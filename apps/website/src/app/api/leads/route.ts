import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { SUPABASE_URL, SUPABASE_KEY, requireApiKey, rateLimit, getClientIp, supaHeaders, supaAnonHeaders, validateTenant, encodeSupabaseParam, sanitizeInput } from '../../../lib/security';

/* =============================================================================
   LEADS API — CRUD for lead management
   Security: API key or same-origin auth + rate limiting + input sanitization
   ============================================================================= */

const VALID_STATUSES = ['new', 'contacted', 'appointment', 'showed', 'credit_app', 'approved', 'delivered', 'lost'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth
  const authError = requireApiKey(request);
  if (authError) return authError;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 60)) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const tenant = validateTenant(request.nextUrl.searchParams.get('tenant'));
  const status = request.nextUrl.searchParams.get('status');
  const search = request.nextUrl.searchParams.get('search');
  const activity = request.nextUrl.searchParams.get('activity');
  const phone = request.nextUrl.searchParams.get('phone');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '100'), 500);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  // Activity endpoint — CRM notes + all status entries (HOT_PAUSED, AI_RESUMED, etc.)
  if (activity === 'true' && phone) {
    try {
      const encodedPhone = encodeSupabaseParam(phone);
      const anonH = supaAnonHeaders(tenant);
      const [crmRes, statusRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&lead_id=eq.${encodedPhone}&channel=eq.crm&select=id,created_at,role,channel,content,entry_type&order=created_at.desc&limit=50`,
          { headers: anonH, signal: AbortSignal.timeout(10000) }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&lead_id=eq.${encodedPhone}&entry_type=eq.status&select=id,created_at,role,channel,content,entry_type&order=created_at.desc&limit=10`,
          { headers: anonH, signal: AbortSignal.timeout(10000) }
        ),
      ]);
      const crmData = crmRes.ok ? await crmRes.json() : [];
      const statusData = statusRes.ok ? await statusRes.json() : [];
      // Merge and deduplicate by id
      const seen = new Set<string>();
      const merged = [...crmData, ...statusData].filter((e: { id: string }) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      }).sort((a: { created_at: string }, b: { created_at: string }) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return NextResponse.json({ activity: merged }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (err) {
      console.error('[leads] Activity fetch error:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      return NextResponse.json({ activity: [] });
    }
  }

  try {
    let query = `v_funnel_submissions?tenant_id=eq.${tenant}&select=*&order=created_at.desc&limit=${limit}`;
    if (status && VALID_STATUSES.includes(status)) query += `&status=eq.${status}`;
    if (search) query += `&or=(first_name.ilike.*${encodeSupabaseParam(search)}*,last_name.ilike.*${encodeSupabaseParam(search)}*,phone.ilike.*${encodeSupabaseParam(search)}*,email.ilike.*${encodeSupabaseParam(search)}*)`;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers: supaAnonHeaders(tenant), signal: AbortSignal.timeout(10000) });
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });

    return NextResponse.json({ leads: await res.json() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[leads] GET error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 30)) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error('[leads] PATCH parse error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { phone, status, tenant: rawTenant } = body as { phone?: string; status?: string; tenant?: string };
    const tenant = validateTenant(rawTenant || null);

    if (!phone || !status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Valid phone and status required' }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/funnel_submissions?phone=eq.${encodeSupabaseParam(phone)}&tenant_id=eq.${tenant}`,
      { method: 'PATCH', headers: { ...supaHeaders(), Prefer: 'return=minimal' }, body: JSON.stringify({ status }), signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return NextResponse.json({ error: 'Failed to update' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[leads] PATCH error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 20)) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  let postBody;
  try {
    postBody = await request.json();
  } catch (err) {
    console.error('[leads] POST parse error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { tenant: rawTenant, phone, type, content } = postBody as { tenant?: string; phone?: string; type?: string; content?: string };
    const tenant = validateTenant(rawTenant || null);

    if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

    // Create lead
    if (type === 'create_lead') {
      const leadData = JSON.parse(content);
      const normalizedPhone = (leadData.phone || '').replace(/\D/g, '');
      const fullPhone = normalizedPhone.length === 10 ? `+1${normalizedPhone}` : normalizedPhone.length === 11 ? `+${normalizedPhone}` : `+${normalizedPhone}`;

      // Check duplicate
      const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/v_funnel_submissions?tenant_id=eq.${tenant}&phone=eq.${encodeSupabaseParam(fullPhone)}&limit=1`,
        { headers: supaAnonHeaders(tenant), signal: AbortSignal.timeout(10000) }
      );
      if (checkRes.ok) {
        const existing = await checkRes.json();
        if (existing.length > 0) return NextResponse.json({ success: true, existing: true, lead: existing[0] });
      }

      const createRes = await fetch(`${SUPABASE_URL}/rest/v1/funnel_submissions`, {
        method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=representation' },
        body: JSON.stringify({
          tenant_id: tenant,
          first_name: sanitizeInput(leadData.first_name || '', 100),
          last_name: sanitizeInput(leadData.last_name || '', 100),
          phone: fullPhone,
          email: sanitizeInput(leadData.email || '', 200),
          vehicle_type: sanitizeInput(leadData.vehicle_type || '', 100),
          credit_situation: sanitizeInput(leadData.credit_situation || '', 100),
          status: 'new',
          casl_consent: false, // Must be explicitly consented, not auto-true
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!createRes.ok) return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
      const created = await createRes.json();
      return NextResponse.json({ success: true, existing: false, lead: created[0] || created });
    }

    // Save activity note
    const res = await fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts`, {
      method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({
        tenant_id: tenant, lead_id: sanitizeInput(phone || 'unknown', 50),
        entry_type: type || 'note', role: 'system',
        content: sanitizeInput(content, 5000), channel: 'crm',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[leads] POST error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authError = requireApiKey(request);
  if (authError) return authError;

  let deleteBody;
  try {
    deleteBody = await request.json();
  } catch (err) {
    console.error('[leads] DELETE parse error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { tenant: rawTenant, phone } = deleteBody as { tenant?: string; phone?: string };
    const tenant = validateTenant(rawTenant || null);

    if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

    const encodedPhone = encodeSupabaseParam(phone);

    await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&lead_id=eq.${encodedPhone}`, { method: 'DELETE', headers: { ...supaHeaders(), Prefer: 'return=minimal' } }),
      fetch(`${SUPABASE_URL}/rest/v1/funnel_submissions?tenant_id=eq.${tenant}&phone=eq.${encodedPhone}`, { method: 'DELETE', headers: { ...supaHeaders(), Prefer: 'return=minimal' } }),
      fetch(`${SUPABASE_URL}/rest/v1/consent_records?tenant_id=eq.${tenant}&lead_id=eq.${encodedPhone}`, { method: 'DELETE', headers: { ...supaHeaders(), Prefer: 'return=minimal' } }),
    ]);

    return NextResponse.json({ success: true, message: 'All customer data deleted' });
  } catch (err) {
    console.error('[leads] DELETE error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
