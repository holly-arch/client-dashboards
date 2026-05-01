import { TranscendKpis } from '@/lib/transcend-types';
import MetricCard from './MetricCard';

interface EmailMetricCardsProps {
  kpis: TranscendKpis;
}

const BRAND = '#ff2eeb';

function fmtPct(r: number | null): string {
  if (r === null) return '—';
  return `${(r * 100).toFixed(1)}%`;
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-GB');
}

export default function EmailMetricCards({ kpis }: EmailMetricCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
      <MetricCard
        title="Campaigns"
        value={kpis.totalCampaigns}
        subtitle="currently tracked"
        borderColorHex={BRAND}
        icon={
          <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M3 8l9 6 9-6M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
          </svg>
        }
      />
      <MetricCard
        title="Emails Sent"
        value={fmtInt(kpis.totalEmailsSent)}
        subtitle="across all campaigns"
        borderColorHex="#06b6d4"
        icon={
          <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        }
      />
      <MetricCard
        title="Replies"
        value={fmtInt(kpis.totalReplies)}
        subtitle={`${fmtInt(kpis.positiveReplies)} positive`}
        borderColorHex="#22c55e"
        icon={
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        }
      />
      <MetricCard
        title="Open Rate"
        value={fmtPct(kpis.avgOpenRate)}
        subtitle="avg across campaigns"
        borderColorHex={BRAND}
        icon={
          <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        }
      />
      <MetricCard
        title="Click Rate"
        value={fmtPct(kpis.avgClickRate)}
        subtitle="avg across campaigns"
        borderColorHex="#06b6d4"
        icon={
          <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        }
      />
      <MetricCard
        title="Bounce Rate"
        value={fmtPct(kpis.avgBounceRate)}
        subtitle="avg across campaigns"
        borderColorHex="#f87171"
        icon={
          <svg className="w-5 h-5" style={{ color: '#f87171' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M3 3v18h18" />
            <path d="M7 17l4-8 4 4 5-10" />
          </svg>
        }
      />
    </div>
  );
}
