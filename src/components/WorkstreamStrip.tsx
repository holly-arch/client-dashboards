import { WorkstreamRow } from '@/lib/storfund-types';
import StatusPill from './StatusPill';

interface WorkstreamStripProps {
  workstreams: WorkstreamRow[];
}

// Default ordering when the sheet doesn't dictate it — matches the SOW
// workstream sequence in Gareth's brief.
const DEFAULT_ORDER = [
  'Content and social',
  'Data and lists',
  'Outreach and priority accounts',
  'Campaigns and demand',
  'Onboarding',
];

// Accent colour per workstream (used as the 4px top border on each card so
// the strip reads as 5 distinct lanes even when statuses are similar).
const WORKSTREAM_ACCENTS: Record<string, string> = {
  'Content and social': '#ff2eeb',
  'Data and lists': '#27ccd7',
  'Outreach and priority accounts': '#f5602e',
  'Campaigns and demand': '#6d01f7',
  'Onboarding': '#22c55e',
};

function accentFor(name: string): string {
  // Case-insensitive lookup so the sheet header can vary slightly.
  const key = Object.keys(WORKSTREAM_ACCENTS).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? WORKSTREAM_ACCENTS[key] : 'var(--color-text-muted)';
}

export default function WorkstreamStrip({ workstreams }: WorkstreamStripProps) {
  // If sheet is empty, render placeholders for the five expected workstreams so
  // the layout doesn't collapse and the team can see what's expected.
  const rows: WorkstreamRow[] = workstreams.length > 0
    ? workstreams
    : DEFAULT_ORDER.map((name) => ({ workstream: name, status: 'Not started', owner: '', note: '', lastUpdated: '' }));

  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-xs font-bold tracking-widest" style={{ color: '#ff2eeb' }}>WORKSTREAMS</h3>
        <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{rows.length} active</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {rows.map((w) => (
          <div
            key={w.workstream}
            className="rounded-lg p-4"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderTop: `4px solid ${accentFor(w.workstream)}`,
            }}
          >
            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{w.workstream}</h4>
            <div className="mb-2"><StatusPill status={w.status} /></div>
            {w.owner && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Owner: <span style={{ color: 'var(--color-text-secondary)' }}>{w.owner}</span></p>}
            {w.note && <p className="text-xs mt-1 truncate" title={w.note} style={{ color: 'var(--color-text-muted)' }}>{w.note}</p>}
            {w.lastUpdated && <p className="text-xs mt-1" style={{ color: 'var(--color-text-fainter)' }}>Updated {w.lastUpdated}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
