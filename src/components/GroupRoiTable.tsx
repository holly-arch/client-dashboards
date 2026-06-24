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
  return `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

export default function GroupRoiTable({ clients }: GroupRoiTableProps) {
  const rows = clients
    .map((c) => {
      const t = c.data.roi?.totals;
      return {
        name: c.name,
        url: c.url,
        annual: t?.annual12moContract ?? 0,
        total: t?.totalContractValue ?? 0,
        billed: t?.totalBilled ?? 0,
        toBeBilled: c.data.roi?.opportunities.reduce((s, o) => s + o.toBeBilled, 0) ?? 0,
        pipeline: t?.totalPipeline ?? 0,
        deals: c.data.roi?.opportunities.length ?? 0,
      };
    })
    .sort((a, b) => (b.annual + b.pipeline) - (a.annual + a.pipeline));

  const totals = rows.reduce(
    (s, r) => ({
      annual: s.annual + r.annual,
      total: s.total + r.total,
      billed: s.billed + r.billed,
      toBeBilled: s.toBeBilled + r.toBeBilled,
      pipeline: s.pipeline + r.pipeline,
      deals: s.deals + r.deals,
    }),
    { annual: 0, total: 0, billed: 0, toBeBilled: 0, pipeline: 0, deals: 0 },
  );

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>ROI BY CLIENT</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: '#fafafa' }}>Per-client breakdown</span>
          <span className="text-sm" style={{ color: '#666' }}>{rows.length} clients</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
              <th className="text-left py-2 pr-3 font-medium">Client</th>
              <th className="text-right py-2 pr-3 font-medium">Annual Contract</th>
              <th className="text-right py-2 pr-3 font-medium">Total Contract</th>
              <th className="text-right py-2 pr-3 font-medium">Billed</th>
              <th className="text-right py-2 pr-3 font-medium">To Be Billed</th>
              <th className="text-right py-2 pr-3 font-medium">Pipeline</th>
              <th className="text-right py-2 font-medium"># Opps</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {rows.map((r) => (
              <tr key={r.name} className="hover:bg-white/[0.03]">
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">{r.name}</a>
                </td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#fafafa' }}>{fmt(r.annual)}</td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#fafafa' }}>{fmt(r.total)}</td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#4ade80' }}>{fmt(r.billed)}</td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#facc15' }}>{fmt(r.toBeBilled)}</td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#b0b0b0' }}>{fmt(r.pipeline)}</td>
                <td className="py-3 text-right tabular-nums" style={{ color: '#888' }}>{r.deals}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid #252525' }}>
              <td className="py-3 pr-3 text-xs uppercase tracking-wider font-medium" style={{ color: '#666' }}>Total</td>
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{fmt(totals.annual)}</td>
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{fmt(totals.total)}</td>
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: '#4ade80' }}>{fmt(totals.billed)}</td>
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: '#facc15' }}>{fmt(totals.toBeBilled)}</td>
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{fmt(totals.pipeline)}</td>
              <td className="py-3 text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{totals.deals}</td>
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
              <span style={{ color: '#666' }}>Annual Contract</span>
              <span className="text-right tabular-nums" style={{ color: '#fafafa' }}>{fmt(r.annual)}</span>
              <span style={{ color: '#666' }}>Total Contract</span>
              <span className="text-right tabular-nums" style={{ color: '#fafafa' }}>{fmt(r.total)}</span>
              <span style={{ color: '#666' }}>Billed</span>
              <span className="text-right tabular-nums" style={{ color: '#4ade80' }}>{fmt(r.billed)}</span>
              <span style={{ color: '#666' }}>To Be Billed</span>
              <span className="text-right tabular-nums" style={{ color: '#facc15' }}>{fmt(r.toBeBilled)}</span>
              <span style={{ color: '#666' }}>Pipeline</span>
              <span className="text-right tabular-nums" style={{ color: '#b0b0b0' }}>{fmt(r.pipeline)}</span>
              <span style={{ color: '#666' }}># Opportunities</span>
              <span className="text-right tabular-nums" style={{ color: '#888' }}>{r.deals}</span>
            </div>
          </div>
        ))}
        <div className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: '#666' }}>Total</p>
          <div className="grid grid-cols-2 gap-y-1 text-xs">
            <span style={{ color: '#666' }}>Annual Contract</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{fmt(totals.annual)}</span>
            <span style={{ color: '#666' }}>Total Contract</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{fmt(totals.total)}</span>
            <span style={{ color: '#666' }}>Billed</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#4ade80' }}>{fmt(totals.billed)}</span>
            <span style={{ color: '#666' }}>To Be Billed</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#facc15' }}>{fmt(totals.toBeBilled)}</span>
            <span style={{ color: '#666' }}>Pipeline</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{fmt(totals.pipeline)}</span>
            <span style={{ color: '#666' }}># Opportunities</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{totals.deals}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
