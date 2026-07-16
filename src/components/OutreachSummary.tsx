import { OutreachRow } from '@/lib/storfund-types';
import { formatDate } from '@/lib/utils';

interface OutreachSummaryProps {
  outreach: OutreachRow[];
}

function MiniKpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderTop: `3px solid ${color}` }}>
      <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value.toLocaleString('en-GB')}</p>
    </div>
  );
}

export default function OutreachSummary({ outreach }: OutreachSummaryProps) {
  const connections = outreach.filter((o) => {
    const ch = o.channel.toLowerCase();
    return ch.includes('linkedin') || o.outcome.toLowerCase().includes('connection');
  }).length;
  const calls = outreach.filter((o) => o.channel.toLowerCase().includes('call')).length;
  const replies = outreach.filter((o) => o.outcome.toLowerCase().includes('repl')).length;

  const recent = [...outreach].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>OUTREACH ACTIVITY</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Effort Behind the Meetings</span>
          <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{outreach.length} touches this period</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-4">
        <MiniKpi label="Connections" value={connections} color="#27ccd7" />
        <MiniKpi label="Calls" value={calls} color="#f5602e" />
        <MiniKpi label="Replies" value={replies} color="#22c55e" />
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
              <th className="text-left py-2 pr-3 font-medium">Date</th>
              <th className="text-left py-2 pr-3 font-medium">Channel</th>
              <th className="text-left py-2 pr-3 font-medium">Account</th>
              <th className="text-left py-2 font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {recent.map((o, i) => (
              <tr key={`${o.account}-${i}`} className="row-hover">
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{formatDate(o.date) || '—'}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-secondary)' }}>{o.channel || '—'}</td>
                <td className="py-3 pr-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{o.account}</td>
                <td className="py-3" style={{ color: 'var(--color-text-secondary)' }}>{o.outcome || '—'}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center" style={{ color: 'var(--color-text-fainter)' }}>Nothing logged yet for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {recent.map((o, i) => (
          <div key={`${o.account}-${i}`} className="rounded-lg p-3" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
            <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{o.account}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{o.channel} · {formatDate(o.date)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{o.outcome}</p>
          </div>
        ))}
        {recent.length === 0 && <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-fainter)' }}>Nothing logged yet for this period</p>}
      </div>
    </div>
  );
}
