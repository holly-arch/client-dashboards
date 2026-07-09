import * as crypto from 'crypto';
import { MeetingRecord, LeadRecord, TouchpointRow, WebsiteInboundRecord, WarmLeadRecord, WebinarRegistrant, RoiEntry, RoiOpportunity } from './types';

// --- Google Sheets Auth (JWT / Service Account) ---

let cachedToken: { token: string; expiry: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiry) return cachedToken.token;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!email || !privateKey) throw new Error('Google service account credentials not configured');

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), privateKey);
  const jwt = `${header}.${claims}.${signature.toString('base64url')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google auth error ${res.status}: ${text}`);
  }

  const data = await res.json();
  cachedToken = { token: data.access_token, expiry: Date.now() + 55 * 60 * 1000 }; // cache 55 min
  return data.access_token;
}

// --- Google Sheets Data Fetching ---

interface SheetCache { data: string[][]; expiry: number; }
const sheetCache = new Map<string, SheetCache>();
const CACHE_TTL = 300_000; // 5 minutes — keeps us safely under the shared Google Sheets 60-req/min/user quota across 25+ dashboards

export async function fetchSheet(sheetId: string, tabName: string): Promise<string[][]> {
  const cacheKey = `${sheetId}:${tabName}`;
  const cached = sheetCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.data;

  const token = await getAccessToken();
  const quotedTab = `'${tabName}'`;
  const encodedTab = encodeURIComponent(quotedTab);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedTab}?valueRenderOption=FORMATTED_VALUE`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Sheets error ${res.status} for tab "${tabName}": ${text}`);
  }

  const json = await res.json();
  const rows: string[][] = json.values || [];

  sheetCache.set(cacheKey, { data: rows, expiry: Date.now() + CACHE_TTL });
  return rows;
}

// --- Sheet fetch with background colour metadata ---
// Used when a sheet encodes state in cell fill (e.g. Storfund's Assets tab
// where Approval status is colour-coded green/orange rather than text).

export interface SheetCellMeta {
  v: string;
  bg?: { r: number; g: number; b: number };
}

interface SheetMetaCache { data: SheetCellMeta[][]; expiry: number; }
const sheetMetaCache = new Map<string, SheetMetaCache>();

interface GoogleSheetsCellResponse {
  formattedValue?: string;
  effectiveFormat?: { backgroundColor?: { red?: number; green?: number; blue?: number } };
}
interface GoogleSheetsRowResponse { values?: GoogleSheetsCellResponse[] }
interface GoogleSheetsDataResponse { rowData?: GoogleSheetsRowResponse[] }
interface GoogleSheetsSheetResponse { data?: GoogleSheetsDataResponse[] }
interface GoogleSheetsSpreadsheetResponse { sheets?: GoogleSheetsSheetResponse[] }

