import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onAccountClick?: () => void;
}

export default function Header({ onAccountClick }: HeaderProps) {
  const { logout, selectedAccount, selectedAccountId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="bg-pn-surface border-b border-pn-border px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Branding */}
          <div className="flex items-center gap-3">
            <img 
              src="/pn_logo_white.svg" 
              alt="PubNub" 
              className="h-7"
            />
            <span className="text-sm font-medium text-pn-text-secondary">
              Account Usage
            </span>
          </div>

          {/* Center: Page Tabs */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => navigate('/usage-summary')}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                isActive('/usage-summary')
                  ? 'bg-pn-blue text-white'
                  : 'text-pn-text-secondary hover:text-white hover:bg-pn-surface-light'
              }`}
            >
              Usage Summary
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                isActive('/dashboard')
                  ? 'bg-pn-blue text-white'
                  : 'text-pn-text-secondary hover:text-white hover:bg-pn-surface-light'
              }`}
            >
              Detailed View
            </button>
            <button
              onClick={() => navigate('/features')}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                isActive('/features')
                  ? 'bg-pn-blue text-white'
                  : 'text-pn-text-secondary hover:text-white hover:bg-pn-surface-light'
              }`}
            >
              Features
            </button>
          </nav>

          {/* Right: Account Selector + Logout */}
          <div className="flex items-center gap-3">
            <button
              onClick={onAccountClick}
              className="flex items-center gap-2 px-3 py-2 rounded bg-pn-bg border border-pn-border hover:border-pn-blue transition-colors"
            >
              <span className="text-sm text-white">
                {selectedAccount
                  ? selectedAccount.properties?.company || selectedAccount.email || `Account ${selectedAccountId}`
                  : 'Select Account'}
              </span>
              <ChevronDown className="w-4 h-4 text-pn-text-secondary" />
            </button>
            <button
              onClick={logout}
              className="p-2 text-pn-text-secondary hover:text-white hover:bg-pn-surface-light rounded transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
