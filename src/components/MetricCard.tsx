import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: ReactNode;
  borderColorHex: string;
}

export default function MetricCard({ title, value, subtitle, icon, borderColorHex }: MetricCardProps) {
  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: '#141414',
        border: '1px solid #252525',
        borderTop: `4px solid ${borderColorHex}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9a9a9a' }}>{title}</h4>
        <div style={{ color: '#666' }}>{icon}</div>
      </div>
      <p className="text-4xl font-bold mb-1" style={{ color: '#fafafa' }}>{value}</p>
      <p className="text-sm" style={{ color: '#666' }}>{subtitle}</p>
    </div>
  );
}
