#!/usr/bin/env node
/**
 * Scan the campaign inbox for replies and bounces, then pull those people out
 * of the automated sequence.
 *
 * Why this exists: send-wave.mjs advances everyone on a timer. Without this,
 * someone who answers "no thanks" still gets touch #2 three days later. That is
 * the single fastest way to turn a warm list into spam complaints.
 *
 * Any reply pauses the sequence — classification is a bonus, not the safety net.
 * An out-of-office that pauses someone is a cheap mistake; a follow-up to
 * someone who already said no is not.
 *
 * SAFETY: writes nothing unless --confirm is passed. Default is a dry run.
 *
 * Usage:
 *   node scripts/sync-replies.mjs              # dry run — shows what it would change
 *   node scripts/sync-replies.mjs --confirm    # apply
 *   node scripts/sync-replies.mjs --days 14    # look further back (default 7)
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, GMAIL_USER, GMAIL_PASS
 */

import { ImapFlow } from 'imapflow';

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim();
const GMAIL_USER = (process.env.GMAIL_USER ?? '').trim();
const GMAIL_PASS = (process.env.GMAIL_PASS ?? '').trim();
const TENANT = 'readycar';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const daysArg = args.indexOf('--days');
const days = daysArg !== -1 ? parseInt(args[daysArg + 1] ?? '7', 10) : 7;

