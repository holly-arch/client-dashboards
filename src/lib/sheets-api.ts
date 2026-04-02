import * as crypto from 'crypto';
import { MeetingRecord, LeadRecord, TouchpointRow } from './types';

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
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
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

async function fetchSheet(sheetId: string, tabName: string): Promise<string[][]> {
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
};

const LEAD_COLUMN_MATCHERS: Record<string, string[]> = {
  name: ['name', 'contact name', 'contact', 'full name'],
  firstName: ['first name', 'first name(s)', 'firstname', 'first', 'forename'],
  surname: ['surname', 'last name', 'second name', 'lastname', 'last', 'family name'],
  company: ['company', 'company name', 'organisation', 'organization', 'business'],
  jobTitle: ['job title', 'title', 'role', 'position'],
  dateBooked: ['date booked', 'date'],
  status: ['status', 'opportunity status', 'pipeline status'],
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

function parseDate(dateStr: string, timeStr?: string): string | null {
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
}> {
  const sheetId = overrideSheetId || process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID environment variable is not set');

  const meetingsTab = overrideMeetingsTab || process.env.MEETINGS_TAB || 'Meetings booked';
  const leadsTab = overrideLeadsTab || process.env.LEADS_TAB || 'Leads';

  // Fetch all tabs in parallel (Touchpoints tab is optional — fail silently)
  const [meetingRows, leadRows, touchpointRows] = await Promise.all([
    fetchSheet(sheetId, meetingsTab),
    fetchSheet(sheetId, leadsTab),
    fetchSheet(sheetId, 'Touchpoints').catch(() => [] as string[][]),
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

      meetings.push({
        id: `m-${i}`,
        company,
        contactName,
        contactTitle,
        meetingDate,
        subStatus: normaliseAttendance(attendance),
        dateCreated,
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

      const date = parseDate(dateBooked) || new Date().toISOString();

      leads.push({
        id: `l-${i}`,
        company,
        contactName,
        contactTitle,
        date,
        status,
      });
    }
  }

  // Sort meetings by meeting date (most recent first), fallback to dateCreated
  meetings.sort((a, b) => {
    const da = a.meetingDate || a.dateCreated;
    const db = b.meetingDate || b.dateCreated;
    return new Date(db).getTime() - new Date(da).getTime();
  });

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
      parsedTouchpoints.push({
        week,
        calls: callsIdx >= 0 ? parseInt(row[callsIdx] || '0') || 0 : 0,
        linkedin: linkedinIdx >= 0 ? parseInt(row[linkedinIdx] || '0') || 0 : 0,
        email: emailIdx >= 0 ? parseInt(row[emailIdx] || '0') || 0 : 0,
      });
    }
  }

  return { meetings, leads, touchpointRows: parsedTouchpoints };
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
