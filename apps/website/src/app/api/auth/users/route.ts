import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { SUPABASE_URL, SUPABASE_KEY, rateLimit, getClientIp, VALID_TENANTS, supaPost } from '@/lib/security';
import { hashPassword, verifyPassword, findUserByEmail } from '@/lib/auth';

function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  return val.replace(/\\n$/g, '').replace(/\n$/g, '').trim();
}

const AUTH_SECRET = cleanEnv(process.env.AUTH_SECRET).trim();

function verifySession(request: NextRequest): { user_id: string; email: string; role: string; tenant_id: string } | null {
  const sessionCookie = request.cookies.get('nexus_session')?.value;
  if (!sessionCookie || !AUTH_SECRET) return null;

  const dotIdx = sessionCookie.indexOf('.');
  if (dotIdx === -1) return null;

  const payloadB64 = sessionCookie.substring(0, dotIdx);
  const signature = sessionCookie.substring(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('hex');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    if (!payload.user_id || !payload.email) return null;
    return { user_id: payload.user_id, email: payload.email, role: payload.role, tenant_id: payload.tenant_id };
  } catch (err) {
    console.error('[users] Session parse error:', err instanceof Error ? err.message : 'unknown');
    return null;
  }
}

function verifyAdminSession(request: NextRequest): { role: string; tenant_id: string } | null {
  const sessionCookie = request.cookies.get('nexus_session')?.value;
  if (!sessionCookie || !AUTH_SECRET) return null;

  const dotIdx = sessionCookie.indexOf('.');
  if (dotIdx === -1) return null;

  const payloadB64 = sessionCookie.substring(0, dotIdx);
  const signature = sessionCookie.substring(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('hex');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    if (payload.role !== 'admin') return null;
    return { role: payload.role, tenant_id: payload.tenant_id };
  } catch (err) {
    console.error('[users] Admin session parse error:', err instanceof Error ? err.message : 'unknown');
    return null;
  }
}

/** POST /api/auth/users — create a new CRM user (admin only) */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const admin = verifyAdminSession(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (await rateLimit(ip, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email, password, name, tenant_id, role } = body as {
      email?: string; password?: string; name?: string; tenant_id?: string; role?: string;
    };

    if (!email || !password || !name || !tenant_id) {
      return NextResponse.json({ error: 'Missing required fields: email, password, name, tenant_id' }, { status: 400 });
    }

    if (!VALID_TENANTS.includes(tenant_id)) {
      return NextResponse.json({ error: 'Invalid tenant_id' }, { status: 400 });
    }

    const validRoles = ['admin', 'manager', 'staff'];
    const userRole = role && validRoles.includes(role) ? role : 'staff';

    const passwordHash = await hashPassword(password);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/crm_users`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        name,
        tenant_id,
        role: userRole,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (errText.includes('duplicate key')) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
      console.error(`[users] Create failed: HTTP ${res.status}: ${errText}`);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const created = await res.json();

    // Audit log — admin-created accounts (especially other admins) are high-signal events
    try {
      await supaPost('lead_transcripts', {
        tenant_id,
        lead_id: 'audit:user-create',
        entry_type: 'status',
        role: 'system',
        content: `USER_CREATED by_admin=${admin.tenant_id} new_user=${email.toLowerCase().trim()} role=${userRole} tenant=${tenant_id}`,
        channel: 'crm',
      });
    } catch (err) {
      console.error('[users] audit log failed:', err instanceof Error ? err.message : 'unknown');
    }

    return NextResponse.json({ success: true, user: { id: created[0]?.id, email, name, tenant_id, role: userRole } }, { status: 201 });
  } catch (err) {
    console.error('[users] POST error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** GET /api/auth/users — list CRM users (admin only) */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const admin = verifyAdminSession(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 403 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_users?select=id,email,name,tenant_id,role,is_active,created_at&tenant_id=eq.${encodeURIComponent(admin.tenant_id)}&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!res.ok) {
      console.error(`[users] List failed: HTTP ${res.status}`);
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }

    const users = await res.json();
    return NextResponse.json({ users });
  } catch (err) {
    console.error('[users] GET error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** PATCH /api/auth/users — change own password (any authenticated user) */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  if (await rateLimit(ip, 5)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { current_password, new_password } = body as { current_password?: string; new_password?: string };

    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Missing current_password or new_password' }, { status: 400 });
    }

    if (new_password.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    // Look up user to get current password hash
    const user = await findUserByEmail(session.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const valid = await verifyPassword(current_password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }

    if (current_password === new_password) {
      return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 });
    }

    // Hash and update
    const newHash = await hashPassword(new_password);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_users?id=eq.${encodeURIComponent(user.id)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ password_hash: newHash }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.error(`[users] Password update failed: HTTP ${res.status}`);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[users] PATCH error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
