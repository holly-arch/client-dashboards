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

  // Analytics tab is enabled when the Composio + GA4 env vars are both set on
  // the deployment (the /api/analytics route reads the same signal).
  const hasAnalytics = !!(process.env.COMPOSIO_API_KEY && process.env.GA4_PROPERTY_ID);

  return NextResponse.json({
    clientName,
    isGroup,
    dashboardType,
    touchpoints,
    hasAnalytics,
  });
}
