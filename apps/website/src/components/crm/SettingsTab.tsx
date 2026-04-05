'use client';

import { useState } from 'react';

interface UserInfo {
  name: string;
  email: string;
  role: string;
  tenant: string;
}

interface SettingsTabProps {
  user: UserInfo;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
  color: '#f0f0f5', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
};

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', manager: 'Manager', staff: 'Staff' };
const TENANT_LABELS: Record<string, string> = { readycar: 'ReadyCar', readyride: 'ReadyRide' };

export default function SettingsTab({ user }: SettingsTabProps): React.ReactElement {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (): Promise<void> => {
    setMessage(null);

    if (!currentPw || !newPw) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }
    if (newPw.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }
    if (newPw !== confirmPw) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (err) {
      console.error('Password change error:', err);
      setMessage({ type: 'error', text: 'Something went wrong' });
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 52px)', overflowY: 'auto' }}>
      <h1 style={{ color: '#f0f0f5', fontSize: '20px', fontWeight: 700, margin: '0 0 24px' }}>Settings</h1>

      {/* Profile Info */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px', marginBottom: '24px', maxWidth: '480px' }}>
        <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Profile</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <div style={{ color: '#8888a0', fontSize: '12px', marginBottom: '4px' }}>Name</div>
            <div style={{ color: '#f0f0f5', fontSize: '14px' }}>{user.name}</div>
          </div>
          <div>
            <div style={{ color: '#8888a0', fontSize: '12px', marginBottom: '4px' }}>Email</div>
            <div style={{ color: '#f0f0f5', fontSize: '14px' }}>{user.email}</div>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <div style={{ color: '#8888a0', fontSize: '12px', marginBottom: '4px' }}>Role</div>
              <div style={{ color: '#f0f0f5', fontSize: '14px' }}>{ROLE_LABELS[user.role] || user.role}</div>
            </div>
            <div>
              <div style={{ color: '#8888a0', fontSize: '12px', marginBottom: '4px' }}>Dealership</div>
              <div style={{ color: '#f0f0f5', fontSize: '14px' }}>{TENANT_LABELS[user.tenant] || user.tenant}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px', maxWidth: '480px' }}>
        <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Change Password</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <label style={{ color: '#8888a0', fontSize: '12px' }}>Current Password</label>
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} style={inputStyle} placeholder="Enter current password" />
          </div>
          <div>
            <label style={{ color: '#8888a0', fontSize: '12px' }}>New Password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={inputStyle} placeholder="Minimum 8 characters" />
          </div>
          <div>
            <label style={{ color: '#8888a0', fontSize: '12px' }}>Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={inputStyle} placeholder="Re-enter new password" />
          </div>
        </div>

        {message && (
          <div style={{
            marginTop: '12px', padding: '10px 12px', borderRadius: '8px', fontSize: '13px',
            background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            {message.text}
          </div>
        )}

        <button onClick={handleChangePassword} disabled={saving || !currentPw || !newPw || !confirmPw}
          style={{
            marginTop: '16px', padding: '10px 20px', borderRadius: '8px', border: 'none',
            background: (!currentPw || !newPw || !confirmPw) ? '#333' : '#DC2626',
            color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
          }}>
          {saving ? 'Saving...' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}
