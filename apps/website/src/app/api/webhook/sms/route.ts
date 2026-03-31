import { NextRequest, NextResponse } from 'next/server';

/* =============================================================================
   SMS WEBHOOK — Receives inbound SMS from Twilio, generates AI reply, sends it
   No n8n. No middleware. Direct: Twilio → Next.js → Claude → Twilio.

   Flow: Twilio POSTs here → we respond with empty TwiML immediately →
   then process the AI reply and send via Twilio API.
   ============================================================================= */

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim().replace(/\\n$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim().replace(/\\n$/, '');
const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY ?? 'REMOVED_SECRET_ANTHROPIC_KEY').trim();
const TWILIO_SID = (process.env.TWILIO_ACCOUNT_SID ?? 'REMOVED_SECRET_TWILIO_SID').trim();
const TWILIO_TOKEN = (process.env.TWILIO_AUTH_TOKEN ?? 'REMOVED_SECRET_TWILIO_TOKEN').trim();

const TENANT_MAP: Record<string, { name: string; location: string; phone: string; gm: string; tenant: string }> = {
  '+13433125045': { name: 'ReadyCar', location: 'Stittsville ON', phone: '613-363-4494', gm: 'Nico', tenant: 'readycar' },
  '+13433412797': { name: 'ReadyRide', location: 'Gloucester ON', phone: '613-983-9834', gm: 'Moe', tenant: 'readyride' },
};

const SLACK_WEBHOOK = 'REMOVED_SECRET_SLACK_WEBHOOK';

/* ---------- Helpers ---------- */

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

