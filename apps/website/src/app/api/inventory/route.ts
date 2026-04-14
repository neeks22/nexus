import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import {
  SUPABASE_URL, requireSession, requireRole, isAuthError, rateLimit, getClientIp,
  sanitizeInput, supaHeaders, supaAnonHeaders, encodeSupabaseParam, isValidUuid,
} from '@/lib/security';

const VALID_STATUSES = ['available', 'sold', 'pending'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = requireSession(request);
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 60)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }
  const status = request.nextUrl.searchParams.get('status');
  const search = request.nextUrl.searchParams.get('search');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '200'), 500);

  try {
    let url = `${SUPABASE_URL}/rest/v1/inventory?tenant_id=eq.${tenant}&order=created_at.desc&limit=${limit}`;

    if (status && VALID_STATUSES.includes(status)) {
      url += `&status=eq.${status}`;
    }

    if (search) {
      const s = encodeSupabaseParam(search);
      url += `&or=(make.ilike.*${s}*,model.ilike.*${s}*,stock_number.ilike.*${s}*,vin.ilike.*${s}*)`;
    }

    const res = await fetch(url, {
      headers: supaAnonHeaders(tenant),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[inventory] GET failed: HTTP ${res.status}`);
      return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
    }

    const vehicles = await res.json();
    return NextResponse.json({ vehicles });
  } catch (err) {
    console.error('[inventory] GET error:', err instanceof Error ? err.message : 'unknown');
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
    const { year, make, model } = body as { year?: number; make?: string; model?: string };

    if (!year || !make || !model) {
      return NextResponse.json({ error: 'Missing required fields: year, make, model' }, { status: 400 });
    }

    if (year < 1990 || year > new Date().getFullYear() + 2) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    const vehicle = {
      tenant_id: tenant,
      year,
      make: sanitizeInput(make, 50),
      model: sanitizeInput(model, 50),
      trim: body.trim ? sanitizeInput(body.trim, 50) : null,
      color: body.color ? sanitizeInput(body.color, 30) : null,
      price: body.price !== undefined && body.price !== '' ? parseFloat(body.price) : null,
      mileage: body.mileage !== undefined && body.mileage !== '' ? parseInt(body.mileage) : null,
      stock_number: body.stock_number ? sanitizeInput(body.stock_number, 30) : null,
      vin: body.vin ? sanitizeInput(body.vin, 17) : null,
      status: body.status && VALID_STATUSES.includes(body.status) ? body.status : 'available',
      notes: body.notes ? sanitizeInput(body.notes, 500) : null,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/inventory`, {
      method: 'POST',
      headers: { ...supaHeaders(tenant), Prefer: 'return=representation' },
      body: JSON.stringify(vehicle),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[inventory] POST failed: HTTP ${res.status}`);
      return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 });
    }

    const created = await res.json();
    return NextResponse.json({ success: true, vehicle: created[0] }, { status: 201 });
  } catch (err) {
    console.error('[inventory] POST error:', err instanceof Error ? err.message : 'unknown');
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
      return NextResponse.json({ error: 'Missing or invalid vehicle id' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.year) updates.year = parseInt(body.year);
    if (body.make) updates.make = sanitizeInput(body.make, 50);
    if (body.model) updates.model = sanitizeInput(body.model, 50);
    if (body.trim !== undefined) updates.trim = body.trim ? sanitizeInput(body.trim, 50) : null;
    if (body.color !== undefined) updates.color = body.color ? sanitizeInput(body.color, 30) : null;
    if (body.price !== undefined) updates.price = body.price !== '' ? parseFloat(body.price) : null;
    if (body.mileage !== undefined) updates.mileage = body.mileage !== '' ? parseInt(body.mileage) : null;
    if (body.stock_number !== undefined) updates.stock_number = body.stock_number ? sanitizeInput(body.stock_number, 30) : null;
    if (body.vin !== undefined) updates.vin = body.vin ? sanitizeInput(body.vin, 17) : null;
    if (body.status && VALID_STATUSES.includes(body.status)) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes ? sanitizeInput(body.notes, 500) : null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/inventory?id=eq.${id}&tenant_id=eq.${tenant}`,
      {
        method: 'PATCH',
        headers: { ...supaHeaders(tenant), Prefer: 'return=minimal' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.error(`[inventory] PATCH failed: HTTP ${res.status}`);
      return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[inventory] PATCH error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  // Require manager+ role for deleting inventory
  const session = requireRole(request, 'manager');
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 20)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id || !isValidUuid(id)) {
      return NextResponse.json({ error: 'Missing or invalid vehicle id' }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/inventory?id=eq.${id}&tenant_id=eq.${tenant}`,
      {
        method: 'DELETE',
        headers: { ...supaHeaders(tenant), Prefer: 'return=minimal' },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.error(`[inventory] DELETE failed: HTTP ${res.status}`);
      return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[inventory] DELETE error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
