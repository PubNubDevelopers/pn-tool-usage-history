import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { App } from '../../types';

interface AppBreakdownTableProps {
  apps: App[];
  selectedAppId: number | string | null;
  onSelectApp: (appId: number) => void;
}

type SortColumn = 'name' | 'keyCount';
type SortDirection = 'asc' | 'desc';

export default function AppBreakdownTable({ apps, selectedAppId, onSelectApp }: AppBreakdownTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedApps = useMemo(() => {
    return [...apps].sort((a, b) => {
      let comparison = 0;

      if (sortColumn === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortColumn === 'keyCount') {
        const aCount = (a as any).key_count || 0;
        const bCount = (b as any).key_count || 0;
        comparison = aCount - bCount;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [apps, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="w-4 h-4" /> :
      <ArrowDown className="w-4 h-4" />;
  };

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
            <th
              className="text-left px-4 py-3 text-sm font-medium text-pn-text-secondary border-b border-pn-border cursor-pointer hover:bg-pn-surface-light transition-colors"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-2">
                Application
                <SortIcon column="name" />
              </div>
            </th>
            <th
              className="text-right px-4 py-3 text-sm font-medium text-pn-text-secondary border-b border-pn-border cursor-pointer hover:bg-pn-surface-light transition-colors"
              onClick={() => handleSort('keyCount')}
            >
              <div className="flex items-center justify-end gap-2">
                Key Sets
                <SortIcon column="keyCount" />
              </div>
            </th>
            <th className="text-center px-4 py-3 text-sm font-medium text-pn-text-secondary border-b border-pn-border">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedApps.map((app) => (
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
