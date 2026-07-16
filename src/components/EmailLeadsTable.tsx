'use client';

import { LeadReplyRecord } from '@/lib/transcend-types';
import { formatDate } from '@/lib/utils';

interface EmailLeadsTableProps {
  leads: LeadReplyRecord[];
}

export default function EmailLeadsTable({ leads }: EmailLeadsTableProps) {
  return (
    <div className="rounded-lg p-4 md:p-5 flex flex-col" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>LEAD TRACKING</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Positive Replies</span>
          <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{leads.length} total</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[500px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider sticky top-0 z-10" style={{ color: 'var(--color-text-faint)', background: 'var(--color-card)' }}>
              <th className="text-left py-2 pr-3 font-medium">Contact</th>
              <th className="text-left py-2 pr-3 font-medium">Company</th>
              <th className="text-left py-2 pr-3 font-medium">Title</th>
              <th className="text-left py-2 pr-3 font-medium">Email</th>
              <th className="text-left py-2 pr-3 font-medium">Phone</th>
              <th className="text-left py-2 pr-3 font-medium">Campaign</th>
              <th className="text-left py-2 pr-3 font-medium">Date Replied</th>
              <th className="text-left py-2 font-medium">Reply</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {leads.map((l) => (
              <tr key={l.id} className="row-hover align-top">
                <td className="py-3 pr-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{l.contactName}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-secondary)' }}>{l.company}</td>
                <td className="py-3 pr-3 truncate max-w-[160px]" style={{ color: 'var(--color-text-muted)' }}>{l.jobTitle}</td>
                <td className="py-3 pr-3 truncate max-w-[200px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {l.email && <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a>}
                </td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{l.phone}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{l.campaignName}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{l.dateReplied ? formatDate(l.dateReplied) : '—'}</td>
                <td className="py-3 min-w-[280px] whitespace-pre-wrap break-words" style={{ color: 'var(--color-text-secondary)' }}>{l.reply}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center" style={{ color: 'var(--color-text-fainter)' }}>No positive replies yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {leads.map((l) => (
          <div key={l.id} className="rounded-lg p-3" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
            <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{l.contactName}</p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{l.company}</p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{l.jobTitle}</p>
            {l.email && <p className="text-xs truncate mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a>
            </p>}
            {l.phone && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{l.phone}</p>}
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>Campaign: {l.campaignName}</p>
            {l.dateReplied && <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Replied {formatDate(l.dateReplied)}</p>}
            {l.reply && <p className="text-xs mt-2 whitespace-pre-wrap break-words" style={{ color: 'var(--color-text-secondary)' }}>{l.reply}</p>}
          </div>
        ))}
        {leads.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-fainter)' }}>No positive replies yet</p>
        )}
      </div>
    </div>
  );
}
