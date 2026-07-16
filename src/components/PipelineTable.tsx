'use client';

import { useState } from 'react';
import { LeadRecord } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import EditableText from './EditableText';

interface PipelineTableProps {
  leads: LeadRecord[];
  statusCounts: Record<string, number>;
  onRefresh?: () => void;
  clientName?: string;
}

const STATUS_ORDER = ['Lead', 'Nurture', 'Lost', 'Closed/Lost', 'Closed Lost', 'Meeting Booked', 'Engaged Lead'];

const SOURCE_CLIENTS = new Set(['Tower Supplies', 'Wire', 'Storfund']);
const CHANNEL_CLIENTS = new Set(['Storfund']);

export default function PipelineTable({ leads, statusCounts, onRefresh, clientName }: PipelineTableProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredLeads = activeFilter ? leads.filter((l) => l.status === activeFilter) : leads;

  // Detect if editable columns exist
  const hasLytxNotes = leads.some((l) => l.lytxNotes !== undefined);
  const hasIndustry = leads.some((l) => l.industry !== undefined);
  const hasSource = SOURCE_CLIENTS.has(clientName ?? '') && leads.some((l) => l.source !== undefined);
  const hasChannel = CHANNEL_CLIENTS.has(clientName ?? '') && leads.some((l) => l.channel !== undefined);

  return (
    <div className="rounded-lg p-4 md:p-5 flex flex-col h-full" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>PIPELINE</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Leads Generated</span>
          <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{leads.length} total</span>
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
                  ? { background: 'var(--color-button-bg)', color: 'var(--color-text-primary)' }
                  : { background: 'var(--color-card-alt)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }
              }
            >
              {status} <span className="font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1 max-h-96">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider sticky top-0 z-10" style={{ color: 'var(--color-text-faint)', background: 'var(--color-card)' }}>
              <th className="text-left py-2 pr-3 font-medium">Company</th>
              <th className="text-left py-2 pr-3 font-medium">Contact</th>
              <th className="text-left py-2 pr-3 font-medium">Title</th>
              {hasIndustry && <th className="text-left py-2 pr-3 font-medium">Industry</th>}
              <th className="text-left py-2 pr-3 font-medium">Date</th>
              <th className="text-left py-2 pr-3 font-medium">Status</th>
              {hasChannel && <th className="text-left py-2 pr-3 font-medium">Channel</th>}
              {hasSource && <th className="text-left py-2 pr-3 font-medium">Source</th>}
              {hasLytxNotes && <th className="text-left py-2 font-medium">Lytx Notes</th>}
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {filteredLeads.map((l) => (
              <tr key={l.id} className="row-hover">
                <td className="py-3 pr-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{l.company}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-secondary)' }}>{l.contactName}</td>
                <td className="py-3 pr-3 truncate max-w-[160px]" style={{ color: 'var(--color-text-muted)' }}>{l.contactTitle}</td>
                {hasIndustry && <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{l.industry || '—'}</td>}
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{formatDate(l.date)}</td>
                <td className="py-3 pr-3"><StatusBadge status={l.status} /></td>
                {hasChannel && <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{l.channel || '—'}</td>}
                {hasSource && <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{l.source || '—'}</td>}
                {hasLytxNotes && (
                  <td className="py-3">
                    <EditableText value={l.lytxNotes || ''} sheetRowIndex={l.sheetRowIndex!} field="lytxNotes" placeholder="Add note..." onSaved={onRefresh} />
                  </td>
                )}
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={5 + (hasIndustry ? 1 : 0) + (hasChannel ? 1 : 0) + (hasSource ? 1 : 0) + (hasLytxNotes ? 1 : 0)} className="py-8 text-center" style={{ color: 'var(--color-text-fainter)' }}>No leads found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden overflow-y-auto flex-1 max-h-96 space-y-3">
        {filteredLeads.map((l) => (
          <div key={l.id} className="rounded-lg p-3" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-start justify-between mb-1">
              <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{l.company}</span>
              <StatusBadge status={l.status} />
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{l.contactName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{l.contactTitle}</p>
            {hasIndustry && l.industry && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Industry: {l.industry}</p>}
            {hasChannel && l.channel && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Channel: {l.channel}</p>}
            {hasSource && l.source && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Source: {l.source}</p>}
            {l.date && <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>{formatDate(l.date)}</p>}
            {hasLytxNotes && (
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Lytx Notes:</span>
                <EditableText value={l.lytxNotes || ''} sheetRowIndex={l.sheetRowIndex!} field="lytxNotes" placeholder="Add note..." onSaved={onRefresh} />
              </div>
            )}
          </div>
        ))}
        {filteredLeads.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-fainter)' }}>No leads found</p>
        )}
      </div>
    </div>
  );
}
