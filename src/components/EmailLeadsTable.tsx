'use client';

import { LeadReplyRecord } from '@/lib/transcend-types';
import { formatDate } from '@/lib/utils';

interface EmailLeadsTableProps {
  leads: LeadReplyRecord[];
}

export default function EmailLeadsTable({ leads }: EmailLeadsTableProps) {
  return (
    <div className="rounded-lg p-4 md:p-5 flex flex-col" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>LEAD TRACKING</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: '#fafafa' }}>Positive Replies</span>
          <span className="text-sm" style={{ color: '#666' }}>{leads.length} total</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[500px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider sticky top-0 z-10" style={{ color: '#666', background: '#141414' }}>
              <th className="text-left py-2 pr-3 font-medium">Contact</th>
              <th className="text-left py-2 pr-3 font-medium">Company</th>
              <th className="text-left py-2 pr-3 font-medium">Title</th>
              <th className="text-left py-2 pr-3 font-medium">Email</th>
              <th className="text-left py-2 pr-3 font-medium">Phone</th>
              <th className="text-left py-2 pr-3 font-medium">Campaign</th>
              <th className="text-left py-2 font-medium">Date Replied</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-white/[0.03]">
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>{l.contactName}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{l.company}</td>
                <td className="py-3 pr-3 truncate max-w-[160px]" style={{ color: '#888' }}>{l.jobTitle}</td>
                <td className="py-3 pr-3 truncate max-w-[200px]" style={{ color: '#b0b0b0' }}>
                  {l.email && <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a>}
                </td>
                <td className="py-3 pr-3" style={{ color: '#888' }}>{l.phone}</td>
                <td className="py-3 pr-3" style={{ color: '#888' }}>{l.campaignName}</td>
                <td className="py-3" style={{ color: '#888' }}>{l.dateReplied ? formatDate(l.dateReplied) : '—'}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center" style={{ color: '#555' }}>No replies yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {leads.map((l) => (
          <div key={l.id} className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <p className="font-medium text-sm" style={{ color: '#fafafa' }}>{l.contactName}</p>
            <p className="text-sm" style={{ color: '#b0b0b0' }}>{l.company}</p>
            <p className="text-xs truncate" style={{ color: '#888' }}>{l.jobTitle}</p>
            {l.email && <p className="text-xs truncate mt-1" style={{ color: '#b0b0b0' }}>
              <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a>
            </p>}
            {l.phone && <p className="text-xs" style={{ color: '#888' }}>{l.phone}</p>}
            <p className="text-xs mt-1" style={{ color: '#666' }}>Campaign: {l.campaignName}</p>
            {l.dateReplied && <p className="text-xs" style={{ color: '#666' }}>Replied {formatDate(l.dateReplied)}</p>}
          </div>
        ))}
        {leads.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: '#555' }}>No replies yet</p>
        )}
      </div>
    </div>
  );
}
