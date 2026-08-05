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
  if (n === 0) return '-';
  return `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number): string {
  if (!n || !isFinite(n)) return '-';
  return `${n.toFixed(1)}%`;
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
        pipeline: t?.totalPipeline ?? 0,
        deals: c.data.roi?.opportunities.length ?? 0,
        conversion: t?.conversionPct ?? 0,
        grossMargin: t?.totalBilledGrossMargin ?? 0,
        hasMargin: !!t?.hasGrossMargin,
      };
    })
    .sort((a, b) => (b.annual + b.pipeline) - (a.annual + a.pipeline));

  const hasAnyMargin = rows.some((r) => r.hasMargin);

  const totals = rows.reduce(
    (s, r) => ({
      annual: s.annual + r.annual,
      total: s.total + r.total,
      billed: s.billed + r.billed,
      pipeline: s.pipeline + r.pipeline,
      deals: s.deals + r.deals,
      grossMargin: s.grossMargin + r.grossMargin,
    }),
    { annual: 0, total: 0, billed: 0, pipeline: 0, deals: 0, grossMargin: 0 },
  );

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>ROI BY CLIENT</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Per-client breakdown</span>
          <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{rows.length} clients</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
              <th className="text-left py-2 pr-3 font-medium">Client</th>
              <th className="text-right py-2 pr-3 font-medium">Annual Contract</th>
              <th className="text-right py-2 pr-3 font-medium">Total Contract</th>
              <th className="text-right py-2 pr-3 font-medium">Billed</th>
              {hasAnyMargin && <th className="text-right py-2 pr-3 font-medium whitespace-nowrap">Billed Gross Margin</th>}
              <th className="text-right py-2 pr-3 font-medium">Pipeline</th>
              <th className="text-right py-2 pr-3 font-medium">Conv %</th>
              <th className="text-right py-2 font-medium"># Opps</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {rows.map((r) => (
              <tr key={r.name} className="row-hover">
                <td className="py-3 pr-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">{r.name}</a>
                </td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{fmt(r.annual)}</td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{fmt(r.total)}</td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#4ade80' }}>{fmt(r.billed)}</td>
                {hasAnyMargin && <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#a78bfa' }}>{r.hasMargin ? fmt(r.grossMargin) : '-'}</td>}
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{fmt(r.pipeline)}</td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#27ccd7' }}>{fmtPct(r.conversion)}</td>
                <td className="py-3 text-right tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{r.deals}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid var(--color-border)' }}>
              <td className="py-3 pr-3 text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-faint)' }}>Total</td>
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmt(totals.annual)}</td>
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmt(totals.total)}</td>
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: '#4ade80' }}>{fmt(totals.billed)}</td>
              {hasAnyMargin && <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: '#a78bfa' }}>{fmt(totals.grossMargin)}</td>}
              <td className="py-3 pr-3 text-right tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmt(totals.pipeline)}</td>
              <td />
              <td className="py-3 text-right tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{totals.deals}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map((r) => (
          <div key={r.name} className="rounded-lg p-3" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
            <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-sm hover:underline" style={{ color: 'var(--color-text-primary)' }}>{r.name}</a>
            <div className="grid grid-cols-2 gap-y-1 text-xs mt-2">
              <span style={{ color: 'var(--color-text-faint)' }}>Annual Contract</span>
              <span className="text-right tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{fmt(r.annual)}</span>
              <span style={{ color: 'var(--color-text-faint)' }}>Total Contract</span>
              <span className="text-right tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{fmt(r.total)}</span>
              <span style={{ color: 'var(--color-text-faint)' }}>Billed</span>
              <span className="text-right tabular-nums" style={{ color: '#4ade80' }}>{fmt(r.billed)}</span>
              {hasAnyMargin && (
                <>
                  <span style={{ color: 'var(--color-text-faint)' }}>Billed Gross Margin</span>
                  <span className="text-right tabular-nums" style={{ color: '#a78bfa' }}>{r.hasMargin ? fmt(r.grossMargin) : '-'}</span>
                </>
              )}
              <span style={{ color: 'var(--color-text-faint)' }}>Pipeline</span>
              <span className="text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{fmt(r.pipeline)}</span>
              <span style={{ color: 'var(--color-text-faint)' }}>Conversion</span>
              <span className="text-right tabular-nums" style={{ color: '#27ccd7' }}>{fmtPct(r.conversion)}</span>
              <span style={{ color: 'var(--color-text-faint)' }}># Opportunities</span>
              <span className="text-right tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{r.deals}</span>
            </div>
          </div>
        ))}
        <div className="rounded-lg p-3" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--color-text-faint)' }}>Total</p>
          <div className="grid grid-cols-2 gap-y-1 text-xs">
            <span style={{ color: 'var(--color-text-faint)' }}>Annual Contract</span>
            <span className="text-right tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmt(totals.annual)}</span>
            <span style={{ color: 'var(--color-text-faint)' }}>Total Contract</span>
            <span className="text-right tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmt(totals.total)}</span>
            <span style={{ color: 'var(--color-text-faint)' }}>Billed</span>
            <span className="text-right tabular-nums font-bold" style={{ color: '#4ade80' }}>{fmt(totals.billed)}</span>
            {hasAnyMargin && (
              <>
                <span style={{ color: 'var(--color-text-faint)' }}>Billed Gross Margin</span>
                <span className="text-right tabular-nums font-bold" style={{ color: '#a78bfa' }}>{fmt(totals.grossMargin)}</span>
              </>
            )}
            <span style={{ color: 'var(--color-text-faint)' }}>Pipeline</span>
            <span className="text-right tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmt(totals.pipeline)}</span>
            <span style={{ color: 'var(--color-text-faint)' }}># Opportunities</span>
            <span className="text-right tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>{totals.deals}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