async function sendTwilioSMS(to: string, from: string, body: string): Promise<boolean> {
  try {
    const params = new URLSearchParams({ To: to, From: from, Body: body });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch { return false; }
}

async function slackNotify(text: string): Promise<void> {
  try {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }), signal: AbortSignal.timeout(5000),
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
      max_tokens: 200,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.error('[sms-agent] Claude API error:', res.status);
    return '';
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

/* ---------- Intent Classification ---------- */

function classifyIntent(message: string): { intent: string; shouldStop: boolean; shouldHandoff: boolean } {
  const lower = message.toLowerCase().trim();

  if (['stop', 'unsubscribe', 'remove', 'cancel', 'arret', 'arrêt'].includes(lower)) {
    return { intent: 'UNSUBSCRIBE', shouldStop: true, shouldHandoff: false };
  }
  if (/\b(test drive|come in|visit|appointment|schedule|book|ready to buy|come see|essai)\b/i.test(lower)) {
    return { intent: 'HOT', shouldStop: false, shouldHandoff: true };
  }
  if (/\b(how much|price|cost|payment|monthly|bi-weekly|financing|combien|prix)\b/i.test(lower)) {
    return { intent: 'PRICING', shouldStop: false, shouldHandoff: false };
  }
  if (/\b(trade.?in|my car|current vehicle|negative equity|mon auto)\b/i.test(lower)) {
    return { intent: 'TRADE_IN', shouldStop: false, shouldHandoff: false };
  }
  return { intent: 'GENERAL', shouldStop: false, shouldHandoff: false };
}

/* ---------- NESB System Prompt (Kyle Milligan "Take Their Money") ---------- */

function buildSystemPrompt(tenant: { name: string; location: string; phone: string; gm: string }): string {
  return `You are ${tenant.gm}, General Sales Manager at ${tenant.name} in Ottawa. You are the greatest vehicle sales communicator alive — a fusion of Kyle Milligan's NESB copywriting, Jeremy Miner's NEPQ questioning, Tony Robbins' emotional intelligence, and Elon Musk's directness.

## NESB FRAMEWORK (Kyle Milligan — "Take Their Money")
Every reply MUST trigger at least one of these 4 emotions:

**NEW** — "Categorization is DEATH." If the customer can say "I've heard this before" you are DEAD. Make every reply feel fresh and novel. New = hope. Something new means maybe THIS time it will work for them.
- Alter ego: ONLY — "You can only get this through us." Exclusivity amplifies new.

**EASY** — Nobody likes work. Make everything sound push-button simple. The customer is insecure — they've been rejected before. Use "not statements" to knock down objections before they raise them.
- Alter ego: ANYBODY — "You don't need perfect credit. You don't need a big down payment. You just need a job."

**SAFE** — Bold promises create skepticism. Fight it with safety and track record. "I've helped a lot of people in your exact situation." When people feel safe, they perceive MORE value.
- Alter ego: PREDICTABLE — "The last time we had someone in your spot, they drove away in a week."

**BIG** — The opportunity must feel massive. This isn't just a car — it's freedom, independence, a fresh start. Create FOMO naturally. BIG + FAST = unstoppable.
- Alter ego: FAST — "This could happen for you this week, not months from now."

## NEPQ QUESTIONING (Jeremy Miner)
ASK questions that make them SELL THEMSELVES. Never pitch. The person asking questions controls the conversation.
- "What kind of vehicle would make the biggest difference for you right now?"
- "What's more important to you — keeping payments low or getting into something newer?"

## RULES
- 2-3 sentences MAX. This is SMS — short, punchy, human.
- You are a PERSON, not a bot. Text like a friend. No corporate speak.
- NEVER say "thanks for reaching out" — YOU contacted THEM first.
- NEVER start with "Hey" every time. Vary openings naturally.
- NEVER discuss specific pricing, monthly payments, interest rates, or financing terms.
- NEVER guarantee approval. Say "I've seen people in similar situations get approved."
- NEVER be pushy. Infinite patience.
- Every response MUST end with ONE question.
- "Your income is your credit" — when credit comes up, pivot to income.
- Make them feel like the ONLY person you're talking to.
- If they text in French, respond in natural Quebec French.
- Read conversation history. NEVER repeat yourself. Each reply must be unique.
- Sign off with: - ${tenant.gm}

## OBJECTION HANDLING
- "My credit is bad" → "I hear you — that's exactly why I reached out. The lenders I work with now look at the full picture, not just a score. What kind of work do you do?"
- "Can't afford down payment" → "A lot of our customers start with little to nothing down. What would a comfortable payment look like for you?"
- "Not interested" / "STOP" → "No problem at all — I respect that. Wishing you all the best."
- "Is this a bot?" → "Ha — fair question. It's ${tenant.gm}, I'm the GM here at ${tenant.name}. What's on your mind?"

## CONTEXT
Dealership: ${tenant.name}, ${tenant.location}. Phone: ${tenant.phone}.
These leads applied within the last 6 months. Steady income is what matters to our lenders. 98% approval rate. Free delivery in Ontario & Quebec.`;
}

/* ---------- Process and Reply (called after delay) ---------- */

async function processAndReply(fromPhone: string, toPhone: string, messageBody: string): Promise<void> {
  const tenant = TENANT_MAP[toPhone] || TENANT_MAP['+13433125045'];
  const { intent, shouldStop, shouldHandoff } = classifyIntent(messageBody);

  // Log inbound
  supaPost('lead_transcripts', {
    tenant_id: tenant.tenant, lead_id: fromPhone,
    entry_type: 'message', role: 'customer', content: messageBody, channel: 'sms',
  });

  // STOP
  if (shouldStop) {
    const msg = `No problem at all. Wishing you all the best. - ${tenant.gm}, ${tenant.name}`;
    await sendTwilioSMS(fromPhone, toPhone, msg);
    supaPost('lead_transcripts', { tenant_id: tenant.tenant, lead_id: fromPhone, entry_type: 'message', role: 'ai', content: msg, channel: 'sms', intent: 'UNSUBSCRIBE' });
    return;
  }

  // HOT — handoff
  if (shouldHandoff) {
    const msg = `Perfect — let me get everything set up for you. ${tenant.gm} will reach out within the hour. You're in great hands. - ${tenant.gm}, ${tenant.name} ${tenant.phone}`;
    await sendTwilioSMS(fromPhone, toPhone, msg);
    supaPost('lead_transcripts', { tenant_id: tenant.tenant, lead_id: fromPhone, entry_type: 'message', role: 'ai', content: msg, channel: 'sms', intent });
    slackNotify(`HOT LEAD HANDOFF\nPhone: ${fromPhone}\nDealer: ${tenant.name}\nMessage: ${messageBody}\nIntent: ${intent}`);
    return;
  }

  // Load conversation history
  let conversationHistory = '';
  try {
    const history = await supaGet(
      `lead_transcripts?tenant_id=eq.${tenant.tenant}&lead_id=eq.${encodeURIComponent(fromPhone)}&channel=eq.sms&select=role,content&order=created_at.desc&limit=10`
    ) as { role: string; content: string }[];
    if (history.length > 0) {
      conversationHistory = history.reverse().map(m => `${m.role}: ${m.content}`).join('\n');
    }
  } catch { /* no history */ }

  // Lookup lead name
  let leadName = '';
  try {
    const leads = await supaGet(
      `v_funnel_submissions?tenant_id=eq.${tenant.tenant}&phone=eq.${encodeURIComponent(fromPhone)}&select=first_name,last_name&limit=1`
    ) as { first_name?: string; last_name?: string }[];
    if (leads.length > 0) leadName = [leads[0].first_name, leads[0].last_name].filter(Boolean).join(' ');
  } catch { /* no lead */ }

  // Call Claude
  const systemPrompt = buildSystemPrompt(tenant);
  const userMsg = (conversationHistory ? `Conversation so far:\n${conversationHistory}\n\n` : '') +
    `Customer ${leadName || 'unknown'} just texted: "${messageBody}"\n\nReply as ${tenant.gm}. 2-3 sentences max. End with a question. You contacted them first — do NOT thank them for reaching out. Use NESB principles.`;

  let aiReply = await callClaude(systemPrompt, userMsg);

  // Fallback
  if (!aiReply) {
    aiReply = leadName
      ? `${leadName}, glad you replied! What kind of vehicle would make the biggest difference for you right now? - ${tenant.gm}`
      : `I'm ${tenant.gm} from ${tenant.name}. What kind of vehicle are you looking for? - ${tenant.gm}`;
  }

  // Send
  await sendTwilioSMS(fromPhone, toPhone, aiReply);

  // Log + notify
  supaPost('lead_transcripts', { tenant_id: tenant.tenant, lead_id: fromPhone, entry_type: 'message', role: 'ai', content: aiReply, channel: 'sms', intent });
  slackNotify(`SMS REPLY (${tenant.name})\nTo: ${fromPhone}\nReply: ${aiReply.substring(0, 100)}...`);
}

/* ---------- Main Webhook Handler ---------- */

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const fromPhone = (formData.get('From') as string) || '';
  const toPhone = (formData.get('To') as string) || '';
  const messageBody = (formData.get('Body') as string) || '';

  if (!fromPhone || !messageBody) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200, headers: { 'Content-Type': 'text/xml' },
    });
  }

  // Trigger delayed processing via our own endpoint
  // This gives us a 45-second human-feeling delay
  const baseUrl = request.nextUrl.origin || 'https://nexusagents.ca';
  fetch(`${baseUrl}/api/webhook/sms/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromPhone, toPhone, messageBody, delay: 45 }),
  }).catch(() => {
    // If delayed endpoint fails, process immediately as fallback
    processAndReply(fromPhone, toPhone, messageBody).catch(console.error);
  });

  // Respond to Twilio immediately
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200, headers: { 'Content-Type': 'text/xml' },
  });
}
