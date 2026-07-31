import { RoiTotals } from '@/lib/types';
import MetricCard from './MetricCard';

interface RoiTotalsCardsProps {
  totals: RoiTotals;
  // Group dashboard opts out - the aggregated conversion figure doesn't
  // mean much when totals span multiple clients with different pipelines.
  showConversion?: boolean;
}

function formatGBP(n: number): string {
  if (n === 0) return '£0';
  return `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

function formatPct(n: number): string {
  if (!n || !isFinite(n)) return '0%';
  return `${n.toFixed(1)}%`;
}

export default function RoiTotalsCards({ totals, showConversion = true }: RoiTotalsCardsProps) {
  const gridCols = showConversion ? 'lg:grid-cols-5' : 'lg:grid-cols-4';
  return (
    <div className={`grid grid-cols-2 ${gridCols} gap-3 md:gap-4`}>
      <MetricCard
        title={totals.annual12moContractLabel}
        value={formatGBP(totals.annual12moContract)}
        subtitle="Contract value in period"
        borderColorHex="#ff2eeb"
        icon={
          <svg className="w-5 h-5" style={{ color: '#ff2eeb' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        }
      />
      <MetricCard
        title="Total Contract Value"
        value={formatGBP(totals.totalContractValue)}
        subtitle="Full contract duration"
        borderColorHex="#22c55e"
        icon={
          <svg className="w-5 h-5" style={{ color: '#22c55e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        }
      />
      <MetricCard
        title="Total Billed"
        value={formatGBP(totals.totalBilled)}
        subtitle="Invoiced to date"
        borderColorHex="#06b6d4"
        icon={
          <svg className="w-5 h-5" style={{ color: '#06b6d4' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 4h16v16H4z" />
            <path d="M4 10h16M9 4v16" />
          </svg>
        }
      />
      <MetricCard
        title="Total Pipeline"
        value={formatGBP(totals.totalPipeline)}
        subtitle="Unsigned potential value"
        borderColorHex="#f59e0b"
        icon={
          <svg className="w-5 h-5" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 4 4 5-5" />
          </svg>
        }
      />
      {showConversion && (
        <MetricCard
          title="Meeting to Closed"
          value={formatPct(totals.conversionPct)}
          subtitle={`${totals.closedCount} closed / ${totals.meetingsBooked} booked`}
          borderColorHex="#27ccd7"
          icon={
            <svg className="w-5 h-5" style={{ color: '#27ccd7' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          }
        />
      )}
    </div>
  );
}
