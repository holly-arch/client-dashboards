import { MeetingRecord, LeadRecord } from './types';

const CLOSE_API_BASE = 'https://api.close.com/api/v1';

function getAuthHeader(): string {
  const apiKey = process.env.CLOSE_API_KEY;
  if (!apiKey) throw new Error('CLOSE_API_KEY environment variable is not set');
  return 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64');
}

async function closeApiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${CLOSE_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  // Retry up to 3 times on 429 rate limit errors
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { Authorization: getAuthHeader(), 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.status === 429) {
      // Wait based on Retry-After header, or use exponential backoff
      const retryAfter = res.headers.get('retry-after');
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : (attempt + 1) * 2000;
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Close API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  throw new Error(`Close API error 429: rate limited after 3 retries on ${path}`);
}

interface CloseStatusResponse {
  data: Array<{ id: string; label: string; type: string }>;
}

interface CloseOpportunity {
  id: string;
  lead_id: string;
  contact_id: string | null;
  status_id: string;
  status_label: string;
  date_created: string;
  date_updated: string;
  value: number | null;
  value_currency: string | null;
  confidence: number | null;
  custom: Record<string, unknown>;
}

interface CloseOpportunityListResponse {
  has_more: boolean;
  data: CloseOpportunity[];
}

interface CloseContact {
  id: string;
  name: string;
  title: string;
}

interface CloseLead {
  id: string;
  display_name: string;
  contacts: CloseContact[];
}

interface CloseCustomField {
  id: string;
  name: string;
  type: string;
}

// --- In-memory cache to avoid hitting Close API rate limits ---
// Custom fields and statuses rarely change: cache for 10 minutes
// Leads/contacts rarely change: cache for 5 minutes
// Opportunities change frequently: cache for 60 seconds
interface CacheEntry<T> { data: T; expiry: number; }
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  return null;
}

function setCache<T>(key: string, data: T, ttlMs: number): T {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
  return data;
}

const CACHE_TTL_CONFIG = 10 * 60 * 1000;  // 10 min for custom fields & statuses
const CACHE_TTL_LEADS = 5 * 60 * 1000;    // 5 min for leads/contacts
const CACHE_TTL_OPPS = 60 * 1000;         // 60s for opportunities

// Auto-resolve custom field IDs by name
async function resolveCustomFieldIds(): Promise<{ cfSubStatus: string; cfMeetingDate: string }> {
  const cached = getCached<{ cfSubStatus: string; cfMeetingDate: string }>('customFieldIds');
  if (cached) return cached;

  const res = await closeApiFetch<{ data: CloseCustomField[] }>('/custom_field/opportunity/');

  let cfSubStatus = '';
  let cfMeetingDate = '';

  for (const field of res.data) {
    const name = field.name.toLowerCase();
    if (name === 'attendance' || name === 'meeting status' || name === 'sub-status') {
      cfSubStatus = field.id;
    }
    if (name === 'meeting date and time' || name === 'meeting date' || name === 'meeting datetime') {
      cfMeetingDate = field.id;
    }
  }

  return setCache('customFieldIds', { cfSubStatus, cfMeetingDate }, CACHE_TTL_CONFIG);
}

// Fetch all opportunity statuses and build a lookup map
async function fetchStatusMap(): Promise<Map<string, string>> {
  const cached = getCached<Map<string, string>>('statusMap');
  if (cached) return cached;

  const res = await closeApiFetch<CloseStatusResponse>('/status/opportunity/');
  const map = new Map<string, string>();
  for (const s of res.data) {
    map.set(s.id, s.label);
  }
  return setCache('statusMap', map, CACHE_TTL_CONFIG);
}

// Fetch all opportunities with pagination (cached 60s)
async function fetchAllOpportunities(): Promise<CloseOpportunity[]> {
  const cached = getCached<CloseOpportunity[]>('opportunities');
  if (cached) return cached;

  const all: CloseOpportunity[] = [];
  let skip = 0;
  const limit = 200;

  while (true) {
    const res = await closeApiFetch<CloseOpportunityListResponse>('/opportunity/', {
      _limit: String(limit),
      _skip: String(skip),
    });
    all.push(...res.data);
    if (!res.has_more) break;
    skip += limit;
  }

  return setCache('opportunities', all, CACHE_TTL_OPPS);
}

