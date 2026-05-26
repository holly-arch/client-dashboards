import * as crypto from 'crypto';
import { MeetingRecord, LeadRecord, TouchpointRow, WebsiteInboundRecord, RoiEntry, RoiOpportunity } from './types';

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
const CACHE_TTL = 60_000; // 60 seconds

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
  const [meetingRows, leadRows, touchpointRows, inboundRows, roiResult] = await Promise.all([
    fetchSheet(sheetId, meetingsTab),
    fetchSheet(sheetId, leadsTab),
    fetchSheet(sheetId, 'Touchpoints').catch(() => [] as string[][]),
    fetchSheet(sheetId, 'Website Inbounds').catch(() => [] as string[][]),
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
      });
    }
  }

  // Sort meetings by Date Booked (most recent first)
  meetings.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

  // Sort leads: Closed/Lost at bottom, then by date (most recent first)
  const closedStatuses = new Set(['closed/lost', 'closed lost', 'lost']);
  leads.sort((a, b) => {
    const aIsClosed = closedStatuses.has(a.status.toLowerCase()) ? 1 : 0;
    const bIsClosed = closedStatuses.has(b.status.toLowerCase()) ? 1 : 0;
    if (aIsClosed !== bIsClosed) return aIsClosed - bIsClosed;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
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
      websiteInbounds.push({
        id: `wi-${i}`,
        firstName,
        lastName,
        email,
        status: getVal(row, iCols.status),
        booked: getVal(row, iCols.booked),
        notes: getVal(row, iCols.notes),
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
    const contractValueIdx = findIdx(['contract value', 'contract', 'total value']);
    const notesIdx = findIdx(['notes', 'note', 'comment']);
    const monthCols: { idx: number; year: number; month: number }[] = [];
    for (let c = 0; c < lowerHeaders.length; c++) {
      if (c === opportunityIdx || c === pipelineValueIdx || c === contractValueIdx || c === notesIdx) continue;
      const parsed = parseMonthYearHeader(lowerHeaders[c]);
      if (parsed) monthCols.push({ idx: c, ...parsed });
    }

    for (let i = 1; i < roiRows.length; i++) {
      const row = roiRows[i];
      const deal = getVal(row, opportunityIdx);
      if (!deal) continue;

      const pipelineAmount = parseCurrency(getVal(row, pipelineValueIdx));
      const contractAmount = parseCurrency(getVal(row, contractValueIdx));
      const monthly: { year: number; month: number; amount: number }[] = [];
      let monthsTotal = 0;
      for (const { idx, year, month } of monthCols) {
        const n = parseCurrency(getVal(row, idx));
        if (n !== undefined) {
          monthly.push({ year, month, amount: n });
          monthsTotal += n;
        }
      }
      const revenueTotal = monthsTotal + (contractAmount ?? 0);
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
      // buildRoiSummary after rows are merged by opportunity name. Initialise
      // to zero here.
      roiOpportunities.push({
        opportunity: deal,
        ...(pipelineAmount !== undefined && pipelineAmount > 0 ? { pipelineValue: pipelineAmount } : {}),
        ...(contractAmount !== undefined && contractAmount > 0 ? { contractValue: contractAmount } : {}),
        monthly,
        ...(notes ? { notes } : {}),
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
  today.setHours(23, 59, 59, 999);

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
