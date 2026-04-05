import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { GMAIL_USER, GMAIL_PASS, ANTHROPIC_KEY, SLACK_WEBHOOK, CRON_SECRET, SUPABASE_URL, SUPABASE_KEY, supaHeaders as _supaHeaders } from '../../../../lib/security';

/* ---------- Tenant email config ---------- */
const TENANT_EMAIL_CONFIG: Record<string, { fromName: string; gm: string; phone: string; signoff: string }> = {
  readycar: { fromName: 'Nicolas Sayah | ReadyCar', gm: 'Nicolas', phone: '613-363-4494', signoff: 'ReadyCar | 613-363-4494' },
  readyride: { fromName: 'Moe | ReadyRide', gm: 'Moe', phone: '613-983-9834', signoff: 'ReadyRide | 613-983-9834' },
};

/* =============================================================================
   EMAIL CRON — Checks Gmail for new replies via SMTP/IMAP workaround
   Uses nodemailer to send replies. Checks Supabase for unprocessed emails.

   Since Vercel Hobby has 10s timeout and IMAP takes too long:
   - Gmail forwards new emails to our Supabase via a Gmail filter + Apps Script
   - OR we use this endpoint to just send pending replies

   For NOW: this is a simple endpoint that can be called manually or via cron
   to process any email that the webhook received.
   ============================================================================= */

function supaHeaders(): Record<string, string> {
  return _supaHeaders();
}

export async function GET(request: Request): Promise<NextResponse> {
  const cronAuth = request.headers.get('authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('secret');
  if (!CRON_SECRET || cronAuth !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Email agent is handled via /api/webhook/email. Set up Gmail forwarding to POST new emails there.',
    setup_instructions: {
      step1: 'Go to Gmail Settings → Forwarding → Add nexusagents.ca/api/webhook/email',
      step2: 'Or use Google Apps Script to POST new emails to the webhook',
      step3: 'The webhook generates AI replies and returns them for sending',
    },
    timestamp: new Date().toISOString(),
  });
}

/* ---------- Direct email send endpoint ---------- */
export async function POST(request: Request): Promise<NextResponse> {
  const cronAuth = request.headers.get('authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('secret');
  if (!CRON_SECRET || cronAuth !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let cronBody;
  try {
    cronBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { to, subject, textBody, htmlBody, from: senderEmail, fromName, inReplyTo, tenant: tenantId } = cronBody as {
      to: string; subject: string; textBody?: string; htmlBody?: string;
      from?: string; fromName?: string; inReplyTo?: string; tenant?: string;
    };

    const tenant = tenantId === 'readyride' ? 'readyride' : 'readycar';
    const tenantCfg = TENANT_EMAIL_CONFIG[tenant] || TENANT_EMAIL_CONFIG.readycar;

    if (!to || !subject) {
      return NextResponse.json({ error: 'to and subject required' }, { status: 400 });
    }

    // Skip internal
    if (to.includes('readycar.ca') || to.includes('readyride.ca')) {
      return NextResponse.json({ skipped: true, reason: 'internal' });
    }

    const emailBody = textBody || (htmlBody || '').replace(/<[^>]*>/g, ' ').substring(0, 2000);

    // Only reply to replies
    if (!subject.toLowerCase().includes('re:')) {
      return NextResponse.json({ skipped: true, reason: 'not a reply' });
    }

    // Classify
    const lower = emailBody.toLowerCase();
    let intent = 'GENERAL';
    let shouldHandoff = false;
    if (/\b(unsubscribe|stop|remove me|not interested)\b/.test(lower)) {
      // Send unsubscribe confirmation
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
      const unsubMsg = `Hi,\n\nNo problem at all — I've removed you from our list. Wishing you all the best.\n\n${tenantCfg.gm}\nGeneral Sales Manager\n${tenantCfg.signoff}`;
      await transport.sendMail({ from: `"${tenantCfg.fromName}" <${GMAIL_USER}>`, to, subject: `Re: ${subject}`, text: unsubMsg });
      return NextResponse.json({ sent: true, intent: 'UNSUBSCRIBE' });
    }

    if (/\b(trade.?in|my car|negative equity)\b/i.test(lower)) { intent = 'TRADE_IN'; shouldHandoff = true; }
    else if (/\b(test drive|come in|visit|appointment)\b/i.test(lower)) { intent = 'TEST_DRIVE'; shouldHandoff = true; }
    else if (/\b(how much|price|cost|payment|monthly)\b/i.test(lower)) { intent = 'PRICING'; }

    // Generate AI reply
    const systemPrompt = `You are ${tenantCfg.gm}, General Sales Manager at ${tenant === 'readyride' ? 'ReadyRide' : 'ReadyCar'} in Ottawa. You are replying to a customer email. Be warm, personal, professional. 3-5 short paragraphs max. NEVER discuss specific pricing, monthly payments, or interest rates. NEVER guarantee approval. Ask 1-2 follow-up questions. If credit concerns: our lenders care about steady income not perfect scores. If trade-in: acknowledge warmly, ask specifics. If hot lead: say you will reach out personally within the hour. Do NOT start with Hey. Do NOT sign off with "- ${tenantCfg.gm}". End naturally. Sign off as ${tenantCfg.gm}, General Sales Manager, ${tenantCfg.signoff}`;

    const userMsg = `Customer ${fromName || 'Unknown'} (${senderEmail || to}) replied to our email. Intent: ${intent}. Their message:\n\n"${emailBody.substring(0, 1000)}"\n\nWrite a personalized reply. You reached out first — do NOT thank them for reaching out.`;

    let aiReply = '';
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-opus-4-6', max_tokens: 4500, thinking: { type: 'enabled', budget_tokens: 4000 }, system: systemPrompt, messages: [{ role: 'user', content: userMsg }] }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = await res.json();
        const textBlock = (data.content || []).find((b: { type: string }) => b.type === 'text');
        aiReply = textBlock?.text || '';
      }
    } catch (err) { console.error('[check-email] Claude API call failed:', err instanceof Error ? err.message : 'unknown'); Sentry.captureException(err instanceof Error ? err : new Error(String(err))); }

    if (!aiReply) {
      aiReply = `I'd love to help you find the right vehicle. What are you looking for? And are you hoping to get into something soon or just exploring?\n\nNo pressure either way — I'm here whenever you're ready.\n\n${tenantCfg.gm}\nGeneral Sales Manager\n${tenantCfg.signoff}`;
    }

    // Send reply
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.default.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
    await transport.sendMail({
      from: `"${tenantCfg.fromName}" <${GMAIL_USER}>`,
      to, subject: `Re: ${subject}`, text: aiReply,
      ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
    });

    // Log — must await on Vercel or unawaited promises get killed
    await fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts`, {
      method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({ tenant_id: tenant, lead_id: senderEmail || to, entry_type: 'message', role: 'ai', content: aiReply, channel: 'email', intent }),
    }).catch((err) => { console.error('[check-email] Supabase log failed:', err instanceof Error ? err.message : 'unknown'); Sentry.captureException(err instanceof Error ? err : new Error(String(err))); });

    await fetch(SLACK_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `EMAIL REPLY SENT\nTo: ${to}\nIntent: ${intent}\nHandoff: ${shouldHandoff}` }),
    }).catch((err) => { console.error('[check-email] Slack notify failed:', err instanceof Error ? err.message : 'unknown'); Sentry.captureException(err instanceof Error ? err : new Error(String(err))); });

    return NextResponse.json({ sent: true, intent, shouldHandoff });
  } catch (error) {
    console.error('[check-email] Error:', error instanceof Error ? error.message : 'unknown');
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