/** Checked at run time, not import time, so the classifiers stay unit-testable. */
function requireEnv() {
  for (const [name, val] of [
    ['SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_KEY', SUPABASE_KEY],
    ['GMAIL_USER', GMAIL_USER],
    ['GMAIL_PASS', GMAIL_PASS],
  ]) {
    if (!val) {
      console.error(`Missing ${name}.`);
      process.exit(1);
    }
  }
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

/** Bounce notifications come from the mail system, not the human. */
const BOUNCE_SENDERS = /^(mailer-daemon|postmaster|no-?reply)@/i;
/** CASL requires we honour an opt-out however it is phrased. Cast a wide net. */
const STOP_PATTERN = /\b(stop|unsubscribe|remove me|take me off|opt out|do not (contact|email)|leave me alone)\b/i;

async function loadSequenceContacts() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/email_campaign_contacts` +
      `?tenant_id=eq.${TENANT}&status=eq.in_sequence&select=id,email,first_name,sequence_step`,
    { headers }
  );
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return new Map(rows.map((r) => [r.email.toLowerCase(), r]));
}

/**
 * Pull the plaintext of a message without adding a MIME-parser dependency.
 * Best effort only — it feeds keyword classification, never the pause decision.
 *
 * Must NOT be called while a fetch() iterator is open: ImapFlow serialises
 * commands on one connection, so downloading mid-iteration deadlocks. Callers
 * collect envelopes first, then fetch bodies once the iterator has closed.
 */
async function bodyText(client, uid) {
  try {
    const part = await client.download(uid, '1', { uid: true });
    if (!part?.content) return '';
    const chunks = [];
    for await (const chunk of part.content) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8').slice(0, 2000);
  } catch {
    // A missing or oddly-structured part is not worth failing the sync over;
    // the message still pauses the contact on the strength of the envelope.
    console.warn(`  (could not read body of uid ${uid} — classifying as a plain reply)`);
    return '';
  }
}

/**
 * Markers that begin the quoted copy of our own email inside a reply.
 * Gmail's "On <date> <sender> wrote:" attribution can wrap across lines, so it
 * is matched without a line anchor.
 */
const QUOTE_MARKERS = [
  /On\s[\s\S]{0,200}?wrote:/i,
  /^\s*-{2,}\s*Original Message\s*-{2,}/im,
  /^\s*>/m,
  /^\s*_{10,}/m,
];

/**
 * Drop the quoted original from a reply before reading it for intent.
 *
 * This is load-bearing, not cosmetic: our own templates sign off with
 * "Just reply STOP", so classifying against the full body marks every
 * quoting reply — including an enthusiastic one — as an opt-out.
 */
function stripQuoted(text) {
  let cut = text.length;
  for (const marker of QUOTE_MARKERS) {
    const match = text.match(marker);
    if (match && match.index < cut) cut = match.index;
  }
  return text.slice(0, cut).trim();
}

function classify(sender, text) {
  if (BOUNCE_SENDERS.test(sender)) return 'bounced';
  // Only what the person actually typed can opt them out.
  if (STOP_PATTERN.test(stripQuoted(text))) return 'unsubscribed';
  return 'replied';
}

async function applyUpdate(contact, status, note, date) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/email_campaign_contacts?id=eq.${contact.id}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status, replied_at: date.toISOString(), notes: note }),
    }
  );
  if (!res.ok) throw new Error(`Update failed for ${contact.email}: ${res.status} ${await res.text()}`);
}

async function main() {
  requireEnv();
  const contacts = await loadSequenceContacts();
  console.log(`${contacts.size} contacts currently in sequence.`);
  if (contacts.size === 0) {
    console.log('Nothing to reconcile.');
    return;
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  const hits = [];

  try {
    // Phase 1: envelopes only. Keep this loop free of other IMAP commands.
    const candidates = [];
    for await (const msg of client.fetch({ since }, { uid: true, envelope: true })) {
      const sender = msg.envelope?.from?.[0]?.address?.toLowerCase();
      if (!sender) continue;
      const isBounce = BOUNCE_SENDERS.test(sender);
      if (!isBounce && !contacts.has(sender)) continue;
      candidates.push({ uid: msg.uid, sender, isBounce, date: msg.envelope.date ?? new Date() });
    }
    console.log(`Scanned inbox since ${since.toISOString().slice(0, 10)} — ${candidates.length} message(s) to inspect.`);

    // Phase 2: the iterator is closed, so bodies are safe to download now.
    for (const c of candidates) {
      const text = await bodyText(client, c.uid);

      // A bounce names the failed recipient in its body, not the From header,
      // so match bounces by scanning their text against the roster instead.
      if (c.isBounce) {
        for (const [email, contact] of contacts) {
          if (text.toLowerCase().includes(email)) {
            hits.push({ contact, status: 'bounced', sender: c.sender, date: c.date, text: '' });
          }
        }
        continue;
      }

      const contact = contacts.get(c.sender);
      hits.push({ contact, status: classify(c.sender, text), sender: c.sender, date: c.date, text });
    }
  } finally {
    lock.release();
    await client.logout();
  }

  // One person can send several messages; the strongest signal wins.
  const rank = { replied: 1, bounced: 2, unsubscribed: 3 };
  const final = new Map();
  for (const hit of hits) {
    const prev = final.get(hit.contact.email);
    if (!prev || rank[hit.status] > rank[prev.status]) final.set(hit.contact.email, hit);
  }

  if (final.size === 0) {
    console.log(`No replies or bounces found in the last ${days} days.`);
    return;
  }

  console.log(`\n${final.size} contact(s) to pull out of the sequence:\n`);
  for (const hit of final.values()) {
    const preview = stripQuoted(hit.text).replace(/\s+/g, ' ').trim().slice(0, 80);
    console.log(`  ${hit.contact.first_name} <${hit.contact.email}>`);
    console.log(`    step ${hit.contact.sequence_step} -> ${hit.status.toUpperCase()}`);
    if (preview) console.log(`    "${preview}"`);
  }

  if (!confirm) {
    console.log('\nDry run. Re-run with --confirm to apply.');
    return;
  }

  for (const hit of final.values()) {
    const note = `Auto-synced ${hit.date.toISOString().slice(0, 10)}: ${hit.status} via inbox scan.`;
    await applyUpdate(hit.contact, hit.status, note, hit.date);
    console.log(`  updated ${hit.contact.email} -> ${hit.status}`);
  }
  console.log(`\nDone. ${final.size} contact(s) removed from the send queue.`);
}

// Exported so the classification rules can be tested without a live mailbox.
export { stripQuoted, classify };

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
