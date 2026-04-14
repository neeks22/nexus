'use client';

import { useState, useEffect, useCallback } from 'react';
import useIsMobile from './useIsMobile';

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
  new: '#DC2626',
  contacted: '#f59e0b',
  appointment: '#10b981',
  showed: '#06b6d4',
  credit_app: '#B91C1C',
  approved: '#22c55e',
  delivered: '#10b981',
  lost: '#ef4444',
};

const GRADE_COLORS: Record<string, string> = {
  'A+': '#10b981', 'A': '#10b981', 'A-': '#34d399',
  'B+': '#22c55e', 'B': '#22c55e', 'B-': '#86efac',
  'C+': '#f59e0b', 'C': '#f59e0b', 'C-': '#fbbf24',
  'D+': '#f97316', 'D': '#f97316', 'D-': '#fb923c',
  'F': '#ef4444',
};

function parseCreditGrade(credit: string): { grade: string; detail: string } | null {
  if (!credit) return null;
  // Format: "B+ | FICO 680 | Moderate utilization · No missed payments"
  const match = credit.match(/^([A-F][+-]?)\s*\|/);
  if (match) {
    const grade = match[1];
    const detail = credit.substring(match[0].length).trim();
    return { grade, detail };
  }
  return null;
}

export default function LeadsTab({ tenant, onSelectLead }: LeadsTabProps): React.ReactElement {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newLead, setNewLead] = useState({ first_name: '', last_name: '', phone: '', email: '', vehicle_type: '', credit_situation: '' });
  const [creating, setCreating] = useState(false);
  const isMobile = useIsMobile();

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

  const createLead = async (): Promise<void> => {
    if (!newLead.first_name || !newLead.phone) return;
    setCreating(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, type: 'create_lead', content: JSON.stringify(newLead), phone: newLead.phone }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewLead({ first_name: '', last_name: '', phone: '', email: '', vehicle_type: '', credit_situation: '' });
        fetchLeads();
      } else {
        alert('Failed to create lead');
      }
    } catch { alert('Failed to create lead'); }
    finally { setCreating(false); }
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', overflowY: 'auto', height: isMobile ? 'calc(100vh - 116px)' : '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ color: '#f0f0f5', fontSize: isMobile ? '18px' : '22px', fontWeight: 700, margin: 0 }}>Leads</h1>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '8px 18px', borderRadius: '8px', border: 'none',
          background: 'linear-gradient(135deg, #DC2626, #B91C1C)', color: '#fff',
          fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        }}>+ New Lead</button>
      </div>

      {/* Create Lead Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setShowCreate(false)}>
          <div style={{ background: '#1a1a2e', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#f0f0f5', margin: '0 0 20px', fontSize: '18px' }}>Create New Lead</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ color: '#8888a0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>First Name *</label>
                <input value={newLead.first_name} onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })} placeholder="John" autoFocus style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#8888a0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Last Name</label>
                <input value={newLead.last_name} onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })} placeholder="Smith" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#8888a0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Phone *</label>
                <input value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} placeholder="6131234567" type="tel" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#8888a0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Email</label>
                <input value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} placeholder="john@email.com" type="email" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#8888a0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Vehicle Interest</label>
                <input value={newLead.vehicle_type} onChange={(e) => setNewLead({ ...newLead, vehicle_type: e.target.value })} placeholder="SUV, Sedan, Truck..." style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#8888a0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Credit Situation</label>
                <select value={newLead.credit_situation} onChange={(e) => setNewLead({ ...newLead, credit_situation: e.target.value })} style={inputStyle}>
                  <option value="">Select...</option>
                  <option value="excellent">Excellent (750+)</option>
                  <option value="good">Good (700-749)</option>
                  <option value="fair">Fair (600-699)</option>
                  <option value="poor">Poor (500-599)</option>
                  <option value="very_poor">Very Poor (&lt;500)</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#8888a0', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createLead} disabled={!newLead.first_name || !newLead.phone || creating} style={{
                padding: '10px 24px', borderRadius: '8px', border: 'none',
                background: (newLead.first_name && newLead.phone) ? 'linear-gradient(135deg, #DC2626, #B91C1C)' : '#333',
                color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                opacity: (newLead.first_name && newLead.phone) ? 1 : 0.5,
              }}>{creating ? 'Creating...' : 'Create Lead'}</button>
            </div>
          </div>
        </div>
      )}

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
            background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
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
        {!isMobile && (
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
        )}

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No leads found</div>
        ) : isMobile ? (
          /* Mobile: card layout */
          leads.map((lead) => (
            <div
              key={lead.phone}
              onClick={() => onSelectLead(lead.phone)}
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ color: '#f0f0f5', fontSize: '14px', fontWeight: 500 }}>
                  {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'}
                </span>
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
              </div>
              <div style={{ display: 'flex', gap: '12px', color: '#8888a0', fontSize: '12px' }}>
                <span>{lead.phone}</span>
                {lead.vehicle_type && <span>{lead.vehicle_type}</span>}
                {(() => {
                  const parsed = parseCreditGrade(lead.credit_situation);
                  return parsed ? <span style={{ color: GRADE_COLORS[parsed.grade] || '#ccc', fontWeight: 600 }}>{parsed.grade}</span> : null;
                })()}
              </div>
            </div>
          ))
        ) : (
          /* Desktop: grid layout */
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
              <span style={{ fontSize: '13px' }}>
                {(() => {
                  const parsed = parseCreditGrade(lead.credit_situation);
                  if (parsed) {
                    return (
                      <span title={parsed.detail} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          background: GRADE_COLORS[parsed.grade] || '#666',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                        }}>{parsed.grade}</span>
                      </span>
                    );
                  }
                  return <span style={{ color: '#ccc' }}>{lead.credit_situation || '-'}</span>;
                })()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
  color: '#f0f0f5', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
};
