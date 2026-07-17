use crate::types::*;
use serde::{Deserialize, Serialize};

pub struct OidcClient {
    config: SsoConfig,
    client: reqwest::Client,
    issuer_url: String,
}

impl OidcClient {
    pub fn new(config: SsoConfig) -> Self {
        Self {
            issuer_url: config.url.trim_end_matches('/').to_string(),
            config,
            client: reqwest::Client::new(),
        }
    }

    /// Discover OIDC configuration from the issuer's well-known endpoint.
    pub async fn discover(&self) -> Result<OidcDiscovery, SsoError> {
        let well_known = format!("{}/.well-known/openid-configuration", self.issuer_url);
        let resp = self.client.get(&well_known).send().await?;
        let discovery: OidcDiscovery = resp.json().await?;
        Ok(discovery)
    }

    /// Exchange authorization code for tokens.
    pub async fn exchange_code(&self, code: &str, redirect_uri: &str) -> Result<TokenResponse, SsoError> {
        let discovery = self.discover().await?;

        let params = [
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", redirect_uri),
            ("client_id", &self.config.client_id),
            ("client_secret", &self.config.client_secret),
        ];

        let resp = self.client
            .post(&discovery.token_endpoint)
            .form(&params)
            .send()
            .await?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(SsoError::TokenExchangeFailed(body));
        }

        let token_resp: TokenResponse = resp.json().await?;
        Ok(token_resp)
    }

    /// Fetch user info using the access token.
    pub async fn userinfo(&self, access_token: &str) -> Result<UserInfo, SsoError> {
        let discovery = self.discover().await?;

        let resp = self.client
            .get(&discovery.userinfo_endpoint)
            .bearer_auth(access_token)
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(SsoError::UserInfoFetchFailed("Userinfo endpoint error".into()));
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OidcDiscovery {
    pub issuer: String,
    pub authorization_endpoint: String,
    pub token_endpoint: String,
    pub userinfo_endpoint: String,
    pub jwks_uri: String,
    pub scopes_supported: Option<Vec<String>>,
    pub response_types_supported: Vec<String>,
    pub subject_types_supported: Vec<String>,
    pub id_token_signing_alg_values_supported: Vec<String>,
}
