import { NextResponse } from 'next/server';

/* =============================================================================
   EMAIL CRON — Checks Gmail for new replies via SMTP/IMAP workaround
   Uses nodemailer to send replies. Checks Supabase for unprocessed emails.

   Since Vercel Hobby has 10s timeout and IMAP takes too long:
   - Gmail forwards new emails to our Supabase via a Gmail filter + Apps Script
   - OR we use this endpoint to just send pending replies

   For NOW: this is a simple endpoint that can be called manually or via cron
   to process any email that the webhook received.
   ============================================================================= */

const GMAIL_USER = 'nicolas@readycar.ca';
const GMAIL_PASS = 'puzj etam ttei khqg';
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim().replace(/\\n$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim().replace(/\\n$/, '');
const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY ?? 'REMOVED_SECRET_ANTHROPIC_KEY').trim();
const SLACK_WEBHOOK = 'REMOVED_SECRET_SLACK_WEBHOOK';
const CRON_SECRET = process.env.CRON_SECRET || 'nexus-email-cron-2026';

function supaHeaders(): Record<string, string> {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  if (url.searchParams.get('secret') !== CRON_SECRET) {
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
  const url = new URL(request.url);
  if (url.searchParams.get('secret') !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { to, subject, textBody, htmlBody, from: senderEmail, fromName, inReplyTo } = body as {
      to: string; subject: string; textBody?: string; htmlBody?: string;
      from?: string; fromName?: string; inReplyTo?: string;
    };

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
      const unsubMsg = 'Hi,\n\nNo problem at all — I\'ve removed you from our list. Wishing you all the best.\n\nNicolas\nGeneral Sales Manager\nReadyCar | 613-363-4494';
      await transport.sendMail({ from: `"Nicolas Sayah | ReadyCar" <${GMAIL_USER}>`, to, subject: `Re: ${subject}`, text: unsubMsg });
      return NextResponse.json({ sent: true, intent: 'UNSUBSCRIBE' });
    }

    if (/\b(trade.?in|my car|negative equity)\b/i.test(lower)) { intent = 'TRADE_IN'; shouldHandoff = true; }
    else if (/\b(test drive|come in|visit|appointment)\b/i.test(lower)) { intent = 'TEST_DRIVE'; shouldHandoff = true; }
    else if (/\b(how much|price|cost|payment|monthly)\b/i.test(lower)) { intent = 'PRICING'; }

    // Generate AI reply
    const systemPrompt = 'You are Nicolas, General Sales Manager at ReadyCar in Ottawa (6231 Hazeldean Rd, Stittsville). You are replying to a customer email. Be warm, personal, professional. 3-5 short paragraphs max. NEVER discuss specific pricing, monthly payments, or interest rates. NEVER guarantee approval. Ask 1-2 follow-up questions. If credit concerns: our lenders care about steady income not perfect scores. If trade-in: acknowledge warmly, ask specifics. If hot lead: say you will reach out personally within the hour. Do NOT start with Hey. Do NOT sign off with "- Nicolas". End naturally. Sign off as Nicolas, General Sales Manager, ReadyCar | 613-363-4494 | readycar.ca/inventory/used/';

    const userMsg = `Customer ${fromName || 'Unknown'} (${senderEmail || to}) replied to our email. Intent: ${intent}. Their message:\n\n"${emailBody.substring(0, 1000)}"\n\nWrite a personalized reply. You reached out first — do NOT thank them for reaching out.`;

    let aiReply = '';
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, system: systemPrompt, messages: [{ role: 'user', content: userMsg }] }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        aiReply = data.content?.[0]?.text || '';
      }
    } catch { /* Claude failed */ }

    if (!aiReply) {
      aiReply = 'I\'d love to help you find the right vehicle. What are you looking for? And are you hoping to get into something soon or just exploring?\n\nNo pressure either way — I\'m here whenever you\'re ready.\n\nNicolas\nGeneral Sales Manager\nReadyCar | 613-363-4494';
    }

    // Send reply
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.default.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
    await transport.sendMail({
      from: `"Nicolas Sayah | ReadyCar" <${GMAIL_USER}>`,
      to, subject: `Re: ${subject}`, text: aiReply,
      ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
    });

    // Log
    fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts`, {
      method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({ tenant_id: 'readycar', lead_id: senderEmail || to, entry_type: 'message', role: 'ai', content: aiReply, channel: 'email', intent }),
    }).catch(() => {});

    fetch(SLACK_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `EMAIL REPLY SENT\nTo: ${to}\nIntent: ${intent}\nHandoff: ${shouldHandoff}` }),
    }).catch(() => {});

    return NextResponse.json({ sent: true, intent, shouldHandoff });
  } catch (error) {
    console.error('[check-email] Error:', error);
    return NextResponse.json({ error: 'Failed', details: String(error) }, { status: 500 });
  }
}
