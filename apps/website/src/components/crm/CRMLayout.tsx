'use client';

import { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import CRMQueryProvider from '@/lib/query-provider';
import ProfileDropdown from './ProfileDropdown';
import useIsMobile from './useIsMobile';

export type CRMTab = 'dashboard' | 'pipeline' | 'inbox' | 'leads' | 'credit' | 'reports' | 'inventory' | 'appointments' | 'deals' | 'settings';

const TABS: { id: CRMTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'pipeline', label: 'Pipeline', icon: '🔀' },
  { id: 'inbox', label: 'Inbox', icon: '💬' },
  { id: 'leads', label: 'Leads', icon: '👥' },
  { id: 'inventory', label: 'Inventory', icon: '🚗' },
  { id: 'appointments', label: 'Appts', icon: '📅' },
  { id: 'deals', label: 'Deals', icon: '💰' },
  { id: 'credit', label: 'Credit', icon: '💳' },
  { id: 'reports', label: 'Reports', icon: '📈' },
];

class TabErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error): { hasError: boolean; error: string } {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('CRM Tab Error:', error, info);
  }
  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ color: '#ef4444', fontSize: '16px', marginBottom: '8px' }}>Something went wrong</div>
          <div style={{ color: '#666', fontSize: '13px' }}>{this.state.error}</div>
          <button
            onClick={() => this.setState({ hasError: false, error: '' })}
            style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', cursor: 'pointer' }}
          >Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const DashboardTab = dynamic(() => import('./DashboardTab'), { ssr: false, loading: () => <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading dashboard...</div> });
const PipelineTab = dynamic(() => import('./PipelineTab'), { ssr: false, loading: () => <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading pipeline...</div> });
const LeadsTab = dynamic(() => import('./LeadsTab'), { ssr: false, loading: () => <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading leads...</div> });
const ReportsTab = dynamic(() => import('./ReportsTab'), { ssr: false, loading: () => <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading reports...</div> });
const InventoryTab = dynamic(() => import('./InventoryTab'), { ssr: false, loading: () => <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading inventory...</div> });
const AppointmentsTab = dynamic(() => import('./AppointmentsTab'), { ssr: false, loading: () => <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading appointments...</div> });
const DealsTab = dynamic(() => import('./DealsTab'), { ssr: false, loading: () => <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading deals...</div> });
const SettingsTab = dynamic(() => import('./SettingsTab'), { ssr: false, loading: () => <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading settings...</div> });
const LeadDetailPanel = dynamic(() => import('./LeadDetailPanel'), { ssr: false });
const InstallPrompt = dynamic(() => import('./InstallPrompt'), { ssr: false });

interface BrandTheme {
  primary: string;
  primaryHover: string;
  primaryGlow: string;
  logo: string;
}

const BRAND_THEMES: Record<string, BrandTheme> = {
  readycar: {
    primary: '#DC2626',
    primaryHover: '#B91C1C',
    primaryGlow: 'rgba(220, 38, 38, 0.3)',
    logo: '/readycar-logo-real.png',
  },
  readyride: {
    primary: '#DC2626',
    primaryHover: '#B91C1C',
    primaryGlow: 'rgba(220, 38, 38, 0.3)',
    logo: '/readyride-logo-real.png',
  },
};

const DEFAULT_THEME: BrandTheme = {
  primary: '#DC2626',
  primaryHover: '#B91C1C',
  primaryGlow: 'rgba(220, 38, 38, 0.3)',
  logo: '',
};

interface CRMLayoutProps {
  tenant: string;
  dealerName: string;
  inboxContent: ReactNode;
  creditRouterContent: ReactNode;
}

