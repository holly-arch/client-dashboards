import { NextResponse } from 'next/server';
import { fetchTranscendRawData } from '@/lib/transcend-sheets';
import { TranscendDashboardData, TimePeriod } from '@/lib/transcend-types';

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const period = (url.searchParams.get('period') as TimePeriod) || 'all_time';
    const endClient = url.searchParams.get('endClient') || '';

    const { campaigns, leads, negativeReplies } = await fetchTranscendRawData();

    // Distinct end-clients for the dropdown — from campaigns, sorted alphabetically
    const endClients = [...new Set(campaigns.map((c) => c.clientName).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    // Filter campaigns by launch date (period) and end-client
    const range = getDateRange(period);
    let filteredCampaigns = campaigns.filter((c) => inRange(c.launchDate, range));
    if (endClient) {
      filteredCampaigns = filteredCampaigns.filter((c) => c.clientName === endClient);
    }

    // Join leads & negative replies to campaigns by campaign name (and end-client if set)
    const campaignNameSet = new Set(filteredCampaigns.map((c) => c.campaignName));
    let filteredLeads = leads.filter((l) => campaignNameSet.has(l.campaignName));
    let filteredNeg = negativeReplies;
    if (endClient) {
      filteredLeads = filteredLeads.filter((l) => l.clientName === endClient);
      filteredNeg = filteredNeg.filter((n) => n.clientName === endClient);
    }
    // Negative Replies sheet doesn't have campaign name, so we filter by end-client only when set.
    // When period filter narrows campaigns, we also narrow neg replies to those whose clientName has
    // at least one campaign in the filtered set — avoids showing unrelated replies.
    if (range) {
      const clientsInRange = new Set(filteredCampaigns.map((c) => c.clientName));
      filteredNeg = filteredNeg.filter((n) => clientsInRange.has(n.clientName));
    }

    // KPIs
    const openRates = filteredCampaigns.map((c) => c.openRate).filter((r): r is number => r !== null);
    const clickRates = filteredCampaigns.map((c) => c.clickRate).filter((r): r is number => r !== null);
    const bounceRates = filteredCampaigns.map((c) => c.bounceRate).filter((r): r is number => r !== null);

    const kpis = {
      totalCampaigns: filteredCampaigns.length,
      totalEmailsSent: filteredCampaigns.reduce((s, c) => s + c.emailsSent, 0),
      totalReplies: filteredCampaigns.reduce((s, c) => s + c.totalReplies, 0),
      positiveReplies: filteredCampaigns.reduce((s, c) => s + c.positiveReplies, 0),
      avgOpenRate: avg(openRates),
      avgClickRate: avg(clickRates),
      avgBounceRate: avg(bounceRates),
    };

    const data: TranscendDashboardData = {
      campaigns: filteredCampaigns,
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
