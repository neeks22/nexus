import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { validateTwilioSignature, rateLimit, getClientIp } from '../../../../lib/security';

/* =============================================================================
   TWILIO USAGE TRIGGER WEBHOOK
   Receives notifications when SMS spending hits thresholds.
   - $75/month: warning notification via Slack
   - $400/month: hard block — suspends SMS sending via agent_toggles table
   Security: Twilio signature validation + rate limiting
   ============================================================================= */

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim();
const SLACK_WEBHOOK = (process.env.SLACK_WEBHOOK_URL ?? '').trim();

function supaHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function slackNotify(message: string): Promise<void> {
  if (!SLACK_WEBHOOK) return;
  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
    signal: AbortSignal.timeout(5000),
  }).catch((err) => {
    console.error('[twilio-usage] Slack notification failed:', err instanceof Error ? err.message : 'unknown');
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);

  // Rate limit: 20 requests/min per IP (trigger fires rarely — anything more is abuse)
  if (await rateLimit(ip, 20)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const formData = await request.formData();

    // Validate Twilio signature — rejects forged requests that would otherwise disable SMS
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });
    if (!validateTwilioSignature(request, params)) {
      console.warn('[twilio-usage] Invalid Twilio signature from', ip);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const triggerValue = formData.get('TriggerValue')?.toString() ?? '0';
    const currentValue = formData.get('CurrentValue')?.toString() ?? '0';
    const friendlyName = formData.get('FriendlyName')?.toString() ?? '';
    const usageCategory = formData.get('UsageCategory')?.toString() ?? '';

    const amount = parseFloat(currentValue);
    const threshold = parseFloat(triggerValue);
    const isHardCap = threshold >= 400;

    console.log(`[twilio-usage] Trigger fired: ${friendlyName} | $${currentValue}/$${triggerValue} | category=${usageCategory}`);

    if (isHardCap) {
      // HARD BLOCK: disable SMS sending via agent_toggles
      // Disable SMS for all tenants
      await fetch(`${SUPABASE_URL}/rest/v1/agent_toggles?agent_id=in.(instant_response,follow_up)`, {
        method: 'PATCH',
        headers: { ...supaHeaders(), Prefer: 'return=minimal' },
        body: JSON.stringify({ enabled: false, reason: `Spending cap hit: $${amount.toFixed(2)}`, toggled_by: 'twilio_usage_trigger' }),
        signal: AbortSignal.timeout(8000),
      });

      await slackNotify(
        `🚨 *TWILIO SPENDING CAP HIT — SMS BLOCKED*\n` +
        `Current spend: *$${amount.toFixed(2)}* (limit: $${threshold.toFixed(2)}/month)\n` +
        `SMS auto-response has been *automatically disabled*.\n\n` +
        `To re-enable, go to the CRM dashboard or reply here.\n` +
        `To increase the limit, update the Twilio usage trigger.`
      );
    } else {
      // WARNING: notify but don't block
      await slackNotify(
        `⚠️ *Twilio SMS Spending Warning*\n` +
        `Current spend: *$${amount.toFixed(2)}* (warning at $${threshold.toFixed(2)}/month)\n` +
        `Hard cap at $400/month will auto-disable SMS.\n` +
        `Current pace: ~$${(amount / new Date().getDate() * 30).toFixed(0)}/month projected.`
      );
    }

    return NextResponse.json({ received: true, blocked: isHardCap });
  } catch (err) {
    console.error('[twilio-usage] Error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
