import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { TENANT_MAP, validateTwilioSignature, rateLimit, getClientIp, isDeduplicate } from '../../../../lib/security';

/* =============================================================================
   SMS WEBHOOK — Twilio inbound SMS → AI reply
   Security: Twilio signature validation + Redis dedup + rate limiting

   CRITICAL: Returns TwiML IMMEDIATELY, fires processing as fire-and-forget.
   This prevents Twilio from retrying the webhook when Claude is slow.
   ============================================================================= */

export const maxDuration = 60;

const TWIML_OK = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const TWIML_HEADERS = { 'Content-Type': 'text/xml' };

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);

  // Rate limit: 60 requests/min per IP
  if (await rateLimit(ip, 60)) {
    return new NextResponse(TWIML_OK, { status: 200, headers: TWIML_HEADERS });
  }

  const formData = await request.formData();
  const fromPhone = (formData.get('From') as string) || '';
  const toPhone = (formData.get('To') as string) || '';
  const messageBody = (formData.get('Body') as string) || '';
  const messageSid = (formData.get('MessageSid') as string) || '';

  if (!fromPhone || !messageBody) {
    return new NextResponse(TWIML_OK, { status: 200, headers: TWIML_HEADERS });
  }

  // Distributed dedup via Redis — prevents double-processing on Twilio retries across instances
  if (messageSid) {
    const isDupe = await isDeduplicate(`msid:${messageSid}`, 300);
    if (isDupe) {
      return new NextResponse(TWIML_OK, { status: 200, headers: TWIML_HEADERS });
    }
  }

  // Validate Twilio signature — always enforced
  const params: Record<string, string> = {};
  formData.forEach((value, key) => { params[key] = value.toString(); });
  const valid = validateTwilioSignature(request, params);
  if (!valid) {
    console.warn('[sms-webhook] Invalid Twilio signature from', ip);
    return new NextResponse(TWIML_OK, { status: 200, headers: TWIML_HEADERS });
  }

  // FIRE AND FORGET — return TwiML immediately so Twilio never retries
  // Processing happens async; if it fails, Slack alert fires but customer isn't double-texted
  const baseUrl = request.nextUrl.origin || 'https://nexusagents.ca';
  const processSecret = (process.env.PROCESS_SECRET ?? '').trim();
  if (!processSecret) {
    console.error('[sms-webhook] PROCESS_SECRET not configured — cannot dispatch to processor');
    Sentry.captureException(new Error('PROCESS_SECRET missing in sms webhook'));
    return new NextResponse(TWIML_OK, { status: 200, headers: TWIML_HEADERS });
  }

  fetch(`${baseUrl}/api/webhook/sms/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-process-secret': processSecret },
    body: JSON.stringify({ fromPhone, toPhone, messageBody, messageSid, delay: 0 }),
    signal: AbortSignal.timeout(55000),
  }).catch((err) => {
    console.error('[sms-webhook] Failed to trigger process:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
  });

  return new NextResponse(TWIML_OK, { status: 200, headers: TWIML_HEADERS });
}
