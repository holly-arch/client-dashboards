import { NextResponse } from 'next/server';
import { fetchTouchpoints } from '@/lib/sheets-api';

export async function GET() {
  const clientName = process.env.CLIENT_NAME || 'Client';
  const isGroup = !!process.env.GROUP_CLIENTS;
  const isTranscend = clientName === 'Transcend Consulting';
  const dashboardType: 'standard' | 'group' | 'transcend' = isGroup
    ? 'group'
    : isTranscend
    ? 'transcend'
    : 'standard';

  // Touchpoints only relevant for standard dashboards — skip the fetch for others.
  const touchpoints = dashboardType === 'standard' ? await fetchTouchpoints() : null;

  return NextResponse.json({
    clientName,
    isGroup,
    dashboardType,
    touchpoints,
  });
}
