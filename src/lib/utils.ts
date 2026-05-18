import { MeetingRecord, LeadRecord, TouchpointRow, WebsiteInboundRecord, DashboardData, DashboardMetrics, TimePeriod, QuarterOption, QuarterPeriod } from './types';

const QUARTER_PATTERN = /^q([1-4])_(\d{4})$/;

function getDateRange(period: TimePeriod): { start: Date; end: Date } | null {
  if (period === 'all_time') return null;

  // Specific quarter (e.g. q3_2025)
  const m = period.match(QUARTER_PATTERN);
  if (m) {
    const q = parseInt(m[1]);
    const y = parseInt(m[2]);
    const startMonth = (q - 1) * 3;
    const start = new Date(y, startMonth, 1, 0, 0, 0, 0);
    // Day 0 of month after the quarter = last day of quarter
    const end = new Date(y, startMonth + 3, 0, 23, 59, 59, 999);
    return { start, end };
  }

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

function deriveAvailableQuarters(meetings: MeetingRecord[], leads: LeadRecord[]): QuarterOption[] {
  const seen = new Set<string>();
  const collect = (iso: string) => {
    if (!iso) return;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return;
    const y = d.getFullYear();
    const q = Math.floor(d.getMonth() / 3) + 1;
    seen.add(`${y}-${q}`);
  };
  for (const m of meetings) collect(m.dateCreated);
  for (const l of leads) collect(l.date);

  return Array.from(seen)
    .map((s) => {
      const [y, q] = s.split('-').map(Number);
      return { year: y, quarter: q };
    })
    .sort((a, b) => a.year - b.year || a.quarter - b.quarter)
    .map(({ year, quarter }) => ({
      value: `q${quarter}_${year}` as QuarterPeriod,
      label: `Q${quarter} ${year}`,
    }));
}

function isInRange(dateStr: string, range: { start: Date; end: Date } | null): boolean {
  if (!range) return true; // All Time — include everything
  if (!dateStr) return false; // No date — only show in All Time
  const d = new Date(dateStr);
  return d >= range.start && d <= range.end;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function buildDashboardData(
  meetings: MeetingRecord[],
  leads: LeadRecord[],
  period: TimePeriod,
  touchpointRows?: TouchpointRow[],
  websiteInbounds?: WebsiteInboundRecord[],
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

  // Filter and sum touchpoints if provided — only include channels that were
  // actually present on the sheet (some clients only track Calls, for example).
  let touchpoints: { calls?: number; linkedin?: number; email?: number } | undefined;
  if (touchpointRows && touchpointRows.length > 0) {
    const filtered = touchpointRows.filter((t) => isInRange(t.week, range));
    const channels: { calls?: number; linkedin?: number; email?: number } = {};
    if (filtered.some((t) => t.calls !== undefined)) {
      channels.calls = filtered.reduce((s, t) => s + (t.calls ?? 0), 0);
    }
    if (filtered.some((t) => t.linkedin !== undefined)) {
      channels.linkedin = filtered.reduce((s, t) => s + (t.linkedin ?? 0), 0);
    }
    if (filtered.some((t) => t.email !== undefined)) {
      channels.email = filtered.reduce((s, t) => s + (t.email ?? 0), 0);
    }
    if (Object.keys(channels).length > 0) touchpoints = channels;
  }

  // Available quarters derived from the unfiltered raw inputs so the filter list
  // is stable regardless of which period is currently selected.
  const availableQuarters = deriveAvailableQuarters(meetings, leads);

  return {
    meetings: filteredMeetings,
    leads: filteredLeads,
    statusCounts,
    metrics,
    touchpoints,
    ...(websiteInbounds && websiteInbounds.length > 0 ? { websiteInbounds } : {}),
    ...(availableQuarters.length > 0 ? { availableQuarters } : {}),
    lastUpdated: new Date().toISOString(),
  };
}
