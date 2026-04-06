import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit, getClientIp } from '@/lib/security';
import { findUserByEmail, verifyPassword } from '@/lib/auth';

/* =============================================================================
   AUTH API — Per-user email+password authentication
   Verifies credentials against crm_users table, sets signed session cookie.
   ============================================================================= */

function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  return val.replace(/\\n$/g, '').replace(/\n$/g, '').trim();
}

const AUTH_SECRET = cleanEnv(process.env.AUTH_SECRET).trim();

function signPayload(payloadB64: string): string {
  return crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('hex');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!AUTH_SECRET) {
    console.error('[auth] AUTH_SECRET not configured — cannot create sessions');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const ip = getClientIp(request);
  if (await rateLimit(ip, 5)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  try {
    let body;
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch (err) {
      console.error('[auth] Body parse error:', err instanceof Error ? err.message : 'unknown');
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const user = await findUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Build signed session token
    const payload = {
      user_id: user.id,
      email: user.email,
      name: user.name,
      tenant_id: user.tenant_id,
      role: user.role,
      exp: Date.now() + 86400000, // 24h
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = signPayload(payloadB64);
    const token = `${payloadB64}.${signature}`;

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set('nexus_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    });
    return response;
  } catch (err) {
    console.error('[auth] POST error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}

/** GET /api/auth — check session and return user info */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!AUTH_SECRET) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }

  const sessionCookie = request.cookies.get('nexus_session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const dotIdx = sessionCookie.indexOf('.');
  if (dotIdx === -1) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payloadB64 = sessionCookie.substring(0, dotIdx);
  const signature = sessionCookie.substring(dotIdx + 1);
  const expectedSig = signPayload(payloadB64);

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    const res = NextResponse.json({ authenticated: false }, { status: 401 });
    res.cookies.delete('nexus_session');
    return res;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp < Date.now()) {
      const res = NextResponse.json({ authenticated: false, reason: 'expired' }, { status: 401 });
      res.cookies.delete('nexus_session');
      return res;
    }
    // Reject old/malformed session cookies missing required fields
    if (!payload.user_id || !payload.email || !payload.tenant_id || !payload.role) {
      const res = NextResponse.json({ authenticated: false, reason: 'invalid_session' }, { status: 401 });
      res.cookies.delete('nexus_session');
      return res;
    }
    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.user_id,
        email: payload.email,
        name: payload.name,
        tenant_id: payload.tenant_id,
        role: payload.role,
      },
    });
  } catch (err) {
    console.error('[auth] Session decode error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

/** DELETE /api/auth — logout */
export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('nexus_session');
  return response;
}
