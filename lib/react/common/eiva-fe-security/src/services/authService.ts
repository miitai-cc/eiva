export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  roles: string[];
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export const loginWithCredentials = async (username: string, password: string): Promise<AuthResponse> => {
  // @ts-ignore
  const loginType = window.__ENV__?.LOGIN_TYPE || 'mock';

  if (loginType === 'mock') {
    if (username === 'root' && password === 'mithra35') {
      return {
        token: 'mock-jwt-token-1234567890',
        user: {
          id: 'mock-root-id',
          username: 'root',
          roles: ['admin'],
        },
      };
    }
    throw new Error('Invalid mock credentials (use root/mithra35)');
  }

  if (loginType === 'sso') {
    throw new Error('SSO login should be handled by Keycloak redirect, not credentials.');
  }

  // Normal / Standalone flow
  const response = await fetch('/cortex/api/v0.85/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  return response.json();
};
