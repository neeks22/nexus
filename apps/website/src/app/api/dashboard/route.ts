import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_URL, requireSession, isAuthError, rateLimit, getClientIp, supaAnonHeaders } from '../../../lib/security';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = requireSession(request);
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 30)) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  if (!SUPABASE_URL) return NextResponse.json({ error: 'Config error' }, { status: 500 });

  try {
    // Compute "today" in Eastern Time (ReadyCar/ReadyRide are in Ontario)
    // Get current date in ET using Intl, then compute midnight ET as UTC
    const etNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    const etMidnight = new Date(etNow);
    etMidnight.setHours(0, 0, 0, 0);
    // Offset between server time and ET (ms)
    const serverNow = new Date();
    const etOffset = serverNow.getTime() - etNow.getTime();
    // Midnight ET as UTC timestamp
    const todayISO = new Date(etMidnight.getTime() + etOffset).toISOString();

    // Pagination for allLeads query
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '50')), 200);
    const offset = (page - 1) * limit;

    const tomorrowET = new Date(etMidnight);
    tomorrowET.setDate(tomorrowET.getDate() + 1);
    const tomorrowISO = new Date(tomorrowET.getTime() + etOffset).toISOString();
    const monthStartET = new Date(etMidnight.getFullYear(), etMidnight.getMonth(), 1);
    const monthStartISO = new Date(monthStartET.getTime() + etOffset).toISOString();
    // 7-day rolling window for response-time KPI — today alone is too noisy.
    const sevenDaysAgoISO = new Date(Date.now() - 7 * 86400000).toISOString();

    const anonH = supaAnonHeaders(tenant);
    const paginatedHeaders = { ...anonH, Range: `${offset}-${offset + limit - 1}`, Prefer: 'count=exact' };

    const [leads, allLeadsRes, _pipelineStatusRows, recentMessages, hotLeadRows, todayAppts, activeDealsRows, monthDealsRows, weekLeadsRows, weekOutboundRows] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/v_funnel_submissions?tenant_id=eq.${tenant}&created_at=gte.${todayISO}&select=phone`, { headers: anonH }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/v_funnel_submissions?tenant_id=eq.${tenant}&select=phone,first_name,last_name,status&order=created_at.desc`, { headers: paginatedHeaders }),
      // Separate unpaginated query for accurate pipeline counts (only fetches status field)
      fetch(`${SUPABASE_URL}/rest/v1/v_funnel_submissions?tenant_id=eq.${tenant}&select=status`, { headers: anonH }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&select=lead_id,content,role,channel,created_at&order=created_at.desc&limit=20`, { headers: anonH }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/v_funnel_submissions?tenant_id=eq.${tenant}&status=in.(appointment,showed)&select=phone,first_name,last_name,status,created_at&order=created_at.desc&limit=20`, { headers: anonH }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/appointments?tenant_id=eq.${tenant}&scheduled_at=gte.${todayISO}&scheduled_at=lt.${tomorrowISO}&status=in.(scheduled,confirmed)&select=id,lead_phone,lead_name,appointment_type,scheduled_at,status,reminder_sent&order=scheduled_at.asc&limit=50`, { headers: anonH }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/deals?tenant_id=eq.${tenant}&status=in.(negotiating,approved,funded)&select=id,lead_phone,lead_name,vehicle_description,sale_price,status&order=created_at.desc&limit=100`, { headers: anonH }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/deals?tenant_id=eq.${tenant}&status=in.(funded,delivered)&created_at=gte.${monthStartISO}&select=sale_price,status&limit=500`, { headers: anonH }).then(r => r.ok ? r.json() : []),
      // For response-time median: leads + first outbound message per lead, last 7 days
      fetch(`${SUPABASE_URL}/rest/v1/v_funnel_submissions?tenant_id=eq.${tenant}&created_at=gte.${sevenDaysAgoISO}&select=phone,created_at`, { headers: anonH }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&created_at=gte.${sevenDaysAgoISO}&role=eq.assistant&select=lead_id,created_at&order=created_at.asc&limit=5000`, { headers: anonH }).then(r => r.ok ? r.json() : []),
    ]);

    const allLeads = allLeadsRes.ok ? await allLeadsRes.json() : [];
    // Parse total count from Content-Range header (e.g. "0-49/123")
    const contentRange = allLeadsRes.headers.get('content-range') || '';
    const totalMatch = contentRange.match(/\/(\d+)$/);
    const totalLeads = totalMatch ? parseInt(totalMatch[1]) : allLeads.length;

    const pipelineCounts: Record<string, number> = {};
    const pipelineData = _pipelineStatusRows as Array<{ status: string }>;
    for (const lead of pipelineData) { const s = lead.status || 'new'; pipelineCounts[s] = (pipelineCounts[s] || 0) + 1; }

    const recentActivity = recentMessages.slice(0, 10).map((msg: Record<string, unknown>) => ({
      time: msg.created_at as string,
      type: msg.channel || 'sms',
      content: ((msg.content as string) || '').substring(0, 100),
      phone: (msg.lead_id as string) || '',
    }));

    // Build today's appointments first — used both as its own widget AND to enrich hot leads
    const todayAppointments = (todayAppts as Array<{ id: string; lead_phone: string; lead_name: string | null; appointment_type: string; scheduled_at: string; status: string; reminder_sent: boolean }>).map(a => ({
      id: a.id, leadPhone: a.lead_phone, leadName: a.lead_name,
      type: a.appointment_type, scheduledAt: a.scheduled_at,
      status: a.status, reminderSent: a.reminder_sent,
    }));

    // Build hot leads with enrichment: last contact time + today's appointment countdown
    const hotRows = hotLeadRows as Array<{ phone: string; first_name: string; last_name: string; status: string; created_at: string }>;
    const hotPhones = hotRows.map(r => r.phone).filter(Boolean);
    // Fetch latest message per hot lead — single `in` query, then reduce to max-per-phone client-side.
    const lastContactByPhone = new Map<string, string>();
    if (hotPhones.length > 0) {
      const quoted = hotPhones.map(p => `"${p}"`).join(',');
      const hotMsgsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&lead_id=in.(${quoted})&select=lead_id,created_at&order=created_at.desc&limit=500`,
        { headers: anonH }
      ).then(r => r.ok ? r.json() : []);
      for (const msg of hotMsgsRes as Array<{ lead_id: string; created_at: string }>) {
        if (!lastContactByPhone.has(msg.lead_id)) lastContactByPhone.set(msg.lead_id, msg.created_at);
      }
    }
    const apptByPhone = new Map<string, { scheduledAt: string; status: string }>();
    for (const a of todayAppointments) {
      // Keep soonest appointment per lead
      const existing = apptByPhone.get(a.leadPhone);
      if (!existing || new Date(a.scheduledAt).getTime() < new Date(existing.scheduledAt).getTime()) {
        apptByPhone.set(a.leadPhone, { scheduledAt: a.scheduledAt, status: a.status });
      }
    }
    const hotLeads = hotRows.map((lead) => {
      const appt = apptByPhone.get(lead.phone);
      return {
        phone: lead.phone,
        name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.phone,
        status: lead.status,
        since: lead.created_at,
        lastContactAt: lastContactByPhone.get(lead.phone) || null,
        appointmentAt: appt?.scheduledAt || null,
        appointmentConfirmed: appt?.status === 'confirmed',
      };
    });

    // Build active deals summary
    const adRows = activeDealsRows as Array<{ id: string; lead_phone: string; lead_name: string | null; vehicle_description: string | null; sale_price: number | null; status: string }>;
    const activeDeals = {
      deals: adRows.map(d => ({ id: d.id, leadPhone: d.lead_phone, leadName: d.lead_name, vehicle: d.vehicle_description, salePrice: d.sale_price, status: d.status })),
      totalValue: adRows.reduce((sum, d) => sum + (d.sale_price || 0), 0),
      byStatus: {
        negotiating: adRows.filter(d => d.status === 'negotiating').length,
        approved: adRows.filter(d => d.status === 'approved').length,
        funded: adRows.filter(d => d.status === 'funded').length,
      },
    };

    // Build monthly deals summary
    const mdRows = monthDealsRows as Array<{ sale_price: number | null; status: string }>;
    const monthlyDeals = {
      count: mdRows.length,
      totalValue: mdRows.reduce((sum, d) => sum + (d.sale_price || 0), 0),
      funded: mdRows.filter(d => d.status === 'funded').length,
      delivered: mdRows.filter(d => d.status === 'delivered').length,
    };

    // Median response time (minutes from lead creation → first outbound msg) over last 7 days
    const weekLeads = weekLeadsRows as Array<{ phone: string; created_at: string }>;
    const outboundMsgs = weekOutboundRows as Array<{ lead_id: string; created_at: string }>;
    const firstOutboundByPhone = new Map<string, string>();
    for (const msg of outboundMsgs) {
      if (!firstOutboundByPhone.has(msg.lead_id)) firstOutboundByPhone.set(msg.lead_id, msg.created_at);
    }
    const responseDeltasMin: number[] = [];
    for (const lead of weekLeads) {
      const firstISO = firstOutboundByPhone.get(lead.phone);
      if (!firstISO) continue;
      const deltaMs = new Date(firstISO).getTime() - new Date(lead.created_at).getTime();
      const deltaMin = deltaMs / 60000;
      // Bound to sane window — drop negatives (clock skew) and >7d (stale)
      if (deltaMin >= 0 && deltaMin <= 10080) responseDeltasMin.push(deltaMin);
    }
    responseDeltasMin.sort((a, b) => a - b);
    const avgResponseTime = responseDeltasMin.length === 0
      ? null
      : responseDeltasMin[Math.floor(responseDeltasMin.length / 2)];

    return NextResponse.json({
      leadsToday: leads.length,
      pipelineCounts, hotLeads, recentActivity,
      todayAppointments, activeDeals, monthlyDeals,
      avgResponseTime,
      pagination: { page, limit, total: totalLeads, pages: Math.ceil(totalLeads / limit) },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[dashboard] GET error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
