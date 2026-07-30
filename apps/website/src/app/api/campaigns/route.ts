import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import {
  SUPABASE_URL,
  SUPABASE_KEY,
  requireSession,
  requireRole,
  isAuthError,
  rateLimit,
  getClientIp,
  supaHeaders,
  encodeSupabaseParam,
  sanitizeInput,
  isValidUuid,
} from '../../../lib/security';
import { DAILY_SEND_CAP, SEQUENCE, TEMPLATES, type TemplateId } from '../../../lib/campaign-templates';

/* =============================================================================
   EMAIL CAMPAIGN API — reactivation campaign roster, queue and send log
   Security: session auth + rate limiting + input sanitization
   ============================================================================= */

const CONTACT_STATUSES = ['pending', 'in_sequence', 'replied', 'unsubscribed', 'bounced', 'closed', 'sold'];
const CONSENT_BASES = ['implied_active', 'implied_expired', 'express'];
const TABLE = 'email_campaign_contacts';
const SENDS_TABLE = 'email_campaign_sends';
/** Contacts still open to further touches — everything else is out of the sequence. */
const ACTIVE_STATUSES = "('pending','in_sequence')";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  lead_created_at: string | null;
  consent_basis: string;
  sequence_step: number;
  status: string;
  last_template: string | null;
  last_sent_at: string | null;
  replied_at: string | null;
  notes: string | null;
}

function configError(): NextResponse {
  return NextResponse.json({ error: 'Server config error' }, { status: 500 });
}

/** Days that must elapse after a send before the given step is due. */
function waitDaysForStep(step: number): number {
  const current = TEMPLATES[step];
  const previous = TEMPLATES[step - 1];
  if (!current || !previous) return 0;
  return current.day - previous.day;
}

async function supaFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...supaHeaders(), ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = requireSession(request);
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 60)) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  if (!SUPABASE_URL || !SUPABASE_KEY) return configError();

  const view = request.nextUrl.searchParams.get('view');

  try {
    if (view === 'stats') return await getStats(tenant);
    if (view === 'queue') return await getQueue(request, tenant);
    return await getContacts(request, tenant);
  } catch (err) {
    console.error('[campaigns] GET error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Failed to load campaign data' }, { status: 500 });
  }
}

