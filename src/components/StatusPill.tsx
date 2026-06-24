// Reusable pill for the Storfund v2 dashboard. Same visual language as
// StatusBadge.tsx but with the v2 status vocabulary (Workstreams, Content,
// Assets). Falls back to neutral grey for unknown values.
const STORFUND_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  // Workstream statuses
  'Live':              { bg: 'rgba(34,197,94,0.10)',   text: '#4ade80', border: 'rgba(34,197,94,0.30)' },
  'Complete':          { bg: 'rgba(34,197,94,0.10)',   text: '#4ade80', border: 'rgba(34,197,94,0.30)' },
  'In progress':       { bg: 'rgba(39,204,215,0.10)',  text: '#27ccd7', border: 'rgba(39,204,215,0.30)' },
  'On hold':           { bg: 'rgba(245,158,11,0.10)',  text: '#fbbf24', border: 'rgba(245,158,11,0.30)' },
  'Not started':       { bg: 'rgba(120,120,120,0.10)', text: '#9a9a9a', border: 'rgba(120,120,120,0.30)' },
  // Content statuses
  'Published':         { bg: 'rgba(34,197,94,0.10)',   text: '#4ade80', border: 'rgba(34,197,94,0.30)' },
  'Scheduled':         { bg: 'rgba(39,204,215,0.10)',  text: '#27ccd7', border: 'rgba(39,204,215,0.30)' },
  'In review':         { bg: 'rgba(245,158,11,0.10)',  text: '#fbbf24', border: 'rgba(245,158,11,0.30)' },
  // Asset statuses
  'Approved':          { bg: 'rgba(34,197,94,0.10)',   text: '#4ade80', border: 'rgba(34,197,94,0.30)' },
  'In draft':          { bg: 'rgba(245,158,11,0.10)',  text: '#fbbf24', border: 'rgba(245,158,11,0.30)' },
  'Awaiting feedback': { bg: 'rgba(39,204,215,0.10)',  text: '#27ccd7', border: 'rgba(39,204,215,0.30)' },
};

const DEFAULT_STYLE = { bg: 'rgba(120,120,120,0.10)', text: '#9a9a9a', border: 'rgba(120,120,120,0.30)' };

interface StatusPillProps {
  status: string;
}

export default function StatusPill({ status }: StatusPillProps) {
  if (!status) return <span style={{ color: '#555' }}>—</span>;
  // Case-insensitive lookup so the sheet can use any capitalisation.
  const key = Object.keys(STORFUND_STYLES).find((k) => k.toLowerCase() === status.toLowerCase());
  const s = (key && STORFUND_STYLES[key]) || DEFAULT_STYLE;
  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  );
}
