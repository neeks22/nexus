#!/usr/bin/env node
/**
 * Log a sent wave: writes one row per contact into email_campaign_sends and
 * advances each contact to the next step in the sequence.
 *
 * Only run this for emails that were actually sent — it is the record the
 * daily cap, reply rate and next-wave timing are all computed from.
 *
 * Usage:
 *   node scripts/mark-wave-sent.mjs <comma-separated-contact-ids>
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from the environment.
 */

import { templateForStep, renderTemplate } from '/tmp/ct.mjs';

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim();
const tenant = 'readycar';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

const ids = (process.argv[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
if (ids.length === 0) {
  console.error('Usage: node scripts/mark-wave-sent.mjs <id1,id2,...>');
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const listUrl =
  `${SUPABASE_URL}/rest/v1/email_campaign_contacts?tenant_id=eq.${tenant}` +
  `&id=in.(${ids.join(',')})&select=id,email,first_name,sequence_step,lead_created_at`;

const res = await fetch(listUrl, { headers });
if (!res.ok) {
  console.error(`Lookup failed (${res.status}):`, (await res.text()).slice(0, 300));
  process.exit(1);
}
const contacts = await res.json();
if (contacts.length !== ids.length) {
  console.warn(`Warning: asked for ${ids.length} contacts, found ${contacts.length}.`);
}

const sentAt = new Date().toISOString();
const sendRows = [];
for (const c of contacts) {
  const template = templateForStep(c.sequence_step);
  if (!template) {
    console.warn(`  skip ${c.email} — sequence already complete`);
    continue;
  }
  const { subject } = renderTemplate(template, c);
  sendRows.push({ tenant_id: tenant, contact_id: c.id, template: template.id, subject, sent_at: sentAt });
}

if (sendRows.length === 0) {
  console.log('Nothing to log.');
  process.exit(0);
}

const logRes = await fetch(`${SUPABASE_URL}/rest/v1/email_campaign_sends`, {
  method: 'POST',
  headers: { ...headers, Prefer: 'return=minimal' },
  body: JSON.stringify(sendRows),
});
if (!logRes.ok) {
  console.error(`Send log failed (${logRes.status}):`, (await logRes.text()).slice(0, 300));
  process.exit(1);
}

// Advance each contact individually — sequence_step differs per contact
let advanced = 0;
for (const c of contacts) {
  const template = templateForStep(c.sequence_step);
  if (!template) continue;
  const nextStep = c.sequence_step + 1;
  const patch = await fetch(
    `${SUPABASE_URL}/rest/v1/email_campaign_contacts?tenant_id=eq.${tenant}&id=eq.${c.id}`,
    {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({
        status: nextStep >= 5 ? 'closed' : 'in_sequence',
        sequence_step: nextStep,
        last_template: template.id,
        last_sent_at: sentAt,
      }),
    }
  );
  if (patch.ok) advanced++;
  else console.error(`  failed to advance ${c.email} (${patch.status})`);
}

console.log(`Logged ${sendRows.length} sends, advanced ${advanced} contacts.`);
