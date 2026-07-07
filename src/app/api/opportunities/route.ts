import { NextResponse } from 'next/server';
import { fetchDashboardRawData, shiftDatesToToday } from '@/lib/sheets-api';
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

    let raw = await fetchDashboardRawData();

    if (searchParams.get('debug') === 'webinar') {
      const { fetchSheet } = await import('@/lib/sheets-api');
      const sheetId = process.env.WEBINAR_SHEET_ID;
      const tab = process.env.WEBINAR_TAB || 'Sheet1';
      if (!sheetId) return NextResponse.json({ error: 'No WEBINAR_SHEET_ID' });
      const rows = await fetchSheet(sheetId, tab);
      return NextResponse.json({
        totalRows: rows.length,
        row0: rows[0],
        row1: rows[1],
        row2: rows[2],
        row3: rows[3],
        headerRowCandidates: rows.slice(0, 5).map((r, i) => ({ i, cellCount: r.length, sample: r.slice(0, 15) })),
      });
    }
    // Rolling demo dates — opt-in either via CLIENT_NAME=Demo (legacy) or the
    // explicit IS_DEMO=true env var (so the displayed clientName can be a
    // fake brand like "Acme Corp" while still keeping the dates fresh).
    if (process.env.CLIENT_NAME === 'Demo' || process.env.IS_DEMO === 'true') {
      raw = shiftDatesToToday(raw);
    }
    const data = buildDashboardData(
      raw.meetings,
      raw.leads,
      period,
      raw.touchpointRows,
      raw.websiteInbounds,
      raw.roiEntries,
      raw.hasRoiTab,
      raw.roiOpportunities,
      raw.warmLeads,
      raw.webinarRegistrants,
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
