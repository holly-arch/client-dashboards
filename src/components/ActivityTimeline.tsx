import { TimelineRow } from '@/lib/storfund-types';
import { formatDate } from '@/lib/utils';

interface ActivityTimelineProps {
  items: TimelineRow[];
}

// Workstream-tag accent colours (mirrors the WorkstreamStrip palette).
const TAG_COLOURS: Record<string, string> = {
  'Content and social': '#ff2eeb',
  'Data and lists': '#27ccd7',
  'Outreach and priority accounts': '#f5602e',
  'Campaigns and demand': '#6d01f7',
  'Onboarding': '#22c55e',
};

function tagColour(name: string): string {
  const key = Object.keys(TAG_COLOURS).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? TAG_COLOURS[key] : 'var(--color-text-muted)';
}

// Returns the Monday of the ISO week containing `dateStr`, as YYYY-MM-DD.
function weekKey(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatWeekHeading(isoKey: string): string {
  if (!isoKey) return 'Undated';
  const d = new Date(isoKey);
  return `Week of ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

export default function ActivityTimeline({ items }: ActivityTimelineProps) {
  const sorted = [...items].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Group by week, preserving newest-first order.
  const groups = new Map<string, TimelineRow[]>();
  for (const it of sorted) {
    const k = weekKey(it.date);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(it);
  }

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>TIMELINE</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Activity by Week</span>
          <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{sorted.length} events</span>
        </div>
      </div>

      {sorted.length === 0 && (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-fainter)' }}>Nothing logged yet for this period</p>
      )}

      {[...groups.entries()].map(([wk, rows]) => (
        <div key={wk || 'undated'} className="mb-5 last:mb-0">
          <h4 className="text-xs uppercase tracking-widest mb-3 pb-2" style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
            {formatWeekHeading(wk)}
          </h4>
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={`${r.description}-${i}`} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-16 text-xs pt-0.5" style={{ color: 'var(--color-text-muted)' }}>{formatDate(r.date) || '—'}</div>
                <div className="flex-shrink-0">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                    style={{
                      background: `${tagColour(r.workstream)}1a`,
                      color: tagColour(r.workstream),
                      border: `1px solid ${tagColour(r.workstream)}4d`,
                    }}
                  >
                    {r.workstream || '—'}
                  </span>
                </div>
                <div className="flex-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {r.description}
                  {r.link && (
                    <a href={r.link} target="_blank" rel="noreferrer" className="ml-2 text-xs hover:underline" style={{ color: '#27ccd7' }}>Open ↗</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
