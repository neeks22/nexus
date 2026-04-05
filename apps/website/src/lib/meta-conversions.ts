import { createHash } from 'crypto';

const PIXEL_ID = process.env.META_PIXEL_ID;
const API_TOKEN = process.env.META_CONVERSIONS_API_TOKEN;
const API_VERSION = 'v21.0';

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

interface LeadEventParams {
  email: string;
  phone: string;
  vehicleType: string;
  creditSituation: string;
  ip: string;
  userAgent: string;
  sourceUrl?: string;
}

export async function sendLeadEvent(params: LeadEventParams): Promise<void> {
  if (!PIXEL_ID || !API_TOKEN) return;

  const eventData = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: params.sourceUrl || 'https://nexusagents.ca/apply/dealerships',
        user_data: {
          em: [sha256(params.email)],
          ph: [sha256(params.phone.replace(/\D/g, ''))],
          client_ip_address: params.ip,
          client_user_agent: params.userAgent,
        },
        custom_data: {
          vehicle_type: params.vehicleType,
          credit_situation: params.creditSituation,
        },
      },
    ],
  };

  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${API_TOKEN}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => 'unknown');
    throw new Error(`Meta CAPI responded ${res.status}: ${body}`);
  }
}
