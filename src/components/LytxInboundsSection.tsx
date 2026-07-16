'use client';

import { LytxInboundRecord } from '@/lib/types';

interface LytxInboundsSectionProps {
  inbounds: LytxInboundRecord[];
}

function formatCreateDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return time === '00:00' ? date : `${date}, ${time}`;
}

// Coloured pill for ORRJO Status. Uses a case-insensitive substring lookup
// so common variants ("Qualified", "Nurture", "Closed / Lost", etc.) get the
// same treatment. Unknown values fall through to a neutral grey pill.
const STATUS_STYLES: { match: string; bg: string; fg: string; border: string }[] = [
  { match: 'qualif', bg: 'rgba(34,197,94,0.1)', fg: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  { match: 'meeting', bg: 'rgba(6,182,212,0.1)', fg: '#22d3ee', border: 'rgba(6,182,212,0.3)' },
  { match: 'nurture', bg: 'rgba(245,158,11,0.1)', fg: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  { match: 'engaged', bg: 'rgba(139,92,246,0.1)', fg: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
  { match: 'lead', bg: 'rgba(255,46,235,0.1)', fg: '#ff2eeb', border: 'rgba(255,46,235,0.3)' },
  { match: 'lost', bg: 'rgba(239,68,68,0.1)', fg: '#f87171', border: 'rgba(239,68,68,0.3)' },
  { match: 'disqualif', bg: 'rgba(239,68,68,0.1)', fg: '#f87171', border: 'rgba(239,68,68,0.3)' },
];

function StatusPill({ value }: { value: string }) {
  if (!value) return <span style={{ color: '#555' }}>—</span>;
  const lower = value.toLowerCase();
  const style = STATUS_STYLES.find((s) => lower.includes(s.match)) ?? {
    bg: 'rgba(160,160,160,0.1)',
    fg: '#a0a0a0',
    border: 'rgba(160,160,160,0.3)',
  };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: style.bg, color: style.fg, border: `1px solid ${style.border}` }}
    >
      {value}
    </span>
  );
}

export default function LytxInboundsSection({ inbounds }: LytxInboundsSectionProps) {
  const allHaveDate = inbounds.length > 0 && inbounds.every((i) => i.createDate);
  const ordered = allHaveDate
    ? [...inbounds].sort((a, b) => (b.createDate ?? '').localeCompare(a.createDate ?? ''))
    : [...inbounds].reverse();

  const total = inbounds.length;
  const hasDate = inbounds.some((i) => i.createDate);

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-xs font-bold tracking-widest" style={{ color: '#ff2eeb' }}>INBOUNDS</h3>
        <span className="text-sm" style={{ color: '#666' }}>{total} total</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
              {hasDate && <th className="text-left py-2 pr-3 font-medium whitespace-nowrap">Created Date</th>}
              <th className="text-left py-2 pr-3 font-medium">First Name</th>
              <th className="text-left py-2 pr-3 font-medium">Last Name</th>
              <th className="text-left py-2 pr-3 font-medium">Account Name</th>
              <th className="text-left py-2 pr-3 font-medium">ORRJO Contact</th>
              <th className="text-left py-2 pr-3 font-medium">ORRJO Status</th>
              <th className="text-left py-2 font-medium">ORRJO Notes</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {ordered.map((i) => (
              <tr key={i.id} className="hover:bg-white/[0.03] align-top">
                {hasDate && <td className="py-3 pr-3 whitespace-nowrap tabular-nums" style={{ color: '#888' }}>{formatCreateDate(i.createDate)}</td>}
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>{i.firstName || '—'}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{i.lastName || '—'}</td>
                <td className="py-3 pr-3" style={{ color: '#fafafa' }}>{i.accountName || '—'}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{i.orrjoContact || '—'}</td>
                <td className="py-3 pr-3"><StatusPill value={i.orrjoStatus} /></td>
                <td className="py-3 max-w-[320px] whitespace-pre-wrap break-words" style={{ color: '#888' }}>{i.orrjoNotes}</td>
              </tr>
            ))}
            {ordered.length === 0 && (
              <tr>
                <td colSpan={hasDate ? 7 : 6} className="py-8 text-center" style={{ color: '#555' }}>No inbounds yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {ordered.map((i) => (
          <div key={i.id} className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-medium text-sm" style={{ color: '#fafafa' }}>{i.firstName} {i.lastName}</p>
              {hasDate && <p className="text-xs whitespace-nowrap tabular-nums" style={{ color: '#666' }}>{formatCreateDate(i.createDate)}</p>}
            </div>
            {i.accountName && <p className="text-xs" style={{ color: '#b0b0b0' }}>{i.accountName}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusPill value={i.orrjoStatus} />
              {i.orrjoContact && <span className="text-xs" style={{ color: '#888' }}>Contact: {i.orrjoContact}</span>}
            </div>
            {i.orrjoNotes && <p className="text-xs mt-2 whitespace-pre-wrap break-words" style={{ color: '#888' }}>{i.orrjoNotes}</p>}
          </div>
        ))}
        {ordered.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: '#555' }}>No inbounds yet</p>
        )}
      </div>
    </div>
  );
}
