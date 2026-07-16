import { AssetRow } from '@/lib/storfund-types';
import { formatDate } from '@/lib/utils';
import StatusPill from './StatusPill';

interface AssetsTableProps {
  assets: AssetRow[];
}

export default function AssetsTable({ assets }: AssetsTableProps) {
  const rows = [...assets].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>ASSETS</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Content Library &amp; Sales Materials</span>
          <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{rows.length} records</span>
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
              <th className="text-left py-2 pr-3 font-medium">Date</th>
              <th className="text-left py-2 pr-3 font-medium">Asset</th>
              <th className="text-left py-2 pr-3 font-medium">Type</th>
              <th className="text-left py-2 pr-3 font-medium">Status</th>
              <th className="text-left py-2 font-medium">Link</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {rows.map((a, i) => (
              <tr key={`${a.asset}-${i}`} className="row-hover">
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{formatDate(a.date) || '—'}</td>
                <td className="py-3 pr-3 font-medium truncate max-w-[280px]" style={{ color: 'var(--color-text-primary)' }} title={a.asset}>{a.asset}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-secondary)' }}>{a.type || '—'}</td>
                <td className="py-3 pr-3"><StatusPill status={a.status} /></td>
                <td className="py-3">
                  {a.link ? (
                    <a href={a.link} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: '#27ccd7' }}>Open ↗</a>
                  ) : <span style={{ color: 'var(--color-text-fainter)' }}>—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center" style={{ color: 'var(--color-text-fainter)' }}>Nothing logged yet for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {rows.map((a, i) => (
          <div key={`${a.asset}-${i}`} className="rounded-lg p-3" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{a.asset}</span>
              <StatusPill status={a.status} />
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{a.type} · {formatDate(a.date)}</p>
            {a.link && <a href={a.link} target="_blank" rel="noreferrer" className="block text-xs mt-1 hover:underline" style={{ color: '#27ccd7' }}>Open ↗</a>}
          </div>
        ))}
        {rows.length === 0 && <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-fainter)' }}>Nothing logged yet for this period</p>}
      </div>
    </div>
  );
}
