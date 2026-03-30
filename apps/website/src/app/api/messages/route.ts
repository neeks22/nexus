import { NextRequest, NextResponse } from 'next/server';

/* =============================================================================
   ENVIRONMENT VARIABLES — never hardcode credentials
   ============================================================================= */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? '';
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? '';
const TWILIO_BASE_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`;

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'https://nexusagents.ca';

/* =============================================================================
   RATE LIMITING — in-memory sliding window (per-IP, 60 req/min)
   ============================================================================= */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitMap.set(ip, entry);
  }
  // Prune expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (entry.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  entry.timestamps.push(now);
  return false;
}

// Periodic cleanup to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of Array.from(rateLimitMap.entries())) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (entry.timestamps.length === 0) {
      rateLimitMap.delete(ip);
    }
  }
}, 120_000);

/* =============================================================================
   INPUT VALIDATION
   ============================================================================= */

/** E.164 phone format: +[country code][number], 8-15 digits total */
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

function isValidE164(phone: string): boolean {
  return E164_REGEX.test(phone);
}

/** Normalize a phone number to E.164 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

/** Sanitize text: strip control characters, limit length */
function sanitizeText(input: string, maxLength: number): string {
  // Remove null bytes and other control characters except newline/tab
  // eslint-disable-next-line no-control-regex
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.slice(0, maxLength);
}

const MAX_SMS_LENGTH = 1600;

/* =============================================================================
   CORS + SECURITY HEADERS
   ============================================================================= */

function securityHeaders(origin?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  // CORS — restrict to allowed origin
  if (origin === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }

  return headers;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

/* =============================================================================
   ORIGIN VALIDATION (CSRF-lite for API routes)
   ============================================================================= */

function isValidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Allow same-origin requests (no origin header = same-origin in most cases)
  if (!origin && !referer) return true;

  if (origin === ALLOWED_ORIGIN) return true;
  if (referer?.startsWith(ALLOWED_ORIGIN)) return true;

  // Allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    if (origin?.includes('localhost') || referer?.includes('localhost')) return true;
  }

  return false;
}

/* =============================================================================
   TYPES
   ============================================================================= */

interface TwilioMessage {
  sid: string;
  body: string;
  from: string;
  to: string;
  date_sent: string;
  date_created: string;
  status: string;
  direction: string;
}

interface TwilioResponse {
  messages: TwilioMessage[];
  next_page_uri: string | null;
}

interface SupabaseLead {
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  vehicle_type: string;
  budget: string;
  credit_situation: string;
}

interface ConversationMessage {
  sid: string;
  body: string;
  from: string;
  to: string;
  dateSent: string;
  status: string;
  direction: 'inbound' | 'outbound';
}

interface Conversation {
  phone: string;
  leadName: string;
  status: string;
  vehicleInterest: string;
  budget: string;
  creditSituation: string;
  messages: ConversationMessage[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

/* =============================================================================
   TWILIO API HELPERS
   ============================================================================= */

function twilioHeaders(): HeadersInit {
  const encoded = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

async function fetchAllMessages(): Promise<TwilioMessage[]> {
  const allMessages: TwilioMessage[] = [];
  let url: string | null = `${TWILIO_BASE_URL}/Messages.json?PageSize=200`;

  while (url) {
    const res = await fetch(url, {
      headers: twilioHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`[messages] Twilio API error: ${res.status}`);
      break;
    }

    const data = (await res.json()) as TwilioResponse;
    allMessages.push(...data.messages);

    if (data.next_page_uri) {
      url = `https://api.twilio.com${data.next_page_uri}`;
    } else {
      url = null;
    }
  }

  return allMessages;
}

