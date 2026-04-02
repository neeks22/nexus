import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware — runs on every request before route handlers.
 *
 * Responsibilities:
 * 1. Enforce security headers globally
 * 2. CSRF protection for POST/PUT/DELETE on API routes (Origin check)
 * 3. Server-side session verification for CRM protected routes
 * 4. Block non-browser automated probing on sensitive routes
 */

const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN ?? 'https://nexusagents.ca').trim().replace(/\\n$/, '');

function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  return val.replace(/\\n$/g, '').replace(/\n$/g, '').trim();
}

const AUTH_SECRET = (cleanEnv(process.env.AUTH_SECRET) || cleanEnv(process.env.CSRF_SECRET) || '').trim();

/* ----- Session verification using Web Crypto API (Edge Runtime compatible) ----- */

async function computeHmac(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface SessionPayload {
  tenant: string;
  exp: number;
}

async function verifySession(cookie: string): Promise<SessionPayload | null> {
  const dotIdx = cookie.indexOf('.');
  if (dotIdx === -1) return null;

  const payloadB64 = cookie.substring(0, dotIdx);
  const signature = cookie.substring(dotIdx + 1);
  if (!payloadB64 || !signature) return null;

  const expectedSig = await computeHmac(AUTH_SECRET, payloadB64);
  // Length check before byte-by-byte comparison
  if (signature.length !== expectedSig.length) return null;

  // Constant-time comparison (safe for Edge Runtime without Node crypto)
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  try {
    const decoded = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(decoded) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (err) {
    console.error('[middleware] Session decode error:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

/* ----- Protected paths ----- */

const PROTECTED_PAGE_PATHS = ['/inbox', '/readycar', '/readyride'];
const PROTECTED_API_PATHS = ['/api/leads', '/api/messages', '/api/dashboard'];

function isProtectedRoute(path: string): boolean {
  return PROTECTED_PAGE_PATHS.some(p => path.startsWith(p)) ||
         PROTECTED_API_PATHS.some(p => path.startsWith(p));
}

function isProtectedApiRoute(path: string): boolean {
  return PROTECTED_API_PATHS.some(p => path.startsWith(p));
}

/* ----- Helper to build unauthorized response ----- */

function unauthorizedResponse(path: string, request: NextRequest, message: string = 'Unauthorized'): NextResponse {
  if (isProtectedApiRoute(path)) {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  // For pages: redirect to the page itself (which will show the login modal)
  // We clear the cookie to ensure a clean state
  const res = NextResponse.redirect(new URL('/inbox', request.url));
  res.cookies.delete('nexus_session');
  return res;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname;

  // Track verified session tenant for downstream header injection
  let verifiedTenant: string | null = null;

  // ----- CRM session verification for protected routes -----
  if (isProtectedRoute(path)) {
    // No secret configured = can't verify sessions = deny access
    if (!AUTH_SECRET) {
      return isProtectedApiRoute(path)
        ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        : NextResponse.redirect(new URL('/inbox', request.url));
    }

    const sessionCookie = request.cookies.get('nexus_session')?.value;

    if (!sessionCookie) {
      // No session cookie — API gets 401, pages get passed through to show login modal
      if (isProtectedApiRoute(path)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Let pages through — the client-side PasswordGate will show the login form
      // (we don't redirect to avoid infinite loops; the page handles its own auth UI)
    } else {
      // Verify the session cookie signature and expiry
      const session = await verifySession(sessionCookie);
      if (!session) {
        return unauthorizedResponse(path, request, 'Invalid or expired session');
      }

      // Tenant scope check: /readycar routes require readycar session, /readyride requires readyride
      const sessionTenant = session.tenant;
      if (path.startsWith('/readycar') && sessionTenant !== 'readycar') {
        const res = NextResponse.redirect(new URL('/inbox', request.url));
        res.cookies.delete('nexus_session');
        return res;
      }
      if (path.startsWith('/readyride') && sessionTenant !== 'readyride') {
        const res = NextResponse.redirect(new URL('/inbox', request.url));
        res.cookies.delete('nexus_session');
        return res;
      }

      // Store verified tenant for header injection after CSRF checks
      verifiedTenant = sessionTenant;
    }
  }

  const response = NextResponse.next();

  // ----- Global security headers -----
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.twilio.com https://*.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");

  // ----- CSRF: validate Origin on mutating requests to /api/* -----
  if (path.startsWith('/api/')) {
    const method = request.method.toUpperCase();
    if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const isDev = process.env.NODE_ENV === 'development';

      // Exempt webhook and cron endpoints from CSRF (they have their own auth: Twilio signature, API keys, secrets)
      const isWebhookOrCron = path.startsWith('/api/webhook/') || path.startsWith('/api/cron/') || path === '/api/auth' || path === '/api/campaign';

      // Reject mutating requests with no origin AND no referer (CSRF protection)
      // But allow webhooks/crons since external services (Twilio, Gmail) don't send origin headers
      if (!origin && !referer && !isDev && !isWebhookOrCron) {
        return NextResponse.json(
          { error: 'Forbidden — missing origin' },
          { status: 403 }
        );
      }

      const originOk =
        !origin ||
        origin === ALLOWED_ORIGIN ||
        (isDev && origin.includes('localhost'));

      const refererOk =
        !referer ||
        referer.startsWith(ALLOWED_ORIGIN) ||
        (isDev && referer.includes('localhost'));

      if (!originOk && !refererOk) {
        return NextResponse.json(
          { error: 'Forbidden — invalid origin' },
          { status: 403 }
        );
      }
    }

    // No-cache for all API responses (PII protection)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // Inject verified tenant header for API route handlers (cross-tenant data access prevention)
  if (verifiedTenant) {
    response.headers.set('x-session-tenant', verifiedTenant);
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and _next internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
