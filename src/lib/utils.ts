import { MeetingRecord, LeadRecord, DashboardData, DashboardMetrics, TimePeriod } from './types';

function getDateRange(period: TimePeriod): { start: Date; end: Date } | null {
  if (period === 'all_time') return null;

  const now = new Date();
  const start = new Date();

  switch (period) {
    case 'this_week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday = start of week
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'ytd':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end: now };
}

function isInRange(dateStr: string, range: { start: Date; end: Date } | null): boolean {
  if (!range) return true;
  const d = new Date(dateStr);
  return d >= range.start && d <= range.end;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function buildDashboardData(
  meetings: MeetingRecord[],
  leads: LeadRecord[],
  period: TimePeriod
): DashboardData {
  const range = getDateRange(period);

  const filteredMeetings = meetings.filter((m) => isInRange(m.dateCreated, range));
  const filteredLeads = leads.filter((l) => isInRange(l.date, range));

  // Compute status counts for leads
  const statusCounts: Record<string, number> = {};
  for (const lead of filteredLeads) {
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
  }

  // Compute meeting metrics
  const attended = filteredMeetings.filter((m) => m.subStatus === 'Attended').length;
  const upcoming = filteredMeetings.filter((m) => m.subStatus === 'Upcoming').length;
  const awaitingReschedule = filteredMeetings.filter((m) => m.subStatus === 'Awaiting Reschedule').length;
  const cancelled = filteredMeetings.filter((m) => m.subStatus === 'Cancelled').length;
  const projected = Math.round(upcoming * 0.8);
  const meetingsSat = attended + projected;

  const metrics: DashboardMetrics = {
    meetingsBooked: filteredMeetings.length,
    meetingsCancelled: cancelled,
    meetingsSat,
    meetingsAttended: attended,
    meetingsProjected: projected,
    upcoming,
    awaitingReschedule,
    leadsGenerated: filteredLeads.length,
    leadsConvertedToMeetings: filteredMeetings.length,
  };

  return {
    meetings: filteredMeetings,
    leads: filteredLeads,
    statusCounts,
    metrics,
    lastUpdated: new Date().toISOString(),
  };
}
