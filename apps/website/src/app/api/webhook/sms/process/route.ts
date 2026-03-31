import { NextRequest, NextResponse } from 'next/server';
import { TENANT_MAP, supaGet, supaPost, sendTwilioSMS, slackNotify, callClaude, rateLimit, getClientIp } from '../../../../../lib/security';

/* =============================================================================
   DELAYED SMS PROCESSOR — Called internally by the webhook
   Security: Internal secret header required + rate limiting
   ============================================================================= */

export const maxDuration = 60;

const PROCESS_SECRET = process.env.PROCESS_SECRET || 'internal-process-key';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify internal call
  const secret = request.headers.get('x-process-secret');
  if (secret !== PROCESS_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  if (rateLimit(ip, 30)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { fromPhone, toPhone, messageBody, delay } = body as {
      fromPhone: string; toPhone: string; messageBody: string; delay?: number;
    };

    if (!fromPhone || !toPhone || !messageBody) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const tenant = TENANT_MAP[toPhone] || TENANT_MAP['+13433125045'];

    // Log inbound
    await supaPost('lead_transcripts', {
      tenant_id: tenant.tenant, lead_id: fromPhone,
      entry_type: 'message', role: 'customer', content: messageBody, channel: 'sms',
    });

    // Intent classification
    const lower = messageBody.toLowerCase().trim();
    let intent = 'GENERAL';
    let shouldStop = false;
    let shouldHandoff = false;

    if (['stop', 'unsubscribe', 'remove', 'cancel', 'arret'].includes(lower)) {
      intent = 'UNSUBSCRIBE'; shouldStop = true;
    } else if (/\b(test drive|come in|visit|appointment|schedule|book|ready to buy|essai)\b/i.test(lower)) {
      intent = 'HOT'; shouldHandoff = true;
    } else if (/\b(how much|price|cost|payment|monthly|bi-weekly|financing)\b/i.test(lower)) {
      intent = 'PRICING';
    } else if (/\b(trade.?in|my car|current vehicle|negative equity)\b/i.test(lower)) {
      intent = 'TRADE_IN';
    }

    // STOP — immediate
    if (shouldStop) {
      const msg = 'No problem at all. Wishing you all the best.';
      await sendTwilioSMS(fromPhone, toPhone, msg);
      await supaPost('lead_transcripts', { tenant_id: tenant.tenant, lead_id: fromPhone, entry_type: 'message', role: 'ai', content: msg, channel: 'sms', intent });
      return NextResponse.json({ sent: true, immediate: true });
    }

    // HOT — immediate handoff
    if (shouldHandoff) {
      const msg = 'Perfect — let me get everything set up for you. I\'ll reach out within the hour to get this rolling. You\'re in great hands.';
      await sendTwilioSMS(fromPhone, toPhone, msg);
      await supaPost('lead_transcripts', { tenant_id: tenant.tenant, lead_id: fromPhone, entry_type: 'message', role: 'ai', content: msg, channel: 'sms', intent });
      await slackNotify(`HOT LEAD HANDOFF\nPhone: ${fromPhone}\nDealer: ${tenant.name}\nMessage: ${messageBody}`);
      return NextResponse.json({ sent: true, immediate: true, handoff: true });
    }

    // Wait for human-like delay
    const delayMs = (delay || 45) * 1000;
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Load conversation history
    let conversationHistory = '';
    try {
      const history = await supaGet(
        `lead_transcripts?tenant_id=eq.${tenant.tenant}&lead_id=eq.${encodeURIComponent(fromPhone)}&channel=eq.sms&select=role,content&order=created_at.desc&limit=10`
      ) as { role: string; content: string }[];
      if (history.length > 0) conversationHistory = history.reverse().map(m => `${m.role}: ${m.content}`).join('\n');
    } catch { /* no history */ }

    // Lookup lead name
    let leadName = '';
    try {
      const leads = await supaGet(
        `v_funnel_submissions?tenant_id=eq.${tenant.tenant}&phone=eq.${encodeURIComponent(fromPhone)}&select=first_name,last_name&limit=1`
      ) as { first_name?: string; last_name?: string }[];
      if (leads.length > 0) leadName = [leads[0].first_name, leads[0].last_name].filter(Boolean).join(' ');
    } catch { /* no lead */ }

    // Build NESB prompt
    const systemPrompt = buildNESBPrompt(tenant);
    const userMsg = (conversationHistory ? `Conversation so far:\n${conversationHistory}\n\n` : '') +
      `Customer ${leadName || 'unknown'} just texted: "${messageBody}"\n\nReply as ${tenant.gm}. 2-3 sentences max. End with a question. You contacted them first — do NOT thank them for reaching out. Apply NESB principles.\n\n${conversationHistory ? 'This is an ONGOING conversation — do NOT introduce yourself again.' : 'This is the FIRST reply — introduce yourself briefly: "It\'s ' + tenant.gm + ', GM over at ' + tenant.name + '." Then get into it.'}`;

    let aiReply = await callClaude(systemPrompt, userMsg);

    if (!aiReply) {
      aiReply = leadName
        ? `${leadName}, glad you replied! What kind of vehicle would make the biggest difference for you right now?`
        : `It's ${tenant.gm}, GM over at ${tenant.name}. What kind of vehicle are you looking for?`;
    }

    await sendTwilioSMS(fromPhone, toPhone, aiReply);
    await supaPost('lead_transcripts', { tenant_id: tenant.tenant, lead_id: fromPhone, entry_type: 'message', role: 'ai', content: aiReply, channel: 'sms', intent });
    slackNotify(`SMS REPLY (${tenant.name})\nTo: ${fromPhone}\nReply: ${aiReply.substring(0, 100)}...`);

    return NextResponse.json({ sent: true, delayed: true });
  } catch (error) {
    console.error('[sms-process] Error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

function buildNESBPrompt(tenant: { name: string; location: string; phone: string; gm: string }): string {
  return `You are ${tenant.gm}, General Sales Manager at ${tenant.name} in Ottawa. You are the greatest vehicle sales communicator alive — a fusion of Kyle Milligan's NESB copywriting, Jeremy Miner's NEPQ questioning, Tony Robbins' emotional intelligence, and Elon Musk's directness.

## NESB FRAMEWORK (Kyle Milligan — "Take Their Money")
Every reply MUST trigger at least one of these 4 emotions:

**NEW** — "Categorization is DEATH." Never sound like a generic dealer. New = hope.
- Alter ego: ONLY — "You can only get this through us."

**EASY** — Make everything sound effortless. Use "not statements."
- Alter ego: ANYBODY — "You don't need perfect credit. You just need a job."

**SAFE** — Fight skepticism with track record. "I've helped a lot of people in your exact situation."
- Alter ego: PREDICTABLE — "The last time we had someone in your spot, they drove away in a week."

**BIG** — This isn't just a car — it's freedom. Create FOMO naturally.
- Alter ego: FAST — "This could happen for you this week."

## RULES
- 2-3 sentences MAX. SMS — short, punchy, human.
- PERSON, not bot. Text like a friend.
- NEVER say "thanks for reaching out" — YOU contacted THEM first.
- NEVER start with "Hey" every time. Vary openings.
- NEVER discuss pricing, payments, rates, financing terms.
- NEVER guarantee approval.
- Every response ends with ONE question.
- "Your income is your credit" — pivot credit concerns to income.
- French → respond in Quebec French.
- NEVER repeat yourself. Each reply must be unique.
- Do NOT sign off with your name. End naturally.

## CONTEXT
${tenant.name}, ${tenant.location}. Phone: ${tenant.phone}. Leads applied within 6 months. Income matters most. 98% approval. Free delivery ON & QC.`;
}
