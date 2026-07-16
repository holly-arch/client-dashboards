'use client';

import { CampaignRecord } from '@/lib/transcend-types';
import { formatDate } from '@/lib/utils';

interface CampaignPerformanceTableProps {
  campaigns: CampaignRecord[];
}

function fmtPct(r: number | null): string {
  if (r === null) return '—';
  return `${(r * 100).toFixed(1)}%`;
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-GB');
}

export default function CampaignPerformanceTable({ campaigns }: CampaignPerformanceTableProps) {
  return (
    <div className="rounded-lg p-4 md:p-5 flex flex-col" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>CAMPAIGN PERFORMANCE</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Active Campaigns</span>
          <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{campaigns.length} total</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[500px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider sticky top-0 z-10" style={{ color: 'var(--color-text-faint)', background: 'var(--color-card)' }}>
              <th className="text-left py-2 pr-3 font-medium">Client</th>
              <th className="text-left py-2 pr-3 font-medium">Campaign</th>
              <th className="text-left py-2 pr-3 font-medium">Sector</th>
              <th className="text-left py-2 pr-3 font-medium">Location</th>
              <th className="text-left py-2 pr-3 font-medium">Launch</th>
              <th className="text-right py-2 pr-3 font-medium">Inboxes</th>
              <th className="text-right py-2 pr-3 font-medium">Emails</th>
              <th className="text-right py-2 pr-3 font-medium">Replies</th>
              <th className="text-right py-2 pr-3 font-medium">Positive</th>
              <th className="text-right py-2 pr-3 font-medium">Open %</th>
              <th className="text-right py-2 pr-3 font-medium">Click %</th>
              <th className="text-right py-2 font-medium">Bounce %</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {campaigns.map((c) => (
              <tr key={c.id} className="row-hover">
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-secondary)' }}>{c.clientName}</td>
                <td className="py-3 pr-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{c.campaignName}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{c.targetSector}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{c.location}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{c.launchDate ? formatDate(c.launchDate) : '—'}</td>
                <td className="py-3 pr-3 text-right" style={{ color: 'var(--color-text-secondary)' }}>{fmtInt(c.inboxes)}</td>
                <td className="py-3 pr-3 text-right" style={{ color: 'var(--color-text-secondary)' }}>{fmtInt(c.emailsSent)}</td>
                <td className="py-3 pr-3 text-right" style={{ color: 'var(--color-text-secondary)' }}>{fmtInt(c.totalReplies)}</td>
                <td className="py-3 pr-3 text-right font-medium" style={{ color: '#22c55e' }}>{fmtInt(c.positiveReplies)}</td>
                <td className="py-3 pr-3 text-right" style={{ color: 'var(--color-text-secondary)' }}>{fmtPct(c.openRate)}</td>
                <td className="py-3 pr-3 text-right" style={{ color: 'var(--color-text-secondary)' }}>{fmtPct(c.clickRate)}</td>
                <td className="py-3 text-right" style={{ color: 'var(--color-text-secondary)' }}>{fmtPct(c.bounceRate)}</td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={12} className="py-8 text-center" style={{ color: 'var(--color-text-fainter)' }}>No campaigns found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {campaigns.map((c) => (
          <div key={c.id} className="rounded-lg p-3" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
            <div className="mb-2">
              <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{c.campaignName}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.clientName} · {c.targetSector || '—'} · {c.location || '—'}</p>
              {c.launchDate && <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Launched {formatDate(c.launchDate)}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span style={{ color: 'var(--color-text-faint)' }}>Emails:</span> <span style={{ color: 'var(--color-text-secondary)' }}>{fmtInt(c.emailsSent)}</span></div>
              <div><span style={{ color: 'var(--color-text-faint)' }}>Replies:</span> <span style={{ color: 'var(--color-text-secondary)' }}>{fmtInt(c.totalReplies)}</span></div>
              <div><span style={{ color: 'var(--color-text-faint)' }}>Positive:</span> <span style={{ color: '#22c55e' }}>{fmtInt(c.positiveReplies)}</span></div>
              <div><span style={{ color: 'var(--color-text-faint)' }}>Open:</span> <span style={{ color: 'var(--color-text-secondary)' }}>{fmtPct(c.openRate)}</span></div>
              <div><span style={{ color: 'var(--color-text-faint)' }}>Click:</span> <span style={{ color: 'var(--color-text-secondary)' }}>{fmtPct(c.clickRate)}</span></div>
              <div><span style={{ color: 'var(--color-text-faint)' }}>Bounce:</span> <span style={{ color: 'var(--color-text-secondary)' }}>{fmtPct(c.bounceRate)}</span></div>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-fainter)' }}>No campaigns found</p>
        )}
      </div>
    </div>
  );
}
