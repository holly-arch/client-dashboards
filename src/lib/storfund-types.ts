import { TimePeriod } from './types';

export type WorkstreamStatus = 'Live' | 'In progress' | 'On hold' | 'Complete' | 'Not started';

export interface WorkstreamRow {
  workstream: string;
  status: WorkstreamStatus | string;
  owner: string;
  note: string;
  lastUpdated: string; // ISO or pretty — passed through to the UI
}

export type ContentStatus = 'Published' | 'Scheduled' | 'In review';

// One of the six brand pillars. We accept any string here and the UI maps known
// values to a colour; unknown values fall back to neutral grey.
export type ContentPillar = string;

export interface ContentRow {
  date: string;        // ISO
  channel: string;
  pillar: ContentPillar;
  title: string;
  status: ContentStatus | string;
  link: string;
}

export type AssetStatus = 'Live' | 'Approved' | 'In draft' | 'On hold' | 'Awaiting feedback';
export type AssetType = 'Video' | 'One-pager' | 'Carousel' | 'Script' | 'Email' | 'Deck' | 'Other';

export interface AssetRow {
  date: string;        // ISO
  asset: string;
  type: AssetType | string;
  status: AssetStatus | string;
  link: string;
}

export type OutreachChannel = 'LinkedIn' | 'Call' | string;

export interface OutreachRow {
  date: string;        // ISO
  channel: OutreachChannel;
  account: string;
  outcome: string;     // free text; "reply" / "connection sent" / etc.
}

export interface DataMetricRow {
  metric: string;      // "Sellers identified" etc.
  value: number;
  target?: number;     // if present → progress bar; otherwise raw stat
  note: string;
}

export interface TimelineRow {
  date: string;        // ISO
  workstream: string;
  description: string;
  link: string;
}

export interface ActivityKpis {
  contentPublished: number;
  contentScheduled: number;
  assetsCreated: number;
  assetsLive: number;
  assetsDraft: number;
  outreachTouches: number;
  outreachReplies: number;
  // Social reach figures live on an optional 'SocialReach' tab (single row of
  // {value, sub_label} pairs). Both optional so the tile can show a — when blank.
  socialReach?: number;
  socialReachDelta?: string; // "+12.4%" etc., displayed verbatim
}

export interface StorfundV2Data {
  workstreams: WorkstreamRow[];
  content: ContentRow[];
  assets: AssetRow[];
  outreach: OutreachRow[];
  dataMetrics: DataMetricRow[];
  timeline: TimelineRow[];
  kpis: ActivityKpis;
  period: TimePeriod;
  lastUpdated: string;
}
