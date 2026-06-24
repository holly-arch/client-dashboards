import { NextResponse } from 'next/server';
import { fetchStorfundData } from '@/lib/storfund-sheets';
import { TimePeriod } from '@/lib/types';

const STANDARD_PERIODS = new Set(['this_week', 'this_month', 'this_quarter', 'ytd', 'all_time']);
const QUARTER_PATTERN = /^q[1-4]_\d{4}$/;

function isValidPeriod(p: string): boolean {
  return STANDARD_PERIODS.has(p) || QUARTER_PATTERN.test(p);
}

// Gated to Storfund only (and to anyone visiting the /v2 preview route on a
// deployment that has STORFUND_DATA_SHEET_ID set, so we can develop against
// staging without flipping CLIENT_NAME).
function isAllowed(): boolean {
  const clientName = process.env.CLIENT_NAME ?? '';
  if (clientName === 'Storfund') return true;
  // Allow preview on any deployment that's explicitly opted in via the env var.
  if (process.env.STORFUND_DATA_SHEET_ID) return true;
  return false;
}

export async function GET(request: Request) {
  if (!isAllowed()) {
    return NextResponse.json({ error: 'Not enabled for this dashboard' }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period') || 'this_month';
    if (!isValidPeriod(periodParam)) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }
    const period = periodParam as TimePeriod;

    const data = await fetchStorfundData(period);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Storfund data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
