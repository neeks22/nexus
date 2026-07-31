#!/usr/bin/env node
/**
 * Send the next N due campaign emails directly via Gmail SMTP, then log
 * each send and advance the contact's sequence step.
 *
 * SAFETY: sends nothing unless --confirm is passed. Default is a dry run.
 *
 * Usage:
 *   npx esbuild apps/website/src/lib/campaign-templates.ts --format=esm --outfile=/tmp/ct.mjs
 *   node scripts/send-wave.mjs 10              # dry run — shows exactly what would send
 *   node scripts/send-wave.mjs 10 --confirm    # actually sends
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, GMAIL_USER, GMAIL_PASS
 * GMAIL_PASS must be a Google App Password, not the account password.
 */

import nodemailer from 'nodemailer';
import { templateForStep, renderTemplate, DAILY_SEND_CAP } from '/tmp/ct.mjs';

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim();
const GMAIL_USER = (process.env.GMAIL_USER ?? '').trim();
const GMAIL_PASS = (process.env.GMAIL_PASS ?? '').trim();
const TENANT = 'readycar';
const FROM_NAME = 'Nicolas Sayah';

/** Gap between sends. Bursting 200 identical-shaped emails is what trips spam heuristics. */
const MIN_GAP_MS = 4000;
const MAX_GAP_MS = 11000;

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const allConsent = args.includes('--all-consent');
/**
 * DAILY_SEND_CAP is our own conservative ceiling, not Google's (which is
 * 2,000/day). `--cap=N` raises it for a deliberate push. ABSOLUTE_MAX exists so
 * a fat-fingered `--cap=4000` cannot take out nicolas@readycar.ca, which is the
 * mailbox the dealership actually runs on.
 */
const ABSOLUTE_MAX = 1000;
const capArg = args.find((a) => a.startsWith('--cap='));
const dailyCeiling = Math.min(capArg ? parseInt(capArg.slice(6), 10) || DAILY_SEND_CAP : DAILY_SEND_CAP, ABSOLUTE_MAX);
if (dailyCeiling > DAILY_SEND_CAP) {
  console.log(`⚠ Daily ceiling raised to ${dailyCeiling} (default ${DAILY_SEND_CAP}).`);
}

/**
 * Gmail signals throttling by rejecting sends, not by slowing down. Without a
 * breaker the loop would keep hammering a mailbox that is already being limited,
 * which is what turns a temporary block into a lasting reputation problem.
 */
const MAX_CONSECUTIVE_FAILURES = 5;

const limit = Math.min(parseInt(args.find((a) => /^\d+$/.test(a)) ?? '10', 10), dailyCeiling);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY.');
  process.exit(1);
}
if (confirm && (!GMAIL_USER || !GMAIL_PASS)) {
  console.error('Missing GMAIL_USER or GMAIL_PASS. Generate an App Password at');
  console.error('https://myaccount.google.com/apppasswords and add both to apps/website/.env.local');
  process.exit(1);
}

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Refuse to blow through the daily cap even if a larger limit is passed. */
async function sentToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/email_campaign_sends?tenant_id=eq.${TENANT}&sent_at=gte.${start.toISOString()}&select=id`,
    { headers: { ...headers, Prefer: 'count=exact' } }
  );
  const range = res.headers.get('content-range');
  return range ? parseInt(range.split('/')[1] ?? '0', 10) || 0 : 0;
}

const already = await sentToday();
const room = dailyCeiling - already;
if (room <= 0) {
  console.error(`Daily cap reached (${already}/${dailyCeiling}). Stop for today.`);
  console.error('Raise it deliberately with --cap=N if that is really what you want.');
  process.exit(1);
}
const take = Math.min(limit, room);
if (take < limit) console.log(`Trimming to ${take} — only ${room} left under today's cap.`);

