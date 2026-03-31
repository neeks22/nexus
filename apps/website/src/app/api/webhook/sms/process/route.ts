import { NextRequest, NextResponse } from 'next/server';

/* =============================================================================
   DELAYED SMS PROCESSOR — Called by the main webhook after Twilio response
   Waits 45 seconds, then generates AI reply and sends via Twilio

   Vercel Hobby has 10s timeout on API routes, but this is an internal call
   so we use maxDuration config. If on Hobby plan and this times out,
   the main webhook has a fallback that processes immediately.
   ============================================================================= */

// Request longer execution time (works on Vercel Pro, ignored on Hobby)
export const maxDuration = 60;

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim().replace(/\\n$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim().replace(/\\n$/, '');
const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY ?? 'REMOVED_SECRET_ANTHROPIC_KEY').trim();
const TWILIO_SID = (process.env.TWILIO_ACCOUNT_SID ?? 'REMOVED_SECRET_TWILIO_SID').trim();
const TWILIO_TOKEN = (process.env.TWILIO_AUTH_TOKEN ?? 'REMOVED_SECRET_TWILIO_TOKEN').trim();
const SLACK_WEBHOOK = 'REMOVED_SECRET_SLACK_WEBHOOK';

const TENANT_MAP: Record<string, { name: string; location: string; phone: string; gm: string; tenant: string }> = {
  '+13433125045': { name: 'ReadyCar', location: 'Stittsville ON', phone: '613-363-4494', gm: 'Nico', tenant: 'readycar' },
  '+13433412797': { name: 'ReadyRide', location: 'Gloucester ON', phone: '613-983-9834', gm: 'Moe', tenant: 'readyride' },
};

function supaHeaders(): Record<string, string> {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
}

async function supaGet(path: string): Promise<unknown[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: supaHeaders(), signal: AbortSignal.timeout(8000) });
    if (res.ok) return await res.json();
  } catch { /* ignore */ }
  return [];
}

async function supaPost(table: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify(data), signal: AbortSignal.timeout(8000),
    });
  } catch { /* ignore */ }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { fromPhone, toPhone, messageBody, delay } = body as {
      fromPhone: string; toPhone: string; messageBody: string; delay?: number;
    };

    if (!fromPhone || !toPhone || !messageBody) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const tenant = TENANT_MAP[toPhone] || TENANT_MAP['+13433125045'];

    // Log inbound message
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

    // STOP — send immediately, no delay
    if (shouldStop) {
      const msg = `No problem at all. Wishing you all the best.`;
      const params = new URLSearchParams({ To: fromPhone, From: toPhone, Body: msg });
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      await supaPost('lead_transcripts', { tenant_id: tenant.tenant, lead_id: fromPhone, entry_type: 'message', role: 'ai', content: msg, channel: 'sms', intent });
      return NextResponse.json({ sent: true, immediate: true });
    }

    // HOT — send immediately, no delay
    if (shouldHandoff) {
      const msg = `Perfect — let me get everything set up for you. I'll reach out within the hour to get this rolling. You're in great hands.`;
      const params = new URLSearchParams({ To: fromPhone, From: toPhone, Body: msg });
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      await supaPost('lead_transcripts', { tenant_id: tenant.tenant, lead_id: fromPhone, entry_type: 'message', role: 'ai', content: msg, channel: 'sms', intent });
      await fetch(SLACK_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `HOT LEAD HANDOFF\nPhone: ${fromPhone}\nDealer: ${tenant.name}\nMessage: ${messageBody}` }) }).catch(() => {});
      return NextResponse.json({ sent: true, immediate: true, handoff: true });
    }

    // --- WAIT 45 SECONDS (human-like delay) ---
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
      `Customer ${leadName || 'unknown'} just texted: "${messageBody}"\n\nReply as ${tenant.gm}. 2-3 sentences max. End with a question. You contacted them first — do NOT thank them for reaching out. Apply NESB principles.\n\n${conversationHistory ? 'This is an ONGOING conversation — do NOT introduce yourself again. They already know who you are.' : 'This is the FIRST reply — introduce yourself briefly: "It\'s ' + tenant.gm + ', GM over at ' + tenant.name + '." Then get into it.'}`;

    // Call Claude
    let aiReply = '';
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 200, system: systemPrompt, messages: [{ role: 'user', content: userMsg }] }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        aiReply = data.content?.[0]?.text || '';
      }
    } catch { /* Claude failed */ }

    // Fallback
    if (!aiReply) {
      aiReply = leadName
        ? `${leadName}, glad you replied! What kind of vehicle would make the biggest difference for you right now?`
        : `It's ${tenant.gm}, GM over at ${tenant.name}. What kind of vehicle are you looking for?`;
    }

    // Send via Twilio
    const params = new URLSearchParams({ To: fromPhone, From: toPhone, Body: aiReply });
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    // Log + Slack
    await supaPost('lead_transcripts', { tenant_id: tenant.tenant, lead_id: fromPhone, entry_type: 'message', role: 'ai', content: aiReply, channel: 'sms', intent });
    fetch(SLACK_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `SMS REPLY (${tenant.name})\nTo: ${fromPhone}\nReply: ${aiReply.substring(0, 100)}...` }) }).catch(() => {});

    return NextResponse.json({ sent: true, delayed: true, delaySeconds: delay || 45 });
  } catch (error) {
    console.error('[sms-process] Error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

function buildNESBPrompt(tenant: { name: string; location: string; phone: string; gm: string }): string {
  return `You are ${tenant.gm}, General Sales Manager at ${tenant.name} in Ottawa. You are the greatest vehicle sales communicator alive — a fusion of Kyle Milligan's NESB copywriting, Jeremy Miner's NEPQ questioning, Tony Robbins' emotional intelligence, and Elon Musk's directness.

## NESB FRAMEWORK (Kyle Milligan — "Take Their Money")
Every reply MUST trigger at least one of these 4 emotions:

**NEW** — "Categorization is DEATH." Never sound like a generic dealer. New = hope. Make every reply feel fresh and novel.
- Alter ego: ONLY — "You can only get this through us."

**EASY** — Make everything sound effortless. Use "not statements" to knock down objections before they raise them.
- Alter ego: ANYBODY — "You don't need perfect credit. You just need a job."

**SAFE** — Fight skepticism with track record. "I've helped a lot of people in your exact situation."
- Alter ego: PREDICTABLE — "The last time we had someone in your spot, they drove away in a week."

**BIG** — This isn't just a car — it's freedom. Create FOMO naturally. BIG + FAST = unstoppable.
- Alter ego: FAST — "This could happen for you this week."

## NEPQ (Jeremy Miner) — Ask questions that make them sell themselves.

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
- Do NOT sign off with your name at the end. No "- Nico" or "- Moe". Just end naturally like a real text.

## OBJECTIONS
- "Bad credit" → "That's exactly why I reached out. Lenders I work with look at the full picture. What kind of work do you do?"
- "Can't afford down payment" → "A lot of our customers start with nothing down. What would a comfortable payment look like?"
- "STOP" → "No problem at all. Wishing you all the best."

## CONTEXT
${tenant.name}, ${tenant.location}. Phone: ${tenant.phone}. Leads applied within 6 months. Income matters most. 98% approval. Free delivery ON & QC.`;
}
