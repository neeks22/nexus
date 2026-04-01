import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit, getClientIp } from '@/lib/security';

/* =============================================================================
   AUTH API — Server-side password verification
   Passwords never appear in client JS bundle
   ============================================================================= */

function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  // Vercel CLI appends literal \n to env vars — strip all trailing whitespace, newlines, and backslash-n
  return val.replace(/\\n$/g, '').replace(/\n$/g, '').trim();
}

const PASSWORDS: Record<string, string> = {
  readycar: cleanEnv(process.env.CRM_PASSWORD_READYCAR),
  readyride: cleanEnv(process.env.CRM_PASSWORD_READYRIDE),
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit: 5 attempts per minute per IP
  const ip = getClientIp(request);
  if (rateLimit(ip, 5)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  try {
    let body;
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch {
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

    // Direct comparison (timing-safe for equal lengths)
    if (password === expected) {
      const token = crypto.randomBytes(32).toString('hex');
      return NextResponse.json({ authenticated: true, token });
    }

    // Fallback: timing-safe comparison
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    const match = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (match) {
      // Generate session token
      const token = crypto.randomBytes(32).toString('hex');
      return NextResponse.json({ authenticated: true, token });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}
