import { NextResponse } from 'next/server';
import { fetchDashboardRawData } from '@/lib/sheets-api';
import { buildDashboardData } from '@/lib/utils';
import { TimePeriod } from '@/lib/types';

const VALID_PERIODS: TimePeriod[] = ['this_week', 'this_month', 'this_quarter', 'ytd', 'all_time'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'all_time') as TimePeriod;

    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }

    const { meetings, leads, touchpointRows } = await fetchDashboardRawData();
    const data = buildDashboardData(meetings, leads, period, touchpointRows);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
