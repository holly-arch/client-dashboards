'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardData, TimePeriod } from '@/lib/types';
import { getGroupRoi } from '@/lib/client-revenues';
import Header from './Header';
import TimeFilter from './TimeFilter';
import GroupROICard from './GroupROICard';
import MetricCard from './MetricCard';
import CampaignTable from './CampaignTable';

const REFRESH_INTERVAL = 60_000;
const BRAND = '#ff2eeb';

interface ClientData {
  name: string;
  url: string;
  data: DashboardData;
}

interface GroupData {
  clients: ClientData[];
  aggregate: DashboardData;
  lastUpdated: string;
}

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

export default function GroupDashboard() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<GroupData | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('all_time');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('Group');

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
      const res = await fetch(`/api/group?period=${period}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json: GroupData = await res.json();
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
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-sm" style={{ color: '#666' }}>Loading dashboard...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-red-400 text-sm">Error: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  const m = data.aggregate.metrics;
  const groupRoi = getGroupRoi(data.clients.map((c) => c.name));

  return (
    <div className="flex flex-col min-h-screen">
      <Header lastUpdated={data.lastUpdated} clientName={clientName} />

      <main className="flex-1 px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>GROUP OVERVIEW</h2>
            <h1 className="text-2xl font-bold" style={{ color: '#fafafa' }}>{clientName}</h1>
            <p className="text-sm mt-1" style={{ color: '#666' }}>
              Aggregated performance across {data.clients.length} campaigns • {period === 'all_time' ? 'All time data' : period.replace('_', ' ')}
            </p>
          </div>
          <TimeFilter selected={period} onChange={setPeriod} />
        </div>

        <GroupROICard revenue={groupRoi.revenue} pipeline={groupRoi.pipeline} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <MetricCard
            title="Total Meetings Booked"
            value={m.meetingsBooked}
            subtitle={`${m.meetingsCancelled} cancelled across group`}
            borderColorHex={BRAND}
            icon={
              <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
          />
          <MetricCard
            title="Total Meetings Sat*"
            value={m.meetingsSat}
            subtitle={`Includes 80% of ${m.upcoming} upcoming`}
            borderColorHex="#22c55e"
            icon={
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            }
          />
          <MetricCard
            title="Upcoming Meetings"
            value={m.upcoming}
            subtitle={`${m.awaitingReschedule} awaiting reschedule`}
            borderColorHex="#06b6d4"
            icon={
              <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            }
          />
          <MetricCard
            title="Total Leads Generated"
            value={m.leadsGenerated}
            subtitle={`${m.leadsConvertedToMeetings} converted to meetings`}
            borderColorHex={BRAND}
            icon={
              <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
        </div>
        <p className="text-xs" style={{ color: '#555' }}>
          *Meetings Sat includes confirmed attendances plus 80% of upcoming meetings based on historical attendance rates.
        </p>

        <CampaignTable clients={data.clients} />
      </main>

      <footer className="flex flex-col sm:flex-row items-center justify-between gap-1 px-4 md:px-6 py-4 text-xs mt-auto" style={{ borderTop: '1px solid #1e1e1e', color: '#555' }}>
        <div>
          Powered by <span className="font-bold" style={{ color: '#ff2eeb' }}>ORRJO</span>
          <span style={{ color: '#333' }}> • </span>
          <span>{clientName}</span>
        </div>
        <div>Data refreshes automatically every 60 seconds</div>
      </footer>
    </div>
  );
}
