import { ReactNode } from 'react';

interface TouchpointsCardProps {
  calls?: number;
  linkedin?: number;
  email?: number;
  week?: string;
}

interface Channel {
  label: string;
  value: number;
  iconBg: string;
  icon: ReactNode;
}

const CALLS_ICON = (
  <svg className="w-5 h-5 md:w-7 md:h-7" style={{ color: '#60a5fa' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const LINKEDIN_ICON = (
  <svg className="w-5 h-5 md:w-7 md:h-7" style={{ color: '#60a5fa' }} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const EMAIL_ICON = (
  <svg className="w-5 h-5 md:w-7 md:h-7" style={{ color: '#4ade80' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export default function TouchpointsCard({ calls, linkedin, email, week }: TouchpointsCardProps) {
  const channels: Channel[] = [];
  if (calls !== undefined) channels.push({ label: 'Calls', value: calls, iconBg: 'rgba(59,130,246,0.2)', icon: CALLS_ICON });
  if (linkedin !== undefined) channels.push({ label: 'LinkedIn', value: linkedin, iconBg: 'rgba(59,130,246,0.2)', icon: LINKEDIN_ICON });
  if (email !== undefined) channels.push({ label: 'Email', value: email, iconBg: 'rgba(34,197,94,0.2)', icon: EMAIL_ICON });

  if (channels.length === 0) return null;
  const isSingle = channels.length === 1;

  return (
    <div className="relative rounded-lg p-[2px]" style={{ background: 'linear-gradient(to right, #ff2eeb, #22c55e)' }}>
      <div className="rounded-lg p-4 md:p-6" style={{ background: '#141414' }}>
        <div className="flex items-baseline gap-3 mb-5">
          <h3 className="text-xs font-bold tracking-widest" style={{ color: '#ff2eeb' }}>WEEKLY TOUCHPOINTS</h3>
          {week && <span className="text-xs" style={{ color: '#555' }}>w/c {week}</span>}
        </div>
        <div
          className={
            isSingle
              ? 'flex items-center justify-center gap-6 py-2'
              : 'flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between'
          }
        >
          {channels.map((ch) => (
            <div key={ch.label} className="flex items-center gap-4">
              <div
                className={`rounded-lg flex items-center justify-center ${isSingle ? 'w-14 h-14 md:w-16 md:h-16' : 'w-11 h-11'}`}
                style={{ background: ch.iconBg }}
              >
                {ch.icon}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: '#888' }}>{ch.label}</p>
                <p className={`font-bold ${isSingle ? 'text-4xl md:text-5xl' : 'text-2xl'}`} style={{ color: '#fafafa' }}>{ch.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
