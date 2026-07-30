#!/usr/bin/env node
/**
 * Render the next N due campaign emails into a clickable HTML sheet.
 *
 * Each row opens a prefilled Gmail compose window, so a wave can be sent
 * without the CRM running. Contact ids are printed at the end so the sends
 * can be logged with mark-wave-sent.mjs afterwards.
 *
 * Usage:
 *   npx esbuild apps/website/src/lib/campaign-templates.ts --format=esm --outfile=/tmp/ct.mjs
 *   node scripts/render-wave.mjs [limit] [--all-consent]
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from the environment.
 */

import { writeFileSync } from 'node:fs';
import { templateForStep, renderTemplate, SENDER_EMAIL } from '/tmp/ct.mjs';

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim();
const OUT = '/tmp/wave.html';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

const args = process.argv.slice(2);
const limit = parseInt(args.find((a) => /^\d+$/.test(a)) ?? '10', 10);
const allConsent = args.includes('--all-consent');
const tenant = 'readycar';

const consentFilter = allConsent ? '' : '&consent_basis=eq.implied_active';
const url =
  `${SUPABASE_URL}/rest/v1/email_campaign_contacts?tenant_id=eq.${tenant}` +
  `&status=eq.pending&sequence_step=eq.0${consentFilter}` +
  `&select=id,email,first_name,last_name,lead_created_at,consent_basis,sequence_step` +
  `&order=lead_created_at.desc&limit=${limit}`;

const res = await fetch(url, {
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
});
if (!res.ok) {
  console.error(`Supabase query failed (${res.status}):`, (await res.text()).slice(0, 300));
  process.exit(1);
}

const contacts = await res.json();
if (contacts.length === 0) {
  console.log('No contacts due.');
  process.exit(0);
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const gmailUrl = (to, su, body) =>
  `https://mail.google.com/mail/?${new URLSearchParams({ view: 'cm', fs: '1', to, su, body })}`;

const rows = contacts.map((c, i) => {
  const template = templateForStep(c.sequence_step);
  const { subject, body } = renderTemplate(template, c);
  return { i: i + 1, c, template, subject, body, href: gmailUrl(c.email, subject, body) };
});

const html = `<meta charset="utf-8"><title>Wave 1 — ${rows.length} emails</title>
<style>
 body{font:15px/1.6 -apple-system,system-ui,sans-serif;background:#0d0d14;color:#f0f0f5;margin:0;padding:32px;max-width:900px}
 h1{font-size:20px;margin:0 0 4px} .sub{color:#8888a0;font-size:13px;margin-bottom:24px}
 .row{background:#15151f;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px;margin-bottom:12px}
 .top{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
 .n{background:#DC2626;color:#fff;width:26px;height:26px;border-radius:6px;display:grid;place-items:center;font-weight:700;font-size:13px;flex:none}
 .who{font-weight:600} .em{color:#8888a0;font-size:13px}
 a.btn{margin-left:auto;background:#DC2626;color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px;font-weight:600;font-size:13px}
 a.btn:visited{background:#3a3a4a}
 .subj{color:#c8c8d8;font-size:13px;margin:10px 0 0}
 details{margin-top:8px} summary{cursor:pointer;color:#8888a0;font-size:12px}
 pre{white-space:pre-wrap;background:#0a0a0f;padding:12px;border-radius:8px;color:#b8b8c8;font:13px/1.6 inherit;margin:8px 0 0}
 .ids{margin-top:28px;color:#8888a0;font-size:12px;word-break:break-all}
</style>
<h1>Wave 1 — ${rows.length} emails</h1>
<div class="sub">From ${esc(SENDER_EMAIL)}. Click a button, Gmail opens prefilled, press Cmd+Enter to send. Buttons turn grey once clicked.</div>
${rows
  .map(
    (r) => `<div class="row">
  <div class="top">
    <div class="n">${r.i}</div>
    <div><div class="who">${esc([r.c.first_name, r.c.last_name].filter(Boolean).join(' ') || r.c.email)}</div>
    <div class="em">${esc(r.c.email)}</div></div>
    <a class="btn" href="${esc(r.href)}" target="_blank" rel="noopener">Send in Gmail →</a>
  </div>
  <div class="subj"><b>Subject:</b> ${esc(r.subject)}</div>
  <details><summary>preview body</summary><pre>${esc(r.body)}</pre></details>
</div>`
  )
  .join('\n')}
<div class="ids">contact ids: ${rows.map((r) => r.c.id).join(',')}</div>`;

writeFileSync(OUT, html);

console.log(`Rendered ${rows.length} emails using template ${rows[0].template.id} (${rows[0].template.name})`);
for (const r of rows) console.log(`  ${String(r.i).padStart(2)}. ${r.c.first_name} <${r.c.email}>`);
console.log(`\nOpen: ${OUT}`);
console.log(`\nAfter sending, log them with:\n  node scripts/mark-wave-sent.mjs ${rows.map((r) => r.c.id).join(',')}`);
