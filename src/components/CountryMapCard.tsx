'use client';

import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';

import worldAtlas from 'world-atlas/countries-110m.json';

interface CountryRow {
  name: string;
  activeUsers: number;
}

interface CountryMapCardProps {
  countries: CountryRow[];
}

// GA's country names sometimes differ from the world-atlas TopoJSON's name field.
// Map GA → TopoJSON for the well-known mismatches; everything else matches directly.
const NAME_ALIASES: Record<string, string> = {
  'United States': 'United States of America',
  'Tanzania': 'United Republic of Tanzania',
  'Congo - Brazzaville': 'Republic of the Congo',
  'Congo - Kinshasa': 'Democratic Republic of the Congo',
  'Czechia': 'Czech Republic',
  'Côte d’Ivoire': 'Ivory Coast',
  "Cote d'Ivoire": 'Ivory Coast',
  'Myanmar (Burma)': 'Myanmar',
  'Bahamas': 'The Bahamas',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'Trinidad & Tobago': 'Trinidad and Tobago',
  'Antigua & Barbuda': 'Antigua and Barbuda',
  'St. Lucia': 'Saint Lucia',
  'St. Vincent & Grenadines': 'Saint Vincent and the Grenadines',
  'St. Kitts & Nevis': 'Saint Kitts and Nevis',
  'Eswatini': 'Swaziland',
  'North Macedonia': 'Macedonia',
  'Timor-Leste': 'East Timor',
  'São Tomé & Príncipe': 'Sao Tome and Principe',
  'Cape Verde': 'Cabo Verde',
};

function canonicalName(gaName: string): string {
  return NAME_ALIASES[gaName] ?? gaName;
}

interface RankedListProps {
  rows: CountryRow[];
  highlightedName: string | null;
  onHover: (name: string | null) => void;
}

function RankedList({ rows, highlightedName, onHover }: RankedListProps) {
  const top = rows.slice(0, 8);
  const max = Math.max(1, ...top.map((r) => r.activeUsers));
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
      <h4 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--color-text-muted)' }}>Top Countries</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
            <th className="text-left py-1.5 pr-3 font-medium">Country</th>
            <th className="text-right py-1.5 font-medium">Users</th>
          </tr>
        </thead>
        <tbody className="divide-subtle">
          {top.map((r) => {
            const isActive = canonicalName(r.name) === highlightedName;
            return (
              <tr
                key={r.name}
                onMouseEnter={() => onHover(canonicalName(r.name))}
                onMouseLeave={() => onHover(null)}
                style={{ background: isActive ? 'rgba(255,46,235,0.08)' : 'transparent' }}
              >
                <td className="py-1.5 pr-3 truncate max-w-[160px]" style={{ color: 'var(--color-text-primary)' }} title={r.name}>{r.name}</td>
                <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1 rounded-full" style={{ width: `${(r.activeUsers / max) * 50}px`, background: 'rgba(255,46,235,0.4)' }} />
                    <span>{r.activeUsers.toLocaleString('en-GB')}</span>
                  </div>
                </td>
              </tr>
            );
          })}
          {top.length === 0 && (
            <tr><td colSpan={2} className="py-6 text-center" style={{ color: 'var(--color-text-fainter)' }}>No data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface GeographyProperties {
  name?: string;
}

export default function CountryMapCard({ countries }: CountryMapCardProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Build a name → users lookup using the canonicalised (alias-corrected) name.
  const usersByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of countries) m.set(canonicalName(c.name), c.activeUsers);
    return m;
  }, [countries]);

  const max = useMemo(() => Math.max(1, ...countries.map((c) => c.activeUsers)), [countries]);

  // Use a log-like progression so a few dominant countries don't wash out the rest.
  const colorScale = useMemo(
    () =>
      scaleLinear<string>()
        .domain([0, max * 0.05, max * 0.2, max])
        .range(['var(--color-card-alt)', '#3a1535', '#a01e8c', '#ff2eeb'])
        .clamp(true),
    [max],
  );

  const totalUsers = countries.reduce((sum, c) => sum + c.activeUsers, 0);

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-xs font-bold tracking-widest" style={{ color: '#ff2eeb' }}>USERS BY COUNTRY</h3>
        <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{totalUsers.toLocaleString('en-GB')} active users</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg overflow-hidden" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
          <ComposableMap
            projectionConfig={{ scale: 130 }}
            width={800}
            height={400}
            style={{ width: '100%', height: 'auto' }}
          >
            <Geographies geography={worldAtlas}>
              {({ geographies }: { geographies: { rsmKey: string; properties: GeographyProperties }[] }) =>
                geographies.map((geo) => {
                  const name = geo.properties.name ?? '';
                  const users = usersByName.get(name) ?? 0;
                  const fill = users > 0 ? colorScale(users) : 'var(--color-border)';
                  const isHovered = hovered === name;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke="#0a0a0a"
                      strokeWidth={0.5}
                      onMouseEnter={() => setHovered(name)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: isHovered ? '#ff2eeb' : fill, outline: 'none', cursor: users > 0 ? 'pointer' : 'default' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
          {hovered && (
            <div className="px-3 py-2 text-xs" style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
              {hovered}{usersByName.has(hovered) ? ` — ${usersByName.get(hovered)!.toLocaleString('en-GB')} users` : ''}
            </div>
          )}
        </div>
        <RankedList rows={countries} highlightedName={hovered} onHover={setHovered} />
      </div>
    </div>
  );
}
