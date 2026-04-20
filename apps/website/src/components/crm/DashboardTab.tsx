'use client';

import StatCard from './StatCard';
import TodaySchedule from './TodaySchedule';
import useIsMobile from './useIsMobile';
import PipelineFunnel from './PipelineFunnel';
import { useDashboard, type DashboardData } from '@/hooks/use-dashboard';
import { DEAL_STATUS_COLORS, MONTHLY_GOALS, RESPONSE_TIME_TARGET_MIN } from './tokens';

interface DashboardTabProps {
  tenant: string;
  onSelectLead: (phone: string) => void;
}

const fmt = (n: number): string => `$${n.toLocaleString()}`;

const fmtMin = (m: number): string => m < 60 ? `${Math.round(m)}m` : `${(m / 60).toFixed(1)}h`;

const EMPTY: DashboardData = {
  leadsToday: 0, pipelineCounts: {}, hotLeads: [],
  recentActivity: [], todayAppointments: [],
  activeDeals: { deals: [], totalValue: 0, byStatus: {} },
  monthlyDeals: { count: 0, totalValue: 0, funded: 0, delivered: 0 },
  avgResponseTime: null,
};

export default function DashboardTab({ tenant, onSelectLead }: DashboardTabProps): React.ReactElement {
  const { data, isLoading, isError } = useDashboard(tenant);
  const isMobile = useIsMobile();

  if (isLoading) {
    return <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading dashboard...</div>;
  }

  if (isError) {
    return <div style={{ padding: '40px', textAlign: 'center' }}><div style={{ color: '#ef4444', fontSize: '16px', marginBottom: '8px' }}>Failed to load dashboard</div><div style={{ color: '#8888a0', fontSize: '13px' }}>Check your connection and try refreshing.</div></div>;
  }

  const d = data || EMPTY;

  // Hot leads breakdown by status (appointment vs showed)
  const hotApptCount = d.hotLeads.filter(l => l.status === 'appointment').length;
  const hotShowedCount = d.hotLeads.filter(l => l.status === 'showed').length;

  // Active deals breakdown
  const dealsByStatus = d.activeDeals.byStatus || {};
  const dealsBreakdown = [
    dealsByStatus.negotiating ? `${dealsByStatus.negotiating} neg` : null,
    dealsByStatus.approved ? `${dealsByStatus.approved} appr` : null,
    dealsByStatus.funded ? `${dealsByStatus.funded} funded` : null,
  ].filter(Boolean).join(' · ');

  // Response time vs target (industry benchmark <15 min)
  const rt = d.avgResponseTime;
  const responseValue = rt == null ? '—' : fmtMin(rt);
  const responseColor = rt == null ? '#666' : (rt <= RESPONSE_TIME_TARGET_MIN ? '#10b981' : '#ef4444');

  // Monthly funded vs goal
  const goal = MONTHLY_GOALS[tenant] ?? 30;
  const goalPct = goal > 0 ? Math.round((d.monthlyDeals.count / goal) * 100) : 0;
  const goalColor = d.monthlyDeals.count >= goal ? '#10b981' : '#22c55e';

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', overflowY: 'auto', height: isMobile ? 'calc(100vh - 116px)' : 'calc(100vh - 52px)' }}>
      <h1 style={{ color: '#f0f0f5', fontSize: isMobile ? '18px' : '22px', fontWeight: 700, margin: '0 0 24px' }}>Dashboard</h1>

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <StatCard title="New Leads Today" value={d.leadsToday} color="#10b981" />
        <StatCard title="Appts Today" value={d.todayAppointments.length} color="#8b5cf6" />
        <StatCard title="Hot Leads" value={d.hotLeads.length} subtitle={`${hotApptCount} appt · ${hotShowedCount} showed`} color="#ef4444" />
        <StatCard title="Active Deals" value={d.activeDeals.deals.length} subtitle={dealsBreakdown || 'No deals in flight'} color="#f59e0b" />
        <StatCard title="Avg Response" value={responseValue} subtitle={`Target: <${RESPONSE_TIME_TARGET_MIN}m · 7d median`} color={responseColor} />
        <StatCard title="Funded This Month" value={d.monthlyDeals.count} subtitle={`${fmt(d.monthlyDeals.totalValue)} · ${goalPct}% of ${goal} goal`} color={goalColor} />
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
