'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardData, TimePeriod } from '@/lib/types';
import Header from './Header';
import TimeFilter from './TimeFilter';
import ROICard from './ROICard';
import TouchpointsCard from './TouchpointsCard';
import MetricCards from './MetricCards';
import OutreachTable from './OutreachTable';
import PipelineTable from './PipelineTable';
import Footer from './Footer';

const REFRESH_INTERVAL = 60_000;

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('Client');

  // Check stored password on mount
  useEffect(() => {
    const stored = localStorage.getItem('dashboard_auth');
    if (stored) {
      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: stored }),
      })
        .then((res) => res.json())
        .then((data) => setAuthed(data.ok))
        .catch(() => setAuthed(false));
    } else {
      setAuthed(false);
    }
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
          <div>
            <h2 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>PERFORMANCE OVERVIEW</h2>
            <h1 className="text-2xl font-bold" style={{ color: '#fafafa' }}>Campaign Dashboard</h1>
          </div>
          <TimeFilter selected={period} onChange={setPeriod} />
        </div>

        {clientName === 'Select Group' && <ROICard revenue="£18,000" />}
        {clientName === 'Catapult Marketing' && <ROICard revenue="£18,900" />}
        {['Prime Secure', 'Evergreen Security', 'Trust Hire', 'V360'].includes(clientName) && <ROICard />}
        {['Jua', 'myBasePay'].includes(clientName) && data.touchpoints && <TouchpointsCard calls={data.touchpoints.calls} linkedin={data.touchpoints.linkedin} email={data.touchpoints.email} />}
        <MetricCards metrics={data.metrics} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <OutreachTable meetings={data.meetings} onRefresh={fetchData} clientName={clientName} />
          <PipelineTable leads={data.leads} statusCounts={data.statusCounts} onRefresh={fetchData} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
