#!/usr/bin/env node
/**
 * Import cleaned campaign contacts into email_campaign_contacts.
 *
 * Usage:
 *   node scripts/import-campaign-contacts.mjs <csv> [tenant] [--dry-run]
 *
 * --dry-run parses and reports without writing anything.
 * Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from the environment.
 * Upserts on (tenant_id, email), so re-running is safe and idempotent.
 *
 * Expected CSV columns: email, first, last, phone, zip, status, created, source
 */

import { readFileSync } from 'node:fs';

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim();
const BATCH_SIZE = 500;
/** CASL: implied consent from an inquiry lapses 6 months after the inquiry. */
const CONSENT_WINDOW_DAYS = 183;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const positional = args.filter((a) => !a.startsWith('--'));
const [csvPath, tenantArg] = positional;
const tenant = tenantArg || 'readycar';

if (!csvPath) {
  console.error('Usage: node scripts/import-campaign-contacts.mjs <csv-path> [tenant] [--dry-run]');
  process.exit(1);
}
if (!dryRun && (!SUPABASE_URL || !SUPABASE_KEY)) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment.');
  process.exit(1);
}

/** Minimal RFC-4180 parser — the export contains quoted fields with commas. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** "May-28-2026 | 10:26 AM" → ISO string, or null when unparseable. */
function parseLeadDate(value) {
  if (!value) return null;
  const datePart = value.split('|')[0].trim();
  const parsed = new Date(datePart.replace(/-/g, ' '));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function consentBasis(isoDate) {
  if (!isoDate) return 'implied_expired';
  const ageDays = (Date.now() - new Date(isoDate).getTime()) / 86_400_000;
  return ageDays <= CONSENT_WINDOW_DAYS ? 'implied_active' : 'implied_expired';
}

const rows = parseCsv(readFileSync(csvPath, 'utf8'));
const header = rows[0].map((h) => h.trim().toLowerCase());
const idx = (name) => header.indexOf(name);

const contacts = rows.slice(1).map((r) => {
  const leadCreated = parseLeadDate(r[idx('created')]);
  return {
    tenant_id: tenant,
    email: (r[idx('email')] ?? '').trim().toLowerCase(),
    first_name: (r[idx('first')] ?? '').trim() || null,
    last_name: (r[idx('last')] ?? '').trim() || null,
    phone: (r[idx('phone')] ?? '').trim() || null,
    zip: (r[idx('zip')] ?? '').trim() || null,
    lead_source: (r[idx('source')] ?? '').trim() || null,
    lead_created_at: leadCreated,
    consent_basis: consentBasis(leadCreated),
  };
}).filter((c) => c.email.includes('@'));

const active = contacts.filter((c) => c.consent_basis === 'implied_active').length;
console.log(`Parsed ${contacts.length} contacts for tenant "${tenant}"`);
console.log(`  CASL implied-consent active: ${active}`);
console.log(`  CASL implied-consent lapsed: ${contacts.length - active}`);

if (dryRun) {
  console.log('\n--dry-run: nothing written. Sample of first 3 rows:');
  for (const c of contacts.slice(0, 3)) console.log(' ', JSON.stringify(c));
  const missingName = contacts.filter((c) => !c.first_name).length;
  const missingDate = contacts.filter((c) => !c.lead_created_at).length;
  console.log(`\n  rows without a first name: ${missingName} (these render as "there")`);
  console.log(`  rows without a parseable date: ${missingDate} (treated as consent lapsed)`);
  process.exit(0);
}

let imported = 0;
for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
  const batch = contacts.slice(i, i + BATCH_SIZE);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/email_campaign_contacts?on_conflict=tenant_id,email`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  });

  if (!res.ok) {
    console.error(`Batch ${i / BATCH_SIZE + 1} failed (${res.status}):`, (await res.text()).slice(0, 400));
    process.exit(1);
  }
  imported += batch.length;
  console.log(`  imported ${imported}/${contacts.length}`);
}

console.log(`\nDone. ${imported} contacts in email_campaign_contacts for "${tenant}".`);
