import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import {
  SUPABASE_URL, requireSession, requireRole, isAuthError, rateLimit, getClientIp,
  sanitizeInput, supaHeaders, supaAnonHeaders, encodeSupabaseParam, isValidUuid,
} from '@/lib/security';

const VALID_STATUSES = ['negotiating', 'approved', 'funded', 'delivered', 'lost'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = requireSession(request);
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 60)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }
  const status = request.nextUrl.searchParams.get('status');
  const leadPhone = request.nextUrl.searchParams.get('lead_phone');

  try {
    let url = `${SUPABASE_URL}/rest/v1/deals?tenant_id=eq.${tenant}&select=*&order=created_at.desc&limit=200`;

    if (status && VALID_STATUSES.includes(status)) {
      url += `&status=eq.${status}`;
    }

    if (leadPhone) {
      url += `&lead_phone=eq.${encodeSupabaseParam(leadPhone)}`;
    }

    const res = await fetch(url, {
      headers: supaAnonHeaders(tenant),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[deals] GET failed: HTTP ${res.status}`);
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
    }

    const deals = await res.json();
    return NextResponse.json({ deals });
  } catch (err) {
    console.error('[deals] GET error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = requireSession(request);
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 20)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { lead_phone } = body as { lead_phone?: string };

    if (!lead_phone) {
      return NextResponse.json({ error: 'Missing required field: lead_phone' }, { status: 400 });
    }

    const deal = {
      tenant_id: tenant,
      lead_phone: sanitizeInput(lead_phone, 20),
      lead_name: body.lead_name ? sanitizeInput(body.lead_name, 100) : null,
      vehicle_id: body.vehicle_id || null,
      vehicle_description: body.vehicle_description ? sanitizeInput(body.vehicle_description, 200) : null,
      sale_price: body.sale_price !== undefined && body.sale_price !== '' ? parseFloat(body.sale_price) : null,
      trade_in_value: body.trade_in_value !== undefined && body.trade_in_value !== '' ? parseFloat(body.trade_in_value) : null,
      down_payment: body.down_payment !== undefined && body.down_payment !== '' ? parseFloat(body.down_payment) : null,
      monthly_payment: body.monthly_payment !== undefined && body.monthly_payment !== '' ? parseFloat(body.monthly_payment) : null,
      term_months: body.term_months !== undefined && body.term_months !== '' ? parseInt(body.term_months) : null,
      lender: body.lender ? sanitizeInput(body.lender, 100) : null,
      status: body.status && VALID_STATUSES.includes(body.status) ? body.status : 'negotiating',
      notes: body.notes ? sanitizeInput(body.notes, 500) : null,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/deals`, {
      method: 'POST',
      headers: { ...supaHeaders(tenant), Prefer: 'return=representation' },
      body: JSON.stringify(deal),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[deals] POST failed: HTTP ${res.status}: ${errText}`);
      return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
    }

    const created = await res.json();
    return NextResponse.json({ success: true, deal: created[0] }, { status: 201 });
  } catch (err) {
    console.error('[deals] POST error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = requireSession(request);
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 30)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id || !isValidUuid(id)) {
      return NextResponse.json({ error: 'Missing or invalid deal id' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.status && VALID_STATUSES.includes(body.status)) updates.status = body.status;
    if (body.sale_price !== undefined) updates.sale_price = body.sale_price !== '' ? parseFloat(body.sale_price) : null;
    if (body.trade_in_value !== undefined) updates.trade_in_value = body.trade_in_value !== '' ? parseFloat(body.trade_in_value) : null;
    if (body.down_payment !== undefined) updates.down_payment = body.down_payment !== '' ? parseFloat(body.down_payment) : null;
    if (body.monthly_payment !== undefined) updates.monthly_payment = body.monthly_payment !== '' ? parseFloat(body.monthly_payment) : null;
    if (body.term_months !== undefined) updates.term_months = body.term_months !== '' ? parseInt(body.term_months) : null;
    if (body.lender !== undefined) updates.lender = body.lender ? sanitizeInput(body.lender, 100) : null;
    if (body.vehicle_id !== undefined) updates.vehicle_id = body.vehicle_id || null;
    if (body.vehicle_description !== undefined) updates.vehicle_description = body.vehicle_description ? sanitizeInput(body.vehicle_description, 200) : null;
    if (body.notes !== undefined) updates.notes = body.notes ? sanitizeInput(body.notes, 500) : null;
    if (body.lead_name !== undefined) updates.lead_name = body.lead_name ? sanitizeInput(body.lead_name, 100) : null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/deals?id=eq.${id}&tenant_id=eq.${tenant}`,
      {
        method: 'PATCH',
        headers: { ...supaHeaders(tenant), Prefer: 'return=minimal' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.error(`[deals] PATCH failed: HTTP ${res.status}`);
      return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[deals] PATCH error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
