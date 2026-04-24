'use client';

import { NegativeReplyRecord, NegativeReplyCategory } from '@/lib/transcend-types';

interface NegativeRepliesTableProps {
  negativeReplies: NegativeReplyRecord[];
}

const CATEGORY_COLORS: Record<NegativeReplyCategory, { bg: string; fg: string; border: string }> = {
  'Not Interested': { bg: 'rgba(245,158,11,0.1)', fg: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  'Wrong Person': { bg: 'rgba(59,130,246,0.1)', fg: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  'Do Not Contact': { bg: 'rgba(239,68,68,0.1)', fg: '#f87171', border: 'rgba(239,68,68,0.3)' },
  'Uncategorised': { bg: 'rgba(160,160,160,0.1)', fg: '#a0a0a0', border: 'rgba(160,160,160,0.3)' },
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
    <div className="rounded-lg p-4 md:p-5 flex flex-col" style={{ background: '#141414', border: '1px solid #252525' }}>
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-widest mb-1" style={{ color: '#ff2eeb' }}>NEGATIVE REPLIES</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: '#fafafa' }}>Declined Responses</span>
          <span className="text-sm" style={{ color: '#666' }}>{negativeReplies.length} total</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[500px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider sticky top-0 z-10" style={{ color: '#666', background: '#141414' }}>
              <th className="text-left py-2 pr-3 font-medium">Contact</th>
              <th className="text-left py-2 pr-3 font-medium">Company</th>
              <th className="text-left py-2 pr-3 font-medium">End-client</th>
              <th className="text-left py-2 pr-3 font-medium">Category</th>
              <th className="text-left py-2 pr-3 font-medium">Contact Info</th>
              <th className="text-left py-2 font-medium">Reply</th>
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {negativeReplies.map((n) => (
              <tr key={n.id} className="hover:bg-white/[0.03] align-top">
                <td className="py-3 pr-3 font-medium" style={{ color: '#fafafa' }}>{n.contactName}</td>
                <td className="py-3 pr-3" style={{ color: '#b0b0b0' }}>{n.company}</td>
                <td className="py-3 pr-3" style={{ color: '#888' }}>{n.clientName}</td>
                <td className="py-3 pr-3"><CategoryBadge category={n.category} /></td>
                <td className="py-3 pr-3 truncate max-w-[200px]" style={{ color: '#888' }}>{n.contactInfo}</td>
                <td className="py-3 max-w-[320px]" style={{ color: '#b0b0b0' }}>{truncate(n.reply, 120)}</td>
              </tr>
            ))}
            {negativeReplies.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center" style={{ color: '#555' }}>No negative replies</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {negativeReplies.map((n) => (
          <div key={n.id} className="rounded-lg p-3" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <div className="flex items-start justify-between mb-1 gap-2">
              <span className="font-medium text-sm" style={{ color: '#fafafa' }}>{n.contactName}</span>
              <CategoryBadge category={n.category} />
            </div>
            <p className="text-sm" style={{ color: '#b0b0b0' }}>{n.company}</p>
            {n.clientName && <p className="text-xs" style={{ color: '#888' }}>End-client: {n.clientName}</p>}
            {n.contactInfo && <p className="text-xs truncate mt-1" style={{ color: '#888' }}>{n.contactInfo}</p>}
            {n.reply && <p className="text-xs mt-2" style={{ color: '#b0b0b0' }}>{truncate(n.reply, 160)}</p>}
          </div>
        ))}
        {negativeReplies.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: '#555' }}>No negative replies</p>
        )}
      </div>
    </div>
  );
}
