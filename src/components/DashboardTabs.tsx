'use client';

export type DashboardTab = 'campaign' | 'roi' | 'hubspot' | 'analytics';

interface TabDef {
  value: DashboardTab;
  label: string;
}

interface DashboardTabsProps {
  selected: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  tabs?: TabDef[];
}

const DEFAULT_TABS: TabDef[] = [
  { value: 'campaign', label: 'Campaign' },
  { value: 'roi', label: 'ROI' },
];

export default function DashboardTabs({ selected, onChange, tabs = DEFAULT_TABS }: DashboardTabsProps) {
  return (
    <div className="inline-flex w-fit self-start rounded-full p-1" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      {tabs.map((t) => {
        const active = selected === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className="px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors"
            style={{
              background: active ? '#ff2eeb' : 'transparent',
              color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
