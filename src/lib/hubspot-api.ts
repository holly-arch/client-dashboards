import { Composio } from '@composio/core';

const COMPOSIO_USER_ID = 'mybasepay';
const DEAL_PAGE_LIMIT = 200;
const MAX_DEAL_PAGES = 5;

interface HubSpotDealRaw {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    createdate?: string;
    hs_lastmodifieddate?: string;
  };
}

interface HubSpotListDealsResponse {
  results?: HubSpotDealRaw[];
  paging?: { next?: { after?: string } };
}

interface HubSpotStageRaw {
  id: string;
  label: string;
  displayOrder: number;
  metadata?: { isClosed?: string; probability?: string };
}

interface HubSpotPipelineRaw {
  id: string;
  label: string;
  displayOrder: number;
  stages: HubSpotStageRaw[];
}

interface HubSpotPipelinesResponse {
  results?: HubSpotPipelineRaw[];
}

export interface HubSpotStage {
  id: string;
  label: string;
  order: number;
  probability: number;
  isClosed: boolean;
  isWon: boolean;
  pipelineId: string;
  pipelineLabel: string;
}

export interface HubSpotDeal {
  id: string;
  name: string;
  amount: number;
  stageId: string;
  stageLabel: string;
  pipelineLabel: string;
  probability: number;
  isClosed: boolean;
  isWon: boolean;
  closeDate: string | null;
  lastModified: string | null;
  url: string;
}

export interface HubSpotStageBucket {
  stageId: string;
  stageLabel: string;
  pipelineLabel: string;
  order: number;
  count: number;
  value: number;
  weightedValue: number;
}

export interface HubSpotKpis {
  openPipelineValue: number;
  openDealsCount: number;
  weightedForecast: number;
  wonValue: number;
  wonCount: number;
  avgOpenDealSize: number;
}

export interface HubSpotData {
  kpis: HubSpotKpis;
  buckets: HubSpotStageBucket[];
  recentDeals: HubSpotDeal[];
  totalDeals: number;
  truncated: boolean;
}

let cachedClient: Composio | null = null;

function client(): Composio {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error('COMPOSIO_API_KEY is not set');
  if (!cachedClient) cachedClient = new Composio({ apiKey });
  return cachedClient;
}

async function execute<T>(slug: string, args: Record<string, unknown>): Promise<T> {
  const composio = client();
  let result: { successful?: boolean; data?: T; error?: string | null };
  try {
    result = (await composio.tools.execute(slug, {
      userId: COMPOSIO_USER_ID,
      arguments: args,
      dangerouslySkipVersionCheck: true,
    })) as { successful?: boolean; data?: T; error?: string | null };
  } catch (e) {
    const rec = e as Record<string, unknown>;
    const detail = JSON.stringify({
      name: rec?.name,
      message: rec?.message,
      code: rec?.code,
      status: rec?.status,
      body: rec?.body,
      response: rec?.response,
      cause: rec?.cause,
    }).slice(0, 800);
    console.error(`[hubspot] SDK threw on ${slug}:`, detail);
    throw new Error(`HubSpot ${slug} SDK error: ${detail}`);
  }
  if (result?.successful === false) {
    console.error(`[hubspot] ${slug} unsuccessful. Full result:`, JSON.stringify(result));
    throw new Error(`HubSpot ${slug} failed: ${result.error ?? 'unknown error'} | full=${JSON.stringify(result).slice(0, 400)}`);
  }
  return result?.data ?? ({} as T);
}

