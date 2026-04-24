'use client';

interface EndClientFilterProps {
  endClients: string[];
  selected: string;
  onChange: (value: string) => void;
}

export default function EndClientFilter({ endClients, selected, onChange }: EndClientFilterProps) {
  if (endClients.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-bold tracking-widest uppercase" style={{ color: '#9a9a9a' }}>
        End-client
      </label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
        style={{ background: '#1a1a1a', border: '1px solid #252525', color: '#fafafa' }}
      >
        <option value="">All</option>
        {endClients.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
