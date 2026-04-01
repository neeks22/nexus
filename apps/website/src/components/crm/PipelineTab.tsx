'use client';

import { useState, useEffect, useCallback } from 'react';
import KanbanBoard from './KanbanBoard';

interface Lead {
  phone: string;
  first_name: string;
  last_name: string;
  status: string;
  vehicle_type: string;
  created_at: string;
}

interface PipelineTabProps {
  tenant: string;
  onSelectLead: (phone: string) => void;
}

export default function PipelineTab({ tenant, onSelectLead }: PipelineTabProps): React.ReactElement {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/leads?tenant=${tenant}&limit=500`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('Pipeline fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleMoveLead = async (phone: string, newStatus: string): Promise<void> => {
    // Optimistic update
    setLeads((prev) => prev.map((l) => (l.phone === phone ? { ...l, status: newStatus } : l)));

    // Persist
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, status: newStatus, tenant }),
      });
      if (!res.ok) throw new Error('Failed to update lead status');
    } catch (err) {
      console.error('Failed to update lead status:', err);
      fetchLeads(); // Revert on failure
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading pipeline...</div>;
  }

  return (
    <div style={{ padding: '24px', height: '100vh', overflow: 'hidden' }}>
      <h1 style={{ color: '#f0f0f5', fontSize: '22px', fontWeight: 700, margin: '0 0 16px' }}>Pipeline</h1>
      <KanbanBoard leads={leads} onMoveLead={handleMoveLead} onSelectLead={onSelectLead} />
    </div>
  );
}
