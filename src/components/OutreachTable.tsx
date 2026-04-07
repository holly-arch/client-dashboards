import { MeetingRecord } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import StatusBadge from './StatusBadge';

interface OutreachTableProps {
  meetings: MeetingRecord[];
}

export default function OutreachTable({ meetings }: OutreachTableProps) {
  return (
    <div className="rounded-lg p-5 flex flex-col h-full" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>OUTREACH</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: '#fafafa' }}>Meetings Booked</span>
          <span className="text-sm" style={{ color: '#666' }}>{meetings.length} records</span>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-auto flex-1 max-h-96">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
              <th className="text-left py-2 pr-3 font-medium">Company</th>
              <th className="text-left py-2 pr-3 font-medium">Contact</th>
              <th className="text-left py-2 pr-3 font-medium">Title</th>
              <th className="text-left py-2 pr-3 font-medium">Date Booked</th>
              <th className="text-left py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {meetings.map((m) => (
              <tr key={m.id} className="hover:bg-white/[0.03]">
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>{m.company}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{m.contactName}</td>
                <td className="py-3 pr-3 truncate max-w-[160px]" style={{ color: '#888' }}>{m.contactTitle}</td>
                <td className="py-3 pr-3" style={{ color: '#888' }}>{formatDate(m.dateCreated)}</td>
                <td className="py-3"><StatusBadge status={m.subStatus} /></td>
              </tr>
            ))}
            {meetings.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center" style={{ color: '#555' }}>No meetings found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