const consentFilter = allConsent ? '' : '&consent_basis=eq.implied_active';
const listRes = await fetch(
  `${SUPABASE_URL}/rest/v1/email_campaign_contacts?tenant_id=eq.${TENANT}` +
    `&status=eq.pending&sequence_step=eq.0${consentFilter}` +
    `&select=id,email,first_name,last_name,lead_created_at,sequence_step` +
    `&order=lead_created_at.desc&limit=${take}`,
  { headers }
);
if (!listRes.ok) {
  console.error(`Query failed (${listRes.status}):`, (await listRes.text()).slice(0, 300));
  process.exit(1);
}
const contacts = await listRes.json();
if (contacts.length === 0) {
  console.log('Nobody due.');
  process.exit(0);
}

console.log(`${contacts.length} recipients${confirm ? '' : '  (DRY RUN — nothing will send)'}\n`);
for (const c of contacts) {
  const t = templateForStep(c.sequence_step);
  const { subject } = renderTemplate(t, c);
  console.log(`  ${c.first_name ?? '(no name)'} <${c.email}>  ·  "${subject}"`);
}

if (!confirm) {
  const t = templateForStep(contacts[0].sequence_step);
  console.log(`\n--- body that would send to ${contacts[0].first_name} ---`);
  console.log(renderTemplate(t, contacts[0]).body);
  console.log('\nRe-run with --confirm to send for real.');
  process.exit(0);
}

const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_PASS },
});

try {
  await transport.verify();
  console.log(`\nSMTP connection to ${GMAIL_USER} verified.\n`);
} catch (err) {
  console.error('SMTP verify failed:', err.message);
  console.error('If this says "Username and Password not accepted", GMAIL_PASS must be an App Password.');
  process.exit(1);
}

let sent = 0;
let consecutiveFailures = 0;
const failures = [];

for (const [i, c] of contacts.entries()) {
  const template = templateForStep(c.sequence_step);
  if (!template) continue;
  const { subject, body } = renderTemplate(template, c);

  try {
    await transport.sendMail({
      from: `"${FROM_NAME}" <${GMAIL_USER}>`,
      to: c.email,
      subject,
      text: body,
    });
  } catch (err) {
    console.error(`  ✗ ${c.email} — ${err.message}`);
    failures.push({ email: c.email, error: err.message });
    consecutiveFailures++;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(`\n⛔ ABORTED — ${consecutiveFailures} sends failed in a row.`);
      console.error('That pattern means Gmail is refusing mail, not that these addresses are bad.');
      console.error(`Stopped at ${sent} sent so the rest of the queue is untouched.`);
      break;
    }
    continue;
  }
  consecutiveFailures = 0;

  const sentAt = new Date().toISOString();
  // Log first, then advance — a crash between the two leaves an un-advanced
  // contact (they get a duplicate) rather than a silent un-logged send.
  const logRes = await fetch(`${SUPABASE_URL}/rest/v1/email_campaign_sends`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ tenant_id: TENANT, contact_id: c.id, template: template.id, subject, sent_at: sentAt }),
  });
  if (!logRes.ok) console.error(`  ! sent to ${c.email} but failed to log (${logRes.status})`);

  const nextStep = c.sequence_step + 1;
  await fetch(`${SUPABASE_URL}/rest/v1/email_campaign_contacts?tenant_id=eq.${TENANT}&id=eq.${c.id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      status: nextStep >= 5 ? 'closed' : 'in_sequence',
      sequence_step: nextStep,
      last_template: template.id,
      last_sent_at: sentAt,
    }),
  });

  sent++;
  console.log(`  ✓ ${sent}/${contacts.length}  ${c.email}`);

  if (i < contacts.length - 1) {
    await sleep(MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS)));
  }
}

console.log(`\nSent ${sent}. Failed ${failures.length}. Today's total: ${already + sent}/${dailyCeiling}.`);
if (failures.length) {
  console.log('Failures:');
  for (const f of failures) console.log(`  ${f.email} — ${f.error}`);
}
