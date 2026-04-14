'use client';

import { useState, useEffect } from 'react';
import StatCard from './StatCard';
import TodaySchedule from './TodaySchedule';
import useIsMobile from './useIsMobile';
import PipelineFunnel from './PipelineFunnel';

interface Appointment {
  id: string;
  leadPhone: string;
  leadName: string | null;
  type: string;
  scheduledAt: string;
  status: string;
  reminderSent: boolean;
}

interface ActiveDeal {
  id: string;
  leadPhone: string;
  leadName: string | null;
  vehicle: string | null;
  salePrice: number | null;
  status: string;
}

interface DashboardData {
  leadsToday: number;
  messagesToday: number;
  pipelineCounts: Record<string, number>;
  hotLeads: { phone: string; name: string; status: string }[];
  recentActivity: { time: string; type: string; content: string; phone: string }[];
  todayAppointments: Appointment[];
  activeDeals: { deals: ActiveDeal[]; totalValue: number; byStatus: Record<string, number> };
  monthlyDeals: { count: number; totalValue: number; funded: number; delivered: number };
}

interface DashboardTabProps {
  tenant: string;
  onSelectLead: (phone: string) => void;
}

const DEAL_STATUS_COLORS: Record<string, string> = {
  negotiating: '#f59e0b',
  approved: '#10b981',
  funded: '#06b6d4',
};

const fmt = (n: number): string => `$${n.toLocaleString()}`;

const EMPTY: DashboardData = {
  leadsToday: 0, messagesToday: 0, pipelineCounts: {}, hotLeads: [],
  recentActivity: [], todayAppointments: [],
  activeDeals: { deals: [], totalValue: 0, byStatus: {} },
  monthlyDeals: { count: 0, totalValue: 0, funded: 0, delivered: 0 },
};

export default function DashboardTab({ tenant, onSelectLead }: DashboardTabProps): React.ReactElement {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard(): Promise<void> {
      try {
        const res = await fetch(`/api/dashboard?tenant=${tenant}`);
        if (res.ok) setData(await res.json());
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
    return <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading dashboard...</div>;
  }

  const d = data || EMPTY;
  const totalPipeline = Object.values(d.pipelineCounts).reduce((a, b) => a + b, 0);
  const isMobile = useIsMobile();

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', overflowY: 'auto', height: isMobile ? 'calc(100vh - 116px)' : 'calc(100vh - 52px)' }}>
      <h1 style={{ color: '#f0f0f5', fontSize: isMobile ? '18px' : '22px', fontWeight: 700, margin: '0 0 24px' }}>Dashboard</h1>

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <StatCard title="New Leads Today" value={d.leadsToday} color="#10b981" />
        <StatCard title="Appts Today" value={d.todayAppointments.length} color="#8b5cf6" />
        <StatCard title="Hot Leads" value={d.hotLeads.length} subtitle="Appointment / Showed" color="#ef4444" />
        <StatCard title="Active Deals" value={d.activeDeals.deals.length} color="#f59e0b" />
        <StatCard title="Pipeline Value" value={fmt(d.activeDeals.totalValue)} color="#06b6d4" />
        <StatCard title="Funded This Month" value={d.monthlyDeals.count} subtitle={fmt(d.monthlyDeals.totalValue)} color="#22c55e" />
      </div>

      {/* Today's Schedule */}
      <div style={{ marginBottom: '24px' }}>
        <TodaySchedule appointments={d.todayAppointments} onSelectLead={onSelectLead} />
      </div>

      {/* Two Column: Hot Leads + Active Deals */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {/* Hot Leads */}
        <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Hot Leads</h3>
          {d.hotLeads.length === 0 ? (
            <div style={{ color: '#666', fontSize: '13px' }}>No hot leads right now</div>
          ) : d.hotLeads.map(lead => (
            <div key={lead.phone} onClick={() => onSelectLead(lead.phone)} style={{
              padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
            }}>
              <span style={{ color: '#f0f0f5', fontSize: '14px' }}>{lead.name || lead.phone}</span>
              <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>
                {lead.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>

        {/* Active Deals */}
        <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Active Deals</h3>
          {d.activeDeals.deals.length === 0 ? (
            <div style={{ color: '#666', fontSize: '13px' }}>No active deals</div>
          ) : d.activeDeals.deals.slice(0, 8).map(deal => (
            <div key={deal.id} style={{
              padding: '10px 12px', borderRadius: '8px', marginBottom: '4px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span onClick={() => onSelectLead(deal.leadPhone)} style={{ color: '#f0f0f5', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#DC2626')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#f0f0f5')}>
                  {deal.leadName || deal.leadPhone}
                </span>
                {deal.vehicle && <div style={{ color: '#8888a0', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.vehicle}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {deal.salePrice != null && <span style={{ color: '#f0f0f5', fontSize: '13px', fontWeight: 600 }}>{fmt(deal.salePrice)}</span>}
                <span style={{ color: DEAL_STATUS_COLORS[deal.status] || '#666', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>{deal.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div style={{ marginBottom: '24px' }}>
        <PipelineFunnel pipelineCounts={d.pipelineCounts} />
      </div>

      {/* Recent Activity */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Recent Activity</h3>
        {d.recentActivity.length === 0 ? (
          <div style={{ color: '#666', fontSize: '13px' }}>No activity yet today</div>
        ) : d.recentActivity.slice(0, 10).map((item, i) => (
          <div key={i} onClick={() => onSelectLead(item.phone)} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
            <div style={{ color: '#8888a0', fontSize: '11px' }}>{new Date(item.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
            <div style={{ color: '#ccc', fontSize: '13px', marginTop: '2px' }}>
              {item.content.substring(0, 80)}{item.content.length > 80 ? '...' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
