'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
  FunnelChart, Funnel, LabelList,
} from 'recharts';
import useIsMobile from './useIsMobile';

interface ReportsTabProps {
  tenant: string;
}

interface LeadRow {
  status: string;
  created_at: string;
  utm_source?: string;
  utm_medium?: string;
}

interface TranscriptRow {
  lead_id: string;
  role: string;
  channel: string;
  created_at: string;
}

const COLORS = ['#DC2626', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#22c55e', '#ef4444', '#666'];
const STAGES = ['new', 'contacted', 'appointment', 'showed', 'credit_app', 'approved', 'delivered', 'lost'];

function computeAvgResponseTime(transcripts: TranscriptRow[]): number {
  // Group by lead_id, find first customer/funnel entry and first AI response
  const byLead: Record<string, { firstContact?: Date; firstAiReply?: Date }> = {};

  for (const t of transcripts) {
    if (!byLead[t.lead_id]) byLead[t.lead_id] = {};
    const entry = byLead[t.lead_id];
    const ts = new Date(t.created_at);

    if ((t.role === 'customer' || t.channel === 'funnel') && (!entry.firstContact || ts < entry.firstContact)) {
      entry.firstContact = ts;
    }
    if (t.role === 'ai' && (!entry.firstAiReply || ts < entry.firstAiReply)) {
      entry.firstAiReply = ts;
    }
  }

  const responseTimes: number[] = [];
  for (const entry of Object.values(byLead)) {
    if (entry.firstContact && entry.firstAiReply && entry.firstAiReply > entry.firstContact) {
      const diffSec = (entry.firstAiReply.getTime() - entry.firstContact.getTime()) / 1000;
      if (diffSec < 3600) responseTimes.push(diffSec); // exclude outliers > 1hr
    }
  }

  if (responseTimes.length === 0) return 0;
  return Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
}

export default function ReportsTab({ tenant }: ReportsTabProps): React.ReactElement {
  const [pipelineData, setPipelineData] = useState<{ name: string; count: number }[]>([]);
  const [funnelData, setFunnelData] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; leads: number }[]>([]);
  const [sourceData, setSourceData] = useState<{ name: string; count: number }[]>([]);
  const [stats, setStats] = useState({ avgResponseSec: 0, totalLeads: 0, conversionRate: 0 });
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const [dashRes, leadsRes, transcriptsRes] = await Promise.all([
          fetch(`/api/dashboard?tenant=${tenant}`),
          fetch(`/api/leads?tenant=${tenant}&limit=200`),
          fetch(`/api/leads?tenant=${tenant}&mode=activity&limit=500`),
        ]);

        // Pipeline data from dashboard
        if (dashRes.ok) {
          const data = await dashRes.json();
          const counts = data.pipelineCounts || {};
          setPipelineData(STAGES.map((s) => ({
            name: s.replace('_', ' ').replace(/^\w/, (c: string) => c.toUpperCase()),
            count: counts[s] || 0,
          })));

          // Funnel: cumulative from start to end (excluding lost)
          const funnelStages = ['new', 'contacted', 'appointment', 'showed', 'credit_app', 'approved', 'delivered'];
          let cumulative = 0;
          const funnelEntries = funnelStages.map((s) => { cumulative += counts[s] || 0; return cumulative; });
          setFunnelData(funnelStages.map((s, i) => ({
            name: s.replace('_', ' ').replace(/^\w/, (c: string) => c.toUpperCase()),
            value: funnelEntries[funnelStages.length - 1 - i] || 0,
            fill: COLORS[i % COLORS.length],
          })));

          const delivered = counts['delivered'] || 0;
          const total = Object.values(counts).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0);
          setStats((prev) => ({
            ...prev,
            totalLeads: total,
            conversionRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
          }));
        }

        // Leads for trend + source
        if (leadsRes.ok) {
          const data = await leadsRes.json();
          const leads: LeadRow[] = data.leads || [];

          // Weekly trend (last 4 weeks)
          const now = new Date();
          const weeks: Record<string, number> = {};
          for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            weeks[label] = 0;
          }
          for (const lead of leads) {
            const d = new Date(lead.created_at);
            const daysDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
            const weekIdx = Math.min(3, Math.floor(daysDiff / 7));
            const weekKeys = Object.keys(weeks);
            const key = weekKeys[3 - weekIdx];
            if (key) weeks[key]++;
          }
          setTrendData(Object.entries(weeks).map(([date, leads]) => ({ date, leads })));

          // Source breakdown
          const sources: Record<string, number> = {};
          for (const lead of leads) {
            const src = lead.utm_source || lead.utm_medium || 'Direct';
            sources[src] = (sources[src] || 0) + 1;
          }
          setSourceData(
            Object.entries(sources)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
          );
        }

        // Compute avg response time from transcripts
        if (transcriptsRes.ok) {
          const data = await transcriptsRes.json();
          const transcripts: TranscriptRow[] = data.transcripts || data.leads || [];
          if (transcripts.length > 0 && transcripts[0]?.lead_id) {
            const avgSec = computeAvgResponseTime(transcripts);
            setStats((prev) => ({ ...prev, avgResponseSec: avgSec }));
          }
        }
      } catch (err) {
        console.error('Reports fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [tenant]);

  if (loading) {
    return <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading reports...</div>;
  }

  function formatResponseTime(sec: number): string {
    if (sec === 0) return 'N/A';
    if (sec < 60) return `${sec}s`;
    return `${Math.round(sec / 60)}m`;
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', overflowY: 'auto', height: isMobile ? 'calc(100vh - 116px)' : '100vh' }}>
      <h1 style={{ color: '#f0f0f5', fontSize: isMobile ? '18px' : '22px', fontWeight: 700, margin: '0 0 24px' }}>Reports</h1>

      {/* KPI Summary */}
      <div style={{ display: 'flex', gap: isMobile ? '8px' : '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <KPICard label="Total Leads" value={String(stats.totalLeads)} color="#DC2626" isMobile={isMobile} />
        <KPICard label="Conversion Rate" value={`${stats.conversionRate}%`} sub="To Delivered" color="#10b981" isMobile={isMobile} />
        <KPICard label="Avg Response" value={formatResponseTime(stats.avgResponseSec)} sub="First AI reply" color="#f59e0b" isMobile={isMobile} />
      </div>

      {/* Row 1: Pipeline + Funnel */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <ChartCard title="Pipeline by Stage" flex={isMobile ? '1 1 100%' : '2 1 400px'}>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
            <BarChart data={pipelineData}>
              <XAxis dataKey="name" tick={{ fill: '#8888a0', fontSize: isMobile ? 9 : 11 }} axisLine={false} tickLine={false} angle={isMobile ? -45 : 0} textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 60 : 30} />
              <YAxis tick={{ fill: '#8888a0', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {pipelineData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Conversion Funnel" flex={isMobile ? '1 1 100%' : '1 1 300px'}>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
            <FunnelChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList position="right" fill="#ccc" fontSize={isMobile ? 9 : 11} dataKey="name" />
                <LabelList position="center" fill="#fff" fontSize={isMobile ? 11 : 13} fontWeight={600} dataKey="value" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Trend + Sources */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <ChartCard title="Lead Trend (Last 4 Weeks)" flex={isMobile ? '1 1 100%' : '2 1 400px'}>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#8888a0', fontSize: isMobile ? 10 : 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8888a0', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="leads" stroke="#DC2626" strokeWidth={2} dot={{ r: 4, fill: '#DC2626' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lead Sources" flex={isMobile ? '1 1 100%' : '1 1 250px'}>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
            <PieChart>
              <Pie
                data={sourceData.length > 0 ? sourceData : [{ name: 'Direct', count: 1 }]}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 70 : 90}
                label={isMobile ? false : ((props: Record<string, unknown>) => `${props.name || ''}: ${props.value || 0}`) as any}
              >
                {(sourceData.length > 0 ? sourceData : [{ name: 'Direct', count: 1 }]).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#f0f0f5',
};

function KPICard({ label, value, sub, color, isMobile }: { label: string; value: string; sub?: string; color: string; isMobile?: boolean }): React.ReactElement {
  return (
    <div style={{
      flex: isMobile ? '1 1 calc(50% - 4px)' : '1 1 180px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: isMobile ? '14px' : '20px',
    }}>
      <div style={{ color: '#8888a0', fontSize: isMobile ? '11px' : '12px', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div>
      <div style={{ color, fontSize: isMobile ? '22px' : '28px', fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, flex, children }: { title: string; flex: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{
      flex,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>{title}</h3>
      {children}
    </div>
  );
}
