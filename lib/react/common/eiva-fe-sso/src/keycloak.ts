import type { SsoConfig, SsoProvider } from './types';

export function buildKeycloakAuthUrl(config: SsoConfig): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
  });
  return `${config.url}/realms/${config.realm}/protocol/openid-connect/auth?${params}`;
}

export function buildKeycloakLogoutUrl(config: SsoConfig): string {
  const params = new URLSearchParams({
    redirect_uri: config.logoutRedirectUri,
  });
  return `${config.url}/realms/${config.realm}/protocol/openid-connect/logout?${params}`;
}

export function extractAuthCode(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

export function buildCallbackPayload(code: string, redirectUri: string) {
  return {
    code,
    redirect_uri: redirectUri,
    provider: 'keycloak' as SsoProvider,
  };
}

export function redirectToKeycloakLogin(config: SsoConfig): void {
  window.location.href = buildKeycloakAuthUrl(config);
}

export function redirectToKeycloakLogout(config: SsoConfig): void {
  window.location.href = buildKeycloakLogoutUrl(config);
}

export function isKeycloakCallback(): boolean {
  return extractAuthCode() !== null;
}
