import { fetchSheet, parseDate } from './sheets-api';
import { getDateRange, isInRange } from './utils';
import { TimePeriod } from './types';
import {
  StorfundV2Data,
  WorkstreamRow,
  ContentRow,
  AssetRow,
  OutreachRow,
  DataMetricRow,
  TimelineRow,
  ActivityKpis,
} from './storfund-types';

const TAB_WORKSTREAMS = 'Workstreams';
const TAB_CONTENT = 'Content';
const TAB_ASSETS = 'Assets';
const TAB_OUTREACH = 'Outreach';
const TAB_DATA = 'Data';
const TAB_TIMELINE = 'Timeline';
const TAB_SOCIAL = 'SocialReach';

// Fuzzy lookup: returns column index for the first header in `candidates`
// that appears (case-insensitive, trimmed) in `headers`. -1 if none match.
function findIdx(headers: string[], candidates: string[]): number {
  const lower = headers.map((h) => (h || '').toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

function getCell(row: string[], idx: number): string {
  if (idx < 0 || idx >= row.length) return '';
  return (row[idx] ?? '').toString().trim();
}

function parseNumber(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[£$,\s]/g, '').trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Wrap fetchSheet to return [] gracefully when a tab doesn't exist yet —
// keeps the v2 dashboard rendering empty states instead of erroring while the
// sheet is being populated.
async function safeFetchSheet(sheetId: string, tab: string): Promise<string[][]> {
  try {
    return await fetchSheet(sheetId, tab);
  } catch {
    return [];
  }
}

function parseWorkstreams(rows: string[][]): WorkstreamRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const idx = {
    workstream: findIdx(headers, ['workstream', 'name', 'area']),
    status: findIdx(headers, ['status', 'state']),
    owner: findIdx(headers, ['owner', 'lead', 'responsible']),
    note: findIdx(headers, ['note', 'notes', 'detail', 'comment']),
    lastUpdated: findIdx(headers, ['last_updated', 'last updated', 'updated', 'date']),
  };
  const out: WorkstreamRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = getCell(r, idx.workstream);
    if (!name) continue;
    out.push({
      workstream: name,
      status: getCell(r, idx.status),
      owner: getCell(r, idx.owner),
      note: getCell(r, idx.note),
      lastUpdated: getCell(r, idx.lastUpdated),
    });
  }
  return out;
}

function parseContent(rows: string[][]): ContentRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const idx = {
    date: findIdx(headers, ['date', 'published', 'scheduled date']),
    channel: findIdx(headers, ['channel', 'platform', 'page']),
    pillar: findIdx(headers, ['pillar', 'theme', 'category']),
    title: findIdx(headers, ['title', 'topic', 'post', 'headline']),
    status: findIdx(headers, ['status', 'state']),
    link: findIdx(headers, ['link', 'url']),
  };
  const out: ContentRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const title = getCell(r, idx.title);
    if (!title) continue;
    out.push({
      date: parseDate(getCell(r, idx.date)) ?? '',
      channel: getCell(r, idx.channel),
      pillar: getCell(r, idx.pillar),
      title,
      status: getCell(r, idx.status),
      link: getCell(r, idx.link),
    });
  }
  return out;
}

const MONTH_NAME_IDX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Parses Storfund's "Month X (June)" date label → ISO date string anchored
// to the 15th of that month in the current calendar year. Empty / unparseable
// labels return '' so the row passes the "All Time" filter but is hidden by
// time-bound pills (this_week / this_month / etc.) — same convention as
// real meeting rows with no date.
function parseMonthLabel(label: string): string {
  if (!label) return '';
  const m = label.match(/\(([a-z]+)\)/i);
  if (!m) return '';
  const monthIdx = MONTH_NAME_IDX[m[1].toLowerCase().slice(0, 3)];
  if (monthIdx === undefined) return '';
  const year = new Date().getFullYear();
  // Use UTC noon to dodge any timezone edge-cases when isInRange compares.
  return new Date(Date.UTC(year, monthIdx, 15, 12, 0, 0)).toISOString();
}

