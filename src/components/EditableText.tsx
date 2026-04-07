'use client';

import { useState, useRef, useEffect } from 'react';

interface EditableTextProps {
  value: string;
  sheetRowIndex: number;
  field: string;
  placeholder?: string;
  onSaved?: () => void;
}

export default function EditableText({ value, sheetRowIndex, field, placeholder = 'Add note...', onSaved }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setCurrent(value), [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    setEditing(false);
    if (current === value) return; // No change
    setSaving(true);
    try {
      const password = localStorage.getItem('dashboard_auth') || '';
      await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dashboard-password': password },
        body: JSON.stringify({ sheetRowIndex, field, value: current }),
      });
      onSaved?.();
    } catch {
      setCurrent(value); // Revert
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setCurrent(value); setEditing(false); } }}
        className="w-full px-2 py-1 rounded text-xs outline-none"
        style={{ background: '#1a1a1a', border: '1px solid #ff2eeb', color: '#fafafa' }}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left px-2 py-1 rounded text-xs truncate cursor-pointer hover:bg-white/[0.05] transition-colors"
      style={{
        color: current ? '#b0b0b0' : '#555',
        border: '1px solid transparent',
        opacity: saving ? 0.5 : 1,
      }}
    >
      {current || placeholder}
    </button>
  );
}
