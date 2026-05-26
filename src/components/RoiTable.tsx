import { RoiOpportunity } from '@/lib/types';

interface RoiTableProps {
  opportunities: RoiOpportunity[];
}

function fmt(n: number): string {
  if (n === 0) return '—';
  return `£${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
}

export default function RoiTable({ opportunities }: RoiTableProps) {
  const totals = opportunities.reduce(
    (s, o) => ({
      pipeline: s.pipeline + (o.pipelineValue ?? 0),
      totalContract: s.totalContract + o.totalContract,
      billed: s.billed + o.billed,
      toBeBilled: s.toBeBilled + o.toBeBilled,
    }),
    { pipeline: 0, totalContract: 0, billed: 0, toBeBilled: 0 },
  );

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>OPPORTUNITIES</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: '#fafafa' }}>Revenue &amp; Pipeline</span>
          <span className="text-sm" style={{ color: '#666' }}>{opportunities.length} deals</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
              <th className="text-left py-2 pr-3 font-medium">Opportunity</th>
              <th className="text-right py-2 pr-3 font-medium">Pipeline</th>
              <th className="text-right py-2 pr-3 font-medium">Total Contract</th>
              <th className="text-right py-2 pr-3 font-medium">Billed</th>
              <th className="text-right py-2 font-medium">To Be Billed</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {opportunities.map((o, i) => (
              <tr key={`${o.opportunity}-${i}`} className="hover:bg-white/[0.03]">
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>
                  {o.opportunity}
                  {o.notes && <span className="block text-xs font-normal mt-0.5" style={{ color: '#666' }}>{o.notes}</span>}
                </td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#b0b0b0' }}>{fmt(o.pipelineValue ?? 0)}</td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#fafafa' }}>{fmt(o.totalContract)}</td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#4ade80' }}>{fmt(o.billed)}</td>
                <td className="py-3 text-right tabular-nums" style={{ color: '#facc15' }}>{fmt(o.toBeBilled)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid #252525' }}>
              <td className="py-3 pr-3 text-xs uppercase tracking-wider font-medium" style={{ color: '#666' }}>Total</td>
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{fmt(totals.pipeline)}</td>
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{fmt(totals.totalContract)}</td>
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: '#4ade80' }}>{fmt(totals.billed)}</td>
              <td className="py-3 text-right tabular-nums font-bold" style={{ color: '#facc15' }}>{fmt(totals.toBeBilled)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {opportunities.map((o, i) => (
          <div key={`${o.opportunity}-${i}`} className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <p className="font-medium text-sm mb-2" style={{ color: '#fafafa' }}>{o.opportunity}</p>
            {o.notes && <p className="text-xs mb-2" style={{ color: '#666' }}>{o.notes}</p>}
            <div className="grid grid-cols-2 gap-y-1 text-xs">
              <span style={{ color: '#666' }}>Pipeline</span>
              <span className="text-right tabular-nums" style={{ color: '#b0b0b0' }}>{fmt(o.pipelineValue ?? 0)}</span>
              <span style={{ color: '#666' }}>Total Contract</span>
              <span className="text-right tabular-nums" style={{ color: '#fafafa' }}>{fmt(o.totalContract)}</span>
              <span style={{ color: '#666' }}>Billed</span>
              <span className="text-right tabular-nums" style={{ color: '#4ade80' }}>{fmt(o.billed)}</span>
              <span style={{ color: '#666' }}>To Be Billed</span>
              <span className="text-right tabular-nums" style={{ color: '#facc15' }}>{fmt(o.toBeBilled)}</span>
            </div>
          </div>
        ))}
        <div className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: '#666' }}>Total</p>
          <div className="grid grid-cols-2 gap-y-1 text-xs">
            <span style={{ color: '#666' }}>Pipeline</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{fmt(totals.pipeline)}</span>
            <span style={{ color: '#666' }}>Total Contract</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#fafafa' }}>{fmt(totals.totalContract)}</span>
            <span style={{ color: '#666' }}>Billed</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#4ade80' }}>{fmt(totals.billed)}</span>
            <span style={{ color: '#666' }}>To Be Billed</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#facc15' }}>{fmt(totals.toBeBilled)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
