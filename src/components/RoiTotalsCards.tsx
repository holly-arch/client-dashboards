import { RoiTotals } from '@/lib/types';
import MetricCard from './MetricCard';

interface RoiTotalsCardsProps {
  totals: RoiTotals;
}

function formatGBP(n: number): string {
  if (n === 0) return '£0';
  return `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

export default function RoiTotalsCards({ totals }: RoiTotalsCardsProps) {
  // Grid grows from 4 tiles to 6 when gross margin data is present on any opp.
  const gridCols = totals.hasGrossMargin ? 'md:grid-cols-3 lg:grid-cols-6' : 'lg:grid-cols-4';
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
      {totals.hasGrossMargin && (
        <>
          <MetricCard
            title="Total Contract Value Gross Margin"
            value={formatGBP(totals.totalContractValueGrossMargin)}
            subtitle="Projected profit on signed contracts"
            borderColorHex="#a78bfa"
            icon={
              <svg className="w-5 h-5" style={{ color: '#a78bfa' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />
          <MetricCard
            title="Total Billed Gross Margin"
            value={formatGBP(totals.totalBilledGrossMargin)}
            subtitle="Margin on money billed in period"
            borderColorHex="#c084fc"
            icon={
              <svg className="w-5 h-5" style={{ color: '#c084fc' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 12h4l3-9 4 18 3-9h4" />
              </svg>
            }
          />
        </>
      )}
    </div>
  );
}
