import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp, supaGet, requireSession, isAuthError } from '@/lib/security';
import { normalizePhone } from '@/lib/auto-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RequestSchema = z.object({
  phones: z.array(z.string()).max(200),
});

export async function POST(request: NextRequest) {
  // Require authenticated session
  const session = requireSession(request);
  if (isAuthError(session)) return session;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 10, 60000)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  let body;
  try {
    body = RequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    // Normalize input phones to E.164 (matches how insertLead stores them).
    // Query the decrypted view so we compare against plaintext phones,
    // not ciphertext in funnel_submissions.phone_encrypted.
    const normalized = body.phones
      .map(p => normalizePhone(p))
      .filter((p): p is string => Boolean(p));

    if (normalized.length === 0) return NextResponse.json({ duplicates: [] });

    // PostgREST treats `+` as a space inside in.(...) — must encode it as %2B.
    const phoneList = normalized
      .map(p => encodeURIComponent(p).replace(/%2B/g, '%2B'))
      .join(',');

    const { data } = await supaGet(
      `v_funnel_submissions?tenant_id=eq.${encodeURIComponent(session.tenant)}&phone=in.(${phoneList})&select=phone`
    );

    // Return duplicates in the same format the client normalized to (E.164),
    // so the modal can dedupe correctly.
    const found = new Set((data as { phone: string }[]).map(r => normalizePhone(r.phone)));
    const duplicates = normalized.filter(p => found.has(p));
    return NextResponse.json({ duplicates });
  } catch (err) {
    console.error('[check-duplicates] Error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 });
  }
}
