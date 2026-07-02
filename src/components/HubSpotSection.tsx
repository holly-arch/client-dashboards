'use client';

import { useState, useEffect, useCallback } from 'react';

interface HubSpotStageBucket {
  stageId: string;
  stageLabel: string;
  pipelineLabel: string;
  order: number;
  count: number;
  value: number;
  weightedValue: number;
}

interface HubSpotDeal {
  id: string;
  name: string;
  amount: number;
  stageLabel: string;
  pipelineLabel: string;
  probability: number;
  isClosed: boolean;
  isWon: boolean;
  closeDate: string | null;
  lastModified: string | null;
  url: string;
}

interface HubSpotData {
  kpis: {
    openPipelineValue: number;
    openDealsCount: number;
    weightedForecast: number;
    wonValue: number;
    wonCount: number;
    avgOpenDealSize: number;
  };
  buckets: HubSpotStageBucket[];
  recentDeals: HubSpotDeal[];
  totalDeals: number;
  truncated: boolean;
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString('en-GB')}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Kpi({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div
      className="rounded-lg p-4 md:p-5"
      style={{ background: '#141414', border: '1px solid #252525', borderTop: `4px solid ${accent}` }}
    >
      <h4 className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#9a9a9a' }}>{label}</h4>
      <p className="text-2xl md:text-3xl font-bold" style={{ color: '#fafafa' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#888' }}>{sub}</p>}
    </div>
  );
}

function StageBadge({ label, probability }: { label: string; probability: number }) {
  // Colour ramps green as probability rises, magenta on cold stages.
  const hue = Math.round(probability * 140);
  const color = probability >= 0.99 ? '#22c55e' : probability >= 0.5 ? `hsl(${hue}, 70%, 55%)` : '#ff2eeb';
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${color}1A`, border: `1px solid ${color}4D`, color }}
    >
      {label}
    </span>
  );
}

function PipelineFunnel({ buckets }: { buckets: HubSpotStageBucket[] }) {
  const maxValue = Math.max(1, ...buckets.map((b) => b.value));
  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: '#141414', border: '1px solid #252525' }}>
      <h3 className="text-xs font-bold tracking-widest mb-3" style={{ color: '#ff2eeb' }}>PIPELINE BY STAGE</h3>
      {buckets.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: '#555' }}>No open deals in the pipeline</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
              <th className="text-left py-2 pr-3 font-medium">Stage</th>
              <th className="text-right py-2 pr-3 font-medium">Deals</th>
              <th className="text-right py-2 pr-3 font-medium">Value</th>
              <th className="text-right py-2 font-medium">Weighted</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {buckets.map((b) => (
              <tr key={b.stageId}>
                <td className="py-3 pr-3" style={{ color: '#fafafa' }}>
                  <div className="flex flex-col">
                    <span className="font-medium">{b.stageLabel}</span>
                    <span className="text-xs" style={{ color: '#666' }}>{b.pipelineLabel}</span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#b0b0b0' }}>{b.count}</td>
                <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#fafafa' }}>
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1 rounded-full hidden md:block" style={{ width: `${(b.value / maxValue) * 80}px`, background: 'rgba(255,46,235,0.4)' }} />
                    <span>{formatMoney(b.value)}</span>
                  </div>
                </td>
                <td className="py-3 text-right tabular-nums" style={{ color: '#888' }}>{formatMoney(b.weightedValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function RecentDealsTable({ deals }: { deals: HubSpotDeal[] }) {
  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: '#141414', border: '1px solid #252525' }}>
      <h3 className="text-xs font-bold tracking-widest mb-3" style={{ color: '#ff2eeb' }}>RECENTLY UPDATED DEALS</h3>
      {deals.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: '#555' }}>No deals</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
                  <th className="text-left py-2 pr-3 font-medium">Deal</th>
                  <th className="text-left py-2 pr-3 font-medium">Stage</th>
                  <th className="text-right py-2 pr-3 font-medium">Amount</th>
                  <th className="text-left py-2 pr-3 font-medium">Close date</th>
                  <th className="text-left py-2 font-medium">Last updated</th>
                </tr>
              </thead>
              <tbody className="divide-subtle">
                {deals.map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>{d.name}</td>
                    <td className="py-3 pr-3"><StageBadge label={d.stageLabel} probability={d.probability} /></td>
                    <td className="py-3 pr-3 text-right tabular-nums" style={{ color: '#fafafa' }}>{formatMoney(d.amount)}</td>
                    <td className="py-3 pr-3" style={{ color: '#888' }}>{formatDate(d.closeDate)}</td>
                    <td className="py-3" style={{ color: '#888' }}>{formatDate(d.lastModified)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {deals.map((d) => (
              <div key={d.id} className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-sm" style={{ color: '#fafafa' }}>{d.name}</span>
                  <span className="text-sm tabular-nums" style={{ color: '#fafafa' }}>{formatMoney(d.amount)}</span>
                </div>
                <StageBadge label={d.stageLabel} probability={d.probability} />
                <p className="text-xs mt-1" style={{ color: '#666' }}>Close: {formatDate(d.closeDate)} · Updated: {formatDate(d.lastModified)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function HubSpotSection() {
  const [data, setData] = useState<HubSpotData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/hubspot');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as HubSpotData;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load HubSpot data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return <div className="text-sm py-8 text-center" style={{ color: '#666' }}>Loading HubSpot data…</div>;
  }
  if (error) {
    return <div className="text-sm py-8 text-center text-red-400">HubSpot error: {error}</div>;
  }
  if (!data) return null;

  const k = data.kpis;
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <Kpi label="Open Pipeline" value={formatMoney(k.openPipelineValue)} accent="#ff2eeb" sub={`${k.openDealsCount} deals`} />
        <Kpi label="Weighted Forecast" value={formatMoney(k.weightedForecast)} accent="#27ccd7" sub="probability-weighted" />
        <Kpi label="Avg Open Deal" value={formatMoney(k.avgOpenDealSize)} accent="#6d01f7" />
        <Kpi label="Closed Won Value" value={formatMoney(k.wonValue)} accent="#22c55e" sub={`${k.wonCount} deals`} />
        <Kpi label="Open Deals" value={k.openDealsCount.toLocaleString('en-GB')} accent="#f5602e" />
        <Kpi label="Total Deals" value={data.totalDeals.toLocaleString('en-GB')} accent="#c8a96a" sub={data.truncated ? 'showing latest 500' : 'all-time'} />
      </div>

      <PipelineFunnel buckets={data.buckets} />

      <RecentDealsTable deals={data.recentDeals} />
    </div>
  );
}
