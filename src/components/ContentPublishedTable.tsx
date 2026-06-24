import { ContentRow } from '@/lib/storfund-types';
import { formatDate } from '@/lib/utils';
import StatusPill from './StatusPill';

interface ContentPublishedTableProps {
  content: ContentRow[];
}

// 6-pillar brand palette. Unknown / unmapped pillar codes fall through to grey.
const PILLAR_COLOURS: Record<string, string> = {
  '01': '#ff2eeb',
  '02': '#27ccd7',
  '03': '#6d01f7',
  '04': '#f5602e',
  '05': '#c8a96a',
  '06': '#a0a0a0',
};

function pillarColour(pillar: string): string {
  if (!pillar) return '#9a9a9a';
  // Try first 2 chars (e.g. "01 Brand"), then full string match.
  const head = pillar.trim().slice(0, 2);
  return PILLAR_COLOURS[head] ?? PILLAR_COLOURS[pillar.trim()] ?? '#9a9a9a';
}

export default function ContentPublishedTable({ content }: ContentPublishedTableProps) {
  // Newest first.
  const rows = [...content].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>CONTENT</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: '#fafafa' }}>Published &amp; Scheduled</span>
          <span className="text-sm" style={{ color: '#666' }}>{rows.length} records</span>
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
              <th className="text-left py-2 pr-3 font-medium">Date</th>
              <th className="text-left py-2 pr-3 font-medium">Channel</th>
              <th className="text-left py-2 pr-3 font-medium">Pillar</th>
              <th className="text-left py-2 pr-3 font-medium">Title</th>
              <th className="text-left py-2 pr-3 font-medium">Status</th>
              <th className="text-left py-2 font-medium">Link</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {rows.map((c, i) => (
              <tr key={`${c.title}-${i}`} className="hover:bg-white/[0.03]">
                <td className="py-3 pr-3" style={{ color: '#888' }}>{formatDate(c.date) || '—'}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{c.channel || '—'}</td>
                <td className="py-3 pr-3">
                  {c.pillar ? (
                    <span className="inline-flex items-center gap-2" style={{ color: '#b0b0b0' }}>
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: pillarColour(c.pillar) }} />
                      {c.pillar}
                    </span>
                  ) : (
                    <span style={{ color: '#555' }}>—</span>
                  )}
                </td>
                <td className="py-3 pr-3 truncate max-w-[280px]" style={{ color: '#fafafa' }} title={c.title}>{c.title}</td>
                <td className="py-3 pr-3"><StatusPill status={c.status} /></td>
                <td className="py-3">
                  {c.link ? (
                    <a href={c.link} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: '#27ccd7' }}>Open ↗</a>
                  ) : <span style={{ color: '#555' }}>—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center" style={{ color: '#555' }}>Nothing logged yet for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {rows.map((c, i) => (
          <div key={`${c.title}-${i}`} className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-medium text-sm" style={{ color: '#fafafa' }}>{c.title}</span>
              <StatusPill status={c.status} />
            </div>
            <p className="text-xs" style={{ color: '#888' }}>{c.channel} · {formatDate(c.date)}</p>
            {c.pillar && (
              <p className="text-xs mt-1 inline-flex items-center gap-2" style={{ color: '#b0b0b0' }}>
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: pillarColour(c.pillar) }} />
                {c.pillar}
              </p>
            )}
            {c.link && <a href={c.link} target="_blank" rel="noreferrer" className="block text-xs mt-1 hover:underline" style={{ color: '#27ccd7' }}>Open ↗</a>}
          </div>
        ))}
        {rows.length === 0 && <p className="py-8 text-center text-sm" style={{ color: '#555' }}>Nothing logged yet for this period</p>}
      </div>
    </div>
  );
}
