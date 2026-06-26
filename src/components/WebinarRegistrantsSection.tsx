'use client';

import { WebinarRegistrant } from '@/lib/types';

interface WebinarRegistrantsSectionProps {
  registrants: WebinarRegistrant[];
}

export default function WebinarRegistrantsSection({ registrants }: WebinarRegistrantsSectionProps) {
  // Newest entries (bottom of sheet) shown first — mirrors WebsiteInbounds + WarmLeads.
  const ordered = [...registrants].reverse();

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-xs font-bold tracking-widest" style={{ color: '#ff2eeb' }}>TECH TALK WEBINAR REGISTRANTS</h3>
        <span className="text-sm" style={{ color: '#666' }}>{registrants.length} registered</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
              <th className="text-left py-2 pr-3 font-medium">First Name</th>
              <th className="text-left py-2 pr-3 font-medium">Last Name</th>
              <th className="text-left py-2 pr-3 font-medium">Organisation</th>
              <th className="text-left py-2 font-medium">Job Title</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {ordered.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.03]">
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>{r.firstName || '—'}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{r.lastName || '—'}</td>
                <td className="py-3 pr-3" style={{ color: '#fafafa' }}>{r.organisation || '—'}</td>
                <td className="py-3" style={{ color: '#b0b0b0' }}>{r.jobTitle || '—'}</td>
              </tr>
            ))}
            {ordered.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center" style={{ color: '#555' }}>No registrants yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {ordered.map((r) => (
          <div key={r.id} className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <p className="font-medium text-sm" style={{ color: '#fafafa' }}>{r.firstName} {r.lastName}</p>
            {r.organisation && <p className="text-xs mt-0.5" style={{ color: '#b0b0b0' }}>{r.organisation}</p>}
            {r.jobTitle && <p className="text-xs mt-0.5" style={{ color: '#888' }}>{r.jobTitle}</p>}
          </div>
        ))}
        {ordered.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: '#555' }}>No registrants yet</p>
        )}
      </div>
    </div>
  );
}
