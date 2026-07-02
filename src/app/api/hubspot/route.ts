import { NextResponse } from 'next/server';
import { fetchHubSpotData } from '@/lib/hubspot-api';

const ALLOWED_CLIENTS = new Set(['myBasePay']);

export async function GET(request: Request) {
  const clientName = process.env.CLIENT_NAME ?? '';
  if (!ALLOWED_CLIENTS.has(clientName)) {
    return NextResponse.json({ error: 'Not enabled for this dashboard' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === '1';

  try {
    const data = await fetchHubSpotData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching HubSpot data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = debug && error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}
