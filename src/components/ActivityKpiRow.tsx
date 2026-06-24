import { ActivityKpis } from '@/lib/storfund-types';
import MetricCard from './MetricCard';

interface ActivityKpiRowProps {
  kpis: ActivityKpis;
}

function fmt(n: number): string {
  return n.toLocaleString('en-GB');
}

export default function ActivityKpiRow({ kpis }: ActivityKpiRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <MetricCard
        title="Content Published"
        value={fmt(kpis.contentPublished)}
        subtitle={`${fmt(kpis.contentScheduled)} scheduled`}
        borderColorHex="#ff2eeb"
        icon={
          <svg className="w-5 h-5" style={{ color: '#ff2eeb' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 4h16v16H4z" />
            <path d="M4 8h16M8 4v4" />
          </svg>
        }
      />
      <MetricCard
        title="Assets Created"
        value={fmt(kpis.assetsCreated)}
        subtitle={`${fmt(kpis.assetsLive)} live, ${fmt(kpis.assetsDraft)} in draft`}
        borderColorHex="#27ccd7"
        icon={
          <svg className="w-5 h-5" style={{ color: '#27ccd7' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5M12 3v12" />
          </svg>
        }
      />
      <MetricCard
        title="Outreach Touches"
        value={fmt(kpis.outreachTouches)}
        subtitle={`${fmt(kpis.outreachReplies)} replies`}
        borderColorHex="#f5602e"
        icon={
          <svg className="w-5 h-5" style={{ color: '#f5602e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
          </svg>
        }
      />
      <MetricCard
        title="Social Reach"
        value={kpis.socialReach !== undefined ? fmt(kpis.socialReach) : '—'}
        subtitle={kpis.socialReachDelta ? `Followers ${kpis.socialReachDelta}` : 'Awaiting data'}
        borderColorHex="#6d01f7"
        icon={
          <svg className="w-5 h-5" style={{ color: '#6d01f7' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
          </svg>
        }
      />
    </div>
  );
}