function num(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function fetchStages(): Promise<Map<string, HubSpotStage>> {
  const data = await execute<HubSpotPipelinesResponse>(
    'HUBSPOT_RETRIEVE_ALL_PIPELINES_FOR_SPECIFIED_OBJECT_TYPE',
    { objectType: 'deals' },
  );
  const map = new Map<string, HubSpotStage>();
  for (const pipeline of data.results ?? []) {
    for (const stage of pipeline.stages ?? []) {
      const isClosed = stage.metadata?.isClosed === 'true';
      const probability = num(stage.metadata?.probability);
      map.set(stage.id, {
        id: stage.id,
        label: stage.label,
        order: stage.displayOrder,
        probability,
        isClosed,
        isWon: isClosed && probability >= 0.99,
        pipelineId: pipeline.id,
        pipelineLabel: pipeline.label,
      });
    }
  }
  return map;
}

async function fetchAllDeals(): Promise<{ raw: HubSpotDealRaw[]; truncated: boolean }> {
  const all: HubSpotDealRaw[] = [];
  let after: string | undefined;
  let truncated = false;

  // SEARCH_DEALS with sort DESC on hs_lastmodifieddate surfaces the most
  // recently active deals first — otherwise HubSpot returns oldest-created
  // deals first, which are almost all closed years ago and hide the current
  // pipeline entirely.
  for (let page = 0; page < MAX_DEAL_PAGES; page++) {
    const args: Record<string, unknown> = {
      limit: DEAL_PAGE_LIMIT,
      properties: ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate', 'createdate', 'hs_lastmodifieddate'],
      sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
    };
    if (after) args.after = after;

    const data = await execute<HubSpotListDealsResponse>('HUBSPOT_SEARCH_DEALS', args);
    const results = data.results ?? [];
    all.push(...results);
    after = data.paging?.next?.after;
    if (!after || results.length === 0) break;
    if (page === MAX_DEAL_PAGES - 1 && after) truncated = true;
  }

  return { raw: all, truncated };
}

export async function fetchHubSpotData(): Promise<HubSpotData> {
  const [stages, dealsResult] = await Promise.all([fetchStages(), fetchAllDeals()]);

  const deals: HubSpotDeal[] = dealsResult.raw.map((d) => {
    const stage = stages.get(d.properties.dealstage ?? '');
    const amount = num(d.properties.amount);
    return {
      id: d.id,
      name: d.properties.dealname ?? '(Untitled deal)',
      amount,
      stageId: d.properties.dealstage ?? '',
      stageLabel: stage?.label ?? 'Unknown stage',
      pipelineLabel: stage?.pipelineLabel ?? '',
      probability: stage?.probability ?? 0,
      isClosed: stage?.isClosed ?? false,
      isWon: stage?.isWon ?? false,
      closeDate: d.properties.closedate ?? null,
      lastModified: d.properties.hs_lastmodifieddate ?? d.updatedAt ?? null,
      url: `https://app.hubspot.com/contacts/*/record/0-3/${d.id}`,
    };
  });

  // KPIs
  const openDeals = deals.filter((d) => !d.isClosed);
  const wonDeals = deals.filter((d) => d.isWon);
  const openPipelineValue = openDeals.reduce((s, d) => s + d.amount, 0);
  const weightedForecast = openDeals.reduce((s, d) => s + d.amount * d.probability, 0);
  const wonValue = wonDeals.reduce((s, d) => s + d.amount, 0);
  const avgOpenDealSize = openDeals.length > 0 ? openPipelineValue / openDeals.length : 0;

  const kpis: HubSpotKpis = {
    openPipelineValue,
    openDealsCount: openDeals.length,
    weightedForecast,
    wonValue,
    wonCount: wonDeals.length,
    avgOpenDealSize,
  };

  // Stage buckets — open stages only, ordered by pipeline display order then stage order.
  const bucketMap = new Map<string, HubSpotStageBucket>();
  for (const deal of openDeals) {
    const stage = stages.get(deal.stageId);
    if (!stage) continue;
    const key = stage.id;
    let bucket = bucketMap.get(key);
    if (!bucket) {
      bucket = {
        stageId: stage.id,
        stageLabel: stage.label,
        pipelineLabel: stage.pipelineLabel,
        order: stage.order,
        count: 0,
        value: 0,
        weightedValue: 0,
      };
      bucketMap.set(key, bucket);
    }
    bucket.count += 1;
    bucket.value += deal.amount;
    bucket.weightedValue += deal.amount * stage.probability;
  }
  const buckets = Array.from(bucketMap.values()).sort((a, b) => {
    if (a.pipelineLabel !== b.pipelineLabel) return a.pipelineLabel.localeCompare(b.pipelineLabel);
    return a.order - b.order;
  });

  // Recent deals — latest 15 by last modified.
  const recentDeals = [...deals]
    .filter((d) => d.lastModified)
    .sort((a, b) => (b.lastModified ?? '').localeCompare(a.lastModified ?? ''))
    .slice(0, 15);

  return {
    kpis,
    buckets,
    recentDeals,
    totalDeals: deals.length,
    truncated: dealsResult.truncated,
  };
}

// --- Meeting enrichment ---
// Looks up each meeting's contact in HubSpot by first+last name and returns
// the record URL, owner name, and last-contacted timestamp. Best-effort:
// unmatched contacts silently return no enrichment; HubSpot errors don't
// block the main dashboard response. Cached in-memory so 90s dashboard
// polling doesn't hammer HubSpot.

export interface MeetingEnrichment {
  contactUrl?: string;
  owner?: string;
  lastContactedIso?: string;
}

interface HubSpotContactRaw {
  id: string;
  url?: string;
  properties: {
    firstname?: string;
    lastname?: string;
    hubspot_owner_id?: string;
    notes_last_contacted?: string;
  };
}

interface HubSpotContactsSearchResponse {
  results?: HubSpotContactRaw[];
  total?: number;
}

interface HubSpotOwnerRaw {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface HubSpotOwnersResponse {
  results?: HubSpotOwnerRaw[];
}

const OWNERS_TTL_MS = 60 * 60 * 1000;      // 1h
const ENRICH_TTL_MS = 5 * 60 * 1000;       // 5m
const ENRICH_ERROR_TTL_MS = 60 * 1000;     // 1m — retry sooner on failure

let ownersCache: { data: Map<string, string>; expires: number } | null = null;
const enrichmentCache = new Map<string, { data: MeetingEnrichment; expires: number }>();

async function getOwners(): Promise<Map<string, string>> {
  if (ownersCache && ownersCache.expires > Date.now()) return ownersCache.data;
  try {
    const data = await execute<HubSpotOwnersResponse>('HUBSPOT_RETRIEVE_OWNERS', {});
    const map = new Map<string, string>();
    for (const o of data.results ?? []) {
      const name = `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim() || o.email || '';
      if (name) map.set(o.id, name);
    }
    ownersCache = { data: map, expires: Date.now() + OWNERS_TTL_MS };
    return map;
  } catch (e) {
    console.error('[hubspot] getOwners failed:', e instanceof Error ? e.message : e);
    // Empty map means "no owner names available" — enrichment still returns URLs.
    return new Map();
  }
}

async function searchContactByName(firstName: string, lastName: string): Promise<HubSpotContactRaw | null> {
  const search = await execute<HubSpotContactsSearchResponse>(
    'HUBSPOT_SEARCH_CONTACTS_BY_CRITERIA',
    {
      filterGroups: [{
        filters: [
          { propertyName: 'firstname', operator: 'EQ', value: firstName },
          { propertyName: 'lastname', operator: 'EQ', value: lastName },
        ],
      }],
      properties: ['firstname', 'lastname', 'hubspot_owner_id', 'notes_last_contacted'],
      limit: 1,
    }
  );
  return search.results?.[0] ?? null;
}

// Strip suffixes (II, III, IV, Jr, Sr, PhD, Esq...) and single-letter tokens
// with optional trailing period (middle initials like "L." or "J.") from a
// tokenised name. Returns the remaining name tokens.
const SUFFIXES = new Set(['ii', 'iii', 'iv', 'v', 'jr', 'jr.', 'sr', 'sr.', 'phd', 'ph.d.', 'esq', 'esq.', 'md', 'm.d.']);
function stripSuffixesAndInitials(tokens: string[]): string[] {
  return tokens.filter((t) => {
    const lower = t.toLowerCase();
    if (SUFFIXES.has(lower)) return false;
    // Single letter, optionally with a period — middle initial.
    if (/^[a-z]\.?$/i.test(t)) return false;
    return true;
  });
}

export async function fetchMeetingEnrichment(
  names: { firstName: string; lastName: string }[]
): Promise<Map<string, MeetingEnrichment>> {
  const out = new Map<string, MeetingEnrichment>();
  if (names.length === 0) return out;

  const owners = await getOwners();
  const now = Date.now();

  await Promise.all(names.map(async ({ firstName, lastName }) => {
    if (!firstName || !lastName) return;
    const key = `${firstName.toLowerCase()} ${lastName.toLowerCase()}`;

    const cached = enrichmentCache.get(key);
    if (cached && cached.expires > now) {
      if (Object.keys(cached.data).length > 0) out.set(key, cached.data);
      return;
    }

    try {
      // Tier 1: exact match on the split we've got.
      let contact = await searchContactByName(firstName, lastName);

      // Tier 2: normalise — strip suffixes (II, III, Jr...) and single-letter
      // middle initials, then retake first/last word. Handles:
      //   "George Robinson II"   → George Robinson
      //   "Austin L. Rowan"      → Austin Rowan
      //   "Jami J. Rodgers"      → Jami Rodgers
      //   "Kaden Avery Elliot"   → Kaden Elliot (last word)
      if (!contact) {
        const allTokens = `${firstName} ${lastName}`.trim().split(/\s+/);
        const cleaned = stripSuffixesAndInitials(allTokens);
        if (cleaned.length >= 2) {
          const cleanFirst = cleaned[0];
          const cleanLast = cleaned[cleaned.length - 1];
          if (cleanFirst.toLowerCase() !== firstName.toLowerCase() || cleanLast.toLowerCase() !== lastName.toLowerCase()) {
            contact = await searchContactByName(cleanFirst, cleanLast);
          }
        }
      }

      if (!contact) {
        enrichmentCache.set(key, { data: {}, expires: now + ENRICH_TTL_MS });
        return;
      }

      const enrichment: MeetingEnrichment = {};
      if (contact.url) enrichment.contactUrl = contact.url;
      const ownerId = contact.properties.hubspot_owner_id;
      if (ownerId && owners.has(ownerId)) enrichment.owner = owners.get(ownerId);
      if (contact.properties.notes_last_contacted) {
        enrichment.lastContactedIso = contact.properties.notes_last_contacted;
      }

      enrichmentCache.set(key, { data: enrichment, expires: now + ENRICH_TTL_MS });
      if (Object.keys(enrichment).length > 0) out.set(key, enrichment);
    } catch (e) {
      console.error(`[hubspot] enrichment failed for ${key}:`, e instanceof Error ? e.message : e);
      enrichmentCache.set(key, { data: {}, expires: now + ENRICH_ERROR_TTL_MS });
    }
  }));

  return out;
}

