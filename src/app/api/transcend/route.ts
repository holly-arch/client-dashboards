import { NextResponse } from 'next/server';
import { fetchTranscendRawData } from '@/lib/transcend-sheets';
import { TranscendDashboardData, TimePeriod, SendsRow } from '@/lib/transcend-types';

function getDateRange(period: TimePeriod): { start: Date; end: Date } | null {
  if (period === 'all_time') return null;
  const now = new Date();
  const start = new Date();
  switch (period) {
    case 'this_week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      start.setMonth(q * 3, 1);
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

function inRange(iso: string | null, range: { start: Date; end: Date } | null): boolean {
  if (!range) return true;
  if (!iso) return false;
  const d = new Date(iso);
  return d >= range.start && d <= range.end;
}

function avg(values: number[]): number | null {
  const valid = values.filter((v) => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// Returns the date of the Monday (UTC-stable) for the week containing the
// given date. Used to match against the Number of Sends tab's Monday rows.
function mondayOf(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay(); // 0=Sun .. 6=Sat
  const diff = day === 0 ? 6 : day - 1;
  out.setDate(out.getDate() - diff);
  return out;
}

// Pre-tracking baseline: total emails sent across all campaigns launched
// before the Number of Sends tab existed. Holly can't backdate per-week rows,
// so we add this lump sum to any period whose range overlaps with the
// pre-cutoff window. Snapshot taken 2026-05-29; cutoff is the Monday of the
// first tracked week (2026-05-25).
const HISTORICAL_BASELINE_EMAILS = 16184;
const HISTORICAL_BASELINE_CUTOFF = new Date('2026-05-25T00:00:00');

function shouldIncludeHistoricalBaseline(period: TimePeriod, range: { start: Date; end: Date } | null): boolean {
  if (period === 'all_time') return true;
  if (!range) return true;
  return range.start < HISTORICAL_BASELINE_CUTOFF;
}

function sumSendsInPeriod(rows: SendsRow[], period: TimePeriod, range: { start: Date; end: Date } | null): number {
  if (period === 'this_week') {
    const monday = mondayOf(new Date()).getTime();
    return rows
      .filter((r) => new Date(r.week).getTime() === monday)
      .reduce((s, r) => s + r.sends, 0);
  }
  if (!range) {
    // all_time
    return rows.reduce((s, r) => s + r.sends, 0);
  }
  return rows
    .filter((r) => {
      const t = new Date(r.week).getTime();
      return t >= range.start.getTime() && t <= range.end.getTime();
    })
    .reduce((s, r) => s + r.sends, 0);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const period = (url.searchParams.get('period') as TimePeriod) || 'all_time';
    const endClient = url.searchParams.get('endClient') || '';

    const { campaigns, leads, negativeReplies, sends } = await fetchTranscendRawData();
    const range = getDateRange(period);

    // Distinct end-clients for the dropdown — from campaigns, sorted alphabetically
    const endClients = [...new Set(campaigns.map((c) => c.clientName).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    // Active Campaigns table — filtered by Status column (Active only), not by time.
    let activeCampaigns = campaigns.filter((c) => (c.status || '').trim().toLowerCase() === 'active');
    if (endClient) {
      activeCampaigns = activeCampaigns.filter((c) => c.clientName === endClient);
    }

    // Campaigns launched in the selected period — only used for the time-driven KPIs
    // (replies, positive replies, rates). NOT shown in the table.
    let launchedInPeriod = campaigns.filter((c) => inRange(c.launchDate, range));
    if (endClient) {
      launchedInPeriod = launchedInPeriod.filter((c) => c.clientName === endClient);
    }

    // Lead Tracking + Negative Replies — show every row, only narrowed by end-client.
    const filteredLeads = endClient ? leads.filter((l) => l.clientName === endClient) : leads;
    const filteredNeg = endClient ? negativeReplies.filter((n) => n.clientName === endClient) : negativeReplies;

    // KPIs
    const openRates = launchedInPeriod.map((c) => c.openRate).filter((r): r is number => r !== null);
    const clickRates = launchedInPeriod.map((c) => c.clickRate).filter((r): r is number => r !== null);
    const bounceRates = launchedInPeriod.map((c) => c.bounceRate).filter((r): r is number => r !== null);

    const kpis = {
      totalCampaigns: activeCampaigns.length,
      totalEmailsSent:
        sumSendsInPeriod(sends, period, range) +
        (shouldIncludeHistoricalBaseline(period, range) ? HISTORICAL_BASELINE_EMAILS : 0),
      totalReplies: launchedInPeriod.reduce((s, c) => s + c.totalReplies, 0),
      positiveReplies: launchedInPeriod.reduce((s, c) => s + c.positiveReplies, 0),
      avgOpenRate: avg(openRates),
      avgClickRate: avg(clickRates),
      avgBounceRate: avg(bounceRates),
    };

    const data: TranscendDashboardData = {
      campaigns: activeCampaigns,
      leads: filteredLeads,
      negativeReplies: filteredNeg,
      endClients,
      kpis,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