// Fetch a lead by ID (for company name and contact info)
async function fetchLead(leadId: string): Promise<CloseLead> {
  return closeApiFetch<CloseLead>(`/lead/${leadId}/?_fields=id,display_name,contacts`);
}

// Batch-resolve leads with deduplication (cached 5 min)
async function resolveLeads(leadIds: string[]): Promise<Map<string, CloseLead>> {
  const cached = getCached<Map<string, CloseLead>>('leadMap');
  if (cached) {
    // Check if all requested leads are in the cache
    const missing = leadIds.filter((id) => !cached.has(id));
    if (missing.length === 0) return cached;
    // Fetch only missing leads and merge into cache
    const unique = [...new Set(missing)];
    const batchSize = 10;
    for (let i = 0; i < unique.length; i += batchSize) {
      const batch = unique.slice(i, i + batchSize);
      const results = await Promise.all(batch.map((id) => fetchLead(id)));
      for (const lead of results) {
        cached.set(lead.id, lead);
      }
    }
    return setCache('leadMap', cached, CACHE_TTL_LEADS);
  }

  const unique = [...new Set(leadIds)];
  const map = new Map<string, CloseLead>();

  const batchSize = 10;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((id) => fetchLead(id)));
    for (const lead of results) {
      map.set(lead.id, lead);
    }
  }

  return setCache('leadMap', map, CACHE_TTL_LEADS);
}

function getContactFromLead(lead: CloseLead, contactId: string | null): { name: string; title: string } {
  if (contactId && lead.contacts) {
    const match = lead.contacts.find((c) => c.id === contactId);
    if (match) return { name: match.name || 'Unknown', title: match.title || '' };
  }
  if (lead.contacts && lead.contacts.length > 0) {
    return { name: lead.contacts[0].name || 'Unknown', title: lead.contacts[0].title || '' };
  }
  return { name: 'Unknown', title: '' };
}

export async function fetchDashboardRawData(): Promise<{
  meetings: MeetingRecord[];
  leads: LeadRecord[];
}> {
  // Auto-resolve custom field IDs, statuses, and opportunities in parallel
  const [{ cfSubStatus, cfMeetingDate }, statusMap, opportunities] = await Promise.all([
    resolveCustomFieldIds(),
    fetchStatusMap(),
    fetchAllOpportunities(),
  ]);

  const leadIds = opportunities.map((o) => o.lead_id).filter(Boolean);
  const leadMap = await resolveLeads(leadIds);

  const meetings: MeetingRecord[] = [];
  const leads: LeadRecord[] = [];

  for (const opp of opportunities) {
    const statusLabel = statusMap.get(opp.status_id) || opp.status_label || 'Unknown';
    const lead = leadMap.get(opp.lead_id);
    const company = lead?.display_name || 'Unknown Company';
    const contact = lead ? getContactFromLead(lead, opp.contact_id) : { name: 'Unknown', title: '' };

    if (statusLabel === 'Meeting Booked') {
      const oppAny = opp as unknown as Record<string, unknown>;
      const rawSubStatus = cfSubStatus ? oppAny[`custom.${cfSubStatus}`] : null;
      const subStatus = rawSubStatus
        ? (Array.isArray(rawSubStatus) ? rawSubStatus[0] : String(rawSubStatus))
        : '';
      const meetingDate = cfMeetingDate ? (oppAny[`custom.${cfMeetingDate}`] as string) || null : null;

      meetings.push({
        id: opp.id,
        company,
        contactName: contact.name,
        contactTitle: contact.title,
        meetingDate,
        subStatus,
        dateCreated: opp.date_created,
      });
    } else {
      leads.push({
        id: opp.id,
        company,
        contactName: contact.name,
        contactTitle: contact.title,
        date: opp.date_created,
        status: statusLabel,
      });
    }
  }

  meetings.sort((a, b) => {
    const da = a.meetingDate || a.dateCreated;
    const db = b.meetingDate || b.dateCreated;
    return new Date(db).getTime() - new Date(da).getTime();
  });

  leads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { meetings, leads };
}
