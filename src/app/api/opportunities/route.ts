import { NextResponse } from 'next/server';
import { fetchDashboardRawData } from '@/lib/sheets-api';
import { buildDashboardData } from '@/lib/utils';
import { TimePeriod } from '@/lib/types';

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

    const { meetings, leads, touchpointRows, websiteInbounds } = await fetchDashboardRawData();
    const data = buildDashboardData(meetings, leads, period, touchpointRows, websiteInbounds);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
