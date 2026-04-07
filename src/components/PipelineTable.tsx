'use client';

import { useState } from 'react';
import { LeadRecord } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import StatusBadge from './StatusBadge';

interface PipelineTableProps {
  leads: LeadRecord[];
  statusCounts: Record<string, number>;
}

const STATUS_ORDER = ['Lead', 'Nurture', 'Lost', 'Closed/Lost', 'Closed Lost', 'Meeting Booked', 'Engaged Lead'];

export default function PipelineTable({ leads, statusCounts }: PipelineTableProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredLeads = activeFilter ? leads.filter((l) => l.status === activeFilter) : leads;

  return (
    <div className="rounded-lg p-4 md:p-5 flex flex-col h-full" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>PIPELINE</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: '#fafafa' }}>Leads Generated</span>
          <span className="text-sm" style={{ color: '#666' }}>{leads.length} total</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_ORDER.map((status) => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          const isActive = activeFilter === status;
          return (
            <button
              key={status}
              onClick={() => setActiveFilter(isActive ? null : status)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={
                isActive
                  ? { background: '#333', color: '#fafafa' }
                  : { background: '#1a1a1a', color: '#b0b0b0', border: '1px solid #252525' }
              }
            >
              {status} <span className="font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-y-auto flex-1 max-h-96">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
              <th className="text-left py-2 pr-3 font-medium">Company</th>
              <th className="text-left py-2 pr-3 font-medium">Contact</th>
              <th className="text-left py-2 pr-3 font-medium">Title</th>
              <th className="text-left py-2 pr-3 font-medium">Date</th>
              <th className="text-left py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {filteredLeads.map((l) => (
              <tr key={l.id} className="hover:bg-white/[0.03]">
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>{l.company}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{l.contactName}</td>
                <td className="py-3 pr-3 truncate max-w-[160px]" style={{ color: '#888' }}>{l.contactTitle}</td>
                <td className="py-3 pr-3" style={{ color: '#888' }}>{formatDate(l.date)}</td>
                <td className="py-3"><StatusBadge status={l.status} /></td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center" style={{ color: '#555' }}>No leads found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden overflow-y-auto flex-1 max-h-96 space-y-3">
        {filteredLeads.map((l) => (
          <div key={l.id} className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <div className="flex items-start justify-between mb-1">
              <span className="font-medium text-sm" style={{ color: '#fafafa' }}>{l.company}</span>
              <StatusBadge status={l.status} />
            </div>
            <p className="text-sm" style={{ color: '#b0b0b0' }}>{l.contactName}</p>
            <p className="text-xs truncate" style={{ color: '#888' }}>{l.contactTitle}</p>
            {l.date && <p className="text-xs mt-1" style={{ color: '#666' }}>{formatDate(l.date)}</p>}
          </div>
        ))}
        {filteredLeads.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: '#555' }}>No leads found</p>
        )}
      </div>
    </div>
  );
}
