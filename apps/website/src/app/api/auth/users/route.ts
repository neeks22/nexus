import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SUPABASE_URL, SUPABASE_KEY, rateLimit, getClientIp } from '@/lib/security';
import { hashPassword } from '@/lib/auth';

function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  return val.replace(/\\n$/g, '').replace(/\n$/g, '').trim();
}

const AUTH_SECRET = (cleanEnv(process.env.AUTH_SECRET) || cleanEnv(process.env.CSRF_SECRET) || '').trim();

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
  } catch {
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
      `${SUPABASE_URL}/rest/v1/crm_users?select=id,email,name,tenant_id,role,is_active,created_at&order=created_at.desc`,
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
