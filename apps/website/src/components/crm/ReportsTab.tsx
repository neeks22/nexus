'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ReportsTabProps {
  tenant: string;
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#22c55e', '#ef4444', '#666'];

export default function ReportsTab({ tenant }: ReportsTabProps): React.ReactElement {
  const [pipelineData, setPipelineData] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const res = await fetch(`/api/dashboard?tenant=${tenant}`);
        if (res.ok) {
          const data = await res.json();
          const stages = ['new', 'contacted', 'appointment', 'showed', 'credit_app', 'approved', 'delivered', 'lost'];
          setPipelineData(stages.map((s) => ({
            name: s.replace('_', ' ').replace(/^\w/, (c: string) => c.toUpperCase()),
            count: data.pipelineCounts?.[s] || 0,
          })));
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

  const totalLeads = pipelineData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100vh' }}>
      <h1 style={{ color: '#f0f0f5', fontSize: '22px', fontWeight: 700, margin: '0 0 24px' }}>Reports</h1>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {/* Pipeline Bar Chart */}
        <div style={{
          flex: '2 1 400px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Pipeline by Stage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineData}>
              <XAxis dataKey="name" tick={{ fill: '#8888a0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8888a0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f0f0f5' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {pipelineData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution Pie */}
        <div style={{
          flex: '1 1 250px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>
            Distribution ({totalLeads} total)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pipelineData.filter((d) => d.count > 0)}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={((props: any) => `${props.name}: ${props.value}`) as any}
              >
                {pipelineData.filter((d) => d.count > 0).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f0f0f5' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
