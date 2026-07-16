import { DataMetricRow } from '@/lib/storfund-types';

interface DataProgressCardsProps {
  metrics: DataMetricRow[];
}

const DEFAULT_METRICS = ['Sellers identified', 'Sellers enriched', 'Partnership accounts mapped'];

function fmt(n: number): string {
  return n.toLocaleString('en-GB');
}

export default function DataProgressCards({ metrics }: DataProgressCardsProps) {
  // If sheet is empty, show placeholder cards for the three expected metrics
  // so the section communicates what's coming rather than disappearing.
  const rows: DataMetricRow[] = metrics.length > 0
    ? metrics
    : DEFAULT_METRICS.map((m) => ({ metric: m, value: 0, note: '' }));

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>DATA &amp; LISTS</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Engine Progress</span>
          <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{rows.length} metrics</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {rows.map((m) => {
          const pct = m.target && m.target > 0 ? Math.min(100, (m.value / m.target) * 100) : null;
          return (
            <div key={m.metric} className="rounded-lg p-4" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--color-text-muted)' }}>{m.metric}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmt(m.value)}</p>
                {m.target && m.target > 0 && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>of {fmt(m.target)}</p>
                )}
              </div>
              {pct !== null && (
                <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full" style={{ width: `${pct}%`, background: '#27ccd7' }} />
                </div>
              )}
              {m.note && <p className="text-xs mt-2" style={{ color: 'var(--color-text-faint)' }}>{m.note}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
