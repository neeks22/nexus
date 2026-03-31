'use client';

import { useState } from 'react';

export type CRMTab = 'dashboard' | 'pipeline' | 'inbox' | 'leads' | 'credit' | 'reports';

interface SidebarProps {
  activeTab: CRMTab;
  onTabChange: (tab: CRMTab) => void;
  dealerName: string;
}

const TABS: { id: CRMTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '&#9632;' },
  { id: 'pipeline', label: 'Pipeline', icon: '&#9654;' },
  { id: 'inbox', label: 'Inbox', icon: '&#9993;' },
  { id: 'leads', label: 'Leads', icon: '&#9679;' },
  { id: 'credit', label: 'Credit Router', icon: '&#9733;' },
  { id: 'reports', label: 'Reports', icon: '&#9776;' },
];

export default function Sidebar({ activeTab, onTabChange, dealerName }: SidebarProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      width: collapsed ? '60px' : '220px',
      minHeight: '100vh',
      background: '#0d0d14',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: collapsed ? '16px 8px' : '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
      }} onClick={() => setCollapsed(!collapsed)}>
        <span style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '14px',
          flexShrink: 0,
        }}>{dealerName[0]}</span>
        {!collapsed && (
          <span style={{ color: '#f0f0f5', fontWeight: 600, fontSize: '15px', whiteSpace: 'nowrap' }}>
            {dealerName}
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ padding: '8px', flex: 1 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              width: '100%',
              padding: collapsed ? '12px 0' : '10px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: activeTab === tab.id ? '#818cf8' : '#8888a0',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              marginBottom: '2px',
              transition: 'all 0.15s ease',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
            title={tab.label}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: tab.icon }} />
            {!collapsed && <span>{tab.label}</span>}
          </button>
        ))}
      </nav>

      {/* Status */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#10b981', display: 'inline-block',
        }} />
        {!collapsed && <span style={{ color: '#666', fontSize: '12px' }}>Nexus AI Active</span>}
      </div>
    </div>
  );
}
