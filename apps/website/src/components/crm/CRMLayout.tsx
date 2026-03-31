'use client';

import { useState } from 'react';
import Sidebar, { CRMTab } from './Sidebar';

interface CRMLayoutProps {
  tenant: string;
  dealerName: string;
  inboxContent: React.ReactNode;
  creditRouterContent: React.ReactNode;
}

// Lazy-load tab components to avoid circular imports
import DashboardTab from './DashboardTab';
import PipelineTab from './PipelineTab';
import LeadsTab from './LeadsTab';
import ReportsTab from './ReportsTab';
import LeadDetailPanel from './LeadDetailPanel';

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

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'dashboard' && <DashboardTab tenant={tenant} onSelectLead={handleSelectLead} />}
        {activeTab === 'pipeline' && <PipelineTab tenant={tenant} onSelectLead={handleSelectLead} />}
        {activeTab === 'inbox' && inboxContent}
        {activeTab === 'leads' && <LeadsTab tenant={tenant} onSelectLead={handleSelectLead} />}
        {activeTab === 'credit' && creditRouterContent}
        {activeTab === 'reports' && <ReportsTab tenant={tenant} />}

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
