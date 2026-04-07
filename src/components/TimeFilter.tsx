'use client';

import { TimePeriod } from '@/lib/types';

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'all_time', label: 'All Time' },
];

interface TimeFilterProps {
  selected: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

export default function TimeFilter({ selected, onChange }: TimeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${
            selected === p.value
              ? 'text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          style={selected === p.value ? { background: '#ff2eeb' } : undefined}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
