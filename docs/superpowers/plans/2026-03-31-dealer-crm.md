# Dealer CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a DealerSocket-grade CRM at `/readycar` and `/readyride` with 6 tabs: Dashboard, Pipeline, Inbox, Leads, Credit Router, Reports.

**Architecture:** Single-page app behind password gate. CRMLayout shell with left sidebar renders tab components. All data from Supabase + Twilio via API routes. Existing Inbox and CreditRouter components reused unchanged. New components in `apps/website/src/components/crm/`.

**Tech Stack:** Next.js 14, React 18, TypeScript, Supabase (existing), Twilio (existing), @dnd-kit (kanban), recharts (charts), inline styles (matches existing codebase pattern).

---

## File Map

```
apps/website/src/
  components/crm/
    CRMLayout.tsx        — sidebar + tab routing shell
    Sidebar.tsx          — left nav icons + labels
    DashboardTab.tsx     — KPI stat cards + widgets
    StatCard.tsx         — reusable KPI card
    PipelineTab.tsx      — kanban board wrapper
    KanbanBoard.tsx      — drag-and-drop board with columns
    LeadCard.tsx         — draggable card in kanban column
    LeadsTab.tsx         — searchable/filterable lead table
    ReportsTab.tsx       — charts (recharts)
    LeadDetailPanel.tsx  — slide-in lead profile overlay
    ActivityTimeline.tsx — chronological event feed
  app/readycar/page.tsx  — MODIFY: replace current page with CRMLayout
  app/readyride/page.tsx — MODIFY: same, tenant=readyride
  app/api/leads/route.ts — NEW: lead CRUD (GET list, PATCH status)
  app/api/dashboard/route.ts — NEW: aggregated KPIs
```

---

### Task 1: Install Dependencies

**Files:**
- Modify: `apps/website/package.json`

- [ ] **Step 1: Install dnd-kit and recharts**

```bash
cd apps/website && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities recharts
```

- [ ] **Step 2: Verify installation**

```bash
npm ls @dnd-kit/core recharts
```

Expected: Both packages listed without errors.

- [ ] **Step 3: Commit**

```bash
git add apps/website/package.json apps/website/package-lock.json
git commit -m "feat(crm): install dnd-kit and recharts for dealer CRM"
```

---

### Task 2: Sidebar Component

**Files:**
- Create: `apps/website/src/components/crm/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar component**

```tsx
'use client';

import { useState } from 'react';

export type CRMTab = 'dashboard' | 'pipeline' | 'inbox' | 'leads' | 'credit' | 'reports';

interface SidebarProps {
  activeTab: CRMTab;
  onTabChange: (tab: CRMTab) => void;
  dealerName: string;
}

const TABS: { id: CRMTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '&#9632;' },
  { id: 'pipeline', label: 'Pipeline', icon: '&#9654;' },
  { id: 'inbox', label: 'Inbox', icon: '&#9993;' },
  { id: 'leads', label: 'Leads', icon: '&#9679;' },
  { id: 'credit', label: 'Credit Router', icon: '&#9733;' },
  { id: 'reports', label: 'Reports', icon: '&#9776;' },
];

