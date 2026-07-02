import { Composio } from '@composio/core';

const COMPOSIO_USER_ID = 'mybasepay';
const DEAL_PAGE_LIMIT = 100;
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
  const result = (await composio.tools.execute(slug, {
    userId: COMPOSIO_USER_ID,
    arguments: args,
    dangerouslySkipVersionCheck: true,
  })) as { successful?: boolean; data?: T; error?: string | null };
  if (result?.successful === false) {
    throw new Error(`HubSpot ${slug} failed: ${result.error ?? 'unknown error'}`);
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

  for (let page = 0; page < MAX_DEAL_PAGES; page++) {
    const args: Record<string, unknown> = {
      limit: DEAL_PAGE_LIMIT,
      properties: ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate', 'createdate', 'hs_lastmodifieddate'],
    };
    if (after) args.after = after;

    const data = await execute<HubSpotListDealsResponse>('HUBSPOT_LIST_DEALS', args);
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
