import { NextResponse } from 'next/server';

/* =============================================================================
   EMAIL CRON — Checks Gmail IMAP for new replies, generates AI response, sends
   Replaces n8n Email Auto-Reply workflow entirely.
   Triggered by external cron (cron-job.org) every 2 minutes.
   ============================================================================= */

export const maxDuration = 60;

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

async function supaPost(table: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify(data), signal: AbortSignal.timeout(8000),
    });
  } catch { /* ignore */ }
}

export async function GET(request: Request): Promise<NextResponse> {
  // Simple auth — prevent random hits
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Dynamic import — imapflow and nodemailer are Node.js only
    const { ImapFlow } = await import('imapflow');
    const nodemailer = await import('nodemailer');

    // Connect to Gmail IMAP
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      logger: false,
    });

    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    let processed = 0;
    let skipped = 0;

    try {
      // Search for unseen emails from the last 24 hours
      const messages = client.fetch(
        { seen: false, since: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        { envelope: true, source: true, bodyStructure: true }
      );

      const smtpTransport = nodemailer.default.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      });

      for await (const msg of messages) {
        const from = msg.envelope?.from?.[0];
        const fromEmail = from ? `${from.address}` : '';
        const fromName = from?.name || '';
        const subject = msg.envelope?.subject || '';
        const inReplyTo = msg.envelope?.inReplyTo || '';

        // Skip internal emails
        if (fromEmail.includes('readycar.ca') || fromEmail.includes('readyride.ca') || fromEmail.includes('nexus')) {
          skipped++;
          await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
          continue;
        }

        // Skip automated senders
        if (/noreply|no-reply|mailer-daemon|postmaster|newsletter|google|facebook|meta/i.test(fromEmail)) {
          skipped++;
          await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
          continue;
        }

        // Only reply to emails that are replies to our campaigns
        if (!subject.toLowerCase().includes('re:')) {
          skipped++;
          await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
          continue;
        }

        // Extract body text from source
        let bodyText = '';
        if (msg.source) {
          const sourceStr = msg.source.toString();
          // Simple extraction — get text after headers
          const bodyStart = sourceStr.indexOf('\r\n\r\n');
          if (bodyStart > -1) {
            bodyText = sourceStr.substring(bodyStart + 4)
              .replace(/<[^>]*>/g, ' ')  // strip HTML
              .replace(/=\r?\n/g, '')     // decode quoted-printable line breaks
              .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
              .substring(0, 2000);
          }
        }

        if (!bodyText.trim()) {
          skipped++;
          await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
          continue;
        }

        // Log inbound email
        supaPost('lead_transcripts', {
          tenant_id: 'readycar', lead_id: fromEmail,
          entry_type: 'message', role: 'customer',
          content: bodyText.substring(0, 500), channel: 'email',
        });

        // Check for unsubscribe
        const lower = bodyText.toLowerCase();
        if (/\b(unsubscribe|stop|remove me|not interested)\b/.test(lower)) {
          const unsubReply = 'Hi,\n\nNo problem at all — I\'ve removed you from our list. Wishing you all the best.\n\nNicolas\nGeneral Sales Manager\nReadyCar | 613-363-4494';
          await smtpTransport.sendMail({
            from: `"Nicolas Sayah | ReadyCar" <${GMAIL_USER}>`,
            to: fromEmail,
            subject: `Re: ${subject}`,
            text: unsubReply,
            inReplyTo,
            references: inReplyTo,
          });
          supaPost('lead_transcripts', { tenant_id: 'readycar', lead_id: fromEmail, entry_type: 'message', role: 'ai', content: unsubReply, channel: 'email', intent: 'UNSUBSCRIBE' });
          await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
          processed++;
          continue;
        }

        // Classify intent
        let intent = 'GENERAL';
        let shouldHandoff = false;
        if (/\b(trade.?in|my car|negative equity)\b/i.test(lower)) { intent = 'TRADE_IN'; shouldHandoff = true; }
        else if (/\b(test drive|come in|visit|appointment)\b/i.test(lower)) { intent = 'TEST_DRIVE'; shouldHandoff = true; }
        else if (/\b(how much|price|cost|payment|monthly)\b/i.test(lower)) { intent = 'PRICING'; }

        // Generate AI reply via Claude
        const systemPrompt = 'You are Nicolas, General Sales Manager at ReadyCar in Ottawa (6231 Hazeldean Rd, Stittsville). You are replying to a customer email. Be warm, personal, professional. 3-5 short paragraphs max. NEVER discuss specific pricing, monthly payments, or interest rates. NEVER guarantee approval. Ask 1-2 follow-up questions. If credit concerns: our lenders care about steady income not perfect scores. If trade-in: acknowledge warmly, ask specifics. If hot lead: say you will reach out personally within the hour. Do NOT start with Hey. Vary openings. Do NOT sign off with "- Nicolas" or "- Nico". Just end naturally. Sign off simply as Nicolas, General Sales Manager, ReadyCar | 613-363-4494 | readycar.ca/inventory/used/';

        const userMsg = `Customer ${fromName} (${fromEmail}) replied to our dealership email. Intent: ${intent}. Handoff needed: ${shouldHandoff}. Their message:\n\n"${bodyText.substring(0, 1000)}"\n\nWrite a personalized email reply. You reached out to them first — do NOT thank them for reaching out.`;

        let aiReply = '';
        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, system: systemPrompt, messages: [{ role: 'user', content: userMsg }] }),
            signal: AbortSignal.timeout(15000),
          });
          if (res.ok) {
            const data = await res.json();
            aiReply = data.content?.[0]?.text || '';
          }
        } catch { /* Claude failed */ }

        if (!aiReply) {
          aiReply = 'Thanks for getting back to me — I appreciate you taking the time.\n\nI\'d love to help you find the right vehicle. What are you looking for? And are you hoping to get into something soon or just exploring?\n\nNo pressure either way — I\'m here whenever you\'re ready.\n\nNicolas\nGeneral Sales Manager\nReadyCar | 613-363-4494';
        }

        // Send reply via Gmail SMTP
        await smtpTransport.sendMail({
          from: `"Nicolas Sayah | ReadyCar" <${GMAIL_USER}>`,
          to: fromEmail,
          subject: `Re: ${subject}`,
          text: aiReply,
          inReplyTo,
          references: inReplyTo,
        });

        // Log + notify
        supaPost('lead_transcripts', { tenant_id: 'readycar', lead_id: fromEmail, entry_type: 'message', role: 'ai', content: aiReply, channel: 'email', intent });

        fetch(SLACK_WEBHOOK, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `EMAIL REPLY SENT\nFrom: ${fromEmail}\nName: ${fromName}\nIntent: ${intent}\nHandoff: ${shouldHandoff}` }),
        }).catch(() => {});

        // Mark as read
        await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
        processed++;
      }
    } finally {
      lock.release();
    }

    await client.logout();

    return NextResponse.json({ success: true, processed, skipped, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[check-email] Error:', error);
    return NextResponse.json({ error: 'Email check failed', details: String(error) }, { status: 500 });
  }
}
