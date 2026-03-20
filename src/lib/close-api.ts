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
  const res = await fetch(url.toString(), {
    headers: { Authorization: getAuthHeader(), 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Close API error ${res.status}: ${text}`);
  }
  return res.json();
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

// Auto-resolve custom field IDs by name
async function resolveCustomFieldIds(): Promise<{ cfSubStatus: string; cfMeetingDate: string }> {
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

  return { cfSubStatus, cfMeetingDate };
}

// Fetch all opportunity statuses and build a lookup map
async function fetchStatusMap(): Promise<Map<string, string>> {
  const res = await closeApiFetch<CloseStatusResponse>('/status/opportunity/');
  const map = new Map<string, string>();
  for (const s of res.data) {
    map.set(s.id, s.label);
  }
  return map;
}

// Fetch all opportunities with pagination
async function fetchAllOpportunities(): Promise<CloseOpportunity[]> {
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

  return all;
}

// Fetch a lead by ID (for company name and contact info)
async function fetchLead(leadId: string): Promise<CloseLead> {
  return closeApiFetch<CloseLead>(`/lead/${leadId}/?_fields=id,display_name,contacts`);
}

// Batch-resolve leads with deduplication
async function resolveLeads(leadIds: string[]): Promise<Map<string, CloseLead>> {
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

  return map;
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
