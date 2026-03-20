'use client';

interface HeaderProps {
  lastUpdated: string | null;
  clientName: string;
}

export default function Header({ lastUpdated, clientName }: HeaderProps) {
  const time = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <header className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid #1e1e1e' }}>
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold tracking-tight">
          <span style={{ color: '#ff2eeb' }}>ORR</span>
          <span style={{ color: '#fafafa' }}>JO</span>
          <span style={{ color: '#ff2eeb' }}>.</span>
        </span>
        <span style={{ color: '#333' }}>|</span>
        <span className="text-base font-medium" style={{ color: '#b0b0b0' }}>{clientName}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
        <span style={{ color: '#b0b0b0' }}>Live</span>
        <span style={{ color: '#666' }}>Updated {time}</span>
      </div>
    </header>
  );
}
