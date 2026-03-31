'use client';

import { DashboardData } from '@/lib/types';

interface ClientData {
  name: string;
  url: string;
  data: DashboardData;
}

interface CampaignTableProps {
  clients: ClientData[];
}

function getAttendPctColor(pct: number): string {
  if (pct >= 90) return '#4ade80';
  if (pct >= 75) return '#facc15';
  if (pct >= 50) return '#fb923c';
  return '#f87171';
}

export default function CampaignTable({ clients }: CampaignTableProps) {
  return (
    <div className="rounded-lg p-6" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-6">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>CAMPAIGN BREAKDOWN</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: '#fafafa' }}>Performance by Campaign</span>
          <span className="text-sm" style={{ color: '#666' }}>{clients.length} campaigns</span>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider" style={{ color: '#555', borderBottom: '1px solid #252525' }}>
            <th className="text-left pb-4 pr-3 font-medium w-10"></th>
            <th className="text-left pb-4 pr-6 font-medium">Campaign</th>
            <th className="text-left pb-4 pr-6 font-medium">Meetings Booked</th>
            <th className="text-left pb-4 pr-6 font-medium">Sat*</th>
            <th className="text-left pb-4 pr-6 font-medium">Attend %</th>
            <th className="text-left pb-4 pr-6 font-medium">Upcoming</th>
            <th className="text-left pb-4 pr-6 font-medium">Leads</th>
            <th className="text-right pb-4 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, idx) => {
            const m = client.data.metrics;
            const attendPct = m.meetingsBooked > 0
              ? Math.round((m.meetingsAttended / m.meetingsBooked) * 100)
              : 0;

            return (
              <tr key={client.name} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid #1e1e1e' }}>
                <td className="py-5 pr-3">
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold"
                    style={{ background: '#ff2eeb', color: '#fafafa' }}
                  >
                    {idx + 1}
                  </span>
                </td>
                <td className="py-5 pr-6 font-semibold text-base" style={{ color: '#fafafa' }}>{client.name}</td>
                <td className="py-5 pr-6" style={{ color: '#b0b0b0' }}>{m.meetingsBooked}</td>
                <td className="py-5 pr-6" style={{ color: '#4ade80' }}>{m.meetingsSat}</td>
                <td className="py-5 pr-6">
                  <span
                    className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold"
                    style={{
                      background: `${getAttendPctColor(attendPct)}15`,
                      color: getAttendPctColor(attendPct),
                      border: `1px solid ${getAttendPctColor(attendPct)}30`,
                    }}
                  >
                    {attendPct}%
                  </span>
                </td>
                <td className="py-5 pr-6" style={{ color: '#b0b0b0' }}>{m.upcoming}</td>
                <td className="py-5 pr-6" style={{ color: '#b0b0b0' }}>{m.leadsGenerated}</td>
                <td className="py-5 text-right">
                  <a
                    href={client.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:opacity-80 transition-opacity"
                    style={{ color: '#ff2eeb' }}
                  >
                    View →
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
