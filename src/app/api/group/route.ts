import { NextResponse } from 'next/server';
import { fetchDashboardRawData } from '@/lib/sheets-api';
import { buildDashboardData } from '@/lib/utils';
import { TimePeriod, DashboardData } from '@/lib/types';

interface ClientConfig {
  name: string;
  sheetId: string;
  url: string;
  meetingsTab?: string;
  leadsTab?: string;
}

export interface ClientData {
  name: string;
  url: string;
  data: DashboardData;
}

export interface GroupResponse {
  clients: ClientData[];
  aggregate: DashboardData;
  lastUpdated: string;
}

const STANDARD_PERIODS = new Set(['this_week', 'this_month', 'this_quarter', 'ytd', 'all_time']);
const QUARTER_PATTERN = /^q[1-4]_\d{4}$/;

function isValidPeriod(p: string): boolean {
  return STANDARD_PERIODS.has(p) || QUARTER_PATTERN.test(p);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'all_time') as TimePeriod;

    if (!isValidPeriod(period)) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }

    const groupClientsRaw = process.env.GROUP_CLIENTS;
    if (!groupClientsRaw) {
      return NextResponse.json({ error: 'GROUP_CLIENTS not configured' }, { status: 500 });
    }

    const clientConfigs: ClientConfig[] = JSON.parse(groupClientsRaw);

    // Fetch all clients in parallel
    const rawDataResults = await Promise.all(
      clientConfigs.map((c) =>
        fetchDashboardRawData(c.sheetId, c.meetingsTab, c.leadsTab)
          .then((raw) => ({ name: c.name, url: c.url, raw, error: null }))
          .catch((err) => ({ name: c.name, url: c.url, raw: null, error: err.message }))
      )
    );

    // Build per-client data and aggregate
    const clients: ClientData[] = [];
    let allMeetings: typeof rawDataResults[0]['raw'] extends null ? never : NonNullable<typeof rawDataResults[0]['raw']>['meetings'] = [];
    let allLeads: typeof rawDataResults[0]['raw'] extends null ? never : NonNullable<typeof rawDataResults[0]['raw']>['leads'] = [];

    for (const result of rawDataResults) {
      if (result.raw) {
        const data = buildDashboardData(result.raw.meetings, result.raw.leads, period);
        clients.push({ name: result.name, url: result.url, data });
        allMeetings = allMeetings.concat(result.raw.meetings);
        allLeads = allLeads.concat(result.raw.leads);
      }
    }

    // Sort clients by meetings booked descending
    clients.sort((a, b) => b.data.metrics.meetingsBooked - a.data.metrics.meetingsBooked);

    // Build aggregate from all combined meetings and leads
    const aggregate = buildDashboardData(allMeetings, allLeads, period);

    return NextResponse.json({
      clients,
      aggregate,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching group data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