export async function fetchSheetWithColor(sheetId: string, tabName: string): Promise<SheetCellMeta[][]> {
  const cacheKey = `${sheetId}:${tabName}:meta`;
  const cached = sheetMetaCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.data;

  const token = await getAccessToken();
  const quotedTab = `'${tabName}'`;
  const params = new URLSearchParams();
  params.append('ranges', quotedTab);
  params.append('fields', 'sheets.data.rowData.values(formattedValue,effectiveFormat.backgroundColor)');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Google Sheets meta error ${res.status} for tab "${tabName}": ${await res.text()}`);

  const json = (await res.json()) as GoogleSheetsSpreadsheetResponse;
  const rowData = json?.sheets?.[0]?.data?.[0]?.rowData ?? [];
  const out: SheetCellMeta[][] = rowData.map((row) => {
    const vals = row.values ?? [];
    return vals.map((cell): SheetCellMeta => {
      const v = cell?.formattedValue ?? '';
      const bg = cell?.effectiveFormat?.backgroundColor;
      if (!bg) return { v };
      return { v, bg: { r: bg.red ?? 0, g: bg.green ?? 0, b: bg.blue ?? 0 } };
    });
  });

  sheetMetaCache.set(cacheKey, { data: out, expiry: Date.now() + CACHE_TTL });
  return out;
}

// --- Column Auto-Detection ---

const MEETING_COLUMN_MATCHERS: Record<string, string[]> = {
  name: ['name', 'contact name', 'contact', 'full name'],
  firstName: ['first name', 'first name(s)', 'firstname', 'first', 'forename'],
  surname: ['surname', 'last name', 'second name', 'lastname', 'last', 'family name'],
  company: ['company', 'company name', 'organisation', 'organization', 'business'],
  jobTitle: ['job title', 'title', 'role', 'position'],
  dateBooked: ['date booked', 'date'],
  meetingDate: ['meeting date'],
  meetingTime: ['meeting time', 'time'],
  attendance: ['attendance', 'status'],
  shortStatus: ['short status'],
  partnerStatus: ['partner status'],
  industry: ['industry'],
  fleetSize: ['fleet size', 'fleet'],
  source: ['source', 'lead source', 'list', 'data source'],
  channel: ['channel', 'contact channel', 'outreach channel', 'contact method'],
};

const LEAD_COLUMN_MATCHERS: Record<string, string[]> = {
  name: ['name', 'contact name', 'contact', 'full name'],
  firstName: ['first name', 'first name(s)', 'firstname', 'first', 'forename'],
  surname: ['surname', 'last name', 'second name', 'lastname', 'last', 'family name'],
  company: ['company', 'company name', 'organisation', 'organization', 'business'],
  jobTitle: ['job title', 'title', 'role', 'position'],
  dateBooked: ['date booked', 'date'],
  status: ['status', 'opportunity status', 'pipeline status'],
  lytxNotes: ['lytx notes'],
  industry: ['industry'],
  source: ['source', 'lead source', 'list', 'data source'],
  channel: ['channel', 'contact channel', 'outreach channel', 'contact method'],
};

// ROI tab schema: each row is one opportunity. Fixed metadata columns
// (Opportunity, Pipeline Value, Contract Value, Notes) plus any number of
// "Month YYYY" columns going forward from the client's engagement start.
// - Sum of all month-year columns + Contract Value = revenue for that row
// - Pipeline Value column = potential / un-signed pipeline for that row
// Past months count as already-billed, future months as still-to-be-billed
// (used by upcoming dashboard tiles — not yet surfaced).
function isMonthYearHeader(h: string): boolean {
  return /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4}$/i.test(h.trim());
}

const MONTH_NAME_TO_IDX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseMonthYearHeader(h: string): { year: number; month: number } | null {
  const m = h.trim().toLowerCase().match(/^([a-z]{3,})[a-z]*\s+(\d{2,4})$/);
  if (!m) return null;
  const monthIdx = MONTH_NAME_TO_IDX[m[1].slice(0, 3)];
  if (monthIdx === undefined) return null;
  let year = parseInt(m[2], 10);
  if (year < 100) year += year > 50 ? 1900 : 2000;
  return { year, month: monthIdx };
}

const INBOUND_COLUMN_MATCHERS: Record<string, string[]> = {
  firstName: ['first name', 'firstname', 'first', 'forename'],
  lastName: ['last name', 'surname', 'lastname', 'second name', 'family name'],
  email: ['email address', 'email'],
  status: ['status', 'qualified', 'qualification'],
  booked: ['booked?', 'booked', 'booking', 'meeting booked'],
  notes: ['notes', 'note'],
  createDate: ['create date', 'created', 'date created', 'created at', 'created date', 'submitted at'],
};

const WEBINAR_COLUMN_MATCHERS: Record<string, string[]> = {
  firstName: ['first name', 'firstname', 'first', 'forename'],
  lastName: ['last name', 'surname', 'lastname', 'second name', 'family name'],
  organisation: ['organisation', 'organization', 'company', 'company name', 'business', 'org'],
  jobTitle: ['job title', 'title', 'role', 'position'],
  question: ['q&a', 'questions you', 'q and a', 'question for', 'question asked', 'question'],
};

const WARM_LEAD_COLUMN_MATCHERS: Record<string, string[]> = {
  firstName: ['first name', 'firstname', 'first', 'forename'],
  surname: ['surname', 'last name', 'lastname', 'second name', 'family name'],
  company: ['company', 'company name', 'business', 'organisation', 'organization'],
  campaign: ['campaign', 'campaign name', 'source campaign'],
  contact: ['contact', 'contact info', 'contact details', 'email', 'phone'],
  status: ['status', 'lead status', 'pipeline status'],
  orrjoNotes: ['orrjo notes', 'orrjo note', 'orrjo', 'notes', 'note'],
};

function detectColumns(headers: string[], matchers: Record<string, string[]>): Record<string, number> {
  const mapping: Record<string, number> = {};
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const [field, candidates] of Object.entries(matchers)) {
    const sorted = [...candidates].sort((a, b) => b.length - a.length);
    // Exact match first
    for (const candidate of sorted) {
      const idx = lowerHeaders.findIndex((h) => h === candidate);
      if (idx !== -1) { mapping[field] = idx; break; }
    }
    // Fallback: partial match
    if (mapping[field] === undefined) {
      for (const candidate of sorted) {
        const idx = lowerHeaders.findIndex((h) => h.includes(candidate));
        if (idx !== -1) { mapping[field] = idx; break; }
      }
    }
  }

  // If firstName found, remove generic name to avoid conflict
  if (mapping.firstName !== undefined) delete mapping.name;

  // If dateBooked not found and first column header is empty, assume it's the date column
  if (mapping.dateBooked === undefined && headers.length > 0 && headers[0].trim() === '') {
    mapping.dateBooked = 0;
  }

  return mapping;
}

// --- Date Parsing ---

export function parseDate(dateStr: string, timeStr?: string): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  let date: Date | null = null;

  // DD/MM/YYYY or DD-MM-YYYY (also handles D/M/YY, D/M/YYYY)
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmyMatch) {
    let [, d, m, y] = dmyMatch;
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }

  // DD/MM (no year — assume current year, or previous year if date would be in future)
  if (!date) {
    const dmMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (dmMatch) {
      const [, d, m] = dmMatch;
      const now = new Date();
      let y = now.getFullYear();
      const candidate = new Date(y, parseInt(m) - 1, parseInt(d));
      // If the date is more than 30 days in the future, assume it was last year
      if (candidate.getTime() > now.getTime() + 30 * 24 * 60 * 60 * 1000) y--;
      date = new Date(y, parseInt(m) - 1, parseInt(d));
    }
  }

  // YYYY-MM-DD
  if (!date) {
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
  }

  // Fallback: try Date.parse
  if (!date) {
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) date = new Date(parsed);
  }

  if (!date || isNaN(date.getTime())) return null;

  // Parse time if provided
  if (timeStr) {
    const timeMatch = timeStr.trim().match(/(\d{1,2})[:\.](\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let [, h, min, , ampm] = timeMatch;
      let hour = parseInt(h);
      if (ampm && ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
      date.setHours(hour, parseInt(min));
    }
  }

  return date.toISOString();
}

// --- Main Data Fetching ---

function getVal(row: string[], idx: number | undefined): string {
  if (idx === undefined) return '';
  return (row[idx] || '').trim();
}

// Strip currency formatting (£, $, commas, spaces) and parse. Returns undefined
// for blank / non-numeric / zero so callers can drop empty rows cleanly.
function parseCurrency(raw: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[£$,\s]/g, '').trim();
  if (!cleaned) return undefined;
  const n = parseFloat(cleaned);
  if (isNaN(n) || n === 0) return undefined;
  return n;
}

// Some sheets use numbers for attendance: 1=Attended, 2=Awaiting Reschedule, 3=Cancelled, 4=Upcoming
function normaliseAttendance(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  switch (trimmed) {
    case '1': return 'Attended';
    case '2': return 'Awaiting Reschedule';
    case '3': return 'Cancelled';
    case '4': return 'Upcoming';
    default: return trimmed;
  }
}

export async function fetchDashboardRawData(
  overrideSheetId?: string,
  overrideMeetingsTab?: string,
  overrideLeadsTab?: string,
): Promise<{
  meetings: MeetingRecord[];
  leads: LeadRecord[];
  touchpointRows: TouchpointRow[];
  websiteInbounds: WebsiteInboundRecord[];
  warmLeads: WarmLeadRecord[];
  webinarRegistrants: WebinarRegistrant[];
  roiEntries: RoiEntry[];
  roiOpportunities: RoiOpportunity[];
  hasRoiTab: boolean;
}> {
  const sheetId = overrideSheetId || process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID environment variable is not set');

  const meetingsTab = overrideMeetingsTab || process.env.MEETINGS_TAB || 'Meetings booked';
  const leadsTab = overrideLeadsTab || process.env.LEADS_TAB || 'Leads';

  // Fetch all tabs in parallel (Touchpoints + Website Inbounds + ROI tabs are optional — fail silently).
  // ROI fetch uses a sentinel `null` for "tab doesn't exist" so we can distinguish missing tab from
  // empty tab (clients who created the tab but haven't entered deals yet should still see the ROI card).
  // Webinar registrants live on a SEPARATE sheet (Zoom export format),
  // pointed at by WEBINAR_SHEET_ID env var. Tab name defaults to "Sheet1"
  // (Zoom's default) but is overridable via WEBINAR_TAB.
  const webinarSheetId = process.env.WEBINAR_SHEET_ID;
  const webinarTab = process.env.WEBINAR_TAB || 'Sheet1';

  const [meetingRows, leadRows, touchpointRows, inboundRows, warmLeadRows, webinarRows, roiResult] = await Promise.all([
    fetchSheet(sheetId, meetingsTab),
    fetchSheet(sheetId, leadsTab),
    fetchSheet(sheetId, 'Touchpoints').catch(() => [] as string[][]),
    fetchSheet(sheetId, 'Website Inbounds').catch(() => [] as string[][]),
    fetchSheet(sheetId, 'Warm Leads').catch(() => [] as string[][]),
    webinarSheetId ? fetchSheet(webinarSheetId, webinarTab).catch(() => [] as string[][]) : Promise.resolve([] as string[][]),
    fetchSheet(sheetId, 'ROI').then((rows) => ({ rows, exists: true })).catch(() => ({ rows: [] as string[][], exists: false })),
  ]);

  // --- Process Meetings ---
  const meetings: MeetingRecord[] = [];
  if (meetingRows.length > 1) {
    const mCols = detectColumns(meetingRows[0], MEETING_COLUMN_MATCHERS);
    const hasSplitName = mCols.name === undefined && mCols.firstName !== undefined;

    for (let i = 1; i < meetingRows.length; i++) {
      const row = meetingRows[i];

      let contactName: string;
      if (hasSplitName) {
        const first = getVal(row, mCols.firstName);
        const last = getVal(row, mCols.surname);
        contactName = `${first} ${last}`.trim();
      } else {
        contactName = getVal(row, mCols.name);
      }
      contactName = contactName.replace(/\s+/g, ' ');
      if (!contactName) continue;

      const company = getVal(row, mCols.company);
      const contactTitle = getVal(row, mCols.jobTitle);
      const dateBooked = getVal(row, mCols.dateBooked);
      const meetingDateStr = getVal(row, mCols.meetingDate);
      const meetingTimeStr = getVal(row, mCols.meetingTime);
      const attendance = getVal(row, mCols.attendance);

      const dateCreated = parseDate(dateBooked) || new Date().toISOString();
      const meetingDate = parseDate(meetingDateStr, meetingTimeStr);
      const shortStatus = getVal(row, mCols.shortStatus);
      const partnerStatus = getVal(row, mCols.partnerStatus);
      const industry = getVal(row, mCols.industry);
      const source = getVal(row, mCols.source);
      const channel = getVal(row, mCols.channel);

      // Fleet size — only parse when the sheet has the column; allow numeric strings
      // with commas (e.g. "1,200"). Blank / non-numeric cells are left undefined so
      // older rows captured before the column existed don't drag the average to zero.
      let fleetSize: number | undefined;
      if (mCols.fleetSize !== undefined) {
        const raw = getVal(row, mCols.fleetSize).replace(/,/g, '');
        if (raw) {
          const n = parseInt(raw, 10);
          if (!isNaN(n)) fleetSize = n;
        }
      }

      meetings.push({
        id: `m-${i}`,
        company,
        contactName,
        contactTitle,
        meetingDate,
        subStatus: normaliseAttendance(attendance),
        dateCreated,
        sheetRowIndex: i + 1, // 1-indexed sheet row (i=1 for first data row = sheet row 2)
        ...(shortStatus !== undefined && mCols.shortStatus !== undefined ? { shortStatus } : {}),
        ...(partnerStatus !== undefined && mCols.partnerStatus !== undefined ? { partnerStatus } : {}),
        ...(mCols.industry !== undefined ? { industry } : {}),
        ...(fleetSize !== undefined ? { fleetSize } : {}),
        ...(mCols.source !== undefined ? { source } : {}),
        ...(mCols.channel !== undefined ? { channel } : {}),
      });
    }
  }

  // --- Process Leads ---
  const leads: LeadRecord[] = [];
  if (leadRows.length > 1) {
    const lCols = detectColumns(leadRows[0], LEAD_COLUMN_MATCHERS);
    const hasSplitName = lCols.name === undefined && lCols.firstName !== undefined;

    for (let i = 1; i < leadRows.length; i++) {
      const row = leadRows[i];

      let contactName: string;
      if (hasSplitName) {
        const first = getVal(row, lCols.firstName);
        const last = getVal(row, lCols.surname);
        contactName = `${first} ${last}`.trim();
      } else {
        contactName = getVal(row, lCols.name);
      }
      contactName = contactName.replace(/\s+/g, ' ');
      if (!contactName) continue;

      const company = getVal(row, lCols.company);
      const contactTitle = getVal(row, lCols.jobTitle);
      const dateBooked = getVal(row, lCols.dateBooked);
      const status = getVal(row, lCols.status);

      if (!status) continue;
      // Skip Meeting Booked rows on the leads tab (they belong in meetings)
      if (status.toLowerCase() === 'meeting booked') continue;

      const date = parseDate(dateBooked) || '';
      const lytxNotes = getVal(row, lCols.lytxNotes);
      const industry = getVal(row, lCols.industry);
      const source = getVal(row, lCols.source);
      const channel = getVal(row, lCols.channel);

      leads.push({
        id: `l-${i}`,
        company,
        contactName,
        contactTitle,
        date,
        status,
        sheetRowIndex: i + 1,
        ...(lytxNotes !== undefined && lCols.lytxNotes !== undefined ? { lytxNotes } : {}),
        ...(lCols.industry !== undefined ? { industry } : {}),
        ...(lCols.source !== undefined ? { source } : {}),
        ...(lCols.channel !== undefined ? { channel } : {}),
      });
    }
  }

  // Sort meetings by Date Booked (most recent first)
  meetings.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

  // Sort leads. Default = Closed/Lost at bottom, then by date (most recent
  // first). Opt-out via LEADS_SORT_DATE_ONLY=true to get pure date-desc across
  // every status (e.g. myBasePay wants to see chronological activity regardless
  // of open/closed).
  //
  // Missing / unparseable dates sink to the bottom of their bucket — otherwise
  // `new Date('').getTime() === NaN` and any comparison involving that NaN
  // returns NaN, which JS's sort treats inconsistently and can split the list
  // into two independently-sorted blocks around the offending row.
  const closedStatuses = new Set(['closed/lost', 'closed lost', 'lost']);
  const dateOnlySort = process.env.LEADS_SORT_DATE_ONLY === 'true';
  const dateTime = (s: string): number => {
    if (!s) return -Infinity;
    const t = new Date(s).getTime();
    return isNaN(t) ? -Infinity : t;
  };
  leads.sort((a, b) => {
    if (!dateOnlySort) {
      const aIsClosed = closedStatuses.has(a.status.toLowerCase()) ? 1 : 0;
      const bIsClosed = closedStatuses.has(b.status.toLowerCase()) ? 1 : 0;
      if (aIsClosed !== bIsClosed) return aIsClosed - bIsClosed;
    }
    return dateTime(b.date) - dateTime(a.date);
  });

  // --- Process Touchpoints ---
  const parsedTouchpoints: TouchpointRow[] = [];
  if (touchpointRows.length > 1) {
    const tHeaders = touchpointRows[0].map((h: string) => h.toLowerCase().trim());
    const weekIdx = tHeaders.findIndex((h: string) => h.includes('week'));
    const callsIdx = tHeaders.findIndex((h: string) => h.includes('call'));
    const linkedinIdx = tHeaders.findIndex((h: string) => h.includes('linkedin'));
    const emailIdx = tHeaders.findIndex((h: string) => h.includes('email'));

    for (let i = 1; i < touchpointRows.length; i++) {
      const row = touchpointRows[i];
      const weekStr = weekIdx >= 0 ? (row[weekIdx] || '').trim() : '';
      const week = parseDate(weekStr);
      if (!week) continue;
      const tp: TouchpointRow = { week };
      if (callsIdx >= 0) tp.calls = parseInt(row[callsIdx] || '0') || 0;
      if (linkedinIdx >= 0) tp.linkedin = parseInt(row[linkedinIdx] || '0') || 0;
      if (emailIdx >= 0) tp.email = parseInt(row[emailIdx] || '0') || 0;
      parsedTouchpoints.push(tp);
    }
  }

  // --- Process Website Inbounds ---
  const websiteInbounds: WebsiteInboundRecord[] = [];
  if (inboundRows.length > 1) {
    const iCols = detectColumns(inboundRows[0], INBOUND_COLUMN_MATCHERS);
    for (let i = 1; i < inboundRows.length; i++) {
      const row = inboundRows[i];
      const firstName = getVal(row, iCols.firstName);
      const lastName = getVal(row, iCols.lastName);
      const email = getVal(row, iCols.email);
      // Skip blank rows
      if (!firstName && !lastName && !email) continue;
      const createDateRaw = getVal(row, iCols.createDate);
      const createDate = createDateRaw ? parseDate(createDateRaw) : null;
      websiteInbounds.push({
        id: `wi-${i}`,
        firstName,
        lastName,
        email,
        status: getVal(row, iCols.status),
        booked: getVal(row, iCols.booked),
        notes: getVal(row, iCols.notes),
        ...(createDate ? { createDate } : {}),
      });
    }
  }

  // --- Process Webinar Registrants ---
  // Source sheet is typically a Zoom registration export with a "Registration
  // Report" cell in A1 and a couple of summary rows ("No. Registered" / count)
  // before the actual data. The detectColumns matcher reads row 0 and locates
  // the real headers by name; per-row we skip anything without a first or last
  // name so the summary rows don't render as registrants.
  //
  // Zoom quirk: the "Please let us know any questions..." Q&A field appears
  // TWICE in the header row (columns 7 and 8) with identical labels, but data
  // only lands in the second one. detectColumns returns the first index it
  // finds, so we build a full list of indexes matching the question aliases
  // and, per row, use whichever has content.
  const webinarRegistrants: WebinarRegistrant[] = [];
  if (webinarRows.length > 1) {
    const wCols = detectColumns(webinarRows[0], WEBINAR_COLUMN_MATCHERS);
    const headers = webinarRows[0].map((h) => h.toLowerCase().trim());
    const questionAliases = WEBINAR_COLUMN_MATCHERS.question ?? [];
    const questionIndexes: number[] = [];
    headers.forEach((h, idx) => {
      if (questionAliases.some((alias) => h.includes(alias))) questionIndexes.push(idx);
    });
    for (let i = 1; i < webinarRows.length; i++) {
      const row = webinarRows[i];
      const firstName = getVal(row, wCols.firstName);
      const lastName = getVal(row, wCols.lastName);
      if (!firstName && !lastName) continue;
      let question = '';
      for (const idx of questionIndexes) {
        const v = getVal(row, idx);
        if (v) { question = v; break; }
      }
      webinarRegistrants.push({
        id: `wr-${i}`,
        firstName,
        lastName,
        organisation: getVal(row, wCols.organisation),
        jobTitle: getVal(row, wCols.jobTitle),
        ...(questionIndexes.length > 0 ? { question } : {}),
      });
    }
  }

  // --- Process Warm Leads ---
  // Optional tab. Currently used by Tower Supplies; any client that adds a
  // "Warm Leads" tab with the matching columns gets the section auto-rendered.
  const warmLeads: WarmLeadRecord[] = [];
  if (warmLeadRows.length > 1) {
    const wCols = detectColumns(warmLeadRows[0], WARM_LEAD_COLUMN_MATCHERS);
    for (let i = 1; i < warmLeadRows.length; i++) {
      const row = warmLeadRows[i];
      const firstName = getVal(row, wCols.firstName);
      const surname = getVal(row, wCols.surname);
      const company = getVal(row, wCols.company);
      if (!firstName && !surname && !company) continue;
      warmLeads.push({
        id: `wl-${i}`,
        firstName,
        surname,
        company,
        campaign: getVal(row, wCols.campaign),
        contact: getVal(row, wCols.contact),
        status: getVal(row, wCols.status),
        orrjoNotes: getVal(row, wCols.orrjoNotes),
      });
    }
  }

  // --- Process ROI ---
  // Schema: Opportunity | Pipeline Value | Contract Value | Notes | <Mon YYYY> | <Mon YYYY> | ...
  // We emit two outputs:
  //   1. roiEntries (legacy) — flat revenue/pipeline per row, used by the
  //      auto-generated revenueNote / pipelineNote subtitles.
  //   2. roiOpportunities — one entry per sheet row with raw monthly amounts
  //      preserved so the dashboard can compute Billed vs To Be Billed.
  const roiEntries: RoiEntry[] = [];
  const roiOpportunities: RoiOpportunity[] = [];
  const { rows: roiRows, exists: hasRoiTab } = roiResult;
  if (roiRows.length > 1) {
    const lowerHeaders = roiRows[0].map((h) => (h || '').toLowerCase().trim());
    const findIdx = (candidates: string[]): number =>
      lowerHeaders.findIndex((h) => candidates.some((c) => h === c));
    const opportunityIdx = findIdx(['opportunity', 'deal name', 'deal', 'company', 'client']);
    const pipelineValueIdx = findIdx(['pipeline value', 'pipeline']);
    // 'contract value' / 'contract' kept on the annual matcher so unmigrated sheets
    // (where the old "Contract Value" column held the annual figure) still parse.
    const annualContractValueIdx = findIdx(['annual contract value', 'annual contract', 'contract value annual', 'contract value', 'contract']);
    const totalContractValueIdx = findIdx(['total contract value', 'total contract', 'lifetime contract value', 'total value']);
    const notesIdx = findIdx(['notes', 'note', 'comment']);
    const typeOfServiceIdx = findIdx(['type of service', 'service type', 'service']);
    const monthCols: { idx: number; year: number; month: number }[] = [];
    for (let c = 0; c < lowerHeaders.length; c++) {
      if (c === opportunityIdx || c === pipelineValueIdx || c === annualContractValueIdx || c === totalContractValueIdx || c === notesIdx || c === typeOfServiceIdx) continue;
      const parsed = parseMonthYearHeader(lowerHeaders[c]);
      if (parsed) monthCols.push({ idx: c, ...parsed });
    }

    for (let i = 1; i < roiRows.length; i++) {
      const row = roiRows[i];
      const deal = getVal(row, opportunityIdx);
      if (!deal) continue;

      const pipelineAmount = parseCurrency(getVal(row, pipelineValueIdx));
      const annualContractAmount = parseCurrency(getVal(row, annualContractValueIdx));
      const totalContractAmount = parseCurrency(getVal(row, totalContractValueIdx));
      const monthly: { year: number; month: number; amount: number }[] = [];
      let monthsTotal = 0;
      for (const { idx, year, month } of monthCols) {
        const n = parseCurrency(getVal(row, idx));
        if (n !== undefined) {
          monthly.push({ year, month, amount: n });
          monthsTotal += n;
        }
      }
      const revenueTotal = monthsTotal + (totalContractAmount ?? annualContractAmount ?? 0);
      const notes = notesIdx >= 0 ? getVal(row, notesIdx) : '';

      // Skip rows that have no signal at all.
      if (revenueTotal === 0 && (pipelineAmount === undefined || pipelineAmount === 0)) continue;

      if (revenueTotal > 0) {
        roiEntries.push({
          month: '',
          deal,
          revenue: revenueTotal,
          ...(notes ? { notes } : {}),
        });
      }
      if (pipelineAmount !== undefined && pipelineAmount > 0) {
        roiEntries.push({
          month: '',
          deal,
          pipeline: pipelineAmount,
          ...(notes ? { notes } : {}),
        });
      }

      // Derived fields (totalContract / billed / toBeBilled) are computed in
      // computeOpportunities. Initialise to zero here.
      const typeOfService = typeOfServiceIdx >= 0 ? getVal(row, typeOfServiceIdx) : '';
      roiOpportunities.push({
        opportunity: deal,
        ...(pipelineAmount !== undefined && pipelineAmount > 0 ? { pipelineValue: pipelineAmount } : {}),
        ...(annualContractAmount !== undefined && annualContractAmount > 0 ? { annualContractValue: annualContractAmount } : {}),
        ...(totalContractAmount !== undefined && totalContractAmount > 0 ? { totalContractValue: totalContractAmount } : {}),
        monthly,
        ...(notes ? { notes } : {}),
        ...(typeOfService ? { typeOfService } : {}),
        totalContract: 0,
        billed: 0,
        toBeBilled: 0,
      });
    }
  }

  return {
    meetings,
    leads,
    touchpointRows: parsedTouchpoints,
    websiteInbounds,
    warmLeads,
    webinarRegistrants,
    roiEntries,
    roiOpportunities,
    hasRoiTab,
  };
}

// Demo dashboard: shift every date so the most recent meeting/lead lands on
// "today". Anchored on the latest dateCreated / lead date (not meetingDate) so
// upcoming meetings stay in the future after the shift.
export function shiftDatesToToday(raw: {
  meetings: MeetingRecord[];
  leads: LeadRecord[];
  touchpointRows: TouchpointRow[];
  websiteInbounds: WebsiteInboundRecord[];
  warmLeads: WarmLeadRecord[];
  webinarRegistrants: WebinarRegistrant[];
  roiEntries: RoiEntry[];
  roiOpportunities: RoiOpportunity[];
  hasRoiTab: boolean;
}): typeof raw {
  const candidates: number[] = [];
  for (const m of raw.meetings) {
    const t = new Date(m.dateCreated).getTime();
    if (!isNaN(t)) candidates.push(t);
  }
  for (const l of raw.leads) {
    if (!l.date) continue;
    const t = new Date(l.date).getTime();
    if (!isNaN(t)) candidates.push(t);
  }
  if (candidates.length === 0) return raw;

  const latest = Math.max(...candidates);
  const today = new Date();
  // Anchor to noon today, not end-of-day. End-of-day in UTC (23:59:59) flips
  // to "tomorrow" when rendered in any timezone east of UTC (e.g. BST), so
  // dashboard viewers in the UK would see the latest date as tomorrow's.
  today.setHours(12, 0, 0, 0);

  const deltaMs = today.getTime() - latest;
  if (Math.abs(deltaMs) < 24 * 60 * 60 * 1000) return raw;

  const shift = (iso: string | null): string | null => {
    if (!iso) return iso;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return new Date(d.getTime() + deltaMs).toISOString();
  };

  return {
    meetings: raw.meetings.map((m) => ({
      ...m,
      dateCreated: shift(m.dateCreated) || m.dateCreated,
      meetingDate: shift(m.meetingDate),
    })),
    leads: raw.leads.map((l) => ({
      ...l,
      date: shift(l.date) || l.date,
    })),
    touchpointRows: raw.touchpointRows.map((t) => ({
      ...t,
      week: shift(t.week) || t.week,
    })),
    websiteInbounds: raw.websiteInbounds,
    warmLeads: raw.warmLeads,
    webinarRegistrants: raw.webinarRegistrants,
    roiEntries: raw.roiEntries,
    roiOpportunities: raw.roiOpportunities,
    hasRoiTab: raw.hasRoiTab,
  };
}

export interface TouchpointsData {
  week: string;
  calls: number;
  linkedin: number;
  email: number;
}

export async function fetchTouchpoints(): Promise<TouchpointsData | null> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) return null;

  try {
    const rows = await fetchSheet(sheetId, 'Touchpoints');
    if (rows.length < 2) return null;

    // Get the last row (most recent week)
    const lastRow = rows[rows.length - 1];
    const headers = rows[0].map((h: string) => h.toLowerCase().trim());

    const weekIdx = headers.findIndex((h: string) => h.includes('week'));
    const callsIdx = headers.findIndex((h: string) => h.includes('call'));
    const linkedinIdx = headers.findIndex((h: string) => h.includes('linkedin'));
    const emailIdx = headers.findIndex((h: string) => h.includes('email'));

    return {
      week: weekIdx >= 0 ? (lastRow[weekIdx] || '') : '',
      calls: callsIdx >= 0 ? parseInt(lastRow[callsIdx] || '0') || 0 : 0,
      linkedin: linkedinIdx >= 0 ? parseInt(lastRow[linkedinIdx] || '0') || 0 : 0,
      email: emailIdx >= 0 ? parseInt(lastRow[emailIdx] || '0') || 0 : 0,
    };
  } catch {
    return null;
  }
}

// --- Writing to Google Sheets ---

// Column letter helper (0=A, 1=B, ..., 25=Z, 26=AA, etc.)
function colLetter(idx: number): string {
  let letter = '';
  let n = idx;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

export async function writeCell(
  sheetId: string,
  tabName: string,
  row: number,
  col: number,
  value: string,
): Promise<void> {
  const token = await getAccessToken();
  const cellRef = `${colLetter(col)}${row}`;
  const range = encodeURIComponent(`'${tabName}'!${cellRef}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=RAW`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[value]] }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Sheets write error ${res.status}: ${text}`);
  }

  // Invalidate cache for this tab
  invalidateCache(sheetId, tabName);
}

export function invalidateCache(sheetId: string, tabName: string): void {
  const cacheKey = `${sheetId}:${tabName}`;
  sheetCache.delete(cacheKey);
}

// Resolve column index for an editable field by reading the sheet headers
export async function resolveColumnIndex(
  sheetId: string,
  tabName: string,
  fieldName: string,
): Promise<number> {
  const rows = await fetchSheet(sheetId, tabName);
  if (rows.length === 0) throw new Error('Sheet is empty');

  const headers = rows[0].map((h: string) => h.toLowerCase().trim());
  const idx = headers.findIndex((h: string) => h === fieldName.toLowerCase());
  if (idx === -1) throw new Error(`Column "${fieldName}" not found in sheet`);
  return idx;
}
