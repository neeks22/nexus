'use client';

import KanbanBoard from './KanbanBoard';
import { useLeads, useUpdateLeadStatus } from '@/hooks/use-leads';

interface PipelineTabProps {
  tenant: string;
  onSelectLead: (phone: string) => void;
}

export default function PipelineTab({ tenant, onSelectLead }: PipelineTabProps): React.ReactElement {
  const { data: leads = [], isLoading } = useLeads(tenant, { search: '', status: '' });
  const updateStatus = useUpdateLeadStatus(tenant);

  const handleMoveLead = async (phone: string, newStatus: string): Promise<void> => {
    try {
      await updateStatus.mutateAsync({ phone, status: newStatus });
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading pipeline...</div>;
  }

  return (
    <div style={{ padding: '24px', height: '100vh', overflow: 'hidden' }}>
      <h1 style={{ color: '#f0f0f5', fontSize: '22px', fontWeight: 700, margin: '0 0 16px' }}>Pipeline</h1>
      <KanbanBoard leads={leads} onMoveLead={handleMoveLead} onSelectLead={onSelectLead} />
    </div>
  );
}
