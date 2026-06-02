import { MeetingRecord, LeadRecord, TouchpointRow, WebsiteInboundRecord, RoiEntry, RoiOpportunity, RoiSummary, DashboardData, DashboardMetrics, TimePeriod, QuarterOption, QuarterPeriod } from './types';

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

function formatGBP(n: number): string {
  return `£${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
}

// Build a "Deal A £X + Deal B £Y" string for the ROI card subtitle. Caps at 4
// named deals + "and N more" so it doesn't overflow on dashboards with lots
// of small line items. Skips entries without a deal name.
function buildDealNote(entries: RoiEntry[], field: 'revenue' | 'pipeline'): string | undefined {
  const named = entries
    .filter((e) => e[field] !== undefined && e[field]! > 0 && e.deal)
    .map((e) => ({ deal: e.deal, amount: e[field] as number }));
  if (named.length === 0) return undefined;

  const MAX = 4;
  const shown = named.slice(0, MAX).map((d) => `${d.deal} ${formatGBP(d.amount)}`);
  const rest = named.length - MAX;
  return rest > 0 ? `${shown.join(' + ')} and ${rest} more` : shown.join(' + ');
}

// One sheet row = one opportunity. Same-name rows stay distinct so a deal that
// has both a Pipeline Value row and a Contract row (e.g. Trust Hire's YTL)
// renders as two separate rows on the dashboard (one in Revenue, one in
// Pipeline). Splits monthly amounts into billed (past + current month) and
// to-be-billed (future months) using today's month/year as the cutoff.
function computeOpportunities(rows: RoiOpportunity[]): RoiOpportunity[] {
  const now = new Date();
  const todayKey = now.getFullYear() * 12 + now.getMonth();

  const computed = rows.map((r) => {
    const monthsSum = r.monthly.reduce((s, m) => s + m.amount, 0);
    const pastSum = r.monthly
      .filter((m) => m.year * 12 + m.month <= todayKey)
      .reduce((s, m) => s + m.amount, 0);
    const futureSum = monthsSum - pastSum;
    // Total Contract = Contract Value column directly; fall back to sum of
    // monthly amounts for legacy rows where the column hasn't been filled in.
    const totalContract = r.contractValue !== undefined ? r.contractValue : monthsSum;
    return {
      ...r,
      totalContract,
      billed: pastSum,
      toBeBilled: futureSum,
    };
  });

  // Biggest deals first — pipeline-only rows still surface in the ordering.
  computed.sort((a, b) =>
    (b.totalContract + (b.pipelineValue ?? 0)) - (a.totalContract + (a.pipelineValue ?? 0)),
  );
  return computed;
}

export function buildRoiSummary(
  entries: RoiEntry[],
  hasRoiTab: boolean,
  rawOpportunities: RoiOpportunity[] = [],
): RoiSummary | undefined {
  if (!hasRoiTab) return undefined;
  const revenueTotal = entries.reduce((s, e) => s + (e.revenue ?? 0), 0);
  const pipelineTotal = entries.reduce((s, e) => s + (e.pipeline ?? 0), 0);
  const opportunities = computeOpportunities(rawOpportunities);
  return {
    entries,
    opportunities,
    revenueTotal,
    pipelineTotal,
    revenue: revenueTotal > 0 ? formatGBP(revenueTotal) : 'N/A',
    pipeline: pipelineTotal > 0 ? formatGBP(pipelineTotal) : 'N/A',
    revenueNote: buildDealNote(entries, 'revenue'),
    pipelineNote: buildDealNote(entries, 'pipeline'),
  };
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
  roiEntries?: RoiEntry[],
  hasRoiTab?: boolean,
  roiOpportunities?: RoiOpportunity[],
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

  // Average fleet size — only computed for sheets that capture the column.
  // Uses the full meeting set (not the time-filtered one) so the figure
  // represents the lifetime average and stays stable when the user clicks
  // between time-period pills.
  const fleetSizes = meetings
    .map((m) => m.fleetSize)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const avgFleetSize = fleetSizes.length > 0
    ? Math.round(fleetSizes.reduce((s, n) => s + n, 0) / fleetSizes.length)
    : undefined;

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
    ...(avgFleetSize !== undefined ? { avgFleetSize } : {}),
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

  // ROI summary — lifetime totals across all entries, ignores the time filter
  // because revenue/pipeline figures don't make sense filtered to "this week".
  const roi = buildRoiSummary(roiEntries ?? [], hasRoiTab ?? false, roiOpportunities ?? []);

  return {
    meetings: filteredMeetings,
    leads: filteredLeads,
    statusCounts,
    metrics,
    touchpoints,
    ...(roi ? { roi } : {}),
    ...(websiteInbounds && websiteInbounds.length > 0 ? { websiteInbounds } : {}),
    ...(availableQuarters.length > 0 ? { availableQuarters } : {}),
    lastUpdated: new Date().toISOString(),
  };
}
