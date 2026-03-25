'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardData, TimePeriod } from '@/lib/types';
import Header from './Header';
import TimeFilter from './TimeFilter';
import ROICard from './ROICard';
import MetricCards from './MetricCards';
import OutreachTable from './OutreachTable';
import PipelineTable from './PipelineTable';
import Footer from './Footer';

const REFRESH_INTERVAL = 60_000;

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('all_time');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('Client');

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
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

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

      <main className="flex-1 px-6 py-6 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>PERFORMANCE OVERVIEW</h2>
            <h1 className="text-2xl font-bold" style={{ color: '#fafafa' }}>Campaign Dashboard</h1>
          </div>
          <TimeFilter selected={period} onChange={setPeriod} />
        </div>

        <ROICard />
        <MetricCards metrics={data.metrics} />

        <div className="grid grid-cols-2 gap-6">
          <OutreachTable meetings={data.meetings} />
          <PipelineTable leads={data.leads} statusCounts={data.statusCounts} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
