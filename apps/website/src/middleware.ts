import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const revokeRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null;

async function isRevoked(signaturePrefix: string): Promise<boolean> {
  if (!revokeRedis || !signaturePrefix) return false;
  try {
    const hit = await revokeRedis.get(`revoke:${signaturePrefix}`);
    return hit !== null;
  } catch (err) {
    console.error('[middleware] revoke check error:', err instanceof Error ? err.message : 'unknown');
    return false;
  }
}

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

const AUTH_SECRET = cleanEnv(process.env.AUTH_SECRET).trim();

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
  user_id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: string;
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
    // Validate required fields — reject old/malformed session cookies
    if (!payload.user_id || !payload.email || !payload.tenant_id || !payload.role) return null;
    return payload;
  } catch (err) {
    console.error('[middleware] Session decode error:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

/* ----- Protected paths ----- */

const PROTECTED_PAGE_PATHS = ['/inbox', '/readycar', '/readyride', '/dashboard'];
const PROTECTED_API_PATHS = ['/api/leads', '/api/messages', '/api/dashboard', '/api/inventory', '/api/appointments', '/api/deals', '/api/import-leads', '/api/check-duplicates', '/api/credit-analyze', '/api/parse-pdf-contacts', '/api/auth/users'];

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
  const res = NextResponse.redirect(new URL('/login', request.url));
  res.cookies.delete('nexus_session');
  return res;
}

function setSecurityHeaders(response: NextResponse, path: string): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  const csp = process.env.NODE_ENV === 'development'
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.twilio.com https://*.sentry.io https://www.facebook.com https://graph.facebook.com wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    : "default-src 'self'; script-src 'self' 'unsafe-inline' https://connect.facebook.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.twilio.com https://*.sentry.io https://www.facebook.com https://graph.facebook.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
  response.headers.set('Content-Security-Policy', csp);

  if (path.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname;

  // Strip any client-supplied session headers BEFORE anything else. A malicious
  // client could set x-session-tenant/role/user-id and try to reach a route
  // handler that calls getSessionContext() without being gated by the
  // protected-paths list. Delete them here so only the middleware can set them.
  const sanitizedHeaders = new Headers(request.headers);
  sanitizedHeaders.delete('x-session-tenant');
  sanitizedHeaders.delete('x-session-role');
  sanitizedHeaders.delete('x-session-user-id');

  // Session data to inject into request headers for route handlers
  let verifiedTenant: string | null = null;
  let verifiedRole: string | null = null;
  let verifiedUserId: string | null = null;

  // ----- CRM session verification for protected routes -----
  if (isProtectedRoute(path)) {
    if (!AUTH_SECRET) {
      return isProtectedApiRoute(path)
        ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        : NextResponse.redirect(new URL('/login', request.url));
    }

    const sessionCookie = request.cookies.get('nexus_session')?.value;

    if (!sessionCookie) {
      if (isProtectedApiRoute(path)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const session = await verifySession(sessionCookie);
    if (!session) {
      return unauthorizedResponse(path, request, 'Invalid or expired session');
    }

    // Check server-side revocation denylist (logout, forced sign-out)
    const dotIdx = sessionCookie.indexOf('.');
    const sigPrefix = dotIdx !== -1 ? sessionCookie.substring(dotIdx + 1, dotIdx + 33) : '';
    if (await isRevoked(sigPrefix)) {
      return unauthorizedResponse(path, request, 'Session revoked');
    }

    // Tenant scope check: staff/manager can only access their own tenant
    // Admin (role='admin') can access any tenant
    const sessionTenant = session.tenant_id;
    const sessionRole = session.role;

    if (sessionRole !== 'admin') {
      if (path.startsWith('/readycar') && sessionTenant !== 'readycar') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      if (path.startsWith('/readyride') && sessionTenant !== 'readyride') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    verifiedTenant = sessionTenant;
    verifiedRole = sessionRole;
    verifiedUserId = session.user_id;

    // For admin accessing a specific tenant path, use that tenant for RLS
    if (sessionRole === 'admin') {
      if (path.startsWith('/readycar')) verifiedTenant = 'readycar';
      else if (path.startsWith('/readyride')) verifiedTenant = 'readyride';
    }

  }

  // ----- CSRF: validate Origin on mutating requests to /api/* -----
  if (path.startsWith('/api/')) {
    const method = request.method.toUpperCase();
    if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const isDev = process.env.NODE_ENV === 'development';

      // Exempt webhook and cron endpoints from CSRF (they have their own auth: Twilio signature, API keys, secrets)
      const isWebhookOrCron = path.startsWith('/api/webhook/') || path.startsWith('/api/cron/') || path === '/api/campaign';

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
  }

  // ----- Sliding session renewal: re-issue cookie when <12h remaining -----
  if (verifiedTenant && verifiedRole && verifiedUserId) {
    const sessionCookie = request.cookies.get('nexus_session')?.value;
    if (sessionCookie) {
      const session = await verifySession(sessionCookie);
      if (session) {
        const timeLeft = session.exp - Date.now();
        if (timeLeft > 0 && timeLeft < 43200000) {
          const renewed = {
            user_id: session.user_id,
            email: session.email,
            name: session.name,
            tenant_id: session.tenant_id,
            role: session.role,
            exp: Date.now() + 86400000,
          };
          const renewedB64 = btoa(JSON.stringify(renewed))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          const renewedSig = await computeHmac(AUTH_SECRET, renewedB64);
          const renewedToken = `${renewedB64}.${renewedSig}`;

          const requestHeaders = new Headers(sanitizedHeaders);
          requestHeaders.set('x-session-tenant', verifiedTenant);
          requestHeaders.set('x-session-role', verifiedRole);
          requestHeaders.set('x-session-user-id', verifiedUserId);

          const res = NextResponse.next({ request: { headers: requestHeaders } });
          res.cookies.set('nexus_session', renewedToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/',
            maxAge: 86400,
          });

          setSecurityHeaders(res, path);
          return res;
        }
      }
    }
  }

  // Inject session context into request headers for route handlers
  const requestHeaders = new Headers(sanitizedHeaders);
  if (verifiedTenant) requestHeaders.set('x-session-tenant', verifiedTenant);
  if (verifiedRole) requestHeaders.set('x-session-role', verifiedRole);
  if (verifiedUserId) requestHeaders.set('x-session-user-id', verifiedUserId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  setSecurityHeaders(response, path);
  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and _next internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
