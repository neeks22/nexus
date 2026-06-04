import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { requireSession, isAuthError, supaGet, supaHeaders, SUPABASE_URL } from '../../../../lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =============================================================================
   GET /api/messages/drafts?phone=<E.164>
   Returns the most recent AI-drafted reply for a conversation (intent='draft').
   Used by the inbox to pre-fill the composer when a draft exists.

   DELETE /api/messages/drafts?id=<uuid>
   Marks a draft as consumed (intent flips to 'sent_from_draft') so it stops
   appearing in the composer. Called after a successful send.
   ============================================================================= */

interface DraftRow {
  id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = requireSession(request);
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const phone = new URL(request.url).searchParams.get('phone');
  if (!phone) {
    return NextResponse.json({ error: 'phone parameter required' }, { status: 400 });
  }

  const { data, error } = await supaGet(
    `lead_transcripts?tenant_id=eq.${tenant}` +
    `&lead_id=eq.${encodeURIComponent(phone)}` +
    `&intent=eq.draft` +
    `&select=id,content,metadata,created_at` +
    `&order=created_at.desc&limit=1`
  );

  if (error) {
    return NextResponse.json({ draft: null });
  }

  const rows = data as DraftRow[];
  const draft = rows[0] ?? null;
  return NextResponse.json({ draft });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const session = requireSession(request);
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lead_transcripts?id=eq.${encodeURIComponent(id)}&tenant_id=eq.${tenant}`,
      {
        method: 'PATCH',
        headers: { ...supaHeaders(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ intent: 'sent_from_draft' }),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) {
      console.error(`[drafts] PATCH failed: ${res.status}`);
      return NextResponse.json({ error: 'Failed to clear draft' }, { status: 500 });
    }
  } catch (err) {
    console.error('[drafts] DELETE error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
