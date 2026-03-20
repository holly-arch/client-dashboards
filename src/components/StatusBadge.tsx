const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Attended':             { bg: 'rgba(34,197,94,0.10)',  text: '#4ade80', border: 'rgba(34,197,94,0.30)' },
  'Awaiting Reschedule':  { bg: 'rgba(234,179,8,0.10)',  text: '#facc15', border: 'rgba(234,179,8,0.30)' },
  'Upcoming':             { bg: 'rgba(6,182,212,0.10)',   text: '#22d3ee', border: 'rgba(6,182,212,0.30)' },
  'Cancelled':            { bg: 'rgba(239,68,68,0.10)',   text: '#f87171', border: 'rgba(239,68,68,0.30)' },
  'Lead':                 { bg: 'rgba(255,46,235,0.10)',  text: '#ff2eeb', border: 'rgba(255,46,235,0.30)' },
  'Nurture':              { bg: 'rgba(234,179,8,0.10)',   text: '#facc15', border: 'rgba(234,179,8,0.30)' },
  'Meeting Booked':       { bg: 'rgba(34,197,94,0.10)',   text: '#4ade80', border: 'rgba(34,197,94,0.30)' },
  'Engaged Lead':         { bg: 'rgba(59,130,246,0.10)',  text: '#60a5fa', border: 'rgba(59,130,246,0.30)' },
  'Closed/Lost':          { bg: 'rgba(120,120,120,0.10)', text: '#9a9a9a', border: 'rgba(120,120,120,0.30)' },
  'Lost':                 { bg: 'rgba(120,120,120,0.10)', text: '#9a9a9a', border: 'rgba(120,120,120,0.30)' },
};

const DEFAULT_STYLE = { bg: 'rgba(120,120,120,0.10)', text: '#9a9a9a', border: 'rgba(120,120,120,0.30)' };

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const s = STATUS_STYLES[status] || DEFAULT_STYLE;

  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      {status}
    </span>
  );
}
