'use client';

import { TimePeriod, QuarterOption } from '@/lib/types';

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
  quarters?: QuarterOption[];
}

export default function TimeFilter({ selected, onChange, quarters }: TimeFilterProps) {
  const renderPill = (value: TimePeriod, label: string) => (
    <button
      key={value}
      onClick={() => onChange(value)}
      className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${
        selected === value
          ? 'text-white'
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      }`}
      style={selected === value ? { background: '#ff2eeb' } : undefined}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIODS.map((p) => renderPill(p.value, p.label))}
      {quarters && quarters.map((q) => renderPill(q.value, q.label))}
    </div>
  );
}
