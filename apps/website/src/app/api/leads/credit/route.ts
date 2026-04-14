import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { SUPABASE_URL, SUPABASE_KEY, requireSession, isAuthError, rateLimit, getClientIp, supaHeaders, encodeSupabaseParam, sanitizeInput } from '../../../../lib/security';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = requireSession(request);
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 30)) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error('[leads/credit] Parse error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { phone, credit_situation } = body as { phone?: string; credit_situation?: string };

  if (!phone || !credit_situation) {
    return NextResponse.json({ error: 'phone and credit_situation required' }, { status: 400 });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  try {
    // Lookup lead by phone via decrypted view, then PATCH by id (phone column is encrypted)
    const lookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/v_funnel_submissions?phone=eq.${encodeSupabaseParam(phone)}&tenant_id=eq.${tenant}&select=id&limit=1`,
      { headers: { ...supaHeaders() }, signal: AbortSignal.timeout(5000) }
    );
    if (!lookupRes.ok) return NextResponse.json({ error: 'Failed to find lead' }, { status: 500 });
    const leads = await lookupRes.json();
    if (!leads.length || !leads[0].id) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/funnel_submissions?id=eq.${leads[0].id}`,
      {
        method: 'PATCH',
        headers: { ...supaHeaders(), Prefer: 'return=minimal' },
        body: JSON.stringify({ credit_situation: sanitizeInput(credit_situation, 500) }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return NextResponse.json({ error: 'Failed to update credit' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[leads/credit] Update error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Failed to update credit' }, { status: 500 });
  }
}