export default function CRMLayout({
  tenant,
  dealerName,
  inboxContent,
  creditRouterContent,
}: CRMLayoutProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<CRMTab>('dashboard');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string; email: string; role: string; tenant_id: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const theme = BRAND_THEMES[tenant] || DEFAULT_THEME;
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch('/api/auth').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.authenticated && data.user) setUser(data.user);
    }).catch(err => console.error('Failed to fetch user:', err));
  }, []);

  // Primary tabs shown in mobile bottom bar (most used)
  const PRIMARY_TABS = TABS.filter(t => ['dashboard', 'inbox', 'leads', 'pipeline', 'deals'].includes(t.id));
  const MORE_TABS = TABS.filter(t => !['dashboard', 'inbox', 'leads', 'pipeline', 'deals'].includes(t.id));

  const contentPaddingBottom = isMobile ? '64px' : '0';

  return (
    <CRMQueryProvider>
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Red accent line at top */}
      <div style={{ height: '3px', background: `linear-gradient(90deg, ${theme.primary}, ${theme.primaryHover})` }} />

      {/* TOP NAV BAR — desktop: full tabs, mobile: compact header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        background: '#0d0d14',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: isMobile ? '0 12px' : '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* Brand Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '12px',
          padding: isMobile ? '10px 8px 10px 0' : '10px 20px 10px 0',
          borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
          marginRight: isMobile ? '0' : '8px',
        }}>
          {theme.logo ? (
            <img src={theme.logo} alt={dealerName} style={{ height: isMobile ? '28px' : '36px', width: 'auto', objectFit: 'contain' }} />
          ) : (
            <>
              <span style={{
                background: theme.primary,
                color: '#fff',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '13px',
              }}>{dealerName[0]}</span>
              {!isMobile && <span style={{ color: '#f0f0f5', fontWeight: 600, fontSize: '15px' }}>{dealerName}</span>}
            </>
          )}
        </div>

        {/* Desktop Tab Buttons */}
        {!isMobile && TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '16px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${theme.primary}` : '2px solid transparent',
              color: activeTab === tab.id ? '#f0f0f5' : '#8888a0',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}

        {/* Mobile: show active tab name */}
        {isMobile && (
          <span style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, marginLeft: '12px' }}>
            {TABS.find(t => t.id === activeTab)?.label}
          </span>
        )}

        {/* Right side: status + profile */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px', padding: '0 8px' }}>
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              <span style={{ color: '#555', fontSize: '11px' }}>AI Active</span>
            </div>
          )}
          {user && (
            <ProfileDropdown
              userName={user.name}
              userRole={user.role}
              onSettings={() => setActiveTab('settings')}
              onLogout={async () => {
                await fetch('/api/auth', { method: 'DELETE' });
                window.location.href = '/login';
              }}
            />
          )}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div style={{ position: 'relative', paddingBottom: contentPaddingBottom }}>
        <TabErrorBoundary key={activeTab}>
          {activeTab === 'dashboard' && <DashboardTab tenant={tenant} onSelectLead={(p: string) => setSelectedLead(p)} />}
          {activeTab === 'pipeline' && <PipelineTab tenant={tenant} onSelectLead={(p: string) => setSelectedLead(p)} />}
          {activeTab === 'inbox' && (
            <div style={{ height: isMobile ? 'calc(100vh - 116px)' : 'calc(100vh - 52px)', overflow: 'auto' }} className="crm-inbox-wrapper">
              <style>{`.crm-inbox-wrapper > div { min-height: auto !important; padding-top: 0 !important; } .crm-inbox-wrapper > div > div { height: ${isMobile ? 'calc(100vh - 116px)' : 'calc(100vh - 52px)'} !important; max-width: 100% !important; padding: 12px !important; }`}</style>
              {inboxContent}
            </div>
          )}
          {activeTab === 'leads' && <LeadsTab tenant={tenant} onSelectLead={(p: string) => setSelectedLead(p)} />}
          {activeTab === 'credit' && (
            <div style={{ padding: isMobile ? '16px' : '24px', overflowY: 'auto', height: isMobile ? 'calc(100vh - 116px)' : 'calc(100vh - 52px)' }}>
              {creditRouterContent}
            </div>
          )}
          {activeTab === 'inventory' && <InventoryTab tenant={tenant} onSelectLead={(p: string) => setSelectedLead(p)} />}
          {activeTab === 'appointments' && <AppointmentsTab tenant={tenant} onSelectLead={(p: string) => setSelectedLead(p)} />}
          {activeTab === 'deals' && <DealsTab tenant={tenant} onSelectLead={(p: string) => setSelectedLead(p)} />}
          {activeTab === 'reports' && <ReportsTab tenant={tenant} />}
          {activeTab === 'settings' && user && <SettingsTab user={{ name: user.name, email: user.email, role: user.role, tenant }} />}
        </TabErrorBoundary>

        {selectedLead && (
          <LeadDetailPanel
            tenant={tenant}
            phone={selectedLead}
            onClose={() => setSelectedLead(null)}
          />
        )}
      </div>

      {/* PWA Install Prompt */}
      {isMobile && <InstallPrompt />}

      {/* MOBILE BOTTOM TAB BAR */}
      {isMobile && (
        <>
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#0d0d14',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 50,
            height: '60px',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
            {PRIMARY_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '8px 0',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: activeTab === tab.id ? theme.primary : '#8888a0',
                }}
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>{tab.icon}</span>
                <span style={{ fontSize: '10px', fontWeight: activeTab === tab.id ? 600 : 400 }}>{tab.label}</span>
              </button>
            ))}
            {/* More button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '8px 0',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: mobileMenuOpen || MORE_TABS.some(t => t.id === activeTab) ? theme.primary : '#8888a0',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>...</span>
              <span style={{ fontSize: '10px', fontWeight: mobileMenuOpen ? 600 : 400 }}>More</span>
            </button>
          </div>

          {/* More menu overlay */}
          {mobileMenuOpen && (
            <div
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: '60px', background: 'rgba(0,0,0,0.5)', zIndex: 49 }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: '#1a1a2e',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px 16px 0 0',
                  padding: '16px',
                }}
                onClick={e => e.stopPropagation()}
              >
                {MORE_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '14px 12px',
                      background: activeTab === tab.id ? 'rgba(220,38,38,0.1)' : 'transparent',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      color: activeTab === tab.id ? theme.primary : '#f0f0f5',
                      fontSize: '15px',
                      fontWeight: activeTab === tab.id ? 600 : 400,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </CRMQueryProvider>
  );
}
