import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { callClaude, rateLimit, getClientIp } from '@/lib/security';
import { z } from 'zod';

const RequestSchema = z.object({
  text: z.string().min(10).max(50000),
});

const ContactSchema = z.array(z.object({
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
}));

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (await rateLimit(ip, 5, 60000)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  let body;
  try {
    body = RequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const system = `You are a data extraction assistant. Extract all person contacts from the following text. Return a JSON array of objects with fields: firstName, lastName, phone. Only include entries where you can identify both a name and a phone number. If a name appears to be a full name, split it into firstName and lastName. Return ONLY the JSON array, no other text.`;

    const result = await callClaude(system, body.text, 2000);

    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ contacts: [], message: 'No contacts found in text' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const contacts = ContactSchema.parse(parsed);

    return NextResponse.json({ contacts });
  } catch (err) {
    console.error('[parse-pdf-contacts] Error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Failed to parse contacts' }, { status: 500 });
  }
}
