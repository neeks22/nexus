import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { FunnelLead, TENANTS, normalizePhone, insertLead, sendSMS } from '@/lib/auto-response';
import { rateLimit, getClientIp, supaGet, requireRole, isAuthError } from '@/lib/security';
import { z } from 'zod';

const ImportSchema = z.object({
  contacts: z.array(z.object({
    firstName: z.string().min(1),
    lastName: z.string(),
    phone: z.string().min(7),
  })).max(200),
});

export async function POST(request: NextRequest) {
  // Require manager+ role for imports
  const session = requireRole(request, 'manager');
  if (isAuthError(session)) return session;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 2, 60000)) {
    return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429 });
  }

  let body;
  try {
    body = ImportSchema.parse(await request.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }

  const tenant = TENANTS[session.tenant];
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Invalid tenant' }), { status: 400 });
  }

  let autoResponseEnabled = true;
  try {
    const { data } = await supaGet(
      `agent_toggles?tenant_id=eq.${tenant.tenantId}&agent_id=eq.instant_response&select=enabled&limit=1`
    );
    const toggle = (data as { enabled: boolean }[])[0];
    if (toggle && !toggle.enabled) autoResponseEnabled = false;
  } catch (err) {
    console.error('[import-leads] Toggle check failed:', err instanceof Error ? err.message : 'unknown');
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let sent = 0;
      let duplicates = 0;
      let failed = 0;

      for (let i = 0; i < body.contacts.length; i++) {
        const contact = body.contacts[i];
        const normalizedPhone = normalizePhone(contact.phone);

        if (!normalizedPhone || normalizedPhone.length < 10) {
          failed++;
          controller.enqueue(encoder.encode(JSON.stringify({
            processed: i + 1, total: body.contacts.length, phone: contact.phone, status: 'invalid_phone'
          }) + '\n'));
          continue;
        }

        try {
          const { data: existing } = await supaGet(
            `funnel_submissions?tenant_id=eq.${tenant.tenantId}&phone=eq.${encodeURIComponent(normalizedPhone)}&select=id&limit=1`
          );
          if ((existing as unknown[]).length > 0) {
            duplicates++;
            controller.enqueue(encoder.encode(JSON.stringify({
              processed: i + 1, total: body.contacts.length, phone: normalizedPhone, status: 'duplicate'
            }) + '\n'));
            continue;
          }
        } catch (err) {
          console.error('[import-leads] Dedup check error:', err instanceof Error ? err.message : 'unknown');
        }

        const lead: FunnelLead = {
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          email: '',
          vehicleType: 'Not specified',
          budget: '',
          monthlyIncome: '',
          jobTitle: '',
          employment: 'Not specified',
          creditSituation: 'Not specified',
          tradeIn: '',
          tradeInYear: '',
          utmSource: 'spreadsheet_import',
          utmMedium: '',
          utmCampaign: '',
        };

        try {
          await insertLead(lead, normalizedPhone, tenant);

          if (autoResponseEnabled) {
            await sendSMS(lead, normalizedPhone, tenant);
          }

          sent++;
          controller.enqueue(encoder.encode(JSON.stringify({
            processed: i + 1, total: body.contacts.length, phone: normalizedPhone, status: autoResponseEnabled ? 'sent' : 'imported'
          }) + '\n'));
        } catch (err) {
          console.error('[import-leads] Error processing contact:', err instanceof Error ? err.message : 'unknown');
          Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
          failed++;
          controller.enqueue(encoder.encode(JSON.stringify({
            processed: i + 1, total: body.contacts.length, phone: normalizedPhone, status: 'failed'
          }) + '\n'));
        }

        if (i < body.contacts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      }

      controller.enqueue(encoder.encode(JSON.stringify({
        done: true, summary: { sent, duplicates, failed, total: body.contacts.length }
      }) + '\n'));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Transfer-Encoding': 'chunked' },
  });
}
