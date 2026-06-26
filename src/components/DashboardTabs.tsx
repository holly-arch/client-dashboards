'use client';

export type DashboardTab = 'campaign' | 'roi';

interface DashboardTabsProps {
  selected: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}

const TABS: { value: DashboardTab; label: string }[] = [
  { value: 'campaign', label: 'Campaign' },
  { value: 'roi', label: 'ROI' },
];

export default function DashboardTabs({ selected, onChange }: DashboardTabsProps) {
  return (
    <div className="inline-flex w-fit self-start rounded-full p-1" style={{ background: '#141414', border: '1px solid #252525' }}>
      {TABS.map((t) => {
        const active = selected === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className="px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors"
            style={{
              background: active ? '#ff2eeb' : 'transparent',
              color: active ? '#fafafa' : '#b0b0b0',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
