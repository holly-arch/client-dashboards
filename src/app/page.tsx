'use client';

import { useState, useEffect } from 'react';
import Dashboard from '@/components/Dashboard';
import GroupDashboard from '@/components/GroupDashboard';
import TranscendDashboard from '@/components/TranscendDashboard';

type DashboardType = 'standard' | 'group' | 'transcend';

export default function Home() {
  const [type, setType] = useState<DashboardType | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((cfg) => setType((cfg.dashboardType as DashboardType) || (cfg.isGroup ? 'group' : 'standard')))
      .catch(() => setType('standard'));
  }, []);

  if (type === null) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-sm" style={{ color: '#666' }}>Loading...</div>
      </div>
    );
  }

  if (type === 'group') return <GroupDashboard />;
  if (type === 'transcend') return <TranscendDashboard />;
  return <Dashboard />;
}
