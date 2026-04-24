import { fetchSheet, parseDate } from './sheets-api';
import {
  CampaignRecord,
  LeadReplyRecord,
  NegativeReplyRecord,
  NegativeReplyCategory,
} from './transcend-types';

const CAMPAIGN_TAB = 'Campaign Performance';
const LEADS_TAB = 'Lead Tracking';
const NEG_TAB = 'Negative Replies';

// Column matchers — tolerant to small header variations
const CAMPAIGN_COLS: Record<string, string[]> = {
  clientName: ['client name', 'client'],
  campaignName: ['campaign name', 'campaign'],
  targetSector: ['target sector', 'sector'],
  location: ['location'],
  launchDate: ['launch date', 'launched', 'start date'],
  domainsUsed: ['domains used', 'domains'],
  inboxes: ['no of inboxes', 'inboxes', 'number of inboxes'],
  emailsSent: ['no of emails sent', 'emails sent', 'total emails sent'],
  totalReplies: ['total replies', 'replies'],
  positiveReplies: ['positive replies', 'positive'],
  openRate: ['open rate'],
  clickRate: ['click rate'],
  bounceRate: ['bounce rate'],
  notes: ['notes'],
};

const LEAD_COLS: Record<string, string[]> = {
  clientName: ['client name', 'client'],
  campaignName: ['campaign name', 'campaign'],
  firstName: ['first name', 'firstname', 'first'],
  lastName: ['last name', 'surname', 'lastname', 'last'],
  jobTitle: ['job title', 'title', 'role'],
  company: ['company', 'organisation', 'organization'],
  email: ['email address', 'email'],
  phone: ['phone number', 'phone'],
  location: ['location'],
  dateReplied: ['date replied', 'reply date'],
  dateEmailSent: ['date email sent', 'email sent'],
  notes: ['notes'],
};

const NEG_COLS: Record<string, string[]> = {
  client: ['client', 'client name'],
  contactName: ['contact name', 'contact', 'name'],
  company: ['company', 'organisation', 'organization'],
  contactInfo: ['contact info', 'contact information', 'email', 'contact'],
  reply: ['reply', 'response', 'message'],
  notInterested: ['not interested'],
  wrongPerson: ['wrong person'],
  doNotContact: ['do not contact', 'dnc'],
  uncategorised: ['uncategorised', 'uncategorized', 'other'],
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
    // Fallback: partial match, but skip if already mapped elsewhere
    if (mapping[field] === undefined) {
      const usedIndices = new Set(Object.values(mapping));
      for (const candidate of sorted) {
        const idx = lowerHeaders.findIndex((h, i) => h.includes(candidate) && !usedIndices.has(i));
        if (idx !== -1) { mapping[field] = idx; break; }
      }
    }
  }

  return mapping;
}

function getVal(row: string[], idx: number | undefined): string {
  if (idx === undefined) return '';
  return (row[idx] || '').trim();
}

