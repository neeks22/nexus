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
