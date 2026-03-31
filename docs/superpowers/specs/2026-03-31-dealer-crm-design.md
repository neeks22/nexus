# Dealer CRM — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Scope:** ReadyCar (`/readycar`), then ReadyRide (`/readyride`)

## What We're Building

A full dealer CRM embedded at `nexusagents.ca/readycar` that replaces the current inbox-only page. Modeled after DealerSocket and DriveCentric — DealerSocket's depth with DriveCentric's modern interface. Dark theme, left sidebar navigation, 6 tabs.

## Layout

**Navigation:** Collapsible left sidebar with icon + label for each tab. Dark theme (#0a0a0f background). Sidebar collapses to icons-only on mobile.

**Password gate:** Unchanged — `Nexus33!33` for ReadyCar, `Readyride2023` for ReadyRide. Session-based auth via sessionStorage.

**Tenant isolation:** Each page passes `tenant=readycar` or `tenant=readyride` to all API calls. Conversations filtered by Twilio number. Supabase queries filtered by `tenant_id`.

## Tabs

### 1. Dashboard (Home)

The landing page after login. Card-based grid showing today's KPIs:

| Widget | Data Source | What It Shows |
|--------|------------|---------------|
| New Leads Today | Supabase `v_funnel_submissions` | Count of leads with `created_at` today |
| Messages Today | Supabase `lead_transcripts` | Count of messages today |
| Pipeline Summary | Supabase `funnel_submissions` | Mini bar chart — leads per stage |
| Hot Leads | Supabase `lead_transcripts` + BANT | Leads with BANT >= 10 or intent = HOT |
| Overdue Follow-ups | Supabase `lead_transcripts` | Leads with no outbound message in 48+ hours |
| Recent Activity | Supabase `lead_transcripts` | Last 10 interactions (SMS sent, email reply, status change) |

### 2. Pipeline (Kanban)

Drag-and-drop board using `@dnd-kit/core` + `@dnd-kit/sortable` (same stack as the react-dnd-kit-tailwind-shadcn-ui repo).

**Stages (columns):**
1. New Lead
2. Contacted
3. Appointment Set
4. Showed
5. Credit App
6. Approved
7. Delivered
8. Lost

Each **lead card** shows: name (or phone if unknown), vehicle interest, BANT score badge, days in stage, last message preview.

**Drag a card** between columns to update `status` in Supabase `funnel_submissions`. Optimistic UI update, then persist.

**Click a card** to open the Lead Detail panel (slide-in from right or full page).

### 3. Inbox (existing)

The current SMS conversation view — already built and working. No changes except:
- Remove the header bar (sidebar replaces it)
- The "+ New Message" button moves into the sidebar or stays in the inbox header

### 4. Leads (table view)

Full-width data table of all leads with:

| Column | Source |
|--------|--------|
| Name | `first_name + last_name` from `v_funnel_submissions` |
| Phone | `phone` |
| Email | `email` |
| Status | `status` (maps to pipeline stage) |
| Vehicle Interest | `vehicle_type` |
| Credit | `credit_situation` |
| BANT Score | Computed from `lead_transcripts` |
| Last Contact | Latest `created_at` from `lead_transcripts` |
| Source | `source` field or "Campaign" / "Inbound" |

**Features:** Search bar, filter by status, sort by any column, click row to open Lead Detail.

### 5. Credit Router (existing)

The existing `CreditRouter` component — already built. No changes except wrapping it in the new sidebar layout.

### 6. Reports

Simple stats page showing:
- Leads by source (pie chart)
- Pipeline conversion funnel (bar chart)
- Messages sent vs received (line chart, last 30 days)
- SMS + AI cost tracking (from `api_costs` + `twilio_costs`)

Charts rendered with a lightweight library (recharts or chart.js via react-chartjs-2).

## Lead Detail Page

Opens when clicking a lead from Pipeline, Leads table, or Inbox. Two-column layout:

**Left column (60%):**
- **Header:** Name, phone (click-to-text), email, status badge, BANT badge
- **Quick actions:** Send SMS, Send Email, Set Appointment, Change Status, Add Note
- **Contact info card:** Phone, email, address, language preference
- **Vehicle of interest card:** Type, budget, specific vehicle if mentioned
- **Trade-in card:** Current vehicle details if provided
- **Credit card:** Credit situation, lender matches (from Credit Router), pre-approval status

**Right column (40%):**
- **Activity timeline:** Chronological feed of ALL interactions:
  - SMS messages (inbound + outbound, with full text)
  - Email messages
  - Status changes
  - Notes added by reps
  - AI agent actions
  - Each entry shows: timestamp, channel icon, content preview

## Data Architecture

**No new Supabase tables needed for MVP.** We use existing tables:
- `v_funnel_submissions` — lead data (decrypted view)
- `funnel_submissions` — lead status updates (write)
- `lead_transcripts` — all communications + activity log
- `api_costs` / `twilio_costs` — for Reports tab

**One new column needed:** Add `pipeline_stage` to `funnel_submissions` if `status` doesn't cover all 8 stages. Current `status` values (new, contacted, etc.) may already map directly.

**Twilio messages:** Fetched via the existing `/api/messages` route (already tenant-aware).

## API Routes

**Existing (reuse):**
- `GET /api/messages?tenant=readycar` — SMS conversations
- `POST /api/messages` — send SMS with `{ tenant, to, body }`

**New routes needed:**
- `GET /api/leads?tenant=readycar` — paginated lead list with filters
- `PATCH /api/leads/[phone]` — update lead status/stage
- `POST /api/leads/[phone]/notes` — add note to lead
- `GET /api/dashboard?tenant=readycar` — aggregated stats for dashboard widgets
- `GET /api/reports?tenant=readycar&period=30d` — report data

All routes query Supabase with `tenant_id` filter. Same CSRF/rate-limiting pattern as existing routes.

## Component Architecture

```
/readycar/page.tsx
  PasswordGate (existing)
  CRMLayout
    Sidebar (nav icons + labels, collapsible)
    MainContent (renders active tab)
      DashboardTab
        StatCard (reusable)
        PipelineMiniChart
        HotLeadsList
        RecentActivity
      PipelineTab
        KanbanBoard
          KanbanColumn (per stage)
            LeadCard (draggable)
      InboxTab (existing InboxContent)
      LeadsTab
        LeadsTable
          LeadRow
      CreditRouterTab (existing CreditRouter)
      ReportsTab
        Charts (recharts)
    LeadDetailPanel (slide-in overlay)
      ContactInfoCard
      VehicleInterestCard
      CreditCard
      ActivityTimeline
      QuickActions
```

Each tab is a separate component file under `apps/website/src/components/crm/`. The CRM shell (sidebar + routing) is shared. ReadyRide uses the same components with `tenant=readyride`.

## File Structure

```
apps/website/src/
  components/crm/
    CRMLayout.tsx          — sidebar + tab routing shell
    Sidebar.tsx            — left nav with icons
    DashboardTab.tsx       — KPI cards + widgets
    PipelineTab.tsx        — kanban board
    KanbanBoard.tsx        — drag-and-drop board
    KanbanColumn.tsx       — single pipeline column
    LeadCard.tsx           — card in kanban
    LeadsTab.tsx           — full lead table
    ReportsTab.tsx         — charts + stats
    LeadDetailPanel.tsx    — slide-in lead profile
    ActivityTimeline.tsx   — chronological event feed
    StatCard.tsx           — reusable KPI card
  app/readycar/page.tsx    — ReadyCar CRM (uses CRMLayout with tenant=readycar)
  app/readyride/page.tsx   — ReadyRide CRM (uses CRMLayout with tenant=readyride)
  app/api/leads/route.ts   — lead CRUD API
  app/api/dashboard/route.ts — dashboard aggregation API
  app/api/reports/route.ts — report data API
```

## Dependencies

- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` — drag-and-drop for kanban
- `recharts` — charts for dashboard + reports
- No other new dependencies. Everything else uses existing React + Next.js + inline styles.

## What's Reused vs. New

| Component | Status |
|-----------|--------|
| Password gate | Reused as-is |
| Inbox (SMS conversations) | Reused as-is |
| Credit Router | Reused as-is |
| Messages API | Reused as-is |
| Supabase tables | Reused, no schema changes for MVP |
| Sidebar nav | New |
| Dashboard | New |
| Pipeline/Kanban | New |
| Leads table | New |
| Lead Detail panel | New |
| Reports | New |
| Leads API | New |
| Dashboard API | New |

## Build Order

1. **CRMLayout + Sidebar** — the shell that wraps everything
2. **Integrate existing tabs** — Inbox + Credit Router work inside new layout
3. **Leads API + LeadsTab** — table view of all leads
4. **Pipeline/Kanban** — drag-and-drop board
5. **Lead Detail panel** — click a lead to see full profile
6. **Dashboard** — KPI cards + widgets
7. **Reports** — charts (lowest priority, do last)
8. **Copy to ReadyRide** — swap tenant param, done

## Out of Scope (Phase 2)

- Desking / payment calculator
- Inventory management
- Appointment calendar view
- DMS integration (Dabadu has no API)
- Credit application submission (RouteOne/DealerTrack)
- Multi-user auth (currently single password per dealer)
- Role-based access (BDC vs salesperson vs manager)
