import { Composio } from '@composio/core';

const COMPOSIO_USER_ID = 'mybasepay';

type GaDateRange = '7d' | '30d' | '90d';

interface GaReportRow {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
}

interface GaReportResponse {
  rows?: GaReportRow[];
  rowCount?: number;
}

export interface AnalyticsKpis {
  sessions: number;
  users: number;
  pageViews: number;
  avgSessionDurationSeconds: number;
}

export interface AnalyticsRow {
  label: string;
  sessions: number;
}

export interface CountryRow {
  name: string;
  activeUsers: number;
}

export interface AnalyticsData {
  kpis: AnalyticsKpis;
  topPages: AnalyticsRow[];
  topSources: AnalyticsRow[];
  countries: CountryRow[];
  range: GaDateRange;
}

let cachedClient: Composio | null = null;

function client(): Composio {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error('COMPOSIO_API_KEY is not set');
  if (!cachedClient) cachedClient = new Composio({ apiKey });
  return cachedClient;
}

function startDate(range: GaDateRange): string {
  if (range === '7d') return '7daysAgo';
  if (range === '90d') return '90daysAgo';
  return '30daysAgo';
}

function num(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function runReport(args: Record<string, unknown>): Promise<GaReportResponse> {
  const composio = client();
  // The Composio SDK returns { successful, data, error } — unwrap to the raw GA response.
  // Composio's manual execute() rejects `version: 'latest'` unless dangerouslySkipVersionCheck
  // is true (their guard against silently picking up breaking toolkit changes). The response
  // shape we parse is Google's GA4 Data API, not Composio's wrapper schema, so the skip is
  // genuinely safe here — we'd be insulated even if Composio re-released the toolkit.
  const result = (await composio.tools.execute('GOOGLE_ANALYTICS_RUN_REPORT', {
    userId: COMPOSIO_USER_ID,
    arguments: args,
    dangerouslySkipVersionCheck: true,
  })) as { successful?: boolean; data?: GaReportResponse; error?: string | null };
  if (result?.successful === false) {
    throw new Error(`GA RunReport failed: ${result.error ?? 'unknown error'}`);
  }
  return result?.data ?? {};
}

export async function fetchAnalytics(range: GaDateRange = '30d'): Promise<AnalyticsData> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) throw new Error('GA4_PROPERTY_ID is not set');
  const property = `properties/${propertyId}`;
  const dateRanges = [{ startDate: startDate(range), endDate: 'today' }];

  const [kpiReport, pagesReport, sourcesReport, countriesReport] = await Promise.all([
    runReport({
      property,
      dateRanges,
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
      ],
    }),
    runReport({
      property,
      dateRanges,
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'sessions' }],
      limit: 10,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),
    runReport({
      property,
      dateRanges,
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }],
      limit: 10,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),
    runReport({
      property,
      dateRanges,
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 250,
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    }),
  ]);

  const kpiRow = kpiReport.rows?.[0];
  const kpiValues = kpiRow?.metricValues ?? [];
  const kpis: AnalyticsKpis = {
    sessions: num(kpiValues[0]?.value),
    users: num(kpiValues[1]?.value),
    pageViews: num(kpiValues[2]?.value),
    avgSessionDurationSeconds: num(kpiValues[3]?.value),
  };

  const topPages: AnalyticsRow[] = (pagesReport.rows ?? []).map((r) => ({
    label: r.dimensionValues?.[0]?.value ?? '—',
    sessions: num(r.metricValues?.[0]?.value),
  }));

  const topSources: AnalyticsRow[] = (sourcesReport.rows ?? []).map((r) => ({
    label: r.dimensionValues?.[0]?.value ?? '—',
    sessions: num(r.metricValues?.[0]?.value),
  }));

  const countries: CountryRow[] = (countriesReport.rows ?? [])
    .map((r) => ({
      name: r.dimensionValues?.[0]?.value ?? '',
      activeUsers: num(r.metricValues?.[0]?.value),
    }))
    .filter((c) => c.name && c.name !== '(not set)');

  return { kpis, topPages, topSources, countries, range };
}
