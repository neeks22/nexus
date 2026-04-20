'use client';

import StatCard from './StatCard';
import TodaySchedule from './TodaySchedule';
import HotLeadsPanel from './HotLeadsPanel';
import ActiveDealsPanel from './ActiveDealsPanel';
import RecentActivityFeed from './RecentActivityFeed';
import useIsMobile from './useIsMobile';
import PipelineFunnel from './PipelineFunnel';
import { useDashboard, type DashboardData } from '@/hooks/use-dashboard';
import { MONTHLY_GOALS, RESPONSE_TIME_TARGET_MIN } from './tokens';

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
        <HotLeadsPanel leads={d.hotLeads} onSelectLead={onSelectLead} />
        <ActiveDealsPanel
          deals={d.activeDeals.deals}
          totalValue={d.activeDeals.totalValue}
          byStatus={d.activeDeals.byStatus}
          onSelectLead={onSelectLead}
        />
      </div>

      {/* Pipeline Funnel */}
      <div style={{ marginBottom: '24px' }}>
        <PipelineFunnel pipelineCounts={d.pipelineCounts} />
      </div>

      <RecentActivityFeed items={d.recentActivity} onSelectLead={onSelectLead} />
    </div>
  );
}
