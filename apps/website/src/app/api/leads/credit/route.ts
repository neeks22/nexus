import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { SUPABASE_URL, SUPABASE_KEY, requireApiKey, rateLimit, getClientIp, supaHeaders, validateTenant, encodeSupabaseParam, sanitizeInput } from '../../../../lib/security';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = requireApiKey(request);
  if (authError) return authError;

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

  const { phone, credit_situation, tenant: rawTenant } = body as { phone?: string; credit_situation?: string; tenant?: string };
  const tenant = validateTenant(rawTenant || null);

  if (!phone || !credit_situation) {
    return NextResponse.json({ error: 'phone and credit_situation required' }, { status: 400 });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/funnel_submissions?phone=eq.${encodeSupabaseParam(phone)}&tenant_id=eq.${tenant}`,
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
