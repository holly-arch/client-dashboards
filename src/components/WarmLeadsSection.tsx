'use client';

import { WarmLeadRecord } from '@/lib/types';
import StatusBadge from './StatusBadge';

interface WarmLeadsSectionProps {
  warmLeads: WarmLeadRecord[];
}

export default function WarmLeadsSection({ warmLeads }: WarmLeadsSectionProps) {
  // Newest entries (bottom of sheet) shown first — mirrors WebsiteInboundsSection.
  const ordered = [...warmLeads].reverse();

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-xs font-bold tracking-widest" style={{ color: '#ff2eeb' }}>WARM LEADS</h3>
        <span className="text-sm" style={{ color: '#666' }}>{warmLeads.length} total</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
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
              <tr key={w.id} className="hover:bg-white/[0.03] align-top">
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>{w.firstName || '—'}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{w.surname || '—'}</td>
                <td className="py-3 pr-3" style={{ color: '#fafafa' }}>{w.company || '—'}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{w.campaign || '—'}</td>
                <td className="py-3 pr-3 truncate max-w-[220px]" style={{ color: '#b0b0b0' }} title={w.contact}>{w.contact || '—'}</td>
                <td className="py-3 pr-3">{w.status ? <StatusBadge status={w.status} /> : <span style={{ color: '#555' }}>—</span>}</td>
                <td className="py-3 max-w-[280px] whitespace-pre-wrap break-words" style={{ color: '#888' }}>{w.orrjoNotes}</td>
              </tr>
            ))}
            {ordered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center" style={{ color: '#555' }}>No warm leads yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {ordered.map((w) => (
          <div key={w.id} className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-medium text-sm" style={{ color: '#fafafa' }}>{w.firstName} {w.surname}</p>
              {w.status && <StatusBadge status={w.status} />}
            </div>
            {w.company && <p className="text-xs" style={{ color: '#b0b0b0' }}>{w.company}</p>}
            {w.campaign && <p className="text-xs mt-1" style={{ color: '#888' }}>Campaign: {w.campaign}</p>}
            {w.contact && <p className="text-xs mt-1 break-words" style={{ color: '#b0b0b0' }}>{w.contact}</p>}
            {w.orrjoNotes && <p className="text-xs mt-2 whitespace-pre-wrap break-words" style={{ color: '#888' }}>{w.orrjoNotes}</p>}
          </div>
        ))}
        {ordered.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: '#555' }}>No warm leads yet</p>
        )}
      </div>
    </div>
  );
}
