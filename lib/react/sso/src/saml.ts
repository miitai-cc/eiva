import type { SsoConfig, SamlConfig } from './types';

export function buildSamlAuthUrl(samlCfg: SamlConfig): string {
  const params = new URLSearchParams({
    RelayState: samlCfg.callbackUrl,
  });
  return `${samlCfg.entryPoint}?${params}`;
}

export function redirectToSamlLogin(samlCfg: SamlConfig): void {
  window.location.href = buildSamlAuthUrl(samlCfg);
}

export function extractSamlResponse(): { relayState: string | null; samlResponse: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    relayState: params.get('RelayState'),
    samlResponse: params.get('SAMLResponse'),
  };
}
