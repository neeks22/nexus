import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit, getClientIp } from '@/lib/security';

/* =============================================================================
   AUTH API — Server-side password verification + signed session cookie
   Passwords never appear in client JS bundle.
   On success, sets an HttpOnly signed cookie (nexus_session) for server-side
   session verification in middleware.
   ============================================================================= */

function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  return val.replace(/\\n$/g, '').replace(/\n$/g, '').trim();
}

const AUTH_SECRET = (cleanEnv(process.env.AUTH_SECRET) || cleanEnv(process.env.CSRF_SECRET) || '').trim();

const PASSWORDS: Record<string, string> = {
  readycar: cleanEnv(process.env.CRM_PASSWORD_READYCAR),
  readyride: cleanEnv(process.env.CRM_PASSWORD_READYRIDE),
};

function signPayload(payloadB64: string): string {
  return crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('hex');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!AUTH_SECRET) {
    console.error('[auth] AUTH_SECRET not configured — cannot create sessions');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Rate limit: 5 attempts per minute per IP
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
    const { password, tenant } = body as { password?: string; tenant?: string };

    if (!password || !tenant) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const expected = PASSWORDS[tenant];
    if (!expected) {
      return NextResponse.json({ authenticated: false, reason: 'no password configured for tenant' }, { status: 401 });
    }

    // Timing-safe comparison — pad to same length to avoid leaking password length
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    const maxLen = Math.max(a.length, b.length);
    const aPadded = Buffer.alloc(maxLen);
    const bPadded = Buffer.alloc(maxLen);
    a.copy(aPadded);
    b.copy(bPadded);
    const lengthMatch = a.length === b.length;
    const contentMatch = crypto.timingSafeEqual(aPadded, bPadded);

    if (lengthMatch && contentMatch) {
      // Build signed session token: base64url(payload).hmac_signature
      const payload = { tenant, exp: Date.now() + 86400000 }; // 24h expiry
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = signPayload(payloadB64);
      const token = `${payloadB64}.${signature}`;

      const response = NextResponse.json({ authenticated: true, token: 'ok' });
      response.cookies.set('nexus_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 86400,
      });
      return response;
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (err) {
    console.error('[auth] POST error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}

/** GET /api/auth — check if session cookie is valid (for client-side auth gating) */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!AUTH_SECRET) {
    return NextResponse.json({ authenticated: false, reason: 'server misconfigured' }, { status: 500 });
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

  // Timing-safe comparison
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
    return NextResponse.json({ authenticated: true, tenant: payload.tenant });
  } catch (err) {
    console.error('[auth] Session decode error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

/** DELETE /api/auth — clear session cookie (logout) */
export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('nexus_session');
  return response;
}
