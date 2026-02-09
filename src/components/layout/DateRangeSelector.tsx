import { useState } from 'react';
import DatePicker from 'react-datepicker';
import { useAuth } from '../../context/AuthContext';
import { Calendar, RefreshCw, Loader2 } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

export default function DateRangeSelector() {
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    fetchUsage,
    isLoadingUsage,
    selectedAccountId,
  } = useAuth();

  const [localStartDate, setLocalStartDate] = useState<Date>(new Date(startDate));
  const [localEndDate, setLocalEndDate] = useState<Date>(new Date(endDate));

  const handleDateChange = (start: Date | null, end: Date | null) => {
    if (start) {
      setLocalStartDate(start);
      setStartDate(start.toISOString().split('T')[0]);
    }
    if (end) {
      setLocalEndDate(end);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const handleStartChange = (date: Date | null) => {
    if (date) {
      handleDateChange(date, localEndDate);
    }
  };

  const handleEndChange = (date: Date | null) => {
    if (date) {
      handleDateChange(localStartDate, date);
    }
  };

  const handleRefresh = () => {
    fetchUsage();
  };

  return (
    <div className="bg-pn-surface border-b border-pn-border px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-pn-text-secondary">
          Select Date Range
        </div>
        <div className="flex items-center gap-4">
          {/* Date Range Picker */}
          <div className="flex items-center gap-2 bg-pn-bg rounded-lg border border-pn-border px-3 py-2">
            <Calendar className="w-4 h-4 text-pn-text-secondary" />
            <DatePicker
              selected={localStartDate}
              onChange={handleStartChange}
              selectsStart
              startDate={localStartDate}
              endDate={localEndDate}
              maxDate={new Date()}
              dateFormat="MMM d, yyyy"
              className="bg-transparent text-white text-sm w-28 focus:outline-none"
              popperPlacement="bottom-start"
            />
            <span className="text-pn-text-secondary">—</span>
            <DatePicker
              selected={localEndDate}
              onChange={handleEndChange}
              selectsEnd
              startDate={localStartDate}
              endDate={localEndDate}
              minDate={localStartDate}
              maxDate={new Date()}
              dateFormat="MMM d, yyyy"
              className="bg-transparent text-white text-sm w-28 focus:outline-none"
              popperPlacement="bottom-end"
            />
          </div>

          {/* Quick Range Buttons */}
          <div className="flex gap-1">
            {[
              { label: '7D', days: 7 },
              { label: '30D', days: 30 },
              { label: '90D', days: 90 },
              { label: '1Y', days: 365 },
            ].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - days);
                  handleDateChange(start, end);
                }}
                className="px-3 py-1.5 text-sm text-pn-text-secondary hover:text-white hover:bg-pn-surface-light rounded transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoadingUsage || !selectedAccountId}
            className="flex items-center gap-2 px-4 py-2 bg-pn-blue hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingUsage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
