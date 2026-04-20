import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { NEXUS_API_KEY, GMAIL_USER, GMAIL_PASS, supaPost, supaGetData, supaHeaders, SUPABASE_URL, slackNotify, callClaude, rateLimit, getClientIp, sanitizeInput } from '../../../../lib/security';

/* ---------- Tenant email config ---------- */
const TENANT_EMAIL_CONFIG: Record<string, { fromName: string; gm: string; phone: string; signoff: string }> = {
  readycar: { fromName: 'Nicolas Sayah | ReadyCar', gm: 'Nicolas', phone: '613-363-4494', signoff: 'ReadyCar | 613-363-4494 | readycar.ca/inventory/used/' },
  readyride: { fromName: 'Moe | ReadyRide', gm: 'Moe', phone: '613-983-9834', signoff: 'ReadyRide | 613-983-9834' },
};

/* =============================================================================
   EMAIL WEBHOOK — Receives email data, generates AI reply, sends via SMTP
   Security: API key or same-origin required + rate limiting
   ============================================================================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);

  // Rate limit: 20 requests/min
  if (await rateLimit(ip, 20)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  // Auth: webhook ingestion requires NEXUS_API_KEY unconditionally.
  // Same-origin was an attack surface — any XSS/CSRF could forge a webhook.
  if (!NEXUS_API_KEY) {
    console.error('[email-webhook] NEXUS_API_KEY not configured — rejecting all requests');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  if (apiKey !== NEXUS_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let emailPayload;
  try {
    emailPayload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const body = emailPayload;
    const { from, fromEmail, subject, textBody, htmlBody, tenant: tenantId } = body as {
      from?: string; fromEmail?: string; subject?: string;
      textBody?: string; htmlBody?: string; tenant?: string;
    };

    const senderEmail = sanitizeInput(fromEmail || from || '', 200);
    const emailBody = sanitizeInput(textBody || (htmlBody || '').replace(/<[^>]*>/g, ' '), 2000);
    const emailSubject = sanitizeInput(subject || '', 200);
    const tenant = tenantId === 'readyride' ? 'readyride' : 'readycar';
    const tenantCfg = TENANT_EMAIL_CONFIG[tenant] || TENANT_EMAIL_CONFIG.readycar;

    if (!senderEmail || !emailBody) {
      return NextResponse.json({ error: 'Missing from or body' }, { status: 400 });
    }

    // Skip internal
    if (/readycar\.ca|readyride\.ca|nexus/i.test(senderEmail)) {
      return NextResponse.json({ skipped: true, reason: 'internal' });
    }

    // Skip automated
    if (/noreply|no-reply|mailer-daemon|postmaster|newsletter|google\.com|facebook|meta\.com/i.test(senderEmail)) {
      return NextResponse.json({ skipped: true, reason: 'automated' });
    }

    // Only reply to campaign replies
    if (!emailSubject.toLowerCase().includes('re:')) {
      return NextResponse.json({ skipped: true, reason: 'not a reply' });
    }

    // Check if content is vehicle-related
    const lower = emailBody.toLowerCase();
    const vehicleKeywords = /vehicle|car|truck|suv|credit|approval|finance|trade|interested|check|yes|readycar|lender|budget|payment|income|license/i;
    if (!vehicleKeywords.test(lower) && !emailSubject.toLowerCase().includes('readycar')) {
      return NextResponse.json({ skipped: true, reason: 'not vehicle related' });
    }

    const nameMatch = (from || '').match(/^([^<]+)</);
    const senderName = nameMatch ? sanitizeInput(nameMatch[1].trim(), 100) : '';

    // Log inbound — must await on Vercel or the promise gets killed
    await supaPost('lead_transcripts', {
      tenant_id: tenant, lead_id: senderEmail, entry_type: 'message',
      role: 'customer', content: emailBody.substring(0, 500), channel: 'email',
    });

    // Check if agent is paused for this lead (manual pause or hot lead)
    {
      let isPaused = false;
      try {
        const statusEntries = await supaGetData(
          `lead_transcripts?tenant_id=eq.${tenant}&lead_id=eq.${encodeURIComponent(senderEmail)}&entry_type=eq.status&select=content,created_at&order=created_at.desc&limit=1`
        ) as { content: string }[];
        if (statusEntries.length > 0 && ['HOT_PAUSED', 'AGENT_PAUSED'].includes(statusEntries[0].content)) {
          isPaused = true;
        }
      } catch (err) {
        console.error('[email-agent] Pause check failed:', err instanceof Error ? err.message : 'unknown');
        isPaused = true; // Safe default — don't spam
      }
      if (isPaused) {
        await slackNotify(`EMAIL RECEIVED (AGENT PAUSED)\nFrom: ${senderEmail}\nSubject: ${emailSubject}\nResume Agent in CRM to auto-reply.`);
        return NextResponse.json({ sent: false, paused: true });
      }
    }

    // Check for unsubscribe
    if (/\b(unsubscribe|stop|remove me|not interested)\b/i.test(lower)) {
      if (GMAIL_PASS) {
        const nodemailer = await import('nodemailer');
        const transport = nodemailer.default.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
        await transport.sendMail({
          from: `"${tenantCfg.fromName}" <${GMAIL_USER}>`, to: senderEmail,
          subject: `Re: ${emailSubject}`,
          text: `Hi,\n\nNo problem at all — I've removed you from our list. Wishing you all the best.\n\n${tenantCfg.gm}\nGeneral Sales Manager\n${tenantCfg.signoff}`,
        });
      }
      return NextResponse.json({ action: 'sent', intent: 'UNSUBSCRIBE' });
    }

    // Classify
    let intent = 'GENERAL';
    let shouldHandoff = false;
    if (/\b(trade.?in|my car|negative equity)\b/i.test(lower)) { intent = 'TRADE_IN'; shouldHandoff = true; }
    else if (/\b(test drive|come in|visit|appointment)\b/i.test(lower)) { intent = 'TEST_DRIVE'; shouldHandoff = true; }
    else if (/\b(how much|price|cost|payment|monthly)\b/i.test(lower)) { intent = 'PRICING'; }

    // AI reply
    const systemPrompt = `You are ${tenantCfg.gm}, General Sales Manager at ${tenant === 'readyride' ? 'ReadyRide' : 'ReadyCar'} in Ottawa. Reply to customer emails. Warm, personal, professional. 3-5 short paragraphs. NEVER discuss pricing/payments/rates. NEVER guarantee approval. Ask 1-2 follow-up questions. Do NOT start with Hey. Do NOT sign off with "- ${tenantCfg.gm}". End naturally. Sign off as ${tenantCfg.gm}, General Sales Manager, ${tenantCfg.signoff}`;
    const userMsg = `Customer ${senderName} (${senderEmail}) replied. Intent: ${intent}. Message:\n\n"${emailBody.substring(0, 1000)}"\n\nWrite a personalized reply. You reached out first — do NOT thank them for reaching out.`;

    let aiReply = await callClaude(systemPrompt, userMsg, 500);
    if (!aiReply) {
      aiReply = `I'd love to help you find the right vehicle. What are you looking for? And are you hoping to get into something soon or just exploring?\n\nNo pressure either way — I'm here whenever you're ready.\n\n${tenantCfg.gm}\nGeneral Sales Manager\n${tenantCfg.signoff}`;
    }

    // Send
    if (GMAIL_PASS) {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
      await transport.sendMail({
        from: `"${tenantCfg.fromName}" <${GMAIL_USER}>`, to: senderEmail,
        subject: `Re: ${emailSubject || 'Your Vehicle Inquiry'}`, text: aiReply,
      });
    }

    await supaPost('lead_transcripts', { tenant_id: tenant, lead_id: senderEmail, entry_type: 'message', role: 'ai', content: aiReply, channel: 'email', intent });
    await slackNotify(`EMAIL REPLY SENT\nTo: ${senderEmail}\nIntent: ${intent}\nHandoff: ${shouldHandoff}`);

    // Update lead status to 'contacted' if still 'new' — look up by email via view, patch by id
    try {
      const lookupRes = await fetch(`${SUPABASE_URL}/rest/v1/v_funnel_submissions?email=eq.${encodeURIComponent(senderEmail)}&tenant_id=eq.${tenant}&status=eq.new&select=id&limit=1`, {
        headers: { ...supaHeaders() },
        signal: AbortSignal.timeout(5000),
      });
      if (lookupRes.ok) {
        const leads = await lookupRes.json();
        if (leads.length > 0 && leads[0].id) {
          await fetch(`${SUPABASE_URL}/rest/v1/funnel_submissions?id=eq.${leads[0].id}`, {
            method: 'PATCH',
            headers: { ...supaHeaders(), Prefer: 'return=minimal' },
            body: JSON.stringify({ status: 'contacted' }),
            signal: AbortSignal.timeout(5000),
          });
        }
      }
    } catch (err) {
      console.error('[email-agent] Status update error:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    }

    return NextResponse.json({ action: 'sent', intent, shouldHandoff });
  } catch (error) {
    console.error('[email-agent] Error:', error instanceof Error ? error.message : 'unknown');
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
