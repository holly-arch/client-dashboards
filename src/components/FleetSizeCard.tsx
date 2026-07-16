interface FleetSizeCardProps {
  avgFleetSize: number;
}

export default function FleetSizeCard({ avgFleetSize }: FleetSizeCardProps) {
  return (
    <div className="rounded-lg p-[2px] inline-block w-full sm:w-auto sm:min-w-[260px]" style={{ background: 'linear-gradient(to right, #ff2eeb, #22c55e)' }}>
      <div className="rounded-lg p-4" style={{ background: 'var(--color-card)' }}>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h3 className="text-xs font-bold tracking-widest" style={{ color: '#ff2eeb' }}>AVG FLEET SIZE</h3>
          <span className="text-[10px]" style={{ color: 'var(--color-text-fainter)' }}>booked meetings</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.2)' }}>
            <svg className="w-5 h-5" style={{ color: '#60a5fa' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M3 13l2-5a2 2 0 012-2h10a2 2 0 012 2l2 5M5 13h14M5 13v5a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-5" />
              <circle cx="7.5" cy="16.5" r="1" />
              <circle cx="16.5" cy="16.5" r="1" />
            </svg>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Vehicles</p>
            <p className="text-3xl font-bold leading-none mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{avgFleetSize.toLocaleString('en-GB')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
