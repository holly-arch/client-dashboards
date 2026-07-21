import { NextResponse } from 'next/server';
import { runReport } from '@/lib/ga-api';

// One-off GA report bundle for the myBasePay addendum. Runs 6 pre-baked
// queries and returns them all in a single response so the caller can dump
// them into a spreadsheet / write-up.
//
// Gated on COMPOSIO_API_KEY + GA4_PROPERTY_ID (same as /api/analytics).

function propertyName(): string {
  const id = process.env.GA4_PROPERTY_ID;
  if (!id) throw new Error('GA4_PROPERTY_ID is not set');
  return `properties/${id}`;
}

interface Row {
  dims: string[];
  metrics: number[];
}

function extractRows(resp: { rows?: Array<{ dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }> }): Row[] {
  return (resp.rows ?? []).map((r) => ({
    dims: (r.dimensionValues ?? []).map((v) => v.value ?? ''),
    metrics: (r.metricValues ?? []).map((v) => Number(v.value ?? '0')),
  }));
}

export async function GET() {
  if (!process.env.COMPOSIO_API_KEY || !process.env.GA4_PROPERTY_ID) {
    return NextResponse.json({ error: 'Not enabled' }, { status: 404 });
  }

  try {
    const property = propertyName();
    const twelveMonths = [{ startDate: '365daysAgo', endDate: 'today' }];

    const [
      sessionsUsersByMonth,
      sessionsByChannelByMonth,
      topLandingPages,
      keyEventsByMonth,
      keyEventsByLandingAndSource,
      topReferrals,
      usSplit,
    ] = await Promise.all([
      // 1. Sessions and total users by month, last 12 months
      runReport({
        property,
        dateRanges: twelveMonths,
        dimensions: [{ name: 'yearMonth' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ dimension: { dimensionName: 'yearMonth' } }],
      }),
      // 2. Sessions by default channel group by month
      runReport({
        property,
        dateRanges: twelveMonths,
        dimensions: [{ name: 'yearMonth' }, { name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'yearMonth' } }],
        limit: 500,
      }),
      // 3. Top 30 landing pages by sessions, with key events per page
      runReport({
        property,
        dateRanges: twelveMonths,
        dimensions: [{ name: 'landingPagePlusQueryString' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'keyEvents' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 30,
      }),
      // 4a. Key events: monthly counts, by event name
      runReport({
        property,
        dateRanges: twelveMonths,
        dimensions: [{ name: 'yearMonth' }, { name: 'eventName' }],
        metrics: [{ name: 'keyEvents' }, { name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'isKeyEvent', stringFilter: { value: 'true' } } },
        orderBys: [{ dimension: { dimensionName: 'yearMonth' } }],
        limit: 500,
      }),
      // 4b. Key events split by landing page + source
      runReport({
        property,
        dateRanges: twelveMonths,
        dimensions: [{ name: 'eventName' }, { name: 'landingPagePlusQueryString' }, { name: 'sessionSource' }],
        metrics: [{ name: 'keyEvents' }, { name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'isKeyEvent', stringFilter: { value: 'true' } } },
        orderBys: [{ metric: { metricName: 'keyEvents' }, desc: true }],
        limit: 200,
      }),
      // 5. Top 20 referral sources
      runReport({
        property,
        dateRanges: twelveMonths,
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        dimensionFilter: { filter: { fieldName: 'sessionMedium', stringFilter: { value: 'referral' } } },
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 20,
      }),
      // 6. US vs non-US users
      runReport({
        property,
        dateRanges: twelveMonths,
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
        limit: 250,
      }),
    ]);

    // Aggregate US split
    const countryRows = extractRows(usSplit);
    let usUsers = 0;
    let nonUsUsers = 0;
    let usSessions = 0;
    let nonUsSessions = 0;
    for (const r of countryRows) {
      const name = r.dims[0] ?? '';
      const users = r.metrics[0] ?? 0;
      const sessions = r.metrics[1] ?? 0;
      if (name === 'United States') {
        usUsers += users;
        usSessions += sessions;
      } else {
        nonUsUsers += users;
        nonUsSessions += sessions;
      }
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      dateRange: '365daysAgo → today',
      sessionsUsersByMonth: extractRows(sessionsUsersByMonth).map((r) => ({
        month: r.dims[0],
        sessions: r.metrics[0],
        totalUsers: r.metrics[1],
      })),
      sessionsByChannelByMonth: extractRows(sessionsByChannelByMonth).map((r) => ({
        month: r.dims[0],
        channel: r.dims[1],
        sessions: r.metrics[0],
      })),
      topLandingPages: extractRows(topLandingPages).map((r) => ({
        page: r.dims[0],
        sessions: r.metrics[0],
        totalUsers: r.metrics[1],
        keyEvents: r.metrics[2],
      })),
      keyEventsByMonth: extractRows(keyEventsByMonth).map((r) => ({
        month: r.dims[0],
        eventName: r.dims[1],
        keyEvents: r.metrics[0],
        eventCount: r.metrics[1],
      })),
      keyEventsByLandingAndSource: extractRows(keyEventsByLandingAndSource).map((r) => ({
        eventName: r.dims[0],
        landingPage: r.dims[1],
        source: r.dims[2],
        keyEvents: r.metrics[0],
        eventCount: r.metrics[1],
      })),
      topReferrals: extractRows(topReferrals).map((r) => ({
        source: r.dims[0],
        sessions: r.metrics[0],
        totalUsers: r.metrics[1],
      })),
      usSplit: {
        us: { users: usUsers, sessions: usSessions },
        nonUs: { users: nonUsUsers, sessions: nonUsSessions },
      },
    });
  } catch (error) {
    console.error('analytics-report error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
