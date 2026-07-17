use crate::types::*;
use async_trait::async_trait;

pub struct KeycloakClient {
    config: SsoConfig,
    client: reqwest::Client,
}

impl KeycloakClient {
    pub fn new(config: SsoConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }

    /// Exchange authorization code for tokens using Keycloak's token endpoint.
    pub async fn exchange_code(&self, code: &str, redirect_uri: &str) -> Result<TokenResponse, SsoError> {
        let realm = self.config.realm.as_deref().unwrap_or("master");
        let token_url = format!(
            "{}/realms/{}/protocol/openid-connect/token",
            self.config.url, realm
        );

        let params = [
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", redirect_uri),
            ("client_id", &self.config.client_id),
            ("client_secret", &self.config.client_secret),
        ];

        let resp = self.client
            .post(&token_url)
            .form(&params)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(SsoError::TokenExchangeFailed(format!("HTTP {}: {}", status, body)));
        }

        let token_resp: TokenResponse = resp.json().await?;
        Ok(token_resp)
    }

    /// Validate an access token using Keycloak's userinfo endpoint.
    pub async fn validate_token(&self, access_token: &str) -> Result<UserInfo, SsoError> {
        let realm = self.config.realm.as_deref().unwrap_or("master");
        let userinfo_url = format!(
            "{}/realms/{}/protocol/openid-connect/userinfo",
            self.config.url, realm
        );

        let resp = self.client
            .get(&userinfo_url)
            .bearer_auth(access_token)
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(SsoError::TokenValidationFailed("Userinfo endpoint returned error".into()));
        }

        let raw: serde_json::Value = resp.json().await?;
        let roles: Vec<String> = raw["roles"]
            .as_array()
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default();

        Ok(UserInfo {
            sub: raw["sub"].as_str().unwrap_or("").to_string(),
            preferred_username: raw["preferred_username"].as_str().map(String::from),
            email: raw["email"].as_str().map(String::from),
            name: raw["name"].as_str().map(String::from),
            roles,
        })
    }

    /// Perform full authorization code flow: exchange code, then fetch user info.
    pub async fn authenticate(&self, code: &str, redirect_uri: &str) -> Result<SsoAuthResult, SsoError> {
        let token_resp = self.exchange_code(code, redirect_uri).await?;
        let user_info = self.validate_token(&token_resp.access_token).await?;

        Ok(SsoAuthResult {
            token: token_resp.access_token,
            user: user_info,
            provider: SsoProvider::Keycloak,
        })
    }

    /// Build the Keycloak JWKS URL for local token verification.
    pub fn jwks_url(&self) -> String {
        let realm = self.config.realm.as_deref().unwrap_or("master");
        format!(
            "{}/realms/{}/protocol/openid-connect/certs",
            self.config.url, realm
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwks_url() {
        let config = SsoConfig {
            enabled: true,
            provider: SsoProvider::Keycloak,
            url: "http://localhost:8080".into(),
            realm: Some("cortex".into()),
            client_id: "test-client".into(),
            client_secret: "".into(),
            redirect_uri: "http://localhost:3000/login".into(),
            scope: "openid profile email".into(),
        };
        let client = KeycloakClient::new(config);
        assert_eq!(
            client.jwks_url(),
            "http://localhost:8080/realms/cortex/protocol/openid-connect/certs"
        );
    }
}
