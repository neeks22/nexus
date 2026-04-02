import { NextRequest, NextResponse } from 'next/server';
// TODO: Switch GET reads to supaAnonHeaders(tenant) once RLS policies (migration 005) are deployed
// and the anon key has confirmed SELECT permissions on v_funnel_submissions and lead_transcripts.
// Until then, service role is required to avoid breaking reads in production.
import { SUPABASE_URL, requireApiKey, rateLimit, getClientIp, supaHeaders, validateTenant } from '../../../lib/security';

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

    const [leads, messages, allLeads, recentMessages] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/v_funnel_submissions?tenant_id=eq.${tenant}&created_at=gte.${todayISO}&select=phone`, { headers: supaHeaders() }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&created_at=gte.${todayISO}&select=lead_id`, { headers: supaHeaders() }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/v_funnel_submissions?tenant_id=eq.${tenant}&select=phone,first_name,last_name,status`, { headers: supaHeaders() }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&select=lead_id,content,role,channel,created_at&order=created_at.desc&limit=20`, { headers: supaHeaders() }).then(r => r.ok ? r.json() : []),
    ]);

    const pipelineCounts: Record<string, number> = {};
    for (const lead of allLeads) { const s = lead.status || 'new'; pipelineCounts[s] = (pipelineCounts[s] || 0) + 1; }

    const recentActivity = recentMessages.slice(0, 10).map((msg: Record<string, unknown>) => ({
      time: new Date(msg.created_at as string).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      type: msg.channel || 'sms', content: (msg.content as string) || '', phone: (msg.lead_id as string) || '',
    }));

    return NextResponse.json({ leadsToday: leads.length, messagesToday: messages.length, pipelineCounts, hotLeads: [], recentActivity }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[dashboard] GET error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
