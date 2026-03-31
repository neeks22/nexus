'use client';

import { useState, useEffect, useCallback } from 'react';

interface Lead {
  phone: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  vehicle_type: string;
  credit_situation: string;
  budget: string;
  created_at: string;
}

interface LeadsTabProps {
  tenant: string;
  onSelectLead: (phone: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  new: '#6366f1',
  contacted: '#f59e0b',
  appointment: '#10b981',
  showed: '#06b6d4',
  credit_app: '#8b5cf6',
  approved: '#22c55e',
  delivered: '#10b981',
  lost: '#ef4444',
};

export default function LeadsTab({ tenant, onSelectLead }: LeadsTabProps): React.ReactElement {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchLeads = useCallback(async (): Promise<void> => {
    try {
      let url = `/api/leads?tenant=${tenant}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [tenant, search, filterStatus]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100vh' }}>
      <h1 style={{ color: '#f0f0f5', fontSize: '22px', fontWeight: 700, margin: '0 0 16px' }}>Leads</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
          style={{
            flex: '1 1 250px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: '#f0f0f5',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: '#f0f0f5',
            fontSize: '14px',
            outline: 'none',
          }}
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="appointment">Appointment</option>
          <option value="showed">Showed</option>
          <option value="credit_app">Credit App</option>
          <option value="approved">Approved</option>
          <option value="delivered">Delivered</option>
          <option value="lost">Lost</option>
        </select>
        <button
          onClick={fetchLeads}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >Search</button>
      </div>

      {/* Table */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr 1fr 0.8fr',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          color: '#8888a0',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          <span>Name</span>
          <span>Phone</span>
          <span>Email</span>
          <span>Status</span>
          <span>Vehicle</span>
          <span>Credit</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No leads found</div>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.phone}
              onClick={() => onSelectLead(lead.phone)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr 1fr 0.8fr',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: '#f0f0f5', fontSize: '14px' }}>
                {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'}
              </span>
              <span style={{ color: '#ccc', fontSize: '13px' }}>{lead.phone}</span>
              <span style={{ color: '#ccc', fontSize: '13px' }}>{lead.email || '-'}</span>
              <span>
                <span style={{
                  background: STATUS_COLORS[lead.status] || '#666',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}>
                  {lead.status || 'new'}
                </span>
              </span>
              <span style={{ color: '#ccc', fontSize: '13px' }}>{lead.vehicle_type || '-'}</span>
              <span style={{ color: '#ccc', fontSize: '13px' }}>{lead.credit_situation || '-'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
