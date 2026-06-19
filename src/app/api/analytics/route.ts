import { NextResponse } from 'next/server';
import { fetchAnalytics } from '@/lib/ga-api';

const ALLOWED_RANGES = new Set(['7d', '30d', '90d']);
const ALLOWED_CLIENTS = new Set(['myBasePay']);

export async function GET(request: Request) {
  const clientName = process.env.CLIENT_NAME ?? '';
  if (!ALLOWED_CLIENTS.has(clientName)) {
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
