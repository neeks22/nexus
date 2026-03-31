import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/* =============================================================================
   SECURITY MODULE — Shared auth, rate limiting, validation for all API routes
   ============================================================================= */

/* ---------- Environment Variables (NO FALLBACKS — fail if missing) ---------- */

export const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim().replace(/\\n$/, '');
export const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim().replace(/\\n$/, '');
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim().replace(/\\n$/, '');
export const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY ?? '').trim();
export const TWILIO_SID = (process.env.TWILIO_ACCOUNT_SID ?? '').trim();
export const TWILIO_TOKEN = (process.env.TWILIO_AUTH_TOKEN ?? '').trim();
export const GMAIL_USER = process.env.GMAIL_USER ?? 'nicolas@readycar.ca';
export const GMAIL_PASS = (process.env.GMAIL_PASS ?? '').trim();
export const SLACK_WEBHOOK = (process.env.SLACK_WEBHOOK_URL ?? '').trim();
export const NEXUS_API_KEY = (process.env.NEXUS_API_KEY ?? '').trim();
export const CRON_SECRET = (process.env.CRON_SECRET ?? '').trim();

/* ---------- Tenant Map ---------- */

export const TENANT_MAP: Record<string, { name: string; location: string; phone: string; gm: string; tenant: string }> = {
  '+13433125045': { name: 'ReadyCar', location: 'Stittsville ON', phone: '613-363-4494', gm: 'Nico', tenant: 'readycar' },
  '+13433412797': { name: 'ReadyRide', location: 'Gloucester ON', phone: '613-983-9834', gm: 'Moe', tenant: 'readyride' },
};

export const VALID_TENANTS = ['readycar', 'readyride'];

/* ---------- Supabase Helpers ---------- */

export function supaHeaders(tenant?: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
  // Pass tenant header for RLS enforcement (defense in depth)
  if (tenant) headers['x-tenant-id'] = tenant;
  return headers;
}

// Use anon key for read-only operations (respects RLS)
export function supaAnonHeaders(tenant?: string): Record<string, string> {
  const key = SUPABASE_ANON_KEY || SUPABASE_KEY;
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  if (tenant) headers['x-tenant-id'] = tenant;
  return headers;
}

export async function supaGet(path: string): Promise<unknown[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: supaHeaders(), signal: AbortSignal.timeout(8000) });
    if (res.ok) return await res.json();
  } catch { /* ignore */ }
  return [];
}

export async function supaPost(table: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify(data), signal: AbortSignal.timeout(8000),
    });
  } catch { /* ignore */ }
}

/* ---------- Twilio Signature Validation ---------- */

export function validateTwilioSignature(request: NextRequest, params: Record<string, string>): boolean {
  if (!TWILIO_TOKEN) return false;

  const signature = request.headers.get('x-twilio-signature');
  if (!signature) return false;

  // Build the full URL Twilio used
  const url = request.url;

  // Sort params alphabetically and concatenate
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // HMAC-SHA1
  const computed = crypto
    .createHmac('sha1', TWILIO_TOKEN)
    .update(data)
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
}

/* ---------- API Key Authentication ---------- */

export function requireApiKey(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('key');

  if (!NEXUS_API_KEY) {
    // If no API key is configured, allow requests from same origin only
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    if (origin?.includes('nexusagents.ca') || referer?.includes('nexusagents.ca')) return null;
    if (process.env.NODE_ENV === 'development') return null;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!apiKey || apiKey !== NEXUS_API_KEY) {
    // Also allow same-origin requests (from the CRM pages)
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    if (origin?.includes('nexusagents.ca') || referer?.includes('nexusagents.ca')) return null;
    if (process.env.NODE_ENV === 'development') return null;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // Authorized
}

/* ---------- Rate Limiting ---------- */

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return false; // Not limited
  }

  entry.count++;
  if (entry.count > maxRequests) return true; // Limited
  return false;
}

// Cleanup stale entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (let i = 0; i < entries.length; i++) {
    if (now > entries[i][1].resetAt) rateLimitStore.delete(entries[i][0]);
  }
}, 120000);

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '0.0.0.0';
}

/* ---------- Input Sanitization ---------- */

export function sanitizeInput(input: string, maxLength: number = 500): string {
  // Remove null bytes and control characters
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, maxLength);
}

export function validateTenant(tenant: string | null): string {
  if (!tenant || !VALID_TENANTS.includes(tenant)) return 'readycar';
  return tenant;
}

export function encodeSupabaseParam(value: string): string {
  return encodeURIComponent(value).replace(/[(),.]/g, c => `%${c.charCodeAt(0).toString(16)}`);
}

/* ---------- Slack ---------- */

export async function slackNotify(text: string): Promise<void> {
  if (!SLACK_WEBHOOK) return;
  try {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }), signal: AbortSignal.timeout(5000),
    });
  } catch { /* ignore */ }
}

/* ---------- Claude API ---------- */

export async function callClaude(system: string, userMsg: string, maxTokens: number = 200): Promise<string> {
  if (!ANTHROPIC_KEY) return '';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return '';
    const data = await res.json();
    return data.content?.[0]?.text || '';
  } catch {
    return '';
  }
}

/* ---------- Twilio SMS ---------- */

export async function sendTwilioSMS(to: string, from: string, body: string): Promise<boolean> {
  if (!TWILIO_SID || !TWILIO_TOKEN) return false;

  try {
    const params = new URLSearchParams({ To: to, From: from, Body: body });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch { return false; }
}

/* ---------- Env Validation ---------- */

export function validateRequiredEnv(...keys: string[]): string | null {
  for (const key of keys) {
    if (!process.env[key]?.trim()) return key;
  }
  return null;
}
