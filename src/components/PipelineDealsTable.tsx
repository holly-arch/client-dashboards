import { RoiOpportunity } from '@/lib/types';

interface PipelineDealsTableProps {
  opportunities: RoiOpportunity[];
}

function fmt(n: number): string {
  if (n === 0) return '—';
  return `£${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
}

export default function PipelineDealsTable({ opportunities }: PipelineDealsTableProps) {
  const hasTypeOfService = opportunities.some((o) => !!o.typeOfService);
  const total = opportunities.reduce((s, o) => s + (o.pipelineValue ?? 0), 0);

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>OPPORTUNITIES</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Pipeline</span>
          <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{opportunities.length} deals</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
              <th className="text-left py-2 pr-3 font-medium">Opportunity</th>
              {hasTypeOfService && <th className="text-left py-2 pr-3 font-medium">Type of Service</th>}
              <th className="text-right py-2 font-medium">Pipeline Value</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {opportunities.map((o, i) => (
              <tr key={`${o.opportunity}-${i}`} className="row-hover">
                <td className="py-3 pr-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {o.opportunity}
                  {o.notes && <span className="block text-xs font-normal mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{o.notes}</span>}
                </td>
                {hasTypeOfService && <td className="py-3 pr-3" style={{ color: 'var(--color-text-secondary)' }}>{o.typeOfService || '—'}</td>}
                <td className="py-3 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{fmt(o.pipelineValue ?? 0)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid var(--color-border)' }}>
              <td className="py-3 pr-3 text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-faint)' }}>Total</td>
              {hasTypeOfService && <td />}
              <td className="py-3 text-right tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {opportunities.map((o, i) => (
          <div key={`${o.opportunity}-${i}`} className="rounded-lg p-3" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
            <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{o.opportunity}</p>
            {hasTypeOfService && o.typeOfService && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{o.typeOfService}</p>}
            {o.notes && <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>{o.notes}</p>}
            <div className="grid grid-cols-2 gap-y-1 text-xs mt-2">
              <span style={{ color: 'var(--color-text-faint)' }}>Pipeline Value</span>
              <span className="text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{fmt(o.pipelineValue ?? 0)}</span>
            </div>
          </div>
        ))}
        <div className="rounded-lg p-3" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--color-text-faint)' }}>Total</p>
          <div className="grid grid-cols-2 gap-y-1 text-xs">
            <span style={{ color: 'var(--color-text-faint)' }}>Pipeline Value</span>
            <span className="text-right tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
