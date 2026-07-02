'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardData, TimePeriod } from '@/lib/types';
import Header from './Header';
import TimeFilter from './TimeFilter';
import RevenueTable from './RevenueTable';
import PipelineDealsTable from './PipelineDealsTable';
import TouchpointsCard from './TouchpointsCard';
import FleetSizeCard from './FleetSizeCard';
import MetricCards from './MetricCards';
import OutreachTable from './OutreachTable';
import PipelineTable from './PipelineTable';
import WebsiteInboundsSection from './WebsiteInboundsSection';
import WarmLeadsSection from './WarmLeadsSection';
import WebinarRegistrantsSection from './WebinarRegistrantsSection';
import GoogleAnalyticsCard from './GoogleAnalyticsCard';
import HubSpotSection from './HubSpotSection';
import DashboardTabs, { DashboardTab } from './DashboardTabs';
import RoiTotalsCards from './RoiTotalsCards';
import Footer from './Footer';

const REFRESH_INTERVAL = 90_000;

// Quarter filter pills only render on the 6 PTG client dashboards (per Holly's request).
const PTG_CLIENTS_WITH_QUARTERS = new Set([
  'Prime Secure', 'Select Group', 'Catapult Marketing',
  'Trust Hire', 'V360', 'Evergreen Security',
]);

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
          style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            color: '#fafafa',
          }}
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

export default function Dashboard() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('all_time');
  const [activeTab, setActiveTab] = useState<DashboardTab>('campaign');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('Client');

  // Check auth on mount. Cookie first (survives Safari's 7-day ITP wipe),
  // then localStorage fallback (which re-POSTs to refresh the cookie so the
  // user is upgraded to cookie-only on next visit).
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

  // Fetch client config once on mount
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((cfg) => setClientName(cfg.clientName))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/opportunities?period=${period}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json: DashboardData = await res.json();
      setData(json);
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

  // Still checking auth
  if (authed === null) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-sm" style={{ color: '#666' }}>Loading...</div>
      </div>
    );
  }

  // Not authed — show password gate
  if (!authed) {
    return <PasswordGate onAuth={() => setAuthed(true)} />;
  }

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm" style={{ color: '#666' }}>Loading dashboard...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-400 text-sm">Error: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header lastUpdated={data.lastUpdated} clientName={clientName} />

      <main className="flex-1 px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>PERFORMANCE OVERVIEW</h2>
              <h1 className="text-2xl font-bold" style={{ color: '#fafafa' }}>{activeTab === 'roi' ? 'ROI Dashboard' : activeTab === 'hubspot' ? 'HubSpot Dashboard' : activeTab === 'analytics' ? 'Analytics Dashboard' : 'Campaign Dashboard'}</h1>
            </div>
            {(() => {
              const tabs: { value: DashboardTab; label: string }[] = [{ value: 'campaign', label: 'Campaign' }];
              if (data.roi) tabs.push({ value: 'roi', label: 'ROI' });
              if (clientName === 'myBasePay') tabs.push({ value: 'hubspot', label: 'HubSpot' });
              if (clientName === 'myBasePay') tabs.push({ value: 'analytics', label: 'Analytics' });
              return tabs.length > 1 ? <DashboardTabs selected={activeTab} onChange={setActiveTab} tabs={tabs} /> : null;
            })()}
          </div>
          {(activeTab === 'campaign' || activeTab === 'roi') && (
            <TimeFilter selected={period} onChange={setPeriod} quarters={PTG_CLIENTS_WITH_QUARTERS.has(clientName) ? data.availableQuarters : undefined} />
          )}
        </div>

        {activeTab === 'campaign' && (
          <>
            {['Jua', 'myBasePay', 'Tower Supplies', 'Storfund'].includes(clientName) && data.touchpoints && <TouchpointsCard calls={data.touchpoints.calls} linkedin={data.touchpoints.linkedin} email={data.touchpoints.email} />}
            {data.metrics.avgFleetSize !== undefined && <FleetSizeCard avgFleetSize={data.metrics.avgFleetSize} />}
            <MetricCards metrics={data.metrics} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <OutreachTable meetings={data.meetings} onRefresh={fetchData} clientName={clientName} />
              <PipelineTable leads={data.leads} statusCounts={data.statusCounts} onRefresh={fetchData} clientName={clientName} />
            </div>

            {data.websiteInbounds && data.websiteInbounds.length > 0 && (
              <WebsiteInboundsSection inbounds={data.websiteInbounds} />
            )}

            {data.warmLeads && data.warmLeads.length > 0 && (
              <WarmLeadsSection warmLeads={data.warmLeads} />
            )}

            {data.webinarRegistrants && data.webinarRegistrants.length > 0 && (
              <WebinarRegistrantsSection registrants={data.webinarRegistrants} />
            )}
          </>
        )}

        {activeTab === 'hubspot' && clientName === 'myBasePay' && <HubSpotSection />}

        {activeTab === 'analytics' && clientName === 'myBasePay' && <GoogleAnalyticsCard />}

        {activeTab === 'roi' && data.roi && (() => {
          const revenueRows = data.roi.opportunities.filter((o) => o.totalContract > 0 || o.billed > 0 || o.toBeBilled > 0);
          const pipelineRows = data.roi.opportunities.filter((o) => (o.pipelineValue ?? 0) > 0);
          return (
            <>
              <RoiTotalsCards totals={data.roi.totals} />
              {(revenueRows.length > 0 || pipelineRows.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                  {revenueRows.length > 0 && <div className="lg:col-span-2"><RevenueTable opportunities={revenueRows} /></div>}
                  {pipelineRows.length > 0 && <div><PipelineDealsTable opportunities={pipelineRows} /></div>}
                </div>
              )}
            </>
          );
        })()}
      </main>

      <Footer />
    </div>
  );
}