// Two shapes supported:
//   (a) Brief schema: date | asset | type | status | link  (Gareth's planned schema)
//   (b) Storfund's existing Content Tracker:
//         Date: | <asset title col, usually month> | Approval | Document/Link |
//         Updated Document | Comments
//       In (b), Type is encoded as in-table section header rows (rows where
//       col A is empty and col B holds the type word — Guide, Video, Photo,
//       etc.). We track the most-recently-seen type and apply it to the
//       asset rows that follow until the next type-header row.
function parseAssets(rows: string[][]): AssetRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const lowerHeaders = headers.map((h) => (h || '').toLowerCase().replace(/[:]/g, '').trim());

  const isContentTracker = lowerHeaders.includes('document/link') || lowerHeaders.includes('updated document');
  if (isContentTracker) return parseAssetsContentTracker(rows, lowerHeaders);

  const idx = {
    date: findIdx(headers, ['date', 'created']),
    asset: findIdx(headers, ['asset', 'name', 'title']),
    type: findIdx(headers, ['type', 'format']),
    status: findIdx(headers, ['status', 'state']),
    link: findIdx(headers, ['link', 'url']),
  };
  const out: AssetRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = getCell(r, idx.asset);
    if (!name) continue;
    out.push({
      date: parseDate(getCell(r, idx.date)) ?? '',
      asset: name,
      type: getCell(r, idx.type),
      status: getCell(r, idx.status),
      link: getCell(r, idx.link),
    });
  }
  return out;
}

function parseAssetsContentTracker(rows: string[][], lowerHeaders: string[]): AssetRow[] {
  const monthLabelIdx = 0; // Column A holds the "Month X (June)" label
  const assetIdx = 1;      // Column B is asset title (and type-header row text)
  const statusIdx = lowerHeaders.indexOf('approval');
  const primaryLinkIdx = lowerHeaders.indexOf('document/link');
  const updatedLinkIdx = lowerHeaders.indexOf('updated document');

  const out: AssetRow[] = [];
  let currentType = 'Other';
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const col2 = getCell(r, assetIdx);
    if (!col2) continue;
    const monthLabel = getCell(r, monthLabelIdx);
    // Type-header row: column A empty, column B holds the type.
    if (!monthLabel) {
      currentType = col2;
      continue;
    }
    const primary = getCell(r, primaryLinkIdx);
    const updated = getCell(r, updatedLinkIdx);
    out.push({
      date: parseMonthLabel(monthLabel),
      asset: col2,
      type: currentType,
      status: getCell(r, statusIdx),
      link: updated || primary,
    });
  }
  return out;
}

function parseOutreach(rows: string[][]): OutreachRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const idx = {
    date: findIdx(headers, ['date']),
    channel: findIdx(headers, ['channel', 'platform']),
    account: findIdx(headers, ['account', 'company', 'contact']),
    outcome: findIdx(headers, ['outcome', 'result', 'note', 'notes']),
  };
  const out: OutreachRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const account = getCell(r, idx.account);
    if (!account) continue;
    out.push({
      date: parseDate(getCell(r, idx.date)) ?? '',
      channel: getCell(r, idx.channel),
      account,
      outcome: getCell(r, idx.outcome),
    });
  }
  return out;
}

function parseDataMetrics(rows: string[][]): DataMetricRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const idx = {
    metric: findIdx(headers, ['metric', 'name', 'label']),
    value: findIdx(headers, ['value', 'count', 'current']),
    target: findIdx(headers, ['target', 'goal']),
    note: findIdx(headers, ['note', 'notes', 'detail']),
  };
  const out: DataMetricRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const metric = getCell(r, idx.metric);
    if (!metric) continue;
    const target = parseNumber(getCell(r, idx.target));
    out.push({
      metric,
      value: parseNumber(getCell(r, idx.value)),
      ...(target > 0 ? { target } : {}),
      note: getCell(r, idx.note),
    });
  }
  return out;
}

