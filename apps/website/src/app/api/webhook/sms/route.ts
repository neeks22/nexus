import { NextRequest, NextResponse } from 'next/server';

/* =============================================================================
   SMS WEBHOOK — Receives inbound SMS from Twilio, generates AI reply, sends it
   No n8n. No middleware. Direct: Twilio → Next.js → Claude → Twilio.
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
    const err = await res.text();
    console.error('[sms-agent] Claude API error:', res.status, err);
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

/* ---------- Build System Prompt ---------- */

function buildSystemPrompt(tenant: { name: string; location: string; phone: string; gm: string }): string {
  return `You are ${tenant.gm}, General Sales Manager at ${tenant.name} in Ottawa. You are texting a potential car buyer via SMS.

CRITICAL RULES:
- 2-3 sentences MAX. This is SMS, keep it short.
- Sound like a real person texting. NOT a company bot.
- NEVER say "thanks for reaching out" or "thanks for getting back to me" or "thanks for your interest" — YOU contacted THEM first via outreach campaign. They are replying to YOUR message.
- NEVER start with "Hey" every time. Vary your openings naturally.
- NEVER discuss pricing, monthly payments, interest rates, or financing terms.
- NEVER guarantee approval. Say things like "I've seen people in similar situations get approved."
- End with ONE question to keep the conversation going.
- If they mention credit concerns: "Our lenders care more about steady income than a perfect score."
- If they ask about specific vehicles: mention you will check inventory and ask what features matter most.
- If they text in French, respond in natural Quebec French.
- Read the conversation history carefully and DO NOT repeat yourself. Each reply must be unique and advance the conversation.
- Sign off with: - ${tenant.gm}

Dealership: ${tenant.name}, ${tenant.location}. Phone: ${tenant.phone}.
These leads came from our outreach campaign. Their income is what matters to our lenders.`;
}

/* ---------- Main Handler ---------- */

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Respond to Twilio immediately with empty TwiML (prevents timeout)
  const twimlResponse = new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { status: 200, headers: { 'Content-Type': 'text/xml' } }
  );

  // Process in the background after responding
  const formData = await request.formData();
  const fromPhone = (formData.get('From') as string) || '';
  const toPhone = (formData.get('To') as string) || '';
  const messageBody = (formData.get('Body') as string) || '';

  if (!fromPhone || !messageBody) return twimlResponse;

  // Detect tenant from the Twilio number that received the SMS
  const tenant = TENANT_MAP[toPhone] || TENANT_MAP['+13433125045'];

  // Log inbound message to Supabase
  supaPost('lead_transcripts', {
    tenant_id: tenant.tenant,
    lead_id: fromPhone,
    entry_type: 'message',
    role: 'customer',
    content: messageBody,
    channel: 'sms',
  });

  // Classify intent
  const { intent, shouldStop, shouldHandoff } = classifyIntent(messageBody);

  // Handle STOP
  if (shouldStop) {
    const stopMsg = `No problem at all. Wishing you all the best. - ${tenant.gm}, ${tenant.name}`;
    await sendTwilioSMS(fromPhone, toPhone, stopMsg);
    supaPost('lead_transcripts', { tenant_id: tenant.tenant, lead_id: fromPhone, entry_type: 'message', role: 'ai', content: stopMsg, channel: 'sms', intent: 'UNSUBSCRIBE' });
    return twimlResponse;
  }

  // Handle HOT lead — handoff to human
  if (shouldHandoff) {
    const handoffMsg = `Perfect — let me get everything set up for you. ${tenant.gm} will reach out within the hour. You're in great hands. - ${tenant.gm}, ${tenant.name} ${tenant.phone}`;
    await sendTwilioSMS(fromPhone, toPhone, handoffMsg);
    supaPost('lead_transcripts', { tenant_id: tenant.tenant, lead_id: fromPhone, entry_type: 'message', role: 'ai', content: handoffMsg, channel: 'sms', intent });
    slackNotify(`HOT LEAD HANDOFF\nPhone: ${fromPhone}\nDealer: ${tenant.name}\nMessage: ${messageBody}\nIntent: ${intent}`);
    return twimlResponse;
  }

  // Load conversation history from Supabase
  let conversationHistory = '';
  try {
    const history = await supaGet(
      `lead_transcripts?tenant_id=eq.${tenant.tenant}&lead_id=eq.${encodeURIComponent(fromPhone)}&channel=eq.sms&select=role,content&order=created_at.desc&limit=10`
    ) as { role: string; content: string }[];

    if (history.length > 0) {
      conversationHistory = history.reverse().map(m => `${m.role}: ${m.content}`).join('\n');
    }
  } catch { /* no history, that's fine */ }

  // Lookup lead name
  let leadName = '';
  try {
    const leads = await supaGet(
      `v_funnel_submissions?tenant_id=eq.${tenant.tenant}&phone=eq.${encodeURIComponent(fromPhone)}&select=first_name,last_name&limit=1`
    ) as { first_name?: string; last_name?: string }[];
    if (leads.length > 0) {
      leadName = [leads[0].first_name, leads[0].last_name].filter(Boolean).join(' ');
    }
  } catch { /* no lead found */ }

  // 2-second delay to feel human (not instant bot response)
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Call Claude API
  const systemPrompt = buildSystemPrompt(tenant);
  const userMsg = (conversationHistory ? `Conversation so far:\n${conversationHistory}\n\n` : '') +
    `Customer ${leadName || 'unknown'} just texted: "${messageBody}"\n\nReply as ${tenant.gm}. 2-3 sentences max. End with a question. You contacted them first — do NOT thank them for reaching out.`;

  let aiReply = await callClaude(systemPrompt, userMsg);

  // Fallback if Claude fails
  if (!aiReply) {
    if (leadName) {
      aiReply = `${leadName}, glad you replied! What kind of vehicle would make the biggest difference for you right now? - ${tenant.gm}`;
    } else {
      aiReply = `I'm ${tenant.gm} from ${tenant.name}. What kind of vehicle are you looking for? - ${tenant.gm}`;
    }
  }

  // Send the reply
  await sendTwilioSMS(fromPhone, toPhone, aiReply);

  // Log outbound message
  supaPost('lead_transcripts', {
    tenant_id: tenant.tenant,
    lead_id: fromPhone,
    entry_type: 'message',
    role: 'ai',
    content: aiReply,
    channel: 'sms',
    intent,
  });

  // Slack notification
  slackNotify(`SMS REPLY SENT (${tenant.name})\nTo: ${fromPhone}\nIntent: ${intent}\nReply: ${aiReply.substring(0, 100)}...`);

  return twimlResponse;
}
