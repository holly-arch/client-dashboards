'use client';

import { useState, useEffect } from 'react';
import Dashboard from '@/components/Dashboard';
import GroupDashboard from '@/components/GroupDashboard';

export default function Home() {
  const [isGroup, setIsGroup] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((cfg) => setIsGroup(cfg.isGroup || false))
      .catch(() => setIsGroup(false));
  }, []);

  if (isGroup === null) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-sm" style={{ color: '#666' }}>Loading...</div>
      </div>
    );
  }

  return isGroup ? <GroupDashboard /> : <Dashboard />;
}
