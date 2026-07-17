export type SsoProvider = 'keycloak' | 'saml' | 'oidc';

export interface SsoConfig {
  enabled: boolean;
  provider: SsoProvider;
  url: string;
  realm?: string;
  clientId: string;
  redirectUri: string;
  logoutRedirectUri: string;
  scope: string;
}

export interface SsoTokenResponse {
  token: string;
  user: SsoUser;
}

export interface SsoUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface SsoCallbackParams {
  code: string;
  redirect_uri: string;
  provider: SsoProvider;
}

export interface SamlConfig {
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
  cert?: string;
}
