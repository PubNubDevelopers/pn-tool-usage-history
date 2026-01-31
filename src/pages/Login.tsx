import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, isLoading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Load saved credentials on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('pn_admin_username');
    const savedPassword = localStorage.getItem('pn_admin_password');
    const savedRemember = localStorage.getItem('pn_admin_remember');
    
    if (savedRemember === 'true' && savedUsername && savedPassword) {
      setUsername(savedUsername);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (!username || !password) {
      setLocalError('Please enter your email and password');
      return;
    }

    try {
      await login(username, password);
      
      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('pn_admin_username', username);
        localStorage.setItem('pn_admin_password', password);
        localStorage.setItem('pn_admin_remember', 'true');
      } else {
        localStorage.removeItem('pn_admin_username');
        localStorage.removeItem('pn_admin_password');
        localStorage.removeItem('pn_admin_remember');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Login failed');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-pn-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <svg
              className="w-10 h-10"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="40" height="40" rx="8" fill="#cd2026" />
              <path
                d="M12 14h6c2.2 0 4 1.8 4 4s-1.8 4-4 4h-6v-8zm2 6h4c1.1 0 2-.9 2-2s-.9-2-2-2h-4v4z"
                fill="white"
              />
              <path d="M12 22h2v6h-2v-6z" fill="white" />
              <path
                d="M24 14h2l6 8v-8h2v14h-2l-6-8v8h-2V14z"
                fill="white"
              />
            </svg>
            <span className="text-2xl font-bold text-white">PubNub</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Account Usage Dashboard</h1>
          <p className="text-pn-text-secondary mt-2">
            Sign in with your PubNub admin credentials
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-pn-surface rounded-lg border border-pn-border p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {displayError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{displayError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-pn-text-secondary mb-2"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="you@pubnub.com"
                className="w-full px-4 py-3 rounded-lg bg-pn-bg border border-pn-border text-white placeholder-gray-500 focus:outline-none focus:border-pn-blue transition-colors"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-pn-text-secondary mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg bg-pn-bg border border-pn-border text-white placeholder-gray-500 focus:outline-none focus:border-pn-blue transition-colors"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-pn-bg border-pn-border text-pn-blue focus:ring-pn-blue focus:ring-2"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 text-sm text-pn-text-secondary cursor-pointer"
              >
                Remember my credentials
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-pn-red hover:bg-pn-red-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-pn-border">
            <p className="text-sm text-pn-text-secondary text-center">
              VPN required for internal admin access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
