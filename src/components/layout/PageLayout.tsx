import { useState } from 'react';
import Header from './Header';
import SelectionPanel from './SelectionPanel';
import AccountSelectorPanel from './AccountSelectorPanel';
import DateRangeSelector from './DateRangeSelector';

interface PageLayoutProps {
  children: React.ReactNode;
  showDateRange?: boolean;
}

export default function PageLayout({ children, showDateRange = false }: PageLayoutProps) {
  const [showAccountPanel, setShowAccountPanel] = useState(false);

  return (
    <div className="h-screen bg-pn-bg flex flex-col">
      <Header onAccountClick={() => setShowAccountPanel(true)} />
      <div className="flex-1 flex overflow-hidden">
        <SelectionPanel />
        <main className="flex-1 flex flex-col overflow-hidden">
          {showDateRange && <DateRangeSelector />}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </main>
      </div>
      <AccountSelectorPanel 
        isOpen={showAccountPanel} 
        onClose={() => setShowAccountPanel(false)} 
      />
    </div>
  );
}
