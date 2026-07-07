'use client';

import { WebsiteInboundRecord } from '@/lib/types';

interface WebsiteInboundsSectionProps {
  inbounds: WebsiteInboundRecord[];
}

const POSITIVE = { bg: 'rgba(34,197,94,0.1)', fg: '#4ade80', border: 'rgba(34,197,94,0.3)' };
const NEUTRAL = { bg: 'rgba(160,160,160,0.1)', fg: '#a0a0a0', border: 'rgba(160,160,160,0.3)' };

function StatusBadge({ value }: { value: string }) {
  if (!value) return <span style={{ color: '#555' }}>—</span>;
  const isPositive = value.toLowerCase() === 'qualified';
  const c = isPositive ? POSITIVE : NEUTRAL;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
    >
      {value}
    </span>
  );
}

function BookedBadge({ value }: { value: string }) {
  if (!value) return <span style={{ color: '#555' }}>—</span>;
  const isPositive = value.toLowerCase() === 'yes';
  const c = isPositive ? POSITIVE : NEUTRAL;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
    >
      {value}
    </span>
  );
}

interface MiniKpiProps {
  label: string;
  value: number;
  color: string;
}

function MiniKpi({ label, value, color }: MiniKpiProps) {
  return (
    <div
      className="rounded-lg p-3 md:p-4"
      style={{ background: '#141414', border: '1px solid #252525', borderTop: `3px solid ${color}` }}
    >
      <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#9a9a9a' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: '#fafafa' }}>{value}</p>
    </div>
  );
}

function formatCreateDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  // Skip the time when it landed at midnight — usually means the sheet only had a date.
  return time === '00:00' ? date : `${date}, ${time}`;
}

export default function WebsiteInboundsSection({ inbounds }: WebsiteInboundsSectionProps) {
  // Sort newest first when Create Date is present on every row; otherwise fall
  // back to reversing sheet order (newer rows are appended to the bottom).
  const allHaveDate = inbounds.length > 0 && inbounds.every((i) => i.createDate);
  const orderedInbounds = allHaveDate
    ? [...inbounds].sort((a, b) => (b.createDate ?? '').localeCompare(a.createDate ?? ''))
    : [...inbounds].reverse();

  const total = inbounds.length;
  const qualified = inbounds.filter((i) => i.status.toLowerCase() === 'qualified').length;
  const booked = inbounds.filter((i) => i.booked.toLowerCase() === 'yes').length;
  const hasDate = inbounds.some((i) => i.createDate);

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-xs font-bold tracking-widest" style={{ color: '#ff2eeb' }}>WEBSITE INBOUNDS</h3>
        <span className="text-sm" style={{ color: '#666' }}>{total} total</span>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-4">
        <MiniKpi label="Total" value={total} color="#ff2eeb" />
        <MiniKpi label="Qualified" value={qualified} color="#22c55e" />
        <MiniKpi label="Booked" value={booked} color="#06b6d4" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
              {hasDate && <th className="text-left py-2 pr-3 font-medium whitespace-nowrap">Date</th>}
              <th className="text-left py-2 pr-3 font-medium">First Name</th>
              <th className="text-left py-2 pr-3 font-medium">Last Name</th>
              <th className="text-left py-2 pr-3 font-medium">Email</th>
              <th className="text-left py-2 pr-3 font-medium">Status</th>
              <th className="text-left py-2 pr-3 font-medium">Booked?</th>
              <th className="text-left py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {orderedInbounds.map((i) => (
              <tr key={i.id} className="hover:bg-white/[0.03] align-top">
                {hasDate && <td className="py-3 pr-3 whitespace-nowrap tabular-nums" style={{ color: '#888' }}>{formatCreateDate(i.createDate)}</td>}
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>{i.firstName}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{i.lastName}</td>
                <td className="py-3 pr-3 truncate max-w-[260px]" style={{ color: '#b0b0b0' }}>
                  {i.email && <a href={`mailto:${i.email}`} className="hover:underline">{i.email}</a>}
                </td>
                <td className="py-3 pr-3"><StatusBadge value={i.status} /></td>
                <td className="py-3 pr-3"><BookedBadge value={i.booked} /></td>
                <td className="py-3 max-w-[280px] whitespace-pre-wrap break-words" style={{ color: '#888' }}>{i.notes}</td>
              </tr>
            ))}
            {inbounds.length === 0 && (
              <tr>
                <td colSpan={hasDate ? 7 : 6} className="py-8 text-center" style={{ color: '#555' }}>No website inbounds yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {orderedInbounds.map((i) => (
          <div key={i.id} className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm" style={{ color: '#fafafa' }}>{i.firstName} {i.lastName}</p>
              {hasDate && <p className="text-xs whitespace-nowrap tabular-nums" style={{ color: '#666' }}>{formatCreateDate(i.createDate)}</p>}
            </div>
            {i.email && (
              <p className="text-xs truncate mt-1" style={{ color: '#b0b0b0' }}>
                <a href={`mailto:${i.email}`} className="hover:underline">{i.email}</a>
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge value={i.status} />
              <BookedBadge value={i.booked} />
            </div>
            {i.notes && <p className="text-xs mt-2 whitespace-pre-wrap break-words" style={{ color: '#888' }}>{i.notes}</p>}
          </div>
        ))}
        {inbounds.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: '#555' }}>No website inbounds yet</p>
        )}
      </div>
    </div>
  );
}
