'use client';

import { useState, useEffect, useRef } from 'react';

interface ProfileDropdownProps {
  userName: string;
  userRole: string;
  onSettings: () => void;
  onLogout: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
};

export default function ProfileDropdown({ userName, userRole, onSettings, onLogout }: ProfileDropdownProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const initial = userName ? userName[0].toUpperCase() : '?';
  const firstName = userName ? userName.split(' ')[0] : 'User';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
          background: open ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{
          width: '28px', height: '28px', borderRadius: '50%', background: '#DC2626',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '12px', fontWeight: 700,
        }}>{initial}</span>
        <span style={{ color: '#f0f0f5', fontSize: '13px', fontWeight: 500 }}>{firstName}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '6px', width: '200px',
          background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden', zIndex: 100,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ color: '#f0f0f5', fontSize: '14px', fontWeight: 600 }}>{userName}</div>
            <div style={{ color: '#8888a0', fontSize: '11px', marginTop: '2px' }}>{ROLE_LABELS[userRole] || userRole}</div>
          </div>
          <button onClick={() => { setOpen(false); onSettings(); }} style={{
            width: '100%', padding: '10px 16px', background: 'transparent', border: 'none',
            color: '#ccc', fontSize: '13px', textAlign: 'left', cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >Settings</button>
          <button onClick={() => { setOpen(false); onLogout(); }} style={{
            width: '100%', padding: '10px 16px', background: 'transparent', border: 'none',
            color: '#ef4444', fontSize: '13px', textAlign: 'left', cursor: 'pointer',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >Sign Out</button>
        </div>
      )}
    </div>
  );
}
