import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { UsageData } from '../../types';
import { getMetricsTableData, exportToCSV, formatNumber } from '../../utils/metrics';
import { Download, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface MetricsTableProps {
  usage: UsageData | null;
}

interface TableRow {
  metric: string;
  value: number;
}

const columnHelper = createColumnHelper<TableRow>();

export default function MetricsTable({ usage }: MetricsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'value', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const data = useMemo(() => getMetricsTableData(usage), [usage]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('metric', {
        header: 'Metric',
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('value', {
        header: 'Value',
        cell: (info) => (
          <span className="font-mono">{formatNumber(info.getValue())}</span>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    exportToCSV(data, `pubnub-usage-${timestamp}.csv`);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Detailed Metrics</h3>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pn-text-secondary" />
            <input
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search metrics..."
              className="pl-9 pr-4 py-2 bg-pn-bg border border-pn-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-pn-blue w-64"
            />
          </div>
          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-pn-surface-light hover:bg-pn-border text-white rounded-lg transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 text-sm font-medium text-pn-text-secondary border-b border-pn-border bg-pn-bg cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ChevronUp className="w-4 h-4" />,
                        desc: <ChevronDown className="w-4 h-4" />,
                      }[header.column.getIsSorted() as string] ?? (
                        <ChevronsUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="text-center py-8 text-pn-text-secondary"
                >
                  No metrics found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-pn-border hover:bg-pn-surface-light transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-white">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.length > 15 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-pn-border">
          <div className="text-sm text-pn-text-secondary">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              data.length
            )}{' '}
            of {data.length} metrics
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1.5 text-sm bg-pn-surface-light text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pn-border transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-pn-text-secondary">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1.5 text-sm bg-pn-surface-light text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pn-border transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
