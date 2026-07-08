import { NextResponse } from 'next/server';
import { fetchAnalytics } from '@/lib/ga-api';

const ALLOWED_RANGES = new Set(['7d', '30d', '90d']);

// Enabled for any client whose deployment has BOTH env vars set. Any new
// client just needs COMPOSIO_API_KEY + GA4_PROPERTY_ID on Vercel + a
// Composio 'user' connection matching the CLIENT_NAME (or an explicit
// COMPOSIO_USER_ID override).
function analyticsEnabled(): boolean {
  return !!(process.env.COMPOSIO_API_KEY && process.env.GA4_PROPERTY_ID);
}

export async function GET(request: Request) {
  if (!analyticsEnabled()) {
    return NextResponse.json({ error: 'Not enabled for this dashboard' }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range') ?? '30d';
    const range = (ALLOWED_RANGES.has(rangeParam) ? rangeParam : '30d') as '7d' | '30d' | '90d';

    const data = await fetchAnalytics(range);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
