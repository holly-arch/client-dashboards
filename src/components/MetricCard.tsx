import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: ReactNode;
  borderColorHex: string;
}

export default function MetricCard({ title, value, subtitle, icon, borderColorHex }: MetricCardProps) {
  return (
    <div
      className="rounded-lg p-4 md:p-5"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderTop: `4px solid ${borderColorHex}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>{title}</h4>
        <div style={{ color: 'var(--color-text-faint)' }}>{icon}</div>
      </div>
      <p className="text-4xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{subtitle}</p>
    </div>
  );
}
