interface ROICardProps {
  revenue?: string;
  revenueNote?: string;
  pipeline?: string;
  pipelineNote?: string;
  pipelineCaption?: string;
}

export default function ROICard({
  revenue = 'N/A',
  revenueNote,
  pipeline = 'N/A',
  pipelineNote,
  pipelineCaption = '(Based on average order value)',
}: ROICardProps) {
  return (
    <div className="relative rounded-lg p-[2px]" style={{ background: 'linear-gradient(to right, #ff2eeb, #22c55e)' }}>
      <div className="rounded-lg p-4 md:p-6" style={{ background: '#141414' }}>
        <h3 className="text-xs font-bold tracking-widest mb-5" style={{ color: '#ff2eeb' }}>RETURN ON INVESTMENT</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(34,120,50,0.25)' }}
            >
              <span className="text-green-400 text-lg font-bold">£</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: '#888' }}>Revenue Generated</p>
              <p className="text-2xl font-bold" style={{ color: '#fafafa' }}>{revenue}</p>
              {revenueNote && <p className="text-[10px]" style={{ color: '#888' }}>{revenueNote}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(59,80,180,0.25)' }}
            >
              <svg className="w-5 h-5" style={{ color: '#818cf8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <circle cx="12" cy="12" r="6" strokeWidth="2" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: '#888' }}>Pipeline Value</p>
              {pipelineCaption && <p className="text-[10px]" style={{ color: '#555' }}>{pipelineCaption}</p>}
              <p className="text-2xl font-bold" style={{ color: '#fafafa' }}>{pipeline}</p>
              {pipelineNote && <p className="text-[10px]" style={{ color: '#888' }}>{pipelineNote}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
