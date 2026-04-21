import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Admin-only diagnostic. Reports env-var shape (presence, length, corruption
// signals) WITHOUT leaking secret values. Use this to verify that Vercel env
// hasn't stored a credential as an encrypted blob (value starting with "eyJ2")
// or with a trailing \n.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = requireRole(request, 'admin');
  if (isAuthError(session)) return session;

  const checkVar = (name: string, minLen = 1) => {
    const raw = process.env[name] ?? '';
    const trimmed = raw.trim().replace(/\\n$/, '');
    return {
      present: Boolean(trimmed),
      length: trimmed.length,
      ok: trimmed.length >= minLen,
      looksLikeEncryptedBlob: trimmed.startsWith('eyJ2'),
      hasTrailingNewline: /\n$/.test(raw) || /\\n$/.test(raw),
      hasLeadingTrailingSpace: raw !== raw.trim(),
    };
  };

  const report = {
    twilio: {
      TWILIO_ACCOUNT_SID: checkVar('TWILIO_ACCOUNT_SID', 30),
      TWILIO_AUTH_TOKEN: checkVar('TWILIO_AUTH_TOKEN', 30),
      TWILIO_FROM_NUMBER: checkVar('TWILIO_FROM_NUMBER', 10),
    },
    supabase: {
      SUPABASE_URL: checkVar('SUPABASE_URL', 20),
      SUPABASE_SERVICE_KEY: checkVar('SUPABASE_SERVICE_KEY', 30),
    },
    auth: {
      AUTH_SECRET: checkVar('AUTH_SECRET', 16),
      ALLOWED_ORIGIN: checkVar('ALLOWED_ORIGIN', 10),
    },
    upstash: {
      UPSTASH_REDIS_REST_URL: checkVar('UPSTASH_REDIS_REST_URL', 10),
      UPSTASH_REDIS_REST_TOKEN: checkVar('UPSTASH_REDIS_REST_TOKEN', 20),
    },
    anthropic: {
      ANTHROPIC_API_KEY: checkVar('ANTHROPIC_API_KEY', 20),
    },
    runtime: {
      region: process.env.VERCEL_REGION || 'local',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
      node: process.version,
    },
  };

  // Live-ping Twilio to confirm creds actually authenticate
  let twilioPing: { ok: boolean; status?: number; error?: string } = { ok: false };
  const sid = (process.env.TWILIO_ACCOUNT_SID ?? '').trim().replace(/\\n$/, '');
  const tok = (process.env.TWILIO_AUTH_TOKEN ?? '').trim().replace(/\\n$/, '');
  if (sid && tok) {
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
        headers: { Authorization: `Basic ${Buffer.from(`${sid}:${tok}`).toString('base64')}` },
        signal: AbortSignal.timeout(8000),
      });
      twilioPing = { ok: res.ok, status: res.status };
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        twilioPing.error = body.slice(0, 200);
      }
    } catch (err) {
      twilioPing = { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    }
  } else {
    twilioPing.error = 'SID or token missing';
  }

  return NextResponse.json({ ...report, twilioPing });
}
