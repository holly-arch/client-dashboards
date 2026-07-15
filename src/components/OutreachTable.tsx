'use client';

import { MeetingRecord } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import EditableDropdown from './EditableDropdown';
import EditableText from './EditableText';

interface OutreachTableProps {
  meetings: MeetingRecord[];
  onRefresh?: () => void;
  clientName?: string;
}

export default function OutreachTable({ meetings, onRefresh, clientName }: OutreachTableProps) {
  // Detect if editable columns exist (only on sheets that have them)
  const hasShortStatus = meetings.some((m) => m.shortStatus !== undefined);
  const hasPartnerStatus = meetings.some((m) => m.partnerStatus !== undefined);
  const hasIndustry = meetings.some((m) => m.industry !== undefined);
  const hasFleetSize = meetings.some((m) => m.fleetSize !== undefined);
  // Source / Channel columns are auto-detected but other clients' sheets
  // happen to have a "Source" header that isn't meant for display. Gate by
  // explicit client-name list.
  const SOURCE_CLIENTS = new Set(['Tower Supplies', 'Wire', 'Storfund']);
  const CHANNEL_CLIENTS = new Set(['Storfund']);
  const hasSource = SOURCE_CLIENTS.has(clientName ?? '') && meetings.some((m) => m.source !== undefined);
  const hasChannel = CHANNEL_CLIENTS.has(clientName ?? '') && meetings.some((m) => m.channel !== undefined);
  const showMeetingDate = clientName === 'Jua' || clientName === 'Tower Supplies';
  // HubSpot-enriched columns — currently gated to myBasePay (the only client
  // wired up to HubSpot via Composio). Rendered only when the data landed.
  const isHubspotClient = clientName === 'myBasePay';
  const hasBookedWith = isHubspotClient && meetings.some((m) => m.bookedWith);
  const hasOwner = isHubspotClient && meetings.some((m) => m.hubspotOwner);
  const hasLastContacted = isHubspotClient && meetings.some((m) => m.lastContactedIso);

  const formatLastContacted = (iso: string | undefined): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

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
            <tr className="text-xs uppercase tracking-wider sticky top-0 z-10" style={{ color: '#666', background: '#141414' }}>
              <th className="text-left py-2 pr-3 font-medium">Company</th>
              <th className="text-left py-2 pr-3 font-medium">Contact</th>
              <th className="text-left py-2 pr-3 font-medium">Title</th>
              {hasOwner && <th className="text-left py-2 pr-3 font-medium">Owner</th>}
              {hasBookedWith && <th className="text-left py-2 pr-3 font-medium">Booked With</th>}
              {hasLastContacted && <th className="text-left py-2 pr-3 font-medium whitespace-nowrap">Last Contacted</th>}
              {hasIndustry && <th className="text-left py-2 pr-3 font-medium">Industry</th>}
              {hasFleetSize && <th className="text-right py-2 pr-3 font-medium">Fleet Size</th>}
              <th className="text-left py-2 pr-3 font-medium">Date Booked</th>
              {showMeetingDate && <th className="text-left py-2 pr-3 font-medium">Meeting Date</th>}
              <th className="text-left py-2 pr-3 font-medium">Status</th>
              {hasChannel && <th className="text-left py-2 pr-3 font-medium">Channel</th>}
              {hasSource && <th className="text-left py-2 pr-3 font-medium">Source</th>}
              {hasShortStatus && <th className="text-left py-2 pr-3 font-medium">Short Status</th>}
              {hasPartnerStatus && <th className="text-left py-2 font-medium">Partner Status</th>}
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {meetings.map((m) => (
              <tr key={m.id} className="hover:bg-white/[0.03]">
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>{m.company}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>
                  {m.hubspotContactUrl ? (
                    <a
                      href={m.hubspotContactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      style={{ color: 'inherit' }}
                    >
                      {m.contactName}
                    </a>
                  ) : (
                    m.contactName
                  )}
                </td>
                <td className="py-3 pr-3 truncate max-w-[160px]" style={{ color: '#888' }}>{m.contactTitle}</td>
                {hasOwner && <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{m.hubspotOwner || '—'}</td>}
                {hasBookedWith && <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{m.bookedWith || '—'}</td>}
                {hasLastContacted && <td className="py-3 pr-3 whitespace-nowrap tabular-nums" style={{ color: '#888' }}>{formatLastContacted(m.lastContactedIso)}</td>}
                {hasIndustry && <td className="py-3 pr-3" style={{ color: '#888' }}>{m.industry || '—'}</td>}
                {hasFleetSize && <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#888' }}>{m.fleetSize !== undefined ? m.fleetSize.toLocaleString('en-GB') : '—'}</td>}
                <td className="py-3 pr-3" style={{ color: '#888' }}>{formatDate(m.dateCreated)}</td>
                {showMeetingDate && <td className="py-3 pr-3" style={{ color: '#888' }}>{m.meetingDate ? formatDate(m.meetingDate) : '—'}</td>}
                <td className="py-3 pr-3"><StatusBadge status={m.subStatus} /></td>
                {hasChannel && <td className="py-3 pr-3" style={{ color: '#888' }}>{m.channel || '—'}</td>}
                {hasSource && <td className="py-3 pr-3" style={{ color: '#888' }}>{m.source || '—'}</td>}
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
                <td colSpan={5 + (showMeetingDate ? 1 : 0) + (hasIndustry ? 1 : 0) + (hasFleetSize ? 1 : 0) + (hasChannel ? 1 : 0) + (hasSource ? 1 : 0) + (hasShortStatus ? 1 : 0) + (hasPartnerStatus ? 1 : 0) + (hasOwner ? 1 : 0) + (hasBookedWith ? 1 : 0) + (hasLastContacted ? 1 : 0)} className="py-8 text-center" style={{ color: '#555' }}>No meetings found</td>
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
            <p className="text-sm" style={{ color: '#b0b0b0' }}>
              {m.hubspotContactUrl ? (
                <a href={m.hubspotContactUrl} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'inherit' }}>
                  {m.contactName}
                </a>
              ) : (
                m.contactName
              )}
            </p>
            <p className="text-xs truncate" style={{ color: '#888' }}>{m.contactTitle}</p>
            {hasOwner && m.hubspotOwner && <p className="text-xs" style={{ color: '#888' }}>Owner: {m.hubspotOwner}</p>}
            {hasBookedWith && m.bookedWith && <p className="text-xs" style={{ color: '#888' }}>Booked with: {m.bookedWith}</p>}
            {hasLastContacted && m.lastContactedIso && <p className="text-xs" style={{ color: '#888' }}>Last contacted: {formatLastContacted(m.lastContactedIso)}</p>}
            {hasIndustry && m.industry && <p className="text-xs" style={{ color: '#888' }}>Industry: {m.industry}</p>}
            {hasFleetSize && m.fleetSize !== undefined && <p className="text-xs" style={{ color: '#888' }}>Fleet size: {m.fleetSize.toLocaleString('en-GB')}</p>}
            {hasChannel && m.channel && <p className="text-xs" style={{ color: '#888' }}>Channel: {m.channel}</p>}
            {hasSource && m.source && <p className="text-xs" style={{ color: '#888' }}>Source: {m.source}</p>}
            <p className="text-xs mt-1" style={{ color: '#666' }}>Booked: {formatDate(m.dateCreated)}</p>
            {showMeetingDate && <p className="text-xs" style={{ color: '#666' }}>Meeting: {m.meetingDate ? formatDate(m.meetingDate) : '—'}</p>}
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
