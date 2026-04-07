import { DashboardMetrics } from '@/lib/types';
import MetricCard from './MetricCard';

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

const BRAND = '#ff2eeb';

export default function MetricCards({ metrics }: MetricCardsProps) {
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          title="Meetings Booked"
          value={metrics.meetingsBooked}
          subtitle={`${metrics.meetingsCancelled} cancelled`}
          borderColorHex={BRAND}
          icon={
            <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          }
        />
        <MetricCard
          title="Meetings Sat*"
          value={metrics.meetingsSat}
          subtitle={`${metrics.meetingsAttended} attended + ${metrics.meetingsProjected} projected`}
          borderColorHex="#22c55e"
          icon={
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          }
        />
        <MetricCard
          title="Upcoming"
          value={metrics.upcoming}
          subtitle={`${metrics.awaitingReschedule} awaiting reschedule`}
          borderColorHex="#06b6d4"
          icon={
            <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          }
        />
        <MetricCard
          title="Leads Generated"
          value={metrics.leadsGenerated}
          subtitle={`${metrics.leadsConvertedToMeetings} converted to meetings`}
          borderColorHex={BRAND}
          icon={
            <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      </div>
      <p className="text-xs mt-3" style={{ color: '#555' }}>
        *Meetings Sat includes confirmed attendances plus 80% of upcoming meetings based on historical attendance rates.
      </p>
    </div>
  );
}
