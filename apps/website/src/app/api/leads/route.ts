import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { SUPABASE_URL, SUPABASE_KEY, requireSession, requireRole, isAuthError, rateLimit, getClientIp, supaHeaders, supaAnonHeaders, encodeSupabaseParam, sanitizeInput } from '../../../lib/security';

/* =============================================================================
   LEADS API — CRUD for lead management
   Security: API key or same-origin auth + rate limiting + input sanitization
   ============================================================================= */

const VALID_STATUSES = ['new', 'contacted', 'appointment', 'showed', 'credit_app', 'approved', 'delivered', 'lost'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = requireSession(request);
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 60)) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  const status = request.nextUrl.searchParams.get('status');
  const search = request.nextUrl.searchParams.get('search');
  const activity = request.nextUrl.searchParams.get('activity');
  const phone = request.nextUrl.searchParams.get('phone');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '100'), 500);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  const statusOnly = request.nextUrl.searchParams.get('status_only');

  // Quick pause-status check for inbox agent toggle
  if (statusOnly === 'true' && phone) {
    try {
      const encodedPhone = encodeSupabaseParam(phone);
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&lead_id=eq.${encodedPhone}&entry_type=eq.status&select=content,created_at&order=created_at.desc&limit=1`,
        { headers: supaAnonHeaders(tenant), signal: AbortSignal.timeout(5000) }
      );
      const statuses = res.ok ? await res.json() : [];
      return NextResponse.json({ statuses }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (err) {
      console.error('[leads] Status check error:', err instanceof Error ? err.message : 'unknown');
      return NextResponse.json({ statuses: [] });
    }
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
    if (search) {
      // Cap search length and whitelist chars to block ReDoS / Postgres ilike abuse
      const safeSearch = search.slice(0, 50).replace(/[^a-zA-Z0-9@._\-+ ]/g, '');
      if (safeSearch.length >= 2) {
        const enc = encodeSupabaseParam(safeSearch);
        query += `&or=(first_name.ilike.*${enc}*,last_name.ilike.*${enc}*,phone.ilike.*${enc}*,email.ilike.*${enc}*)`;
      }
    }

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
  // Status mutations change the sales pipeline — manager+ only
  const session = requireRole(request, 'manager');
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

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
    const { phone, status } = body as { phone?: string; status?: string };

    if (!phone || !status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Valid phone and status required' }, { status: 400 });
    }

    // Use RPC to update status — phone column is encrypted, can't PATCH by phone directly
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_lead_status`, {
      method: 'POST',
      headers: { ...supaHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_phone: phone, p_tenant: tenant, p_status: status, p_only_if_status: null }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return NextResponse.json({ error: 'Failed to update' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[leads] PATCH error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = requireSession(request);
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

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
    const { phone, type, content } = postBody as { phone?: string; type?: string; content?: string };

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
  // Require manager+ role for deleting leads
  const session = requireRole(request, 'manager');
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  let deleteBody;
  try {
    deleteBody = await request.json();
  } catch (err) {
    console.error('[leads] DELETE parse error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { phone } = deleteBody as { phone?: string };

    if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

    const encodedPhone = encodeSupabaseParam(phone);

    // Lookup lead ID via decrypted view (phone column is encrypted in base table)
    let leadId: string | null = null;
    try {
      const lookupRes = await fetch(
        `${SUPABASE_URL}/rest/v1/v_funnel_submissions?phone=eq.${encodedPhone}&tenant_id=eq.${tenant}&select=id&limit=1`,
        { headers: { ...supaHeaders() }, signal: AbortSignal.timeout(5000) }
      );
      if (lookupRes.ok) {
        const leads = await lookupRes.json();
        if (leads.length > 0) leadId = leads[0].id;
      }
    } catch (err) {
      console.error('[leads] DELETE lookup error:', err instanceof Error ? err.message : 'unknown');
    }

    // PIPEDA full erasure — wipe all tables that reference this lead
    const deletePromises = [
      fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&lead_id=eq.${encodedPhone}`, { method: 'DELETE', headers: { ...supaHeaders(), Prefer: 'return=minimal' } }),
      fetch(`${SUPABASE_URL}/rest/v1/consent_records?tenant_id=eq.${tenant}&lead_id=eq.${encodedPhone}`, { method: 'DELETE', headers: { ...supaHeaders(), Prefer: 'return=minimal' } }),
      fetch(`${SUPABASE_URL}/rest/v1/deals?tenant_id=eq.${tenant}&lead_phone=eq.${encodedPhone}`, { method: 'DELETE', headers: { ...supaHeaders(), Prefer: 'return=minimal' } }),
      fetch(`${SUPABASE_URL}/rest/v1/appointments?tenant_id=eq.${tenant}&lead_phone=eq.${encodedPhone}`, { method: 'DELETE', headers: { ...supaHeaders(), Prefer: 'return=minimal' } }),
    ];
    // Delete funnel_submission by ID (phone column is encrypted)
    if (leadId) {
      deletePromises.push(
        fetch(`${SUPABASE_URL}/rest/v1/funnel_submissions?id=eq.${leadId}`, { method: 'DELETE', headers: { ...supaHeaders(), Prefer: 'return=minimal' } })
      );
    }
    await Promise.all(deletePromises);

    return NextResponse.json({ success: true, message: 'All customer data deleted' });
  } catch (err) {
    console.error('[leads] DELETE error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
