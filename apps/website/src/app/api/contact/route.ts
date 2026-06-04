import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { rateLimit, getClientIp, slackNotify, GMAIL_USER, GMAIL_PASS } from '../../../lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN ?? 'https://nexusagents.ca').trim().replace(/\\n$/, '');
const CONTACT_NOTIFY_TO = (process.env.CONTACT_NOTIFY_TO ?? 'nicolas@readycar.ca').trim();

const SQL_INJECTION_REGEX = /('|--|;|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/i;
const XSS_REGEX = /<\s*(script|iframe|object|embed|form|input|svg|on\w+)\b/i;

function sanitizeString(input: string, maxLength: number): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, maxLength);
}

function containsInjection(value: string): boolean {
  return SQL_INJECTION_REGEX.test(value) || XSS_REGEX.test(value);
}

const safeName = z.string().min(1).max(100)
  .transform((v) => sanitizeString(v, 100))
  .refine((v) => !containsInjection(v), { message: 'Invalid characters detected' });

const safeShort = z.string().max(200)
  .transform((v) => sanitizeString(v, 200))
  .refine((v) => !containsInjection(v), { message: 'Invalid characters detected' });

const safeLong = z.string().max(2000)
  .transform((v) => sanitizeString(v, 2000))
  .refine((v) => !containsInjection(v), { message: 'Invalid characters detected' });

const emailSchema = z.string().email('Invalid email format').max(254)
  .transform((v) => v.toLowerCase().trim())
  .refine((v) => !containsInjection(v), { message: 'Invalid characters detected' });

const ContactSchema = z.object({
  name: safeName,
  email: emailSchema,
  company: safeShort.optional().default(''),
  role: safeShort.optional().default(''),
  challenge: safeLong.optional().default(''),
  budget: safeShort.optional().default(''),
});

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface ContactSubmission {
  name: string;
  email: string;
  company: string;
  role: string;
  challenge: string;
  budget: string;
}

async function sendNotificationEmail(submission: ContactSubmission): Promise<void> {
  if (!GMAIL_USER || !GMAIL_PASS) {
    console.error('[contact] Gmail credentials not configured — skipping notification email');
    return;
  }

  const subject = `[Nexus] New audit request: ${submission.name} ${submission.company ? `(${submission.company})` : ''}`.trim();

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">New contact form submission</h2>
  <table style="width:100%; border-collapse:collapse;">
    <tr><td style="padding:6px 0; color:#666;"><strong>Name</strong></td><td style="padding:6px 0;">${escapeHtml(submission.name)}</td></tr>
    <tr><td style="padding:6px 0; color:#666;"><strong>Email</strong></td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(submission.email)}">${escapeHtml(submission.email)}</a></td></tr>
    ${submission.company ? `<tr><td style="padding:6px 0; color:#666;"><strong>Company</strong></td><td style="padding:6px 0;">${escapeHtml(submission.company)}</td></tr>` : ''}
    ${submission.role ? `<tr><td style="padding:6px 0; color:#666;"><strong>Role</strong></td><td style="padding:6px 0;">${escapeHtml(submission.role)}</td></tr>` : ''}
    ${submission.budget ? `<tr><td style="padding:6px 0; color:#666;"><strong>Budget</strong></td><td style="padding:6px 0;">${escapeHtml(submission.budget)}</td></tr>` : ''}
  </table>
  ${submission.challenge ? `<div style="margin-top:20px;"><strong style="color:#666;">Challenge</strong><div style="margin-top:8px; padding:12px; background:#f5f5f5; border-radius:8px; white-space:pre-wrap;">${escapeHtml(submission.challenge)}</div></div>` : ''}
  <p style="margin-top:24px; color:#999; font-size:12px;">Submitted via nexusagents.ca/contact</p>
</div>`;

  const text = `New contact form submission

Name: ${submission.name}
Email: ${submission.email}
${submission.company ? `Company: ${submission.company}\n` : ''}${submission.role ? `Role: ${submission.role}\n` : ''}${submission.budget ? `Budget: ${submission.budget}\n` : ''}
${submission.challenge ? `Challenge:\n${submission.challenge}` : ''}

— nexusagents.ca/contact`;

  const nodemailer = await import('nodemailer');
  const transport = nodemailer.default.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });

  await transport.sendMail({
    from: `"Nexus Agents" <${GMAIL_USER}>`,
    to: CONTACT_NOTIFY_TO,
    replyTo: submission.email,
    subject,
    text,
    html,
  });
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: securityHeaders(origin) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const origin = request.headers.get('origin');

  if (await rateLimit(ip, 5)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait a minute and try again.' },
      { status: 429, headers: securityHeaders(origin) }
    );
  }

  if (!isValidOrigin(request)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: securityHeaders(origin) }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: securityHeaders(origin) }
    );
  }

  const parsed = ContactSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Validation failed';
    return NextResponse.json(
      { error: firstError },
      { status: 400, headers: securityHeaders(origin) }
    );
  }

  const submission = parsed.data;

  console.log(`[contact] Submission received | email=${submission.email} company=${submission.company || 'n/a'}`);

  await Promise.allSettled([
    sendNotificationEmail(submission).catch((err) => {
      console.error('[contact] Email send failed:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    }),
    slackNotify(
      `📩 *New audit request*\n*Name:* ${submission.name}\n*Email:* ${submission.email}\n*Company:* ${submission.company || '—'}\n*Role:* ${submission.role || '—'}\n*Budget:* ${submission.budget || '—'}\n${submission.challenge ? `*Challenge:* ${submission.challenge.slice(0, 500)}` : ''}`
    ).catch((err) => {
      console.error('[contact] Slack notify failed:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    }),
  ]);

  return NextResponse.json(
    { success: true },
    { headers: securityHeaders(origin) }
  );
}
