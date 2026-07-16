'use client';

import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  lastUpdated: string | null;
  clientName: string;
}

export default function Header({ lastUpdated, clientName }: HeaderProps) {
  const time = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold tracking-tight">
          <span style={{ color: 'var(--color-brand)' }}>ORR</span>
          <span style={{ color: 'var(--color-text-primary)' }}>JO</span>
          <span style={{ color: 'var(--color-brand)' }}>.</span>
        </span>
        <span style={{ color: 'var(--color-text-fainter)' }}>|</span>
        <span className="text-base font-medium" style={{ color: 'var(--color-text-secondary)' }}>{clientName}</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
        <span style={{ color: 'var(--color-text-secondary)' }}>Live</span>
        <span style={{ color: 'var(--color-text-faint)' }}>Updated {time}</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
