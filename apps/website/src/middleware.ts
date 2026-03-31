import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware — runs on every request before route handlers.
 *
 * Responsibilities:
 * 1. Enforce security headers globally
 * 2. CSRF protection for POST/PUT/DELETE on API routes (Origin check)
 * 3. Block non-browser automated probing on sensitive routes
 */

const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN ?? 'https://nexusagents.ca').trim().replace(/\\n$/, '');

export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // ----- Global security headers -----
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // ----- CSRF: validate Origin on mutating requests to /api/* -----
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const method = request.method.toUpperCase();
    if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const isDev = process.env.NODE_ENV === 'development';

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

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and _next internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