export default function Sidebar({ activeTab, onTabChange, dealerName }: SidebarProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      width: collapsed ? '60px' : '220px',
      minHeight: '100vh',
      background: '#0d0d14',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: collapsed ? '16px 8px' : '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
      }} onClick={() => setCollapsed(!collapsed)}>
        <span style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '14px',
          flexShrink: 0,
        }}>{dealerName[0]}</span>
        {!collapsed && (
          <span style={{ color: '#f0f0f5', fontWeight: 600, fontSize: '15px', whiteSpace: 'nowrap' }}>
            {dealerName}
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ padding: '8px', flex: 1 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              width: '100%',
              padding: collapsed ? '12px 0' : '10px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: activeTab === tab.id ? '#818cf8' : '#8888a0',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              marginBottom: '2px',
              transition: 'all 0.15s ease',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
            title={tab.label}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: tab.icon }} />
            {!collapsed && <span>{tab.label}</span>}
          </button>
        ))}
      </nav>

      {/* Status */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#10b981', display: 'inline-block',
        }} />
        {!collapsed && <span style={{ color: '#666', fontSize: '12px' }}>Nexus AI Active</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/components/crm/Sidebar.tsx
git commit -m "feat(crm): add sidebar navigation component"
```

---

### Task 3: CRMLayout Shell

**Files:**
- Create: `apps/website/src/components/crm/CRMLayout.tsx`

- [ ] **Step 1: Create CRMLayout component**

This wraps sidebar + active tab content. It receives the tenant and renders the appropriate tab.

```tsx
'use client';

import { useState } from 'react';
import Sidebar, { CRMTab } from './Sidebar';

interface CRMLayoutProps {
  tenant: string;
  dealerName: string;
  inboxContent: React.ReactNode;
  creditRouterContent: React.ReactNode;
}

// Lazy-load tab components to avoid circular imports
import DashboardTab from './DashboardTab';
import PipelineTab from './PipelineTab';
import LeadsTab from './LeadsTab';
import ReportsTab from './ReportsTab';
import LeadDetailPanel from './LeadDetailPanel';

export default function CRMLayout({
  tenant,
  dealerName,
  inboxContent,
  creditRouterContent,
}: CRMLayoutProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<CRMTab>('dashboard');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const handleSelectLead = (phone: string): void => {
    setSelectedLead(phone);
  };

  const handleCloseLead = (): void => {
    setSelectedLead(null);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} dealerName={dealerName} />

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'dashboard' && <DashboardTab tenant={tenant} onSelectLead={handleSelectLead} />}
        {activeTab === 'pipeline' && <PipelineTab tenant={tenant} onSelectLead={handleSelectLead} />}
        {activeTab === 'inbox' && inboxContent}
        {activeTab === 'leads' && <LeadsTab tenant={tenant} onSelectLead={handleSelectLead} />}
        {activeTab === 'credit' && creditRouterContent}
        {activeTab === 'reports' && <ReportsTab tenant={tenant} />}

        {selectedLead && (
          <LeadDetailPanel
            tenant={tenant}
            phone={selectedLead}
            onClose={handleCloseLead}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/components/crm/CRMLayout.tsx
git commit -m "feat(crm): add CRMLayout shell with sidebar + tab routing"
```

---

### Task 4: StatCard + DashboardTab (stub)

**Files:**
- Create: `apps/website/src/components/crm/StatCard.tsx`
- Create: `apps/website/src/components/crm/DashboardTab.tsx`

- [ ] **Step 1: Create StatCard**

```tsx
'use client';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

export default function StatCard({ title, value, subtitle, color = '#6366f1' }: StatCardProps): React.ReactElement {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: '20px',
      flex: '1 1 200px',
      minWidth: '180px',
    }}>
      <div style={{ color: '#8888a0', fontSize: '13px', marginBottom: '8px' }}>{title}</div>
      <div style={{ color: '#f0f0f5', fontSize: '28px', fontWeight: 700 }}>{value}</div>
      {subtitle && <div style={{ color: color, fontSize: '12px', marginTop: '4px' }}>{subtitle}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create DashboardTab**

```tsx
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
  hotLeads: { phone: string; name: string; score: number }[];
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
        <StatCard title="Hot Leads" value={d.hotLeads.length} subtitle="BANT 10+" color="#ef4444" />
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
                }}>BANT {lead.score}</span>
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
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/crm/StatCard.tsx apps/website/src/components/crm/DashboardTab.tsx
git commit -m "feat(crm): add StatCard and DashboardTab components"
```

---

### Task 5: Dashboard API Route

**Files:**
- Create: `apps/website/src/app/api/dashboard/route.ts`

- [ ] **Step 1: Create dashboard API**

```tsx
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim().replace(/\\n$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim().replace(/\\n$/, '');

function supabaseHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function supabaseGet(path: string): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { ...supabaseHeaders(), Prefer: 'count=exact' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenant = request.nextUrl.searchParams.get('tenant') || 'readycar';

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const [leads, messages, allLeads, recentMessages] = await Promise.all([
      supabaseGet(`v_funnel_submissions?tenant_id=eq.${tenant}&created_at=gte.${todayISO}&select=phone`),
      supabaseGet(`lead_transcripts?tenant_id=eq.${tenant}&created_at=gte.${todayISO}&select=lead_id`),
      supabaseGet(`v_funnel_submissions?tenant_id=eq.${tenant}&select=phone,first_name,last_name,status`),
      supabaseGet(`lead_transcripts?tenant_id=eq.${tenant}&select=lead_id,content,role,channel,created_at&order=created_at.desc&limit=20`),
    ]);

    const leadsArr = Array.isArray(leads) ? leads : [];
    const msgsArr = Array.isArray(messages) ? messages : [];
    const allLeadsArr = Array.isArray(allLeads) ? allLeads : [];
    const recentArr = Array.isArray(recentMessages) ? recentMessages : [];

    // Pipeline counts
    const pipelineCounts: Record<string, number> = {};
    for (const lead of allLeadsArr) {
      const status = (lead as { status?: string }).status || 'new';
      pipelineCounts[status] = (pipelineCounts[status] || 0) + 1;
    }

    // Recent activity
    const recentActivity = recentArr.slice(0, 10).map((msg: Record<string, unknown>) => ({
      time: new Date(msg.created_at as string).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      type: msg.channel || 'sms',
      content: (msg.content as string) || '',
      phone: (msg.lead_id as string) || '',
    }));

    return NextResponse.json({
      leadsToday: leadsArr.length,
      messagesToday: msgsArr.length,
      pipelineCounts,
      hotLeads: [],
      recentActivity,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[dashboard] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/app/api/dashboard/route.ts
git commit -m "feat(crm): add dashboard API route"
```

---

### Task 6: Leads API Route

**Files:**
- Create: `apps/website/src/app/api/leads/route.ts`

- [ ] **Step 1: Create leads API**

```tsx
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim().replace(/\\n$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim().replace(/\\n$/, '');

function supabaseHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenant = request.nextUrl.searchParams.get('tenant') || 'readycar';
  const status = request.nextUrl.searchParams.get('status');
  const search = request.nextUrl.searchParams.get('search');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '100'), 500);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  try {
    let query = `v_funnel_submissions?tenant_id=eq.${tenant}&select=*&order=created_at.desc&limit=${limit}`;
    if (status) query += `&status=eq.${status}`;
    if (search) query += `&or=(first_name.ilike.*${search}*,last_name.ilike.*${search}*,phone.ilike.*${search}*,email.ilike.*${search}*)`;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
      headers: supabaseHeaders(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    const leads = await res.json();
    return NextResponse.json({ leads }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[leads] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { phone, status, tenant } = body as { phone?: string; status?: string; tenant?: string };

    if (!phone || !status) {
      return NextResponse.json({ error: 'phone and status required' }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/funnel_submissions?phone=eq.${encodeURIComponent(phone)}${tenant ? `&tenant_id=eq.${tenant}` : ''}`,
      {
        method: 'PATCH',
        headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
        body: JSON.stringify({ status }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[leads] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/app/api/leads/route.ts
git commit -m "feat(crm): add leads API route (GET list, PATCH status)"
```

---

### Task 7: LeadsTab Component

**Files:**
- Create: `apps/website/src/components/crm/LeadsTab.tsx`

- [ ] **Step 1: Create LeadsTab**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/components/crm/LeadsTab.tsx
git commit -m "feat(crm): add LeadsTab with searchable/filterable lead table"
```

---

### Task 8: KanbanBoard + LeadCard + PipelineTab

**Files:**
- Create: `apps/website/src/components/crm/LeadCard.tsx`
- Create: `apps/website/src/components/crm/KanbanBoard.tsx`
- Create: `apps/website/src/components/crm/PipelineTab.tsx`

- [ ] **Step 1: Create LeadCard**

```tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LeadCardProps {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  daysInStage: number;
  onClick: () => void;
}

export default function LeadCard({ id, name, phone, vehicle, daysInStage, onClick }: LeadCardProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '8px',
        cursor: 'grab',
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div style={{ color: '#f0f0f5', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
        {name || phone}
      </div>
      {vehicle && <div style={{ color: '#8888a0', fontSize: '12px', marginBottom: '4px' }}>{vehicle}</div>}
      <div style={{ color: '#666', fontSize: '11px' }}>
        {daysInStage === 0 ? 'Today' : `${daysInStage}d in stage`}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create KanbanBoard**

```tsx
'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import LeadCard from './LeadCard';

interface Lead {
  phone: string;
  first_name: string;
  last_name: string;
  status: string;
  vehicle_type: string;
  created_at: string;
}

interface KanbanBoardProps {
  leads: Lead[];
  onMoveLead: (phone: string, newStatus: string) => void;
  onSelectLead: (phone: string) => void;
}

const STAGES = [
  { id: 'new', label: 'New Lead', color: '#6366f1' },
  { id: 'contacted', label: 'Contacted', color: '#f59e0b' },
  { id: 'appointment', label: 'Appointment', color: '#10b981' },
  { id: 'showed', label: 'Showed', color: '#06b6d4' },
  { id: 'credit_app', label: 'Credit App', color: '#8b5cf6' },
  { id: 'approved', label: 'Approved', color: '#22c55e' },
  { id: 'delivered', label: 'Delivered', color: '#10b981' },
  { id: 'lost', label: 'Lost', color: '#ef4444' },
];

export default function KanbanBoard({ leads, onMoveLead, onSelectLead }: KanbanBoardProps): React.ReactElement {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const leadsByStage: Record<string, Lead[]> = {};
  for (const stage of STAGES) {
    leadsByStage[stage.id] = leads.filter((l) => (l.status || 'new') === stage.id);
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over) return;

    const draggedPhone = active.id as string;
    const targetId = over.id as string;

    // Check if dropped on a stage column
    const targetStage = STAGES.find((s) => s.id === targetId);
    if (targetStage) {
      onMoveLead(draggedPhone, targetStage.id);
      return;
    }

    // Check if dropped on another lead card — use that lead's stage
    const targetLead = leads.find((l) => l.phone === targetId);
    if (targetLead) {
      onMoveLead(draggedPhone, targetLead.status || 'new');
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        padding: '0 0 16px',
        height: 'calc(100vh - 100px)',
      }}>
        {STAGES.map((stage) => {
          const stageLeads = leadsByStage[stage.id] || [];
          return (
            <div
              key={stage.id}
              id={stage.id}
              style={{
                minWidth: '240px',
                width: '240px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
              }}
            >
              {/* Column Header */}
              <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: stage.color, display: 'inline-block',
                  }} />
                  <span style={{ color: '#f0f0f5', fontSize: '13px', fontWeight: 600 }}>{stage.label}</span>
                </div>
                <span style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#8888a0',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                }}>{stageLeads.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding: '8px', flex: 1, overflowY: 'auto' }}>
                <SortableContext items={stageLeads.map((l) => l.phone)} strategy={verticalListSortingStrategy}>
                  {stageLeads.map((lead) => {
                    const daysSince = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000);
                    return (
                      <LeadCard
                        key={lead.phone}
                        id={lead.phone}
                        name={[lead.first_name, lead.last_name].filter(Boolean).join(' ')}
                        phone={lead.phone}
                        vehicle={lead.vehicle_type || ''}
                        daysInStage={daysSince}
                        onClick={() => onSelectLead(lead.phone)}
                      />
                    );
                  })}
                </SortableContext>
              </div>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
```

- [ ] **Step 3: Create PipelineTab**

```tsx
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
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, status: newStatus, tenant }),
      });
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
```

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/components/crm/LeadCard.tsx apps/website/src/components/crm/KanbanBoard.tsx apps/website/src/components/crm/PipelineTab.tsx
git commit -m "feat(crm): add Pipeline tab with drag-and-drop kanban board"
```

---

### Task 9: ActivityTimeline + LeadDetailPanel

**Files:**
- Create: `apps/website/src/components/crm/ActivityTimeline.tsx`
- Create: `apps/website/src/components/crm/LeadDetailPanel.tsx`

- [ ] **Step 1: Create ActivityTimeline**

```tsx
'use client';

interface TimelineEntry {
  id: string;
  time: string;
  role: string;
  channel: string;
  content: string;
}

interface ActivityTimelineProps {
  entries: TimelineEntry[];
}

const CHANNEL_ICONS: Record<string, string> = {
  sms: 'SMS',
  email: 'EMAIL',
  note: 'NOTE',
  system: 'SYS',
};

export default function ActivityTimeline({ entries }: ActivityTimelineProps): React.ReactElement {
  return (
    <div>
      {entries.length === 0 ? (
        <div style={{ color: '#666', fontSize: '13px', padding: '20px 0' }}>No activity yet</div>
      ) : (
        entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              padding: '10px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              gap: '10px',
            }}
          >
            <span style={{
              background: entry.role === 'ai' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
              color: entry.role === 'ai' ? '#818cf8' : '#8888a0',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
              flexShrink: 0,
              marginTop: '2px',
            }}>
              {CHANNEL_ICONS[entry.channel] || entry.channel?.toUpperCase() || 'MSG'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: 1.5 }}>
                {entry.content}
              </div>
              <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
                {entry.role === 'ai' ? 'AI Agent' : entry.role === 'customer' ? 'Customer' : 'Rep'} &middot; {entry.time}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create LeadDetailPanel**

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/crm/ActivityTimeline.tsx apps/website/src/components/crm/LeadDetailPanel.tsx
git commit -m "feat(crm): add LeadDetailPanel with activity timeline"
```

---

### Task 10: ReportsTab

**Files:**
- Create: `apps/website/src/components/crm/ReportsTab.tsx`

- [ ] **Step 1: Create ReportsTab**

```tsx
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
                label={({ name, count }: { name: string; count: number }) => `${name}: ${count}`}
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/components/crm/ReportsTab.tsx
git commit -m "feat(crm): add ReportsTab with pipeline charts"
```

---

### Task 11: Wire CRMLayout into ReadyCar Page

**Files:**
- Modify: `apps/website/src/app/readycar/page.tsx`

- [ ] **Step 1: Refactor ReadyCar page**

Replace the current tab-based layout with CRMLayout. Keep the PasswordGate. Extract the existing InboxContent and CreditRouter as children passed to CRMLayout.

The key change: after password unlock, render `<CRMLayout>` instead of the current inline tab bar + InboxContent/CreditRouter.

Read the current `page.tsx` first. The InboxContent function and all its helpers stay in the file — they get passed as `inboxContent` prop to CRMLayout. CreditRouter is already imported.

The page structure becomes:

```tsx
export default function ReadyCarPage() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('readycar_auth') === 'true') setAuthed(true);
  }, []);

  if (!authed) return <PasswordGate onUnlock={() => setAuthed(true)} />;

  return (
    <CRMLayout
      tenant="readycar"
      dealerName="ReadyCar"
      inboxContent={<InboxContent />}
      creditRouterContent={<CreditRouter />}
    />
  );
}
```

Remove the old tab bar code (the `activeTab` state, the tab buttons div, and the conditional rendering). InboxContent stays defined in the same file.

- [ ] **Step 2: Build and verify**

```bash
cd apps/website && npx next build 2>&1 | grep -E "readycar|Error|error"
```

Expected: `/readycar` compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/app/readycar/page.tsx
git commit -m "feat(crm): wire CRMLayout into ReadyCar page"
```

---

### Task 12: Wire CRMLayout into ReadyRide Page

**Files:**
- Modify: `apps/website/src/app/readyride/page.tsx`

- [ ] **Step 1: Apply same refactor as Task 11**

Same pattern — replace tab bar with CRMLayout, pass `tenant="readyride"` and `dealerName="ReadyRide"`. Keep PasswordGate with `Readyride2023`. Keep InboxContent in the same file. Pass CreditRouter as prop.

- [ ] **Step 2: Build and verify**

```bash
cd apps/website && npx next build 2>&1 | grep -E "readyride|Error|error"
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/app/readyride/page.tsx
git commit -m "feat(crm): wire CRMLayout into ReadyRide page"
```

---

### Task 13: Full Build + Deploy

- [ ] **Step 1: Full build**

```bash
cd apps/website && npx next build
```

Expected: All pages compile, no errors.

- [ ] **Step 2: Deploy to Vercel**

```bash
cd apps/website && vercel --prod --force
```

- [ ] **Step 3: Verify both pages return 200**

```bash
curl -s -o /dev/null -w "%{http_code}" https://nexusagents.ca/readycar && echo " /readycar"
curl -s -o /dev/null -w "%{http_code}" https://nexusagents.ca/readyride && echo " /readyride"
```

Expected: `200 /readycar` and `200 /readyride`

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```
