'use client';

import { useState, useEffect, useCallback } from 'react';
import { TimePeriod, DashboardData } from '@/lib/types';
import { StorfundV2Data } from '@/lib/storfund-types';
import Header from './Header';
import Footer from './Footer';
import TimeFilter from './TimeFilter';
import MetricCards from './MetricCards';
import OutreachTable from './OutreachTable';
import PipelineTable from './PipelineTable';
import WorkstreamStrip from './WorkstreamStrip';
import ActivityKpiRow from './ActivityKpiRow';
import ContentPublishedTable from './ContentPublishedTable';
import AssetsTable from './AssetsTable';
import OutreachSummary from './OutreachSummary';
import DataProgressCards from './DataProgressCards';
import ActivityTimeline from './ActivityTimeline';

const REFRESH_INTERVAL = 90_000;

function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('dashboard_auth', password);
        onAuth();
      } else {
        setError('Incorrect password');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <form onSubmit={submit} className="flex flex-col items-center gap-4">
        <span className="text-2xl font-bold tracking-tight mb-2">
          <span style={{ color: '#ff2eeb' }}>ORR</span>
          <span style={{ color: '#fafafa' }}>JO</span>
          <span style={{ color: '#ff2eeb' }}>.</span>
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="px-4 py-2 rounded-lg text-sm w-64 outline-none focus:ring-2"
          style={{ background: '#1a1a1a', border: '1px solid #333', color: '#fafafa' }}
          autoFocus
        />
        <button
          type="submit"
          disabled={checking}
          className="px-6 py-2 rounded-lg text-sm font-medium w-64 transition-opacity"
          style={{ background: '#ff2eeb', color: '#fafafa', opacity: checking ? 0.5 : 1 }}
        >
          {checking ? 'Checking...' : 'Enter'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </form>
    </div>
  );
}

export default function StorfundV2Dashboard() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  // Two independent fetches: the existing lead-gen view (/api/opportunities)
  // and the new v2 activity view (/api/storfund). The page is one continuous
  // dashboard that surfaces both — the existing data on top, the new sections
  // below, all sharing one time-period filter.
  const [leadData, setLeadData] = useState<DashboardData | null>(null);
  const [v2Data, setV2Data] = useState<StorfundV2Data | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('this_month');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('Storfund');

  // Cookie first (survives Safari ITP), localStorage fallback that re-POSTs
  // to refresh the cookie so the user is upgraded automatically.
  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((d) => {
        if (d.ok) { setAuthed(true); return; }
        const stored = localStorage.getItem('dashboard_auth');
        if (!stored) { setAuthed(false); return; }
        fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: stored }),
        })
          .then((r) => r.json())
          .then((data) => setAuthed(data.ok))
          .catch(() => setAuthed(false));
      })
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((cfg) => setClientName(cfg.clientName))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [leadRes, v2Res] = await Promise.all([
        fetch(`/api/opportunities?period=${period}`),
        fetch(`/api/storfund?period=${period}`),
      ]);
      // Lead view is required; v2 is allowed to fail (e.g. STORFUND_DATA_SHEET_ID
      // not yet set on the deployment) and we render empty-state sections.
      if (leadRes.ok) {
        setLeadData(await leadRes.json());
      } else {
        const err = await leadRes.json();
        throw new Error(err.error || `Lead-gen fetch HTTP ${leadRes.status}`);
      }
      if (v2Res.ok) {
        setV2Data(await v2Res.json());
      } else {
        setV2Data(null);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData, authed]);

  if (authed === null) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-sm" style={{ color: '#666' }}>Loading...</div>
      </div>
    );
  }

  if (!authed) {
    return <PasswordGate onAuth={() => setAuthed(true)} />;
  }

  if (loading && !leadData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm" style={{ color: '#666' }}>Loading dashboard...</div>
      </div>
    );
  }

  if (error && !leadData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-400 text-sm">Error: {error}</div>
      </div>
    );
  }

  if (!leadData) return null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header lastUpdated={v2Data?.lastUpdated ?? leadData.lastUpdated} clientName={clientName} />

      <main className="flex-1 px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>PERFORMANCE OVERVIEW</h2>
            <h1 className="text-2xl font-bold" style={{ color: '#fafafa' }}>Activity Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: '#666' }}>Live view of every workstream — content, assets, outreach, data, and timeline</p>
          </div>
          <TimeFilter selected={period} onChange={setPeriod} />
        </div>

        {/* 1 — Workstream status strip */}
        <WorkstreamStrip workstreams={v2Data?.workstreams ?? []} />

        {/* Existing KPI cards stay exactly as before */}
        <MetricCards metrics={leadData.metrics} />

        {/* 2 — Activity KPI row */}
        {v2Data && <ActivityKpiRow kpis={v2Data.kpis} />}

        {/* Existing Meetings + Leads tables — unchanged */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <OutreachTable meetings={leadData.meetings} onRefresh={fetchData} clientName={clientName} />
          <PipelineTable leads={leadData.leads} statusCounts={leadData.statusCounts} onRefresh={fetchData} />
        </div>

        {/* 3 — Content published */}
        <ContentPublishedTable content={v2Data?.content ?? []} />

        {/* 4 — Assets created */}
        <AssetsTable assets={v2Data?.assets ?? []} />

        {/* 5 — Outreach activity */}
        <OutreachSummary outreach={v2Data?.outreach ?? []} />

        {/* 6 — Data and lists progress */}
        <DataProgressCards metrics={v2Data?.dataMetrics ?? []} />

        {/* 7 — Activity timeline */}
        <ActivityTimeline items={v2Data?.timeline ?? []} />
      </main>

      <Footer />
    </div>
  );
}
