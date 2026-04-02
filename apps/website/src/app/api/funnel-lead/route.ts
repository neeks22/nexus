import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { handleAutoResponse } from '../../../lib/auto-response';
import { rateLimit, getClientIp as sharedGetClientIp } from '../../../lib/security';

/**
 * POST /api/funnel-lead
 *
 * Receives multi-step funnel data from the /apply page (9 steps),
 * forwards it to the n8n webhook for CRM creation and instant response,
 * and returns success/error.
 *
 * Security: rate-limited (10/min/IP), Zod-validated, injection-blocked,
 * origin-checked. Never exposes internals to client.
 */

/* =============================================================================
   ENVIRONMENT
   ============================================================================= */

const N8N_WEBHOOK_URL =
  process.env.N8N_FUNNEL_WEBHOOK_URL ?? 'https://nexusagents.app.n8n.cloud/webhook/ad-lead';
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN ?? 'https://nexusagents.ca').trim().replace(/\\n$/, '');

/* =============================================================================
   RATE LIMITING — 10 submissions per minute per IP (shared Upstash-backed)
   ============================================================================= */

/* =============================================================================
   INPUT VALIDATION — Zod schema with injection blocking
   ============================================================================= */

/** Detect common SQL injection patterns */
const SQL_INJECTION_REGEX = /('|--|;|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/i;

/** Detect script injection */
const XSS_REGEX = /<\s*(script|iframe|object|embed|form|input|svg|on\w+)\b/i;

/** Sanitize a string: strip control chars, reject injection patterns */
function sanitizeString(input: string, maxLength: number = 500): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, maxLength);
}

function containsInjection(value: string): boolean {
  return SQL_INJECTION_REGEX.test(value) || XSS_REGEX.test(value);
}

/** Safe string: alphanumeric, spaces, hyphens, apostrophes, periods, commas */
const safeNameString = z
  .string()
  .min(1)
  .max(100)
  .transform((v) => sanitizeString(v, 100))
  .refine((v) => !containsInjection(v), { message: 'Invalid characters detected' });

const safeGeneralString = z
  .string()
  .max(500)
  .transform((v) => sanitizeString(v, 500))
  .refine((v) => !containsInjection(v), { message: 'Invalid characters detected' });

const phoneSchema = z
  .string()
  .min(7)
  .max(20)
  .regex(/^[\d\s\-().+]+$/, 'Invalid phone format');

const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254)
  .transform((v) => v.toLowerCase().trim())
  .refine((v) => !containsInjection(v), { message: 'Invalid characters detected' });

const FunnelLeadSchema = z.object({
  vehicleType: safeGeneralString,
  employmentStatus: safeGeneralString,
  monthlyIncome: safeGeneralString,
  jobDuration: safeGeneralString.optional().default(''),
  creditSituation: safeGeneralString,
  firstName: safeNameString,
  lastName: safeNameString,
  phone: phoneSchema,
  email: emailSchema,
  preferredContact: z.string().max(50).optional().default(''),
  caslConsent: z.literal(true, {
    errorMap: () => ({ message: 'CASL consent is required' }),
  }),
  utmSource: z.string().max(200).optional().default(''),
  utmMedium: z.string().max(200).optional().default(''),
  utmCampaign: z.string().max(200).optional().default(''),
  completedAt: z.string().max(50).optional(),
  tenant: z.enum(['readycar', 'readyride']).optional().default('readycar'),
});

/* =============================================================================
   SECURITY HEADERS + HELPERS
   ============================================================================= */

function securityHeaders(origin?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  if (origin === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }

  return headers;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

function isValidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (!origin && !referer) return true;
  if (origin === ALLOWED_ORIGIN) return true;
  if (referer?.startsWith(ALLOWED_ORIGIN)) return true;

  if (process.env.NODE_ENV === 'development') {
    if (origin?.includes('localhost') || referer?.includes('localhost')) return true;
  }

  return false;
}

/* =============================================================================
   OPTIONS (CORS preflight)
   ============================================================================= */

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: securityHeaders(origin),
  });
}

/* =============================================================================
   POST /api/funnel-lead
   ============================================================================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const origin = request.headers.get('origin');

  // Rate limiting (shared Upstash-backed, 10 req/min for funnel submissions)
  if (await rateLimit(ip, 10)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait a minute and try again.' },
      { status: 429, headers: securityHeaders(origin) }
    );
  }

  // Origin validation handled by middleware (CSRF check)
  // Route-level check kept as defense-in-depth but with env var trimming applied
  if (!isValidOrigin(request)) {
    console.error('[funnel-lead] Origin rejected:', origin, 'expected:', ALLOWED_ORIGIN);
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: securityHeaders(origin) }
    );
  }

  try {
    // Parse JSON body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: securityHeaders(origin) }
      );
    }

    // Zod validation — rejects bad types, injection patterns, missing fields
    const parsed = FunnelLeadSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Validation failed';
      return NextResponse.json(
        { error: firstError },
        { status: 400, headers: securityHeaders(origin) }
      );
    }

    const body = parsed.data;

    // Build the lead data for auto-response
    const lead = {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email,
      vehicleType: body.vehicleType,
      budget: '',
      monthlyIncome: body.monthlyIncome,
      jobTitle: body.jobDuration || '',
      employment: body.employmentStatus,
      creditSituation: body.creditSituation,
      tradeIn: '',
      tradeInYear: '',
      utmSource: body.utmSource || '',
      utmMedium: body.utmMedium || '',
      utmCampaign: body.utmCampaign || '',
    };

    // Log only non-PII identifiers server-side
    console.log(
      `[funnel-lead] Lead submitted | vehicle=${body.vehicleType} employment=${body.employmentStatus} ` +
        `credit=${body.creditSituation} utm_source=${body.utmSource || 'direct'}`
    );

    // Run auto-response and n8n webhook in parallel to stay within Vercel time limits
    await Promise.allSettled([
      handleAutoResponse(lead, body.tenant).catch((err) => {
        console.error('[funnel-lead] Auto-response error:', err instanceof Error ? err.message : 'unknown');
        Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      }),
      fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'funnel',
          funnelData: {
            vehicleType: body.vehicleType,
            monthlyIncome: body.monthlyIncome,
            employmentStatus: body.employmentStatus,
            jobDuration: body.jobDuration,
            creditSituation: body.creditSituation,
          },
          contact: {
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone,
            email: body.email,
          },
          consent: {
            casl: body.caslConsent,
            timestamp: body.completedAt || new Date().toISOString(),
          },
          attribution: {
            utmSource: body.utmSource,
            utmMedium: body.utmMedium,
            utmCampaign: body.utmCampaign,
          },
          metadata: {
            submittedAt: new Date().toISOString(),
            userAgent: sanitizeString(request.headers.get('user-agent') || '', 500),
            ip,
          },
        }),
        signal: AbortSignal.timeout(10000),
      }).catch((err) => {
        console.error('[funnel-lead] n8n webhook failed:', err instanceof Error ? err.message : 'unknown');
        Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      }),
    ]);

    return NextResponse.json(
      { success: true },
      { headers: securityHeaders(origin) }
    );
  } catch (error: unknown) {
    console.error(
      '[funnel-lead] Error processing lead:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));

    return NextResponse.json(
      { error: 'Failed to process application. Please try again.' },
      { status: 500, headers: securityHeaders(origin) }
    );
  }
}
