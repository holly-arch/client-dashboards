'use client';

import { useState, useEffect, useCallback } from 'react';
import { TranscendDashboardData, TimePeriod } from '@/lib/transcend-types';
import Header from './Header';
import TimeFilter from './TimeFilter';
import Footer from './Footer';
import EmailMetricCards from './EmailMetricCards';
import EndClientFilter from './EndClientFilter';
import CampaignPerformanceTable from './CampaignPerformanceTable';
import EmailLeadsTable from './EmailLeadsTable';
import NegativeRepliesTable from './NegativeRepliesTable';

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

export default function TranscendDashboard() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<TranscendDashboardData | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('all_time');
  const [endClient, setEndClient] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('Transcend Consulting');

  useEffect(() => {
    const stored = localStorage.getItem('dashboard_auth');
    if (stored) {
      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: stored }),
      })
        .then((res) => res.json())
        .then((d) => setAuthed(d.ok))
        .catch(() => setAuthed(false));
    } else {
      setAuthed(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((cfg) => setClientName(cfg.clientName))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period });
      if (endClient) params.set('endClient', endClient);
      const res = await fetch(`/api/transcend?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json: TranscendDashboardData = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [period, endClient]);

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

        <EndClientFilter endClients={data.endClients} selected={endClient} onChange={setEndClient} />

        <EmailMetricCards kpis={data.kpis} />

        <CampaignPerformanceTable campaigns={data.campaigns} />

        <EmailLeadsTable leads={data.leads} />

        <NegativeRepliesTable negativeReplies={data.negativeReplies} />
      </main>

      <Footer />
    </div>
  );
}
