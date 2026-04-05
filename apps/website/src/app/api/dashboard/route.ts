import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_URL, requireApiKey, rateLimit, getClientIp, supaAnonHeaders, validateTenant } from '../../../lib/security';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 30)) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const tenant = validateTenant(request.nextUrl.searchParams.get('tenant'));
  if (!SUPABASE_URL) return NextResponse.json({ error: 'Config error' }, { status: 500 });

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    // Pagination for allLeads query
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '50')), 200);
    const offset = (page - 1) * limit;

    const anonH = supaAnonHeaders(tenant);
    const paginatedHeaders = { ...anonH, Range: `${offset}-${offset + limit - 1}`, Prefer: 'count=exact' };

    const [leads, messages, allLeadsRes, recentMessages, hotLeadRows] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/v_funnel_submissions?tenant_id=eq.${tenant}&created_at=gte.${todayISO}&select=phone`, { headers: anonH }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&created_at=gte.${todayISO}&select=lead_id`, { headers: anonH }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/v_funnel_submissions?tenant_id=eq.${tenant}&select=phone,first_name,last_name,status&order=created_at.desc`, { headers: paginatedHeaders }),
      fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&select=lead_id,content,role,channel,created_at&order=created_at.desc&limit=20`, { headers: anonH }).then(r => r.ok ? r.json() : []),
      // Hot leads: appointment/showed status OR HOT_PAUSED in transcripts
      fetch(`${SUPABASE_URL}/rest/v1/v_funnel_submissions?tenant_id=eq.${tenant}&status=in.(appointment,showed)&select=phone,first_name,last_name,status,created_at&order=created_at.desc`, { headers: anonH }).then(r => r.ok ? r.json() : []),
    ]);

    const allLeads = allLeadsRes.ok ? await allLeadsRes.json() : [];
    // Parse total count from Content-Range header (e.g. "0-49/123")
    const contentRange = allLeadsRes.headers.get('content-range') || '';
    const totalMatch = contentRange.match(/\/(\d+)$/);
    const totalLeads = totalMatch ? parseInt(totalMatch[1]) : allLeads.length;

    const pipelineCounts: Record<string, number> = {};
    for (const lead of allLeads) { const s = lead.status || 'new'; pipelineCounts[s] = (pipelineCounts[s] || 0) + 1; }

    const recentActivity = recentMessages.slice(0, 10).map((msg: Record<string, unknown>) => ({
      time: new Date(msg.created_at as string).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      type: msg.channel || 'sms', content: (msg.content as string) || '', phone: (msg.lead_id as string) || '',
    }));

    // Build hot leads list from appointment/showed status leads
    const hotLeads = (hotLeadRows as Array<{ phone: string; first_name: string; last_name: string; status: string; created_at: string }>).map((lead) => ({
      phone: lead.phone,
      name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.phone,
      status: lead.status,
      since: lead.created_at,
    }));

    return NextResponse.json({
      leadsToday: leads.length, messagesToday: messages.length,
      pipelineCounts, hotLeads, recentActivity,
      pagination: { page, limit, total: totalLeads, pages: Math.ceil(totalLeads / limit) },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[dashboard] GET error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
