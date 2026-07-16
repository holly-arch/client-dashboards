import { NextResponse } from 'next/server';
import { fetchDashboardRawData, shiftDatesToToday } from '@/lib/sheets-api';
import { buildDashboardData } from '@/lib/utils';
import { fetchMeetingEnrichment } from '@/lib/hubspot-api';
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
      raw.lytxInbounds,
    );

    // Best-effort HubSpot enrichment of meetings for clients with the
    // integration wired up (currently myBasePay). Silently skipped on error
    // so the main dashboard still renders if HubSpot is unreachable.
    if (process.env.CLIENT_NAME === 'myBasePay' && process.env.COMPOSIO_API_KEY && data.meetings.length > 0) {
      try {
        const names = data.meetings.map((m) => {
          const parts = m.contactName.trim().split(/\s+/);
          return {
            firstName: parts[0] ?? '',
            lastName: parts.slice(1).join(' '),
          };
        });
        const enrichment = await fetchMeetingEnrichment(names);
        data.meetings = data.meetings.map((m) => {
          const parts = m.contactName.trim().split(/\s+/);
          const key = `${(parts[0] ?? '').toLowerCase()} ${parts.slice(1).join(' ').toLowerCase()}`;
          const extra = enrichment.get(key);
          if (!extra) return m;
          return {
            ...m,
            ...(extra.contactUrl ? { hubspotContactUrl: extra.contactUrl } : {}),
            ...(extra.owner ? { hubspotOwner: extra.owner } : {}),
            ...(extra.lastContactedIso ? { lastContactedIso: extra.lastContactedIso } : {}),
          };
        });
      } catch (e) {
        console.error('[opportunities] HubSpot enrichment failed:', e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
