'use client';

import { useState, Component, ErrorInfo, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Sidebar, { CRMTab } from './Sidebar';

// Error boundary to catch crashes in any tab
class TabErrorBoundary extends Component<{ children: ReactNode; fallback?: string }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode; fallback?: string }) {
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

// Dynamic imports — prevents one broken component from killing everything
const DashboardTab = dynamic(() => import('./DashboardTab'), { ssr: false, loading: () => <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading dashboard...</div> });
const PipelineTab = dynamic(() => import('./PipelineTab'), { ssr: false, loading: () => <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading pipeline...</div> });
const LeadsTab = dynamic(() => import('./LeadsTab'), { ssr: false, loading: () => <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading leads...</div> });
const ReportsTab = dynamic(() => import('./ReportsTab'), { ssr: false, loading: () => <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading reports...</div> });
const LeadDetailPanel = dynamic(() => import('./LeadDetailPanel'), { ssr: false });

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

  const handleSelectLead = (phone: string): void => {
    setSelectedLead(phone);
  };

  const handleCloseLead = (): void => {
    setSelectedLead(null);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} dealerName={dealerName} />

      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <TabErrorBoundary key={activeTab}>
          {activeTab === 'dashboard' && <DashboardTab tenant={tenant} onSelectLead={handleSelectLead} />}
          {activeTab === 'pipeline' && <PipelineTab tenant={tenant} onSelectLead={handleSelectLead} />}
          {activeTab === 'inbox' && (
            <div style={{ height: '100vh', overflow: 'auto' }} className="crm-inbox-wrapper">
              <style>{`.crm-inbox-wrapper > div { min-height: auto !important; padding-top: 0 !important; } .crm-inbox-wrapper > div > div { height: 100vh !important; max-width: 100% !important; padding: 12px !important; }`}</style>
              {inboxContent}
            </div>
          )}
          {activeTab === 'leads' && <LeadsTab tenant={tenant} onSelectLead={handleSelectLead} />}
          {activeTab === 'credit' && (
            <div style={{ padding: '24px', overflowY: 'auto', height: '100vh' }}>
              {creditRouterContent}
            </div>
          )}
          {activeTab === 'reports' && <ReportsTab tenant={tenant} />}
        </TabErrorBoundary>

        {selectedLead && (
          <LeadDetailPanel
            tenant={tenant}
            phone={selectedLead}
            onClose={handleCloseLead}
          />
        )}
      </div>
    </div>
  );
}
