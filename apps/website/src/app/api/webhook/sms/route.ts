import { NextRequest, NextResponse } from 'next/server';
import { TENANT_MAP, validateTwilioSignature, rateLimit, getClientIp } from '../../../../lib/security';

/* =============================================================================
   SMS WEBHOOK — Twilio inbound SMS → AI reply
   Security: Twilio signature validation + rate limiting
   ============================================================================= */

const TWIML_OK = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);

  // Rate limit: 60 requests/min per IP
  if (rateLimit(ip, 60)) {
    return new NextResponse(TWIML_OK, { status: 200, headers: { 'Content-Type': 'text/xml' } });
  }

  const formData = await request.formData();
  const fromPhone = (formData.get('From') as string) || '';
  const toPhone = (formData.get('To') as string) || '';
  const messageBody = (formData.get('Body') as string) || '';

  if (!fromPhone || !messageBody) {
    return new NextResponse(TWIML_OK, { status: 200, headers: { 'Content-Type': 'text/xml' } });
  }

  // Validate Twilio signature (skip in dev for testing)
  if (process.env.NODE_ENV !== 'development') {
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });
    const valid = validateTwilioSignature(request, params);
    if (!valid) {
      console.warn('[sms-webhook] Invalid Twilio signature from', ip);
      return new NextResponse(TWIML_OK, { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }
  }

  // Trigger delayed processing
  const baseUrl = request.nextUrl.origin || 'https://nexusagents.ca';
  const processSecret = process.env.PROCESS_SECRET || 'internal-process-key';

  fetch(`${baseUrl}/api/webhook/sms/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-process-secret': processSecret },
    body: JSON.stringify({ fromPhone, toPhone, messageBody, delay: 0 }),
  }).catch((err) => {
    console.error('[sms-webhook] Failed to trigger process:', err);
  });

  return new NextResponse(TWIML_OK, { status: 200, headers: { 'Content-Type': 'text/xml' } });
}