function parseTimeline(rows: string[][]): TimelineRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const idx = {
    date: findIdx(headers, ['date']),
    workstream: findIdx(headers, ['workstream', 'area', 'tag']),
    description: findIdx(headers, ['description', 'detail', 'note', 'event']),
    link: findIdx(headers, ['link', 'url']),
  };
  const out: TimelineRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const desc = getCell(r, idx.description);
    if (!desc) continue;
    out.push({
      date: parseDate(getCell(r, idx.date)) ?? '',
      workstream: getCell(r, idx.workstream),
      description: desc,
      link: getCell(r, idx.link),
    });
  }
  return out;
}

// Single-row optional tab: { metric | value | sub_label } or similar.
// Returns the figure + delta string if present; both undefined if blank.
function parseSocialReach(rows: string[][]): { reach?: number; delta?: string } {
  if (rows.length < 2) return {};
  const headers = rows[0];
  const idx = {
    value: findIdx(headers, ['value', 'reach', 'impressions', 'page views']),
    delta: findIdx(headers, ['sub_label', 'delta', 'change', 'trend']),
  };
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const v = parseNumber(getCell(r, idx.value));
    if (v > 0) {
      return { reach: v, delta: getCell(r, idx.delta) || undefined };
    }
  }
  return {};
}

function deriveKpis(
  content: ContentRow[],
  assets: AssetRow[],
  outreach: OutreachRow[],
  social: { reach?: number; delta?: string },
): ActivityKpis {
  const contentPublished = content.filter((c) => c.status.toLowerCase() === 'published').length;
  const contentScheduled = content.filter((c) => c.status.toLowerCase() === 'scheduled').length;
  const assetsCreated = assets.length;
  const assetsLive = assets.filter((a) => ['live', 'approved'].includes(a.status.toLowerCase())).length;
  const assetsDraft = assets.filter((a) => a.status.toLowerCase() === 'in draft').length;
  const outreachTouches = outreach.length;
  const outreachReplies = outreach.filter((o) => o.outcome.toLowerCase().includes('repl')).length;
  return {
    contentPublished,
    contentScheduled,
    assetsCreated,
    assetsLive,
    assetsDraft,
    outreachTouches,
    outreachReplies,
    ...(social.reach !== undefined ? { socialReach: social.reach } : {}),
    ...(social.delta ? { socialReachDelta: social.delta } : {}),
  };
}

export async function fetchStorfundData(period: TimePeriod): Promise<StorfundV2Data> {
  const sheetId = process.env.STORFUND_DATA_SHEET_ID;
  if (!sheetId) throw new Error('STORFUND_DATA_SHEET_ID is not set');

  const [workRows, contentRows, assetRows, outreachRows, dataRows, timelineRows, socialRows] = await Promise.all([
    safeFetchSheet(sheetId, TAB_WORKSTREAMS),
    safeFetchSheet(sheetId, TAB_CONTENT),
    safeFetchSheet(sheetId, TAB_ASSETS),
    safeFetchSheet(sheetId, TAB_OUTREACH),
    safeFetchSheet(sheetId, TAB_DATA),
    safeFetchSheet(sheetId, TAB_TIMELINE),
    safeFetchSheet(sheetId, TAB_SOCIAL),
  ]);

  const workstreams = parseWorkstreams(workRows);
  const allContent = parseContent(contentRows);
  const allAssets = parseAssets(assetRows);
  const allOutreach = parseOutreach(outreachRows);
  const dataMetrics = parseDataMetrics(dataRows);
  const allTimeline = parseTimeline(timelineRows);
  const social = parseSocialReach(socialRows);

  // Period-filter every dated section. Workstreams + Data are snapshot views
  // (not date-bound) so they pass through unchanged.
  const range = getDateRange(period);
  const content = allContent.filter((c) => isInRange(c.date, range));
  const assets = allAssets.filter((a) => isInRange(a.date, range));
  const outreach = allOutreach.filter((o) => isInRange(o.date, range));
  const timeline = allTimeline.filter((t) => isInRange(t.date, range));

  const kpis = deriveKpis(content, assets, outreach, social);

  return {
    workstreams,
    content,
    assets,
    outreach,
    dataMetrics,
    timeline,
    kpis,
    period,
    lastUpdated: new Date().toISOString(),
  };
}
