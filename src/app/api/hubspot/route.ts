import { NextResponse } from 'next/server';
import { fetchHubSpotData } from '@/lib/hubspot-api';

const ALLOWED_CLIENTS = new Set(['myBasePay']);

export async function GET() {
  const clientName = process.env.CLIENT_NAME ?? '';
  if (!ALLOWED_CLIENTS.has(clientName)) {
    return NextResponse.json({ error: 'Not enabled for this dashboard' }, { status: 404 });
  }

  try {
    const data = await fetchHubSpotData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching HubSpot data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
