'use client';

import { WebinarRegistrant } from '@/lib/types';

interface WebinarRegistrantsSectionProps {
  registrants: WebinarRegistrant[];
}

export default function WebinarRegistrantsSection({ registrants }: WebinarRegistrantsSectionProps) {
  // Newest entries (bottom of sheet) shown first — mirrors WebsiteInbounds + WarmLeads.
  const ordered = [...registrants].reverse();
  const hasQuestion = registrants.some((r) => r.question && r.question.trim());

  return (
    <div className="rounded-lg p-4 md:p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-xs font-bold tracking-widest" style={{ color: '#ff2eeb' }}>TECH TALK WEBINAR REGISTRANTS</h3>
        <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{registrants.length} registered</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
              <th className="text-left py-2 pr-3 font-medium">First Name</th>
              <th className="text-left py-2 pr-3 font-medium">Last Name</th>
              <th className="text-left py-2 pr-3 font-medium">Organisation</th>
              <th className="text-left py-2 pr-3 font-medium">Job Title</th>
              {hasQuestion && <th className="text-left py-2 font-medium">Question Asked</th>}
            </tr>
          </thead>
          <tbody className="divide-subtle">
            {ordered.map((r) => (
              <tr key={r.id} className="row-hover align-top">
                <td className="py-3 pr-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.firstName || '—'}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-secondary)' }}>{r.lastName || '—'}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-primary)' }}>{r.organisation || '—'}</td>
                <td className="py-3 pr-3" style={{ color: 'var(--color-text-secondary)' }}>{r.jobTitle || '—'}</td>
                {hasQuestion && (
                  <td className="py-3 max-w-[360px] whitespace-pre-wrap break-words" style={{ color: 'var(--color-text-muted)' }}>{r.question || '—'}</td>
                )}
              </tr>
            ))}
            {ordered.length === 0 && (
              <tr><td colSpan={hasQuestion ? 5 : 4} className="py-8 text-center" style={{ color: 'var(--color-text-fainter)' }}>No registrants yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {ordered.map((r) => (
          <div key={r.id} className="rounded-lg p-3" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}>
            <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{r.firstName} {r.lastName}</p>
            {r.organisation && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{r.organisation}</p>}
            {r.jobTitle && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{r.jobTitle}</p>}
            {r.question && r.question.trim() && (
              <p className="text-xs mt-2 whitespace-pre-wrap break-words" style={{ color: 'var(--color-text-muted)' }}>
                <span style={{ color: 'var(--color-text-faint)' }}>Q: </span>{r.question}
              </p>
            )}
          </div>
        ))}
        {ordered.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-fainter)' }}>No registrants yet</p>
        )}
      </div>
    </div>
  );
}
