'use client';

import { useState, useEffect } from 'react';
import StatCard from './StatCard';

interface DashboardTabProps {
  tenant: string;
  onSelectLead: (phone: string) => void;
}

interface DashboardData {
  leadsToday: number;
  messagesToday: number;
  pipelineCounts: Record<string, number>;
  hotLeads: { phone: string; name: string; status: string }[];
  recentActivity: { time: string; type: string; content: string; phone: string }[];
}

export default function DashboardTab({ tenant, onSelectLead }: DashboardTabProps): React.ReactElement {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard(): Promise<void> {
      try {
        const res = await fetch(`/api/dashboard?tenant=${tenant}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [tenant]);

  if (loading) {
    return (
      <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>
        Loading dashboard...
      </div>
    );
  }

  const d = data || { leadsToday: 0, messagesToday: 0, pipelineCounts: {}, hotLeads: [], recentActivity: [] };
  const totalPipeline = Object.values(d.pipelineCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100vh' }}>
      <h1 style={{ color: '#f0f0f5', fontSize: '22px', fontWeight: 700, margin: '0 0 24px' }}>Dashboard</h1>

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <StatCard title="New Leads Today" value={d.leadsToday} color="#10b981" />
        <StatCard title="Messages Today" value={d.messagesToday} color="#6366f1" />
        <StatCard title="Total in Pipeline" value={totalPipeline} color="#f59e0b" />
        <StatCard title="Hot Leads" value={d.hotLeads.length} subtitle="Appointment / Showed" color="#ef4444" />
      </div>

      {/* Two Column */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {/* Hot Leads */}
        <div style={{
          flex: '1 1 300px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Hot Leads</h3>
          {d.hotLeads.length === 0 ? (
            <div style={{ color: '#666', fontSize: '13px' }}>No hot leads right now</div>
          ) : (
            d.hotLeads.map((lead) => (
              <div
                key={lead.phone}
                onClick={() => onSelectLead(lead.phone)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.15)',
                }}
              >
                <span style={{ color: '#f0f0f5', fontSize: '14px' }}>{lead.name || lead.phone}</span>
                <span style={{
                  background: '#ef4444',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}>{lead.status.replace('_', ' ')}</span>
              </div>
            ))
          )}
        </div>

        {/* Recent Activity */}
        <div style={{
          flex: '1 1 300px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Recent Activity</h3>
          {d.recentActivity.length === 0 ? (
            <div style={{ color: '#666', fontSize: '13px' }}>No activity yet today</div>
          ) : (
            d.recentActivity.slice(0, 10).map((item, i) => (
              <div
                key={i}
                onClick={() => onSelectLead(item.phone)}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ color: '#8888a0', fontSize: '11px' }}>{item.time}</div>
                <div style={{ color: '#ccc', fontSize: '13px', marginTop: '2px' }}>
                  {item.content.substring(0, 80)}{item.content.length > 80 ? '...' : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pipeline Summary */}
      <div style={{
        marginTop: '24px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Pipeline</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['new', 'contacted', 'appointment', 'showed', 'credit_app', 'approved', 'delivered', 'lost'].map((stage) => (
            <div key={stage} style={{
              flex: '1 1 100px',
              textAlign: 'center',
              padding: '12px 8px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)',
            }}>
              <div style={{ color: '#f0f0f5', fontSize: '20px', fontWeight: 700 }}>
                {d.pipelineCounts[stage] || 0}
              </div>
              <div style={{ color: '#8888a0', fontSize: '11px', marginTop: '4px', textTransform: 'capitalize' }}>
                {stage.replace('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
