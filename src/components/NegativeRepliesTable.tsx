'use client';

import { NegativeReplyRecord, NegativeReplyCategory } from '@/lib/transcend-types';

interface NegativeRepliesTableProps {
  negativeReplies: NegativeReplyRecord[];
}

const CATEGORY_COLORS: Record<NegativeReplyCategory, { bg: string; fg: string; border: string }> = {
  'Not Interested': { bg: 'rgba(245,158,11,0.1)', fg: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  'Wrong Person': { bg: 'rgba(59,130,246,0.1)', fg: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  'Do Not Contact': { bg: 'rgba(239,68,68,0.1)', fg: '#f87171', border: 'rgba(239,68,68,0.3)' },
  'Uncategorised': { bg: 'rgba(160,160,160,0.1)', fg: 'var(--color-text-secondary)', border: 'rgba(160,160,160,0.3)' },
};

function CategoryBadge({ category }: { category: NegativeReplyCategory }) {
  const c = CATEGORY_COLORS[category];
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
    >
      {category}
    </span>
  );
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s;
}

export default function NegativeRepliesTable({ negativeReplies }: NegativeRepliesTableProps) {
  return (
    <div className="rounded-lg p-4 md:p-5 flex flex-col" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>NEGATIVE REPLIES</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Declined Responses</span>
          <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{negativeReplies.length} total</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[500px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider sticky top-0 z-10" style={{ color: 'var(--color-text-faint)', background: 'var(--color-card)' }}>
              <th className="text-left py-2 pr-3 font-medium">Contact</th>
              <th className="text-left py-2 pr-3 font-medium">Company</th>
              <th className="text-left py-2 pr-3 font-medium">Client</th>
              <th className="text-left py-2 pr-3 font-medium">Category</th>
              <th className="text-left py-2 pr-3 font-medium">Contact Info</th>
              <th className="text-left py-2 font-medium">Reply</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {negativeReplies.map((n) => (
              <tr key={n.id} className="row-hover align-top">
                <td className="py-3 pr-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{n.contactName}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-secondary)' }}>{n.company}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-muted)' }}>{n.clientName}</td>
                <td className="py-3 pr-3"><CategoryBadge category={n.category} /></td>
                <td className="py-3 pr-3 truncate max-w-[200px]" style={{ color: 'var(--color-text-muted)' }}>{n.contactInfo}</td>
                <td className="py-3 max-w-[320px]" style={{ color: 'var(--color-text-secondary)' }}>{truncate(n.reply, 120)}</td>
              </tr>
            ))}
            {negativeReplies.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center" style={{ color: 'var(--color-text-fainter)' }}>No negative replies</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {negativeReplies.map((n) => (
          <div key={n.id} className="rounded-lg p-3" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-start justify-between mb-1 gap-2">
              <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{n.contactName}</span>
              <CategoryBadge category={n.category} />
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{n.company}</p>
            {n.clientName && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Client: {n.clientName}</p>}
            {n.contactInfo && <p className="text-xs truncate mt-1" style={{ color: 'var(--color-text-muted)' }}>{n.contactInfo}</p>}
            {n.reply && <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>{truncate(n.reply, 160)}</p>}
          </div>
        ))}
        {negativeReplies.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-fainter)' }}>No negative replies</p>
        )}
      </div>
    </div>
  );
}
