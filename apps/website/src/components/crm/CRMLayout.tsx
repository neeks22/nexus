'use client';

import { useState, Component, ErrorInfo, ReactNode } from 'react';
import dynamic from 'next/dynamic';

export type CRMTab = 'dashboard' | 'pipeline' | 'inbox' | 'leads' | 'credit' | 'reports';

const TABS: { id: CRMTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'leads', label: 'Leads' },
  { id: 'credit', label: 'Credit Router' },
  { id: 'reports', label: 'Reports' },
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
const LeadDetailPanel = dynamic(() => import('./LeadDetailPanel'), { ssr: false });

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
  const theme = BRAND_THEMES[tenant] || DEFAULT_THEME;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Red accent line at top */}
      <div style={{ height: '3px', background: `linear-gradient(90deg, ${theme.primary}, ${theme.primaryHover})` }} />

      {/* TOP NAV BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        background: '#0d0d14',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* Brand Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 20px 10px 0',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          marginRight: '8px',
        }}>
          {theme.logo ? (
            <img src={theme.logo} alt={dealerName} style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
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
              <span style={{ color: '#f0f0f5', fontWeight: 600, fontSize: '15px' }}>{dealerName}</span>
            </>
          )}
        </div>

        {/* Tab Buttons */}
        {TABS.map((tab) => (
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

        {/* Status indicator */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          <span style={{ color: '#555', fontSize: '12px' }}>Nexus AI Active</span>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div style={{ position: 'relative' }}>
        <TabErrorBoundary key={activeTab}>
          {activeTab === 'dashboard' && <DashboardTab tenant={tenant} onSelectLead={(p: string) => setSelectedLead(p)} />}
          {activeTab === 'pipeline' && <PipelineTab tenant={tenant} onSelectLead={(p: string) => setSelectedLead(p)} />}
          {activeTab === 'inbox' && (
            <div style={{ height: 'calc(100vh - 52px)', overflow: 'auto' }} className="crm-inbox-wrapper">
              <style>{`.crm-inbox-wrapper > div { min-height: auto !important; padding-top: 0 !important; } .crm-inbox-wrapper > div > div { height: calc(100vh - 52px) !important; max-width: 100% !important; padding: 12px !important; }`}</style>
              {inboxContent}
            </div>
          )}
          {activeTab === 'leads' && <LeadsTab tenant={tenant} onSelectLead={(p: string) => setSelectedLead(p)} />}
          {activeTab === 'credit' && (
            <div style={{ padding: '24px', overflowY: 'auto', height: 'calc(100vh - 52px)' }}>
              {creditRouterContent}
            </div>
          )}
          {activeTab === 'reports' && <ReportsTab tenant={tenant} />}
        </TabErrorBoundary>

        {selectedLead && (
          <LeadDetailPanel
            tenant={tenant}
            phone={selectedLead}
            onClose={() => setSelectedLead(null)}
          />
        )}
      </div>
    </div>
  );
}
