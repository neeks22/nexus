import { NextRequest, NextResponse } from 'next/server';

/* =============================================================================
   EMAIL WEBHOOK — Receives forwarded emails, generates AI reply, sends via SMTP
   Called by n8n IMAP trigger (just forwards the email data here, no AI logic in n8n)
   ============================================================================= */

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim().replace(/\\n$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim().replace(/\\n$/, '');
const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY ?? 'REMOVED_SECRET_ANTHROPIC_KEY').trim();
const SLACK_WEBHOOK = 'REMOVED_SECRET_SLACK_WEBHOOK';

/* ---------- Helpers ---------- */

function supaHeaders(): Record<string, string> {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
}

async function supaPost(table: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify(data), signal: AbortSignal.timeout(8000),
    });
  } catch { /* ignore */ }
}

async function callClaude(system: string, userMsg: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.error('[email-agent] Claude API error:', res.status);
    return '';
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function slackNotify(text: string): Promise<void> {
  try {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }), signal: AbortSignal.timeout(5000),
    });
  } catch { /* ignore */ }
}

/* ---------- Intent Classification ---------- */

function classifyEmailIntent(body: string, subject: string): { intent: string; shouldStop: boolean; shouldHandoff: boolean } {
  const lower = body.toLowerCase();

  if (/\b(unsubscribe|stop|remove me|not interested|desabonner)\b/i.test(lower)) {
    return { intent: 'UNSUBSCRIBE', shouldStop: true, shouldHandoff: false };
  }
  if (/\b(trade.?in|my car|negative equity|current vehicle)\b/i.test(lower)) {
    return { intent: 'TRADE_IN', shouldStop: false, shouldHandoff: true };
  }
  if (/\b(test drive|come in|visit|appointment|schedule)\b/i.test(lower)) {
    return { intent: 'TEST_DRIVE', shouldStop: false, shouldHandoff: true };
  }
  if (/\b(how much|price|cost|payment|monthly|bi-weekly)\b/i.test(lower)) {
    return { intent: 'PRICING', shouldStop: false, shouldHandoff: false };
  }

  return { intent: 'GENERAL', shouldStop: false, shouldHandoff: false };
}

/* ---------- Main Handler ---------- */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      from, fromEmail, subject, textBody, htmlBody, tenant: tenantId,
    } = body as {
      from?: string; fromEmail?: string; subject?: string;
      textBody?: string; htmlBody?: string; tenant?: string;
    };

    const senderEmail = fromEmail || from || '';
    const emailBody = textBody || (htmlBody || '').replace(/<[^>]*>/g, ' ').substring(0, 2000);
    const emailSubject = subject || '';
    const tenant = tenantId || 'readycar';

    if (!senderEmail || !emailBody) {
      return NextResponse.json({ error: 'Missing from or body' }, { status: 400 });
    }

    // Skip internal emails
    if (senderEmail.includes('readycar.ca') || senderEmail.includes('readyride.ca') || senderEmail.includes('nexus')) {
      return NextResponse.json({ skipped: true, reason: 'internal' });
    }

    // Skip automated senders
    if (/noreply|no-reply|mailer-daemon|postmaster|newsletter/i.test(senderEmail)) {
      return NextResponse.json({ skipped: true, reason: 'automated' });
    }

    // Only reply to emails that are replies to our campaigns
    if (!emailSubject.toLowerCase().includes('re:')) {
      return NextResponse.json({ skipped: true, reason: 'not a reply' });
    }

    // Extract sender name
    const nameMatch = (from || '').match(/^([^<]+)</);
    const senderName = nameMatch ? nameMatch[1].trim() : '';

    // Log inbound
    supaPost('lead_transcripts', {
      tenant_id: tenant, lead_id: senderEmail, entry_type: 'message',
      role: 'customer', content: emailBody.substring(0, 500), channel: 'email',
    });

    // Classify
    const { intent, shouldStop, shouldHandoff } = classifyEmailIntent(emailBody, emailSubject);

    // Handle unsubscribe
    if (shouldStop) {
      return NextResponse.json({
        action: 'reply',
        replyTo: senderEmail,
        replySubject: `Re: ${emailSubject}`,
        replyBody: `Hi,\n\nNo problem at all — I've removed you from our list. Wishing you all the best.\n\nNicolas\nGeneral Sales Manager\nReadyCar | 613-363-4494`,
        intent,
      });
    }

    // Generate AI reply
    const systemPrompt = `You are Nicolas, General Sales Manager at ReadyCar in Ottawa (6231 Hazeldean Rd, Stittsville). You are replying to a customer email. Be warm, personal, professional. 3-5 short paragraphs max. NEVER discuss specific pricing, monthly payments, or interest rates. NEVER guarantee approval. Ask 1-2 follow-up questions. If credit concerns: our lenders care about steady income not perfect scores. If trade-in: acknowledge warmly, ask specifics. If hot lead: say you will reach out personally within the hour. Do NOT start with Hey. Vary openings. Sign off as Nicolas, General Sales Manager, ReadyCar | 613-363-4494 | readycar.ca/inventory/used/`;

    const userMsg = `Customer ${senderName} (${senderEmail}) replied to our dealership email. Intent: ${intent}. Handoff needed: ${shouldHandoff}. Their message:\n\n"${emailBody.substring(0, 1000)}"\n\nWrite a personalized email reply as Nicolas. Address their specific situation. You reached out to them first — do NOT thank them for reaching out.`;

    let aiReply = await callClaude(systemPrompt, userMsg);

    if (!aiReply) {
      aiReply = `Thanks for getting back to me — I appreciate you taking the time.\n\nI'd love to help you find the right vehicle. What are you looking for? And are you hoping to get into something soon or just exploring?\n\nNo pressure either way — I'm here whenever you're ready.\n\nNicolas\nGeneral Sales Manager\nReadyCar | 613-363-4494`;
    }

    // Send reply directly via Gmail SMTP
    try {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport({
        service: 'gmail',
        auth: { user: 'nicolas@readycar.ca', pass: 'puzj etam ttei khqg' },
      });
      await transport.sendMail({
        from: '"Nicolas Sayah | ReadyCar" <nicolas@readycar.ca>',
        to: senderEmail,
        subject: `Re: ${emailSubject || 'Your Vehicle Inquiry'}`,
        text: aiReply,
      });
    } catch (sendErr) {
      console.error('[email-agent] SMTP send error:', sendErr);
    }

    // Log outbound
    supaPost('lead_transcripts', {
      tenant_id: tenant, lead_id: senderEmail, entry_type: 'message',
      role: 'ai', content: aiReply, channel: 'email', intent,
    });

    // Slack
    slackNotify(`EMAIL REPLY SENT (${tenant})\nTo: ${senderEmail}\nName: ${senderName}\nIntent: ${intent}\nHandoff: ${shouldHandoff}`);

    return NextResponse.json({
      action: 'sent',
      replyTo: senderEmail,
      intent,
      shouldHandoff,
    });
  } catch (error) {
    console.error('[email-agent] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