/** Aggregate counters for the tab header. */
async function getStats(tenant: string): Promise<NextResponse> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const countOf = async (filter: string): Promise<number> => {
    const res = await supaFetch(`${TABLE}?tenant_id=eq.${tenant}&${filter}&select=id`, {
      headers: { Prefer: 'count=exact' },
    });
    if (!res.ok) return 0;
    const range = res.headers.get('content-range');
    return range ? parseInt(range.split('/')[1] ?? '0', 10) || 0 : 0;
  };

  const sentTodayRes = await supaFetch(
    `${SENDS_TABLE}?tenant_id=eq.${tenant}&sent_at=gte.${startOfDay.toISOString()}&select=id`,
    { headers: { Prefer: 'count=exact' } }
  );
  const sentTodayRange = sentTodayRes.headers.get('content-range');
  const sentToday = sentTodayRange ? parseInt(sentTodayRange.split('/')[1] ?? '0', 10) || 0 : 0;

  const [total, pending, inSequence, replied, unsubscribed, bounced, sold, consentActive] = await Promise.all([
    countOf('id=not.is.null'),
    countOf('status=eq.pending'),
    countOf('status=eq.in_sequence'),
    countOf('status=eq.replied'),
    countOf('status=eq.unsubscribed'),
    countOf('status=eq.bounced'),
    countOf('status=eq.sold'),
    countOf('consent_basis=eq.implied_active'),
  ]);

  const touched = inSequence + replied + unsubscribed + bounced + sold;
  const replyRate = touched > 0 ? Math.round((replied / touched) * 1000) / 10 : 0;

  return NextResponse.json(
    {
      stats: {
        total,
        pending,
        inSequence,
        replied,
        unsubscribed,
        bounced,
        sold,
        consentActive,
        sentToday,
        remainingToday: Math.max(0, DAILY_SEND_CAP - sentToday),
        dailyCap: DAILY_SEND_CAP,
        replyRate,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Today's send wave: contacts whose next template is due, oldest wait first.
 * A contact is due when they've never been sent to, or enough days have
 * elapsed since their last send for the next step in the sequence.
 */
async function getQueue(request: NextRequest, tenant: string): Promise<NextResponse> {
  const consentOnly = request.nextUrl.searchParams.get('consent') === 'active';
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10) || 50, DAILY_SEND_CAP);

  const consentFilter = consentOnly ? '&consent_basis=eq.implied_active' : '';
  const res = await supaFetch(
    `${TABLE}?tenant_id=eq.${tenant}&status=in.${ACTIVE_STATUSES}&sequence_step=lt.${SEQUENCE.length}` +
      `${consentFilter}&select=*&order=last_sent_at.asc.nullsfirst&limit=${limit * 4}`
  );
  if (!res.ok) return NextResponse.json({ error: 'Failed to load queue' }, { status: 502 });

  const rows = (await res.json()) as Contact[];
  const now = Date.now();

  const due = rows.filter((c) => {
    if (c.sequence_step === 0 || !c.last_sent_at) return true;
    const waitDays = waitDaysForStep(c.sequence_step);
    const elapsedDays = (now - new Date(c.last_sent_at).getTime()) / 86_400_000;
    return elapsedDays >= waitDays;
  });

  return NextResponse.json(
    { contacts: due.slice(0, limit), totalDue: due.length },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/** Filterable roster view. */
async function getContacts(request: NextRequest, tenant: string): Promise<NextResponse> {
  const status = request.nextUrl.searchParams.get('status');
  const search = request.nextUrl.searchParams.get('search');
  const consent = request.nextUrl.searchParams.get('consent');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '100', 10) || 100, 500);

  let query = `${TABLE}?tenant_id=eq.${tenant}&select=*&order=last_sent_at.desc.nullslast&limit=${limit}`;
  if (status && CONTACT_STATUSES.includes(status)) query += `&status=eq.${status}`;
  if (consent && CONSENT_BASES.includes(consent)) query += `&consent_basis=eq.${consent}`;
  if (search) {
    const term = encodeSupabaseParam(`*${sanitizeInput(search, 100)}*`);
    query += `&or=(email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term})`;
  }

  const res = await supaFetch(query);
  if (!res.ok) return NextResponse.json({ error: 'Failed to load contacts' }, { status: 502 });

  return NextResponse.json({ contacts: await res.json() }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Bulk import from the cleaned CSV. Upserts on (tenant_id, email) so re-imports are safe. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = requireRole(request, 'manager');
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 10)) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  if (!SUPABASE_URL || !SUPABASE_KEY) return configError();

  let body: { contacts?: unknown };
  try {
    body = (await request.json()) as { contacts?: unknown };
  } catch (err) {
    console.error('[campaigns] POST invalid JSON:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.contacts) || body.contacts.length === 0) {
    return NextResponse.json({ error: 'contacts array required' }, { status: 400 });
  }
  if (body.contacts.length > 1000) {
    return NextResponse.json({ error: 'Max 1000 contacts per request' }, { status: 400 });
  }

  const rows = (body.contacts as Record<string, unknown>[])
    .map((c) => {
      const email = sanitizeInput(String(c.email ?? ''), 200).toLowerCase().trim();
      if (!email.includes('@')) return null;
      const consent = String(c.consent_basis ?? '');
      return {
        tenant_id: tenant,
        email,
        first_name: c.first_name ? sanitizeInput(String(c.first_name), 80) : null,
        last_name: c.last_name ? sanitizeInput(String(c.last_name), 80) : null,
        phone: c.phone ? sanitizeInput(String(c.phone), 20) : null,
        zip: c.zip ? sanitizeInput(String(c.zip), 12) : null,
        lead_source: c.lead_source ? sanitizeInput(String(c.lead_source), 80) : null,
        lead_created_at: c.lead_created_at ? String(c.lead_created_at) : null,
        consent_basis: CONSENT_BASES.includes(consent) ? consent : 'implied_expired',
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return NextResponse.json({ error: 'No valid contacts' }, { status: 400 });

  try {
    const res = await supaFetch(`${TABLE}?on_conflict=tenant_id,email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('[campaigns] import failed:', detail.slice(0, 300));
      return NextResponse.json({ error: 'Import failed' }, { status: 502 });
    }
    return NextResponse.json({ imported: rows.length });
  } catch (err) {
    console.error('[campaigns] POST error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

/**
 * PATCH actions:
 *   mark_sent — log the send, advance the sequence step
 *   update    — change status / notes (reply, unsubscribe, bounce, sold)
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = requireSession(request);
  if (isAuthError(session)) return session;
  const tenant = session.tenant;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 120)) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  if (!SUPABASE_URL || !SUPABASE_KEY) return configError();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch (err) {
    console.error('[campaigns] PATCH invalid JSON:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = String(body.id ?? '');
  if (!isValidUuid(id)) return NextResponse.json({ error: 'Valid id required' }, { status: 400 });

  try {
    if (body.action === 'mark_sent') return await markSent(tenant, id, body);
    return await updateContact(tenant, id, body);
  } catch (err) {
    console.error('[campaigns] PATCH error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

async function markSent(tenant: string, id: string, body: Record<string, unknown>): Promise<NextResponse> {
  const template = String(body.template ?? '') as TemplateId;
  if (!SEQUENCE.includes(template)) {
    return NextResponse.json({ error: 'Valid template required' }, { status: 400 });
  }

  const current = await supaFetch(`${TABLE}?tenant_id=eq.${tenant}&id=eq.${id}&select=sequence_step`);
  if (!current.ok) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  const found = (await current.json()) as { sequence_step: number }[];
  if (found.length === 0) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  const nextStep = (found[0].sequence_step ?? 0) + 1;
  const sentAt = new Date().toISOString();

  const logRes = await supaFetch(SENDS_TABLE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      tenant_id: tenant,
      contact_id: id,
      template,
      subject: body.subject ? sanitizeInput(String(body.subject), 200) : null,
      sent_at: sentAt,
    }),
  });
  if (!logRes.ok) {
    const detail = await logRes.text();
    console.error('[campaigns] send log failed:', detail.slice(0, 300));
    return NextResponse.json({ error: 'Failed to log send' }, { status: 502 });
  }

  const patchRes = await supaFetch(`${TABLE}?tenant_id=eq.${tenant}&id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      // Exhausting the sequence closes the contact out rather than leaving them "in_sequence" forever
      status: nextStep >= SEQUENCE.length ? 'closed' : 'in_sequence',
      sequence_step: nextStep,
      last_template: template,
      last_sent_at: sentAt,
    }),
  });
  if (!patchRes.ok) return NextResponse.json({ error: 'Failed to advance sequence' }, { status: 502 });

  return NextResponse.json({ ok: true, sequence_step: nextStep });
}

async function updateContact(tenant: string, id: string, body: Record<string, unknown>): Promise<NextResponse> {
  const patch: Record<string, unknown> = {};

  if (typeof body.status === 'string') {
    if (!CONTACT_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status === 'replied') patch.replied_at = new Date().toISOString();
  }
  if (typeof body.notes === 'string') patch.notes = sanitizeInput(body.notes, 1000);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const res = await supaFetch(`${TABLE}?tenant_id=eq.${tenant}&id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return NextResponse.json({ error: 'Update failed' }, { status: 502 });

  return NextResponse.json({ ok: true });
}