// Parse a number that may have commas, spaces, or a stray % sign
function parseNumber(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[,\s%]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Parse a rate that may be "23.5%", "23.5", or "0.235". Returns decimal (0..1) or null if empty.
function parseRate(raw: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPercent = trimmed.includes('%');
  const cleaned = trimmed.replace(/[,\s%]/g, '');
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  if (hasPercent) return n / 100;
  // Ambiguous: bare number. If <= 1, assume decimal; else assume percent.
  return n <= 1 ? n : n / 100;
}

// Truthy flag for the 4 category columns on Negative Replies — cell has any non-empty value
function isFlagSet(raw: string): boolean {
  if (!raw) return false;
  const t = raw.trim().toLowerCase();
  if (!t) return false;
  return t !== '0' && t !== 'false' && t !== 'no' && t !== 'n';
}

export async function fetchTranscendRawData(): Promise<{
  campaigns: CampaignRecord[];
  leads: LeadReplyRecord[];
  negativeReplies: NegativeReplyRecord[];
}> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID environment variable is not set');

  // Negative Replies tab may not exist yet — fail silently.
  const [campaignRows, leadRows, negRows] = await Promise.all([
    fetchSheet(sheetId, CAMPAIGN_TAB),
    fetchSheet(sheetId, LEADS_TAB),
    fetchSheet(sheetId, NEG_TAB).catch(() => [] as string[][]),
  ]);

  // --- Campaigns ---
  const campaigns: CampaignRecord[] = [];
  if (campaignRows.length > 1) {
    const cols = detectColumns(campaignRows[0], CAMPAIGN_COLS);
    for (let i = 1; i < campaignRows.length; i++) {
      const row = campaignRows[i];
      const campaignName = getVal(row, cols.campaignName);
      const clientName = getVal(row, cols.clientName);
      // Skip completely empty rows
      if (!campaignName && !clientName) continue;
      campaigns.push({
        id: `c-${i}`,
        clientName,
        campaignName,
        targetSector: getVal(row, cols.targetSector),
        location: getVal(row, cols.location),
        launchDate: parseDate(getVal(row, cols.launchDate)),
        domainsUsed: getVal(row, cols.domainsUsed),
        inboxes: parseNumber(getVal(row, cols.inboxes)),
        emailsSent: parseNumber(getVal(row, cols.emailsSent)),
        totalReplies: parseNumber(getVal(row, cols.totalReplies)),
        positiveReplies: parseNumber(getVal(row, cols.positiveReplies)),
        openRate: parseRate(getVal(row, cols.openRate)),
        clickRate: parseRate(getVal(row, cols.clickRate)),
        bounceRate: parseRate(getVal(row, cols.bounceRate)),
        notes: getVal(row, cols.notes),
      });
    }
  }

  // --- Leads ---
  const leads: LeadReplyRecord[] = [];
  if (leadRows.length > 1) {
    const cols = detectColumns(leadRows[0], LEAD_COLS);
    for (let i = 1; i < leadRows.length; i++) {
      const row = leadRows[i];
      const first = getVal(row, cols.firstName);
      const last = getVal(row, cols.lastName);
      const contactName = `${first} ${last}`.trim().replace(/\s+/g, ' ');
      const company = getVal(row, cols.company);
      if (!contactName && !company) continue;
      leads.push({
        id: `l-${i}`,
        clientName: getVal(row, cols.clientName),
        campaignName: getVal(row, cols.campaignName),
        contactName,
        jobTitle: getVal(row, cols.jobTitle),
        company,
        email: getVal(row, cols.email),
        phone: getVal(row, cols.phone),
        location: getVal(row, cols.location),
        dateReplied: parseDate(getVal(row, cols.dateReplied)),
        dateEmailSent: parseDate(getVal(row, cols.dateEmailSent)),
        notes: getVal(row, cols.notes),
      });
    }
  }

  // --- Negative Replies ---
  const negativeReplies: NegativeReplyRecord[] = [];
  if (negRows.length > 1) {
    const cols = detectColumns(negRows[0], NEG_COLS);
    for (let i = 1; i < negRows.length; i++) {
      const row = negRows[i];
      const contactName = getVal(row, cols.contactName);
      const company = getVal(row, cols.company);
      if (!contactName && !company) continue;

      const notInterested = isFlagSet(getVal(row, cols.notInterested));
      const wrongPerson = isFlagSet(getVal(row, cols.wrongPerson));
      const doNotContact = isFlagSet(getVal(row, cols.doNotContact));
      const uncategorised = isFlagSet(getVal(row, cols.uncategorised));

      let category: NegativeReplyCategory = 'Uncategorised';
      if (uncategorised) category = 'Uncategorised';
      else if (doNotContact) category = 'Do Not Contact';
      else if (wrongPerson) category = 'Wrong Person';
      else if (notInterested) category = 'Not Interested';

      negativeReplies.push({
        id: `n-${i}`,
        clientName: getVal(row, cols.client),
        contactName,
        company,
        contactInfo: getVal(row, cols.contactInfo),
        reply: getVal(row, cols.reply),
        category,
      });
    }
  }

  // Sort campaigns by launchDate descending
  campaigns.sort((a, b) => {
    const at = a.launchDate ? new Date(a.launchDate).getTime() : 0;
    const bt = b.launchDate ? new Date(b.launchDate).getTime() : 0;
    return bt - at;
  });

  // Sort leads by dateReplied descending
  leads.sort((a, b) => {
    const at = a.dateReplied ? new Date(a.dateReplied).getTime() : 0;
    const bt = b.dateReplied ? new Date(b.dateReplied).getTime() : 0;
    return bt - at;
  });

  return { campaigns, leads, negativeReplies };
}
