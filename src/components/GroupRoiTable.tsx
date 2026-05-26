import { DashboardData } from '@/lib/types';

interface ClientLike {
  name: string;
  url: string;
  data: DashboardData;
}

interface GroupRoiTableProps {
  clients: ClientLike[];
}

function fmt(n: number): string {
  if (n === 0) return '—';
  return `£${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
}

export default function GroupRoiTable({ clients }: GroupRoiTableProps) {
  const rows = clients
    .map((c) => ({
      name: c.name,
      url: c.url,
      revenue: c.data.roi?.revenueTotal ?? 0,
      pipeline: c.data.roi?.pipelineTotal ?? 0,
    }))
    .sort((a, b) => (b.revenue + b.pipeline) - (a.revenue + a.pipeline));

  const totals = rows.reduce(
    (s, r) => ({ revenue: s.revenue + r.revenue, pipeline: s.pipeline + r.pipeline }),
    { revenue: 0, pipeline: 0 },
  );

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>REVENUE BY CLIENT</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: '#fafafa' }}>Revenue &amp; Pipeline</span>
          <span className="text-sm" style={{ color: '#666' }}>{rows.length} clients</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
              <th className="text-left py-2 pr-3 font-medium">Client</th>
              <th className="text-right py-2 pr-3 font-medium">Revenue</th>
              <th className="text-right py-2 font-medium">Pipeline</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {rows.map((r) => (
              <tr key={r.name} className="hover:bg-white/[0.03]">
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">{r.name}</a>
                </td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#4ade80' }}>{fmt(r.revenue)}</td>
                <td className="py-3 text-right tabular-nums" style={{ color: '#b0b0b0' }}>{fmt(r.pipeline)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid #252525' }}>
              <td className="py-3 pr-3 text-xs uppercase tracking-wider font-medium" style={{ color: '#666' }}>Total</td>
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: '#4ade80' }}>{fmt(totals.revenue)}</td>
              <td className="py-3 text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{fmt(totals.pipeline)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map((r) => (
          <div key={r.name} className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-sm hover:underline" style={{ color: '#fafafa' }}>{r.name}</a>
            <div className="grid grid-cols-2 gap-y-1 text-xs mt-2">
              <span style={{ color: '#666' }}>Revenue</span>
              <span className="text-right tabular-nums" style={{ color: '#4ade80' }}>{fmt(r.revenue)}</span>
              <span style={{ color: '#666' }}>Pipeline</span>
              <span className="text-right tabular-nums" style={{ color: '#b0b0b0' }}>{fmt(r.pipeline)}</span>
            </div>
          </div>
        ))}
        <div className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: '#666' }}>Total</p>
          <div className="grid grid-cols-2 gap-y-1 text-xs">
            <span style={{ color: '#666' }}>Revenue</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#4ade80' }}>{fmt(totals.revenue)}</span>
            <span style={{ color: '#666' }}>Pipeline</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{fmt(totals.pipeline)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
