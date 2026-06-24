import { ContentRow } from './storfund-types';

const PLANABLE_BASE = 'https://api.planable.io/api/v1';
const PAGE_CACHE_TTL = 30 * 60 * 1000; // 30 min — pages rarely change
const POSTS_CACHE_TTL = 5 * 60 * 1000; // 5 min — matches sheet cache cadence

interface PlanableApprovalLevel { id: string; approved: boolean }
interface PlanableApproval { status: string; approved: boolean; type: string; completedLevels: number; totalLevels: number; levels?: PlanableApprovalLevel[] }
interface PlanablePost {
  id: string;
  workspaceId: string;
  pageId: string;
  type: string;
  classification?: string;
  plainText: string;
  scheduledAt: string | null;
  publishedAt?: string;
  published: boolean;
  approved: boolean;
  approval?: PlanableApproval;
  archived?: boolean;
  scheduledSet?: boolean;
  createdAt: string;
  modifiedAt?: string;
}
interface PlanablePage {
  id: string;
  name: string;
  platform: string;
  workspaceId: string;
  link?: string;
  isConnected?: boolean;
}
interface PlanableList<T> { data: T[]; pagination?: { offset: number; limit: number; hasMore: boolean } }

const pagesCache = new Map<string, { pages: Record<string, PlanablePage>; expiry: number }>();
const postsCache = new Map<string, { posts: PlanablePost[]; expiry: number }>();

async function planableFetch<T>(path: string): Promise<T> {
  const key = process.env.PLANABLE_API_KEY;
  if (!key) throw new Error('PLANABLE_API_KEY is not set');
  const res = await fetch(`${PLANABLE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Planable API ${res.status} on ${path}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function loadPages(workspaceId: string): Promise<Record<string, PlanablePage>> {
  const cached = pagesCache.get(workspaceId);
  if (cached && Date.now() < cached.expiry) return cached.pages;
  const res = await planableFetch<PlanableList<PlanablePage>>(`/pages?workspaceId=${encodeURIComponent(workspaceId)}`);
  const pages: Record<string, PlanablePage> = {};
  for (const p of res.data) pages[p.id] = p;
  pagesCache.set(workspaceId, { pages, expiry: Date.now() + PAGE_CACHE_TTL });
  return pages;
}

async function loadPosts(workspaceId: string): Promise<PlanablePost[]> {
  const cached = postsCache.get(workspaceId);
  if (cached && Date.now() < cached.expiry) return cached.posts;
  const all: PlanablePost[] = [];
  let offset = 0;
  const limit = 100;
  // Paginate defensively in case Planable returns hasMore.
  for (let i = 0; i < 10; i++) {
    const res = await planableFetch<PlanableList<PlanablePost>>(
      `/posts?workspaceId=${encodeURIComponent(workspaceId)}&limit=${limit}&offset=${offset}`,
    );
    all.push(...res.data);
    if (!res.pagination?.hasMore) break;
    offset += limit;
  }
  postsCache.set(workspaceId, { posts: all, expiry: Date.now() + POSTS_CACHE_TTL });
  return all;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Pull the first non-empty line from a post body and trim to ~100 chars so the
// Content table's Title column stays readable.
function firstLine(text: string, max = 100): string {
  if (!text) return '(no text)';
  const line = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? text.trim();
  if (line.length <= max) return line;
  return line.slice(0, max - 1).trimEnd() + '…';
}

function deriveStatus(p: PlanablePost): string {
  if (p.published) return 'Published';
  const approval = p.approval?.status;
  // Planable's approval.status values: NEVER_SENT (pending), PENDING, APPROVED, REJECTED.
  if (approval && approval !== 'APPROVED') return 'In review';
  if (p.approved && p.scheduledSet !== false) return 'Scheduled';
  return 'In review';
}

export async function fetchPlanableContent(): Promise<ContentRow[]> {
  const workspaceId = process.env.PLANABLE_WORKSPACE_ID;
  if (!workspaceId) throw new Error('PLANABLE_WORKSPACE_ID is not set');

  const [pages, posts] = await Promise.all([loadPages(workspaceId), loadPosts(workspaceId)]);

  const rows: ContentRow[] = [];
  for (const p of posts) {
    if (p.archived) continue;
    const page = pages[p.pageId];
    const channel = page ? `${capitalize(p.type)} – ${page.name}` : capitalize(p.type);
    const date = p.publishedAt || p.scheduledAt || p.createdAt || '';
    rows.push({
      date,
      channel,
      pillar: '', // Not stored in Planable. Stays blank unless we tag posts.
      title: firstLine(p.plainText, 100),
      status: deriveStatus(p),
      link: page?.link || '', // Falls back to the page profile URL since per-post URLs aren't in the API response
    });
  }
  return rows;
}
