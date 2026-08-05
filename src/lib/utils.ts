import { MeetingRecord, LeadRecord, TouchpointRow, WebsiteInboundRecord, WarmLeadRecord, WebinarRegistrant, LytxInboundRecord, RoiEntry, RoiOpportunity, RoiSummary, RoiTotals, DashboardData, DashboardMetrics, TimePeriod, QuarterOption, QuarterPeriod } from './types';

const QUARTER_PATTERN = /^q([1-4])_(\d{4})$/;

export function getDateRange(period: TimePeriod): { start: Date; end: Date } | null {
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

export function isInRange(dateStr: string, range: { start: Date; end: Date } | null): boolean {
  if (!range) return true; // All Time - include everything
  if (!dateStr) return false; // No date - only show in All Time
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

// Returns true if the given (year, 0-indexed month) falls inside the period.
// Used to filter ROI monthly cells when the user picks a time range on the
// ROI tab. all_time = always true. this_week is treated as the current month
// for ROI purposes (per-day billing doesn't apply).
function monthInPeriod(year: number, month: number, period: TimePeriod): boolean {
  if (period === 'all_time') return true;
  const q = period.match(QUARTER_PATTERN);
  if (q) {
    const qNum = parseInt(q[1]);
    const qYear = parseInt(q[2]);
    if (year !== qYear) return false;
    const startMonth = (qNum - 1) * 3;
    return month >= startMonth && month <= startMonth + 2;
  }
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  switch (period) {
    case 'this_week':
    case 'this_month':
      return year === nowYear && month === nowMonth;
    case 'this_quarter': {
      const startMonth = Math.floor(nowMonth / 3) * 3;
      return year === nowYear && month >= startMonth && month <= startMonth + 2;
    }
    case 'ytd':
      return year === nowYear && month <= nowMonth;
  }
  return false;
}

// Months between two ISO dates, rounded to the nearest whole month. Used for
// the ROI cycle column (first meeting sat -> first invoice billed). Returns
// undefined when either date is missing or unparseable.
const AVG_MONTH_MS = 30.4375 * 24 * 60 * 60 * 1000; // 365.25 / 12 days in ms
function monthsBetween(a: string | undefined, b: string | undefined): number | undefined {
  if (!a || !b) return undefined;
  const aMs = new Date(a).getTime();
  const bMs = new Date(b).getTime();
  if (isNaN(aMs) || isNaN(bMs)) return undefined;
  const diff = Math.abs(bMs - aMs);
  return Math.max(0, Math.round(diff / AVG_MONTH_MS));
}

// Derive an implicit "first billed date" from the earliest monthly cell that
// has a positive amount. Used when the ROI sheet doesn't carry an explicit
// First Billed Date column - the first month with revenue is a good proxy.
// Anchored to the 1st of that month.
function deriveFirstBilledFromMonthly(monthly: { year: number; month: number; amount: number }[]): string | undefined {
  const withValue = monthly.filter((m) => m.amount > 0);
  if (withValue.length === 0) return undefined;
  const earliest = withValue.reduce((a, b) =>
    a.year * 12 + a.month <= b.year * 12 + b.month ? a : b,
  );
  return new Date(Date.UTC(earliest.year, earliest.month, 1)).toISOString();
}

// One sheet row = one opportunity. Same-name rows stay distinct so a deal that
// has both a Pipeline Value row and a Contract row (e.g. Trust Hire's YTL)
// renders as two separate rows on the dashboard (one in Revenue, one in
// Pipeline). Billed counts only the monthly cells whose (year, month) falls
// inside the selected period AND are past-or-current (using today as the
// cutoff). Cycle counts whole months between First Meeting Date and First
// Billed Date; First Billed Date is read from the sheet if present, otherwise
// derived from the earliest monthly cell with a positive amount.
function computeOpportunities(rows: RoiOpportunity[], period: TimePeriod): RoiOpportunity[] {
  const now = new Date();
  const todayKey = now.getFullYear() * 12 + now.getMonth();

  const computed = rows.map((r) => {
    const monthsSum = r.monthly.reduce((s, m) => s + m.amount, 0);
    const inPeriod = r.monthly.filter((m) => monthInPeriod(m.year, m.month, period));
    const pastSum = inPeriod
      .filter((m) => m.year * 12 + m.month <= todayKey)
      .reduce((s, m) => s + m.amount, 0);
    const totalContract = r.totalContractValue ?? r.annualContractValue ?? monthsSum;
    const firstBilledDate = r.firstBilledDate ?? deriveFirstBilledFromMonthly(r.monthly);
    const cycleMonths = monthsBetween(r.firstMeetingDate, firstBilledDate);

    // Gross margin rate is implicit in the sheet: rate = averageGrossMargin / totalContractValue.
    // Applying that rate to any period's billed figure gives the period-aware margin.
    // all_time uses the sheet value verbatim to avoid rounding drift on partial monthly data.
    const rateBase = r.totalContractValue ?? r.annualContractValue;
    const grossMarginRate = r.averageGrossMargin !== undefined && rateBase && rateBase > 0
      ? r.averageGrossMargin / rateBase
      : undefined;
    const grossMarginInPeriod = r.averageGrossMargin === undefined
      ? undefined
      : period === 'all_time'
        ? r.averageGrossMargin
        : grossMarginRate !== undefined
          ? pastSum * grossMarginRate
          : undefined;

    return {
      ...r,
      totalContract,
      billed: pastSum,
      ...(firstBilledDate ? { firstBilledDate } : {}),
      ...(cycleMonths !== undefined ? { cycleMonths } : {}),
      ...(grossMarginRate !== undefined ? { grossMarginRate } : {}),
      ...(grossMarginInPeriod !== undefined ? { grossMarginInPeriod } : {}),
    };
  });

  // Biggest deals first. Pipeline-only rows still surface in the ordering.
  computed.sort((a, b) =>
    (b.totalContract + (b.pipelineValue ?? 0)) - (a.totalContract + (a.pipelineValue ?? 0)),
  );
  return computed;
}

// Human label for the "Total {period} CV" tile. Reflects the current filter.
function periodLabelForCv(period: TimePeriod): string {
  if (period === 'all_time') return 'Total All Time Contract Value';
  const q = period.match(QUARTER_PATTERN);
  if (q) return `Total Q${q[1]} ${q[2]} CV`;
  switch (period) {
    case 'this_week': return 'Total This Week CV';
    case 'this_month': return 'Total This Month CV';
    case 'this_quarter': return 'Total This Quarter CV';
    case 'ytd': return 'Total YTD CV';
  }
  return 'Total CV';
}

// "Closed" = the deal has actually been invoiced. Firm signal: firstBilledDate
// is set AND on or before today. A contract value on its own doesn't count -
// nothing's landed until real money has been billed. First Billed Date can be
// either an explicit sheet column or the earliest monthly cell with a positive
// amount (computed in deriveFirstBilledFromMonthly).
function isClosedOpportunity(o: RoiOpportunity, todayMs: number): boolean {
  if (!o.firstBilledDate) return false;
  const billedMs = new Date(o.firstBilledDate).getTime();
  return !isNaN(billedMs) && billedMs <= todayMs;
}

export function buildRoiSummary(
  entries: RoiEntry[],
  hasRoiTab: boolean,
  rawOpportunities: RoiOpportunity[] = [],
  period: TimePeriod = 'all_time',
  meetingsBookedCount = 0,
): RoiSummary | undefined {
  if (!hasRoiTab) return undefined;
  const opportunities = computeOpportunities(rawOpportunities, period);

  // Period-aware 12-Month CV. all_time keeps the original "sum of
  // annualContractValue" behaviour so the default view is unchanged. Any
  // specific period sums the monthly cells that fall inside it.
  const annual12moContract = period === 'all_time'
    ? opportunities.reduce((s, o) => s + (o.annualContractValue ?? 0), 0)
    : opportunities.reduce((s, o) => {
        const inPeriod = o.monthly.filter((m) => monthInPeriod(m.year, m.month, period));
        return s + inPeriod.reduce((ms, m) => ms + m.amount, 0);
      }, 0);

  const todayMs = Date.now();
  const closedCount = opportunities.filter((o) => isClosedOpportunity(o, todayMs)).length;
  const conversionPct = meetingsBookedCount > 0
    ? (closedCount / meetingsBookedCount) * 100
    : 0;

  // Gross margin totals. Only opps whose sheet has an Average Gross Margin
  // cell contribute. Average is per-opp mean across the same set (opps that
  // *have* a margin rate but happen to have zero period billing still count
  // as £0 in the mean - otherwise the average balloons when only 1-2 opps
  // have billed in the current quarter).
  const marginOpps = opportunities.filter((o) => o.averageGrossMargin !== undefined);
  const totalGrossMargin = marginOpps.reduce((s, o) => s + (o.grossMarginInPeriod ?? 0), 0);
  const avgGrossMarginPerOpp = marginOpps.length > 0
    ? totalGrossMargin / marginOpps.length
    : 0;
  const hasGrossMargin = marginOpps.length > 0;

  const totals: RoiTotals = {
    annual12moContract,
    annual12moContractLabel: periodLabelForCv(period),
    totalContractValue: opportunities.reduce((s, o) => s + (o.totalContractValue ?? o.annualContractValue ?? 0), 0),
    totalBilled: opportunities.reduce((s, o) => s + o.billed, 0),
    totalPipeline: opportunities.reduce((s, o) => s + (o.pipelineValue ?? 0), 0),
    meetingsBooked: meetingsBookedCount,
    closedCount,
    conversionPct,
    totalGrossMargin,
    avgGrossMarginPerOpp,
    hasGrossMargin,
  };
  const revenueTotal = opportunities.reduce((s, o) => s + o.totalContract, 0);
  const pipelineTotal = totals.totalPipeline;
  return {
    entries,
    opportunities,
    totals,
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
  warmLeads?: WarmLeadRecord[],
  webinarRegistrants?: WebinarRegistrant[],
  lytxInbounds?: LytxInboundRecord[],
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

  // Average fleet size - only computed for sheets that capture the column.
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

  // Filter and sum touchpoints if provided - only include channels that were
  // actually present on the sheet (some clients only track Calls, for example).
  //
  // A touchpoint row represents an entire 7-day span (Sun-Sat or Mon-Sun,
  // whichever the client's sheet uses), not a single day. So a row "in range"
  // is one whose 7-day span overlaps the selected period - not just one whose
  // start date sits inside it. Without this, a Sunday-dated row for the
  // current week gets excluded by This Week (starts Monday) and This Month
  // (starts on the 1st) because the point comparison fails.
  //
  // Also hide the card entirely when the selected period starts BEFORE the
  // earliest week's END - otherwise a "This Year"-style filter would silently
  // underreport by summing only the weeks that happen to be filled in and
  // ignoring the un-tracked ones.
  let touchpoints: { calls?: number; linkedin?: number; email?: number } | undefined;
  if (touchpointRows && touchpointRows.length > 0) {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const weekOverlapsRange = (weekIso: string): boolean => {
      if (!range) return true;
      if (!weekIso) return false;
      const weekStart = new Date(weekIso).getTime();
      if (isNaN(weekStart)) return false;
      const weekEnd = weekStart + WEEK_MS;
      return weekEnd > range.start.getTime() && weekStart <= range.end.getTime();
    };

    const weekStartTimes = touchpointRows
      .map((t) => new Date(t.week).getTime())
      .filter((n) => !isNaN(n));
    const earliestWeekEnd = weekStartTimes.length > 0 ? Math.min(...weekStartTimes) + WEEK_MS : null;
    const periodStartsBeforeData =
      range !== null && earliestWeekEnd !== null && range.start.getTime() < earliestWeekEnd - WEEK_MS;

    if (!periodStartsBeforeData) {
      const filtered = touchpointRows.filter((t) => weekOverlapsRange(t.week));
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
  }

  // Available quarters derived from the unfiltered raw inputs so the filter list
  // is stable regardless of which period is currently selected.
  const availableQuarters = deriveAvailableQuarters(meetings, leads);

  // ROI summary. Total Contract Value / Pipeline stay time-independent. Billed
  // and the new 12-Month CV honour `period` so the ROI tab's time filter
  // scopes them to the selected quarter / YTD / etc. Meetings-booked count
  // is passed in so the summary can compute the Meeting -> Closed conversion.
  const roi = buildRoiSummary(roiEntries ?? [], hasRoiTab ?? false, roiOpportunities ?? [], period, metrics.meetingsBooked);

  return {
    meetings: filteredMeetings,
    leads: filteredLeads,
    statusCounts,
    metrics,
    touchpoints,
    ...(roi ? { roi } : {}),
    ...(websiteInbounds && websiteInbounds.length > 0 ? { websiteInbounds } : {}),
    ...(warmLeads && warmLeads.length > 0 ? { warmLeads } : {}),
    ...(webinarRegistrants && webinarRegistrants.length > 0 ? { webinarRegistrants } : {}),
    ...(lytxInbounds && lytxInbounds.length > 0 ? { lytxInbounds } : {}),
    ...(availableQuarters.length > 0 ? { availableQuarters } : {}),
    lastUpdated: new Date().toISOString(),
  };
}
