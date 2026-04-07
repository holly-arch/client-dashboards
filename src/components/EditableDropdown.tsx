'use client';

import { useState, useRef, useEffect } from 'react';

const SHORT_STATUS_OPTIONS = [
  'Cancelled',
  'ORRJO Reschedule',
  'Upcoming',
  'With Ctrack',
  'With Optix',
  'With Stefan',
];

interface EditableDropdownProps {
  value: string;
  sheetRowIndex: number;
  field: string;
  onSaved?: () => void;
}

export default function EditableDropdown({ value, sheetRowIndex, field, onSaved }: EditableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setCurrent(value), [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const save = async (newValue: string) => {
    setCurrent(newValue);
    setOpen(false);
    setSaving(true);
    try {
      const password = localStorage.getItem('dashboard_auth') || '';
      await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dashboard-password': password },
        body: JSON.stringify({ sheetRowIndex, field, value: newValue }),
      });
      onSaved?.();
    } catch {
      // Revert on error
      setCurrent(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap cursor-pointer transition-opacity"
        style={{
          background: current ? 'rgba(255,46,235,0.10)' : 'rgba(120,120,120,0.10)',
          color: current ? '#ff2eeb' : '#666',
          border: `1px solid ${current ? 'rgba(255,46,235,0.30)' : 'rgba(120,120,120,0.30)'}`,
          opacity: saving ? 0.5 : 1,
        }}
      >
        {current || 'Select...'}
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 rounded-lg py-1 shadow-lg"
          style={{ background: '#1e1e1e', border: '1px solid #333', minWidth: '160px' }}
        >
          {SHORT_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => save(opt)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/[0.05] transition-colors"
              style={{ color: opt === current ? '#ff2eeb' : '#b0b0b0' }}
            >
              {opt}
            </button>
          ))}
          {current && (
            <button
              onClick={() => save('')}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/[0.05] transition-colors"
              style={{ color: '#666', borderTop: '1px solid #333' }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
