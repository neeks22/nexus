'use client';

import { useState, useEffect } from 'react';
import ActivityTimeline from './ActivityTimeline';

interface LeadDetailPanelProps {
  tenant: string;
  phone: string;
  onClose: () => void;
}

interface LeadData {
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

interface TimelineEntry {
  id: string;
  time: string;
  role: string;
  channel: string;
  content: string;
}

export default function LeadDetailPanel({ tenant, phone, onClose }: LeadDetailPanelProps): React.ReactElement {
  const [lead, setLead] = useState<LeadData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const [leadRes, timelineRes] = await Promise.all([
          fetch(`/api/leads?tenant=${tenant}&search=${encodeURIComponent(phone)}&limit=1`),
          fetch(`/api/messages?tenant=${tenant}&phone=${encodeURIComponent(phone)}`),
        ]);

        if (leadRes.ok) {
          const data = await leadRes.json();
          if (data.leads?.length > 0) setLead(data.leads[0]);
        }

        if (timelineRes.ok) {
          const data = await timelineRes.json();
          const conv = data.conversation;
          if (conv?.messages) {
            setTimeline(conv.messages.map((m: { sid: string; dateSent: string; direction: string; body: string }, i: number) => ({
              id: m.sid || String(i),
              time: new Date(m.dateSent).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
              role: m.direction === 'inbound' ? 'customer' : 'ai',
              channel: 'sms',
              content: m.body,
            })));
          }
        }
      } catch (err) {
        console.error('Lead detail fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [tenant, phone]);

  const name = lead ? [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown' : phone;

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: '480px',
      maxWidth: '100vw',
      background: '#12121f',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-10px 0 40px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ color: '#f0f0f5', fontSize: '18px', fontWeight: 600 }}>{name}</div>
          <div style={{ color: '#8888a0', fontSize: '13px' }}>{phone}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#8888a0',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >Close</button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Lead Info Cards */}
          {lead && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <InfoCard label="Status" value={lead.status || 'new'} />
                <InfoCard label="Vehicle" value={lead.vehicle_type || 'Not specified'} />
                <InfoCard label="Credit" value={lead.credit_situation || 'Unknown'} />
                <InfoCard label="Budget" value={lead.budget || 'Not specified'} />
                <InfoCard label="Email" value={lead.email || 'None'} />
                <InfoCard label="Since" value={new Date(lead.created_at).toLocaleDateString()} />
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>Activity</h3>
          <ActivityTimeline entries={timeline} />
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '8px',
      padding: '10px 12px',
    }}>
      <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#ccc', fontSize: '13px', textTransform: 'capitalize' }}>{value}</div>
    </div>
  );
}