async function fetchMessagesForPhone(phone: string): Promise<TwilioMessage[]> {
  const [sentRes, receivedRes] = await Promise.all([
    fetch(`${TWILIO_BASE_URL}/Messages.json?To=${encodeURIComponent(phone)}&PageSize=200`, {
      headers: twilioHeaders(),
      signal: AbortSignal.timeout(15000),
    }),
    fetch(`${TWILIO_BASE_URL}/Messages.json?From=${encodeURIComponent(phone)}&PageSize=200`, {
      headers: twilioHeaders(),
      signal: AbortSignal.timeout(15000),
    }),
  ]);

  const messages: TwilioMessage[] = [];

  if (sentRes.ok) {
    const data = (await sentRes.json()) as TwilioResponse;
    messages.push(...data.messages);
  }
  if (receivedRes.ok) {
    const data = (await receivedRes.json()) as TwilioResponse;
    messages.push(...data.messages);
  }

  messages.sort((a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime());

  return messages;
}

async function fetchLeads(): Promise<Map<string, SupabaseLead>> {
  const leadMap = new Map<string, SupabaseLead>();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/v_funnel_submissions?select=first_name,last_name,phone,status,vehicle_type,budget,credit_situation`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (res.ok) {
      const leads = (await res.json()) as SupabaseLead[];
      for (const lead of leads) {
        if (lead.phone) {
          const normalized = normalizePhone(lead.phone);
          leadMap.set(normalized, lead);
        }
      }
    } else {
      console.error(`[messages] Supabase error: ${res.status}`);
    }
  } catch (err) {
    console.error('[messages] Failed to fetch leads from Supabase:', err);
  }

  return leadMap;
}

function groupIntoConversations(
  messages: TwilioMessage[],
  leads: Map<string, SupabaseLead>
): Conversation[] {
  const convMap = new Map<string, ConversationMessage[]>();

  for (const msg of messages) {
    const isOutbound = msg.from === TWILIO_FROM_NUMBER || msg.direction?.includes('outbound');
    const otherPhone = isOutbound ? normalizePhone(msg.to) : normalizePhone(msg.from);

    if (!convMap.has(otherPhone)) {
      convMap.set(otherPhone, []);
    }

    convMap.get(otherPhone)!.push({
      sid: msg.sid,
      body: msg.body,
      from: msg.from,
      to: msg.to,
      dateSent: msg.date_sent || msg.date_created,
      status: msg.status,
      direction: isOutbound ? 'outbound' : 'inbound',
    });
  }

  const conversations: Conversation[] = [];

  const entries = Array.from(convMap.entries());
  for (let e = 0; e < entries.length; e++) {
    const phone = entries[e][0];
    const msgs = entries[e][1];

    msgs.sort((a, b) => new Date(a.dateSent).getTime() - new Date(b.dateSent).getTime());

    const lead = leads.get(phone);
    const lastMsg = msgs[msgs.length - 1];

    let unreadCount = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].direction === 'inbound') {
        unreadCount++;
      } else {
        break;
      }
    }

    conversations.push({
      phone,
      leadName: lead ? `${lead.first_name} ${lead.last_name}` : '',
      status: lead?.status || 'new',
      vehicleInterest: lead?.vehicle_type || '',
      budget: lead?.budget || '',
      creditSituation: lead?.credit_situation || '',
      messages: msgs,
      lastMessage: lastMsg?.body || '',
      lastMessageTime: lastMsg?.dateSent || '',
      unreadCount,
    });
  }

  conversations.sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );

  return conversations;
}

/* =============================================================================
   PREFLIGHT (CORS OPTIONS)
   ============================================================================= */

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: securityHeaders(origin),
  });
}

/* =============================================================================
   GET /api/messages — fetch conversations (no-cache, rate-limited)
   ============================================================================= */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const origin = request.headers.get('origin');

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: securityHeaders(origin) }
    );
  }

  // Credential check — fail fast if not configured
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('[messages] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not set');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500, headers: securityHeaders(origin) }
    );
  }

  try {
    const phone = request.nextUrl.searchParams.get('phone');

    if (phone) {
      // Validate phone parameter
      const normalized = normalizePhone(phone);
      if (!isValidE164(normalized)) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400, headers: securityHeaders(origin) }
        );
      }

      const [messages, leads] = await Promise.all([
        fetchMessagesForPhone(normalized),
        fetchLeads(),
      ]);

      const conversations = groupIntoConversations(messages, leads);
      const conversation = conversations.find((c) => c.phone === normalized);

      return NextResponse.json(
        { conversation: conversation || null },
        { headers: securityHeaders(origin) }
      );
    }

    const [messages, leads] = await Promise.all([fetchAllMessages(), fetchLeads()]);
    const conversations = groupIntoConversations(messages, leads);

    return NextResponse.json(
      { conversations },
      { headers: securityHeaders(origin) }
    );
  } catch (error: unknown) {
    // NEVER expose error details to client
    console.error('[messages] Error fetching messages:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500, headers: securityHeaders(origin) }
    );
  }
}

/* =============================================================================
   POST /api/messages — send SMS (validated, rate-limited, origin-checked)
   ============================================================================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const origin = request.headers.get('origin');

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: securityHeaders(origin) }
    );
  }

  // CSRF-lite: validate origin
  if (!isValidOrigin(request)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: securityHeaders(origin) }
    );
  }

  // Credential check
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.error('[messages] Twilio credentials not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500, headers: securityHeaders(origin) }
    );
  }

  try {
    const body = (await request.json()) as { to?: unknown; body?: unknown };

    // Validate required fields exist and are strings
    if (typeof body.to !== 'string' || typeof body.body !== 'string') {
      return NextResponse.json(
        { error: 'Missing required fields: to (string), body (string)' },
        { status: 400, headers: securityHeaders(origin) }
      );
    }

    // Validate and normalize phone number
    const toPhone = normalizePhone(body.to);
    if (!isValidE164(toPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Must be E.164 format (e.g. +14165551234)' },
        { status: 400, headers: securityHeaders(origin) }
      );
    }

    // Sanitize and validate message body
    const messageBody = sanitizeText(body.body.trim(), MAX_SMS_LENGTH);
    if (messageBody.length === 0) {
      return NextResponse.json(
        { error: 'Message body cannot be empty' },
        { status: 400, headers: securityHeaders(origin) }
      );
    }

    const params = new URLSearchParams({
      To: toPhone,
      From: TWILIO_FROM_NUMBER,
      Body: messageBody,
    });

    const res = await fetch(`${TWILIO_BASE_URL}/Messages.json`, {
      method: 'POST',
      headers: twilioHeaders(),
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'no body');
      console.error(`[messages] Twilio send error: ${res.status} — ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500, headers: securityHeaders(origin) }
      );
    }

    const sentMessage = await res.json();

    return NextResponse.json(
      {
        success: true,
        message: {
          sid: sentMessage.sid,
          body: sentMessage.body,
          to: sentMessage.to,
          from: sentMessage.from,
          status: sentMessage.status,
          dateSent: sentMessage.date_created,
        },
      },
      { headers: securityHeaders(origin) }
    );
  } catch (error: unknown) {
    // NEVER expose error details to client
    console.error('[messages] Error sending message:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500, headers: securityHeaders(origin) }
    );
  }
}
