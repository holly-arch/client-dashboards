'use client';

import { WarmLeadRecord } from '@/lib/types';

interface WarmLeadsSectionProps {
  warmLeads: WarmLeadRecord[];
}

// Loose, case-insensitive keyword match. First hit wins, so list more specific
// terms before broader ones (e.g. "closed won" before "closed", "closed lost"
// before generic "lost"). Returns null for blank values so the cell renders
// as an em-dash instead of an empty pill.
function pillStyle(value: string, lookup: { keys: string[]; bg: string; text: string; border: string }[]): { bg: string; text: string; border: string } {
  const lower = value.toLowerCase();
  for (const entry of lookup) {
    if (entry.keys.some((k) => lower.includes(k))) return entry;
  }
  // Neutral fallback so unmapped values still render as a pill — just grey.
  return { bg: 'rgba(120,120,120,0.10)', text: 'var(--color-text-secondary)', border: 'rgba(120,120,120,0.30)' };
}

const STATUS_LOOKUP = [
  { keys: ['closed won', 'won'], bg: 'rgba(34,197,94,0.10)', text: '#4ade80', border: 'rgba(34,197,94,0.30)' },
  { keys: ['hot', 'qualified', 'engaged', 'interested', 'booked'], bg: 'rgba(34,197,94,0.10)', text: '#4ade80', border: 'rgba(34,197,94,0.30)' },
  { keys: ['warm', 'nurtur', 'following', 'follow up', 'follow-up', 'contacted', 'in progress'], bg: 'rgba(39,204,215,0.10)', text: '#27ccd7', border: 'rgba(39,204,215,0.30)' },
  { keys: ['awaiting', 'pending', 'reply', 'on hold'], bg: 'rgba(234,179,8,0.10)', text: '#facc15', border: 'rgba(234,179,8,0.30)' },
  { keys: ['cold'], bg: 'rgba(96,165,250,0.10)', text: '#60a5fa', border: 'rgba(96,165,250,0.30)' },
  { keys: ['new'], bg: 'rgba(255,46,235,0.10)', text: '#ff2eeb', border: 'rgba(255,46,235,0.30)' },
  { keys: ['closed lost', 'lost', 'not interested', 'disqualified', 'unqualified'], bg: 'rgba(120,120,120,0.10)', text: 'var(--color-text-muted)', border: 'rgba(120,120,120,0.30)' },
];

const CONTACT_LOOKUP = [
  { keys: ['linkedin', 'linked in', 'li dm'], bg: 'rgba(96,165,250,0.10)', text: '#60a5fa', border: 'rgba(96,165,250,0.30)' },
  { keys: ['email', '@', 'mail'], bg: 'rgba(39,204,215,0.10)', text: '#27ccd7', border: 'rgba(39,204,215,0.30)' },
  { keys: ['phone', 'call', 'tel '], bg: 'rgba(245,96,46,0.10)', text: '#f5602e', border: 'rgba(245,96,46,0.30)' },
  { keys: ['meeting', 'in person', 'in-person', 'event'], bg: 'rgba(34,197,94,0.10)', text: '#4ade80', border: 'rgba(34,197,94,0.30)' },
  { keys: ['dm', 'message'], bg: 'rgba(168,85,247,0.10)', text: '#c084fc', border: 'rgba(168,85,247,0.30)' },
];

function Pill({ value, lookup }: { value: string; lookup: typeof STATUS_LOOKUP }) {
  if (!value) return <span style={{ color: 'var(--color-text-fainter)' }}>—</span>;
  const s = pillStyle(value, lookup);
  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {value}
    </span>
  );
}

export default function WarmLeadsSection({ warmLeads }: WarmLeadsSectionProps) {
  // Newest entries (bottom of sheet) shown first — mirrors WebsiteInboundsSection.
  const ordered = [...warmLeads].reverse();

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-xs font-bold tracking-widest" style={{ color: '#ff2eeb' }}>WARM LEADS</h3>
        <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{warmLeads.length} total</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
              <th className="text-left py-2 pr-3 font-medium">First Name</th>
              <th className="text-left py-2 pr-3 font-medium">Surname</th>
              <th className="text-left py-2 pr-3 font-medium">Company</th>
              <th className="text-left py-2 pr-3 font-medium">Campaign</th>
              <th className="text-left py-2 pr-3 font-medium">Contact</th>
              <th className="text-left py-2 pr-3 font-medium">Status</th>
              <th className="text-left py-2 font-medium">ORRJO Notes</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {ordered.map((w) => (
              <tr key={w.id} className="row-hover align-top">
                <td className="py-3 pr-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{w.firstName || '—'}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-secondary)' }}>{w.surname || '—'}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-primary)' }}>{w.company || '—'}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-secondary)' }}>{w.campaign || '—'}</td>
                <td className="py-3 pr-3 truncate max-w-[220px]" title={w.contact}><Pill value={w.contact} lookup={CONTACT_LOOKUP} /></td>
                <td className="py-3 pr-3"><Pill value={w.status} lookup={STATUS_LOOKUP} /></td>
                <td className="py-3 max-w-[280px] whitespace-pre-wrap break-words" style={{ color: 'var(--color-text-muted)' }}>{w.orrjoNotes}</td>
              </tr>
            ))}
            {ordered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center" style={{ color: 'var(--color-text-fainter)' }}>No warm leads yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {ordered.map((w) => (
          <div key={w.id} className="rounded-lg p-3" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{w.firstName} {w.surname}</p>
              {w.status && <Pill value={w.status} lookup={STATUS_LOOKUP} />}
            </div>
            {w.company && <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{w.company}</p>}
            {w.campaign && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Campaign: {w.campaign}</p>}
            {w.contact && <div className="mt-1"><Pill value={w.contact} lookup={CONTACT_LOOKUP} /></div>}
            {w.orrjoNotes && <p className="text-xs mt-2 whitespace-pre-wrap break-words" style={{ color: 'var(--color-text-muted)' }}>{w.orrjoNotes}</p>}
          </div>
        ))}
        {ordered.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-fainter)' }}>No warm leads yet</p>
        )}
      </div>
    </div>
  );
}
