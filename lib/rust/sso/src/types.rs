use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SsoProvider {
    #[serde(rename = "keycloak")]
    Keycloak,
    #[serde(rename = "saml")]
    Saml,
    #[serde(rename = "oidc")]
    Oidc,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SsoConfig {
    pub enabled: bool,
    pub provider: SsoProvider,
    pub url: String,
    pub realm: Option<String>,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
    pub scope: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SsoCallbackRequest {
    pub code: String,
    pub redirect_uri: String,
    pub provider: SsoProvider,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
    pub refresh_token: Option<String>,
    pub id_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub sub: String,
    pub preferred_username: Option<String>,
    pub email: Option<String>,
    pub name: Option<String>,
    pub roles: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SsoAuthResult {
    pub token: String,
    pub user: UserInfo,
    pub provider: SsoProvider,
}

#[derive(Debug, thiserror::Error)]
pub enum SsoError {
    #[error("SSO not configured")]
    NotConfigured,
    #[error("Token exchange failed: {0}")]
    TokenExchangeFailed(String),
    #[error("Token validation failed: {0}")]
    TokenValidationFailed(String),
    #[error("User info fetch failed: {0}")]
    UserInfoFetchFailed(String),
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
    #[error("Invalid SAML response: {0}")]
    InvalidSamlResponse(String),
    #[error("Invalid state: {0}")]
    InvalidState(String),
}
