'use client';

import { MeetingRecord } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import EditableDropdown from './EditableDropdown';
import EditableText from './EditableText';

interface OutreachTableProps {
  meetings: MeetingRecord[];
  onRefresh?: () => void;
}

export default function OutreachTable({ meetings, onRefresh }: OutreachTableProps) {
  // Detect if editable columns exist (only on sheets that have them)
  const hasShortStatus = meetings.some((m) => m.shortStatus !== undefined);
  const hasPartnerStatus = meetings.some((m) => m.partnerStatus !== undefined);

  return (
    <div className="rounded-lg p-4 md:p-5 flex flex-col h-full" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>OUTREACH</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: '#fafafa' }}>Meetings Booked</span>
          <span className="text-sm" style={{ color: '#666' }}>{meetings.length} records</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1 max-h-96">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
              <th className="text-left py-2 pr-3 font-medium">Company</th>
              <th className="text-left py-2 pr-3 font-medium">Contact</th>
              <th className="text-left py-2 pr-3 font-medium">Title</th>
              <th className="text-left py-2 pr-3 font-medium">Date Booked</th>
              <th className="text-left py-2 pr-3 font-medium">Status</th>
              {hasShortStatus && <th className="text-left py-2 pr-3 font-medium">Short Status</th>}
              {hasPartnerStatus && <th className="text-left py-2 font-medium">Partner Status</th>}
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {meetings.map((m) => (
              <tr key={m.id} className="hover:bg-white/[0.03]">
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>{m.company}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{m.contactName}</td>
                <td className="py-3 pr-3 truncate max-w-[160px]" style={{ color: '#888' }}>{m.contactTitle}</td>
                <td className="py-3 pr-3" style={{ color: '#888' }}>{formatDate(m.dateCreated)}</td>
                <td className="py-3 pr-3"><StatusBadge status={m.subStatus} /></td>
                {hasShortStatus && (
                  <td className="py-3 pr-3">
                    <EditableDropdown value={m.shortStatus || ''} sheetRowIndex={m.sheetRowIndex!} field="shortStatus" onSaved={onRefresh} />
                  </td>
                )}
                {hasPartnerStatus && (
                  <td className="py-3">
                    <EditableText value={m.partnerStatus || ''} sheetRowIndex={m.sheetRowIndex!} field="partnerStatus" placeholder="Add status..." onSaved={onRefresh} />
                  </td>
                )}
              </tr>
            ))}
            {meetings.length === 0 && (
              <tr>
                <td colSpan={5 + (hasShortStatus ? 1 : 0) + (hasPartnerStatus ? 1 : 0)} className="py-8 text-center" style={{ color: '#555' }}>No meetings found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden overflow-y-auto flex-1 max-h-96 space-y-3">
        {meetings.map((m) => (
          <div key={m.id} className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <div className="flex items-start justify-between mb-1">
              <span className="font-medium text-sm" style={{ color: '#fafafa' }}>{m.company}</span>
              <StatusBadge status={m.subStatus} />
            </div>
            <p className="text-sm" style={{ color: '#b0b0b0' }}>{m.contactName}</p>
            <p className="text-xs truncate" style={{ color: '#888' }}>{m.contactTitle}</p>
            <p className="text-xs mt-1" style={{ color: '#666' }}>{formatDate(m.dateCreated)}</p>
            {(hasShortStatus || hasPartnerStatus) && (
              <div className="mt-2 pt-2 space-y-2" style={{ borderTop: '1px solid #252525' }}>
                {hasShortStatus && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#666' }}>Short Status:</span>
                    <EditableDropdown value={m.shortStatus || ''} sheetRowIndex={m.sheetRowIndex!} field="shortStatus" onSaved={onRefresh} />
                  </div>
                )}
                {hasPartnerStatus && (
                  <div>
                    <span className="text-xs" style={{ color: '#666' }}>Partner Status:</span>
                    <EditableText value={m.partnerStatus || ''} sheetRowIndex={m.sheetRowIndex!} field="partnerStatus" placeholder="Add status..." onSaved={onRefresh} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {meetings.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: '#555' }}>No meetings found</p>
        )}
      </div>
    </div>
  );
}
