'use client';

import { useState, useEffect, useCallback } from 'react';
import CountryMapCard from './CountryMapCard';

type Range = '7d' | '30d' | '90d';

interface AnalyticsRow {
  label: string;
  sessions: number;
}

interface CountryRow {
  name: string;
  activeUsers: number;
}

interface AnalyticsData {
  kpis: {
    sessions: number;
    users: number;
    pageViews: number;
    avgSessionDurationSeconds: number;
  };
  topPages: AnalyticsRow[];
  topSources: AnalyticsRow[];
  countries: CountryRow[];
  range: Range;
}

const RANGE_LABELS: Record<Range, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

function formatNumber(n: number): string {
  return n.toLocaleString('en-GB');
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="rounded-lg p-4 md:p-5"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderTop: `4px solid ${accent}` }}
    >
      <h4 className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--color-text-muted)' }}>{label}</h4>
      <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
    </div>
  );
}

function RankedTable({ title, rows, labelHeader }: { title: string; rows: AnalyticsRow[]; labelHeader: string }) {
  const max = Math.max(1, ...rows.map((r) => r.sessions));
  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <h3 className="text-xs font-bold tracking-widest mb-3" style={{ color: '#ff2eeb' }}>{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
            <th className="text-left py-2 pr-3 font-medium">{labelHeader}</th>
            <th className="text-right py-2 font-medium">Sessions</th>
          </tr>
        </thead>
        <tbody className="divide-subtle">
          {rows.map((r, idx) => (
            <tr key={`${r.label}-${idx}`}>
              <td className="py-2 pr-3 truncate max-w-[260px]" style={{ color: 'var(--color-text-primary)' }} title={r.label}>{r.label}</td>
              <td className="py-2 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1 rounded-full" style={{ width: `${(r.sessions / max) * 60}px`, background: 'rgba(255,46,235,0.4)' }} />
                  <span>{formatNumber(r.sessions)}</span>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={2} className="py-6 text-center" style={{ color: 'var(--color-text-fainter)' }}>No data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RangeToggle({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const ranges: Range[] = ['7d', '30d', '90d'];
  return (
    <div className="inline-flex rounded-lg p-1" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      {ranges.map((r) => {
        const active = r === value;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
            style={{
              background: active ? '#ff2eeb' : 'transparent',
              color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            }}
          >
            {RANGE_LABELS[r]}
          </button>
        );
      })}
    </div>
  );
}

export default function GoogleAnalyticsCard() {
  const [range, setRange] = useState<Range>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics?range=${range}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as AnalyticsData;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>WEBSITE ANALYTICS</h2>
          <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Google Analytics</h3>
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </div>

      {loading && !data && (
        <div className="rounded-lg p-6 text-center text-sm" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-faint)' }}>
          Loading analytics…
        </div>
      )}

      {error && !data && (
        <div className="rounded-lg p-4 text-sm" style={{ background: 'var(--color-card)', border: '1px solid #3a1a1a', color: '#f87171' }}>
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Kpi label="Sessions" value={formatNumber(data.kpis.sessions)} accent="#ff2eeb" />
            <Kpi label="Users" value={formatNumber(data.kpis.users)} accent="#22c55e" />
            <Kpi label="Page Views" value={formatNumber(data.kpis.pageViews)} accent="#06b6d4" />
            <Kpi label="Avg Session" value={formatDuration(data.kpis.avgSessionDurationSeconds)} accent="#f59e0b" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <RankedTable title="TOP PAGES" rows={data.topPages} labelHeader="Page" />
            <RankedTable title="TOP SOURCES" rows={data.topSources} labelHeader="Source" />
          </div>

          <CountryMapCard countries={data.countries} />
        </>
      )}
    </section>
  );
}
