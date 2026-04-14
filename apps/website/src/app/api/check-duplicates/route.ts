import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp, supaGet, requireSession, isAuthError } from '@/lib/security';
import { normalizePhone } from '@/lib/auto-response';
import { z } from 'zod';

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
    const normalized = body.phones.map(p => normalizePhone(p)).filter(Boolean);
    const phoneList = normalized.map(p => encodeURIComponent(p)).join(',');

    const { data } = await supaGet(
      `funnel_submissions?tenant_id=eq.${session.tenant}&phone=in.(${phoneList})&select=phone`
    );

    const duplicates = (data as { phone: string }[]).map(r => r.phone);
    return NextResponse.json({ duplicates });
  } catch (err) {
    console.error('[check-duplicates] Error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 });
  }
}
