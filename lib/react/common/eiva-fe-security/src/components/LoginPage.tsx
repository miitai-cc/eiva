import React, { useState } from 'react';
import { loginWithCredentials } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';
import { LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const setAuth = useAuthStore((state) => state.setAuth);

  // @ts-ignore
  const loginType = window.__ENV__?.LOGIN_TYPE || 'mock';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (loginType === 'mock') {
        if (username === 'root' && password === 'mithra35') {
          setAuth(
            { id: 'mock-root', username: 'root', email: 'root@mock.local', roles: ['admin'] },
            'mock-jwt-token-1234567890'
          );
          return;
        } else {
          throw new Error('Invalid mock credentials (use root/mithra35)');
        }
      }

      if (loginType === 'sso') {
        // @ts-ignore
        const kcUrl = window.__ENV__?.KEYCLOAK_URL || 'http://localhost:8080';
        window.location.href = kcUrl;
        return;
      }

      const { token, user } = await loginWithCredentials(username, password);
      setAuth(user, token);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
        <div className="text-center mb-8">
          <div className="bg-purple-500/10 p-3 rounded-full inline-block mb-4">
            <LogIn className="w-8 h-8 text-purple-500" />
          </div>
          <h2 className="text-3xl font-bold text-white">Welcome to Cortex</h2>
          <p className="text-gray-400 mt-2">
            {loginType === 'mock' ? 'Mock Mode Enabled (root/mithra35)' : 'Please sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {loginType !== 'sso' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : loginType === 'sso' ? 'Sign in with SSO' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};
