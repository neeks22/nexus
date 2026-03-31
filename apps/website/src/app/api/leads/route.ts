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
