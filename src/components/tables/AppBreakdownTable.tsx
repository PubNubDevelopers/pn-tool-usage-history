import { App } from '../../types';

interface AppBreakdownTableProps {
  apps: App[];
  selectedAppId: number | string | null;
  onSelectApp: (appId: number) => void;
}

export default function AppBreakdownTable({ apps, selectedAppId, onSelectApp }: AppBreakdownTableProps) {
  if (apps.length === 0) {
    return (
      <div className="text-center py-8 text-pn-text-secondary">
        No apps available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium text-pn-text-secondary border-b border-pn-border">
              Application
            </th>
            <th className="text-right px-4 py-3 text-sm font-medium text-pn-text-secondary border-b border-pn-border">
              Key Sets
            </th>
            <th className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary border-b border-pn-border">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => (
            <tr
              key={app.id}
              className={`border-b border-pn-border hover:bg-pn-surface-light transition-colors ${
                selectedAppId === app.id ? 'bg-pn-surface-light' : ''
              }`}
            >
              <td className="px-4 py-3 text-white">
                <div>
                  <p className="font-medium">{app.name}</p>
                  <p className="text-xs text-pn-text-secondary">ID: {app.id}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-white text-right">
                {(app as any).key_count || '-'}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onSelectApp(app.id)}
                  className="px-3 py-1 text-sm bg-pn-blue hover:bg-blue-600 text-white rounded transition-colors"
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
