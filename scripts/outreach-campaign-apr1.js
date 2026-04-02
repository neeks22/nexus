#!/usr/bin/env node

/**
 * Outreach Campaign — April 1, 2026
 * 33 new leads → Import to Supabase → SMS via Twilio → Email via Gmail
 * Tenant: ReadyCar | From: +13433125045 | Email: nicolas@readycar.ca
 *
 * Usage:
 *   SUPABASE_SECRET_KEY=xxx GMAIL_USER=nicolas@readycar.ca GMAIL_PASS=xxx \
 *   TWILIO_ACCOUNT_SID=xxx TWILIO_AUTH_TOKEN=xxx \
 *   node scripts/outreach-campaign-apr1.js
 */

import nodemailer from 'nodemailer';

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://arnczuspgedxsxiyueup.supabase.co';
const SUPABASE_KEY = (process.env.SUPABASE_SECRET_KEY || '').trim();
const GMAIL_USER = process.env.GMAIL_USER || 'nicolas@readycar.ca';
const GMAIL_PASS = (process.env.GMAIL_PASS || '').trim();
const TWILIO_SID = (process.env.TWILIO_ACCOUNT_SID || '').trim();
const TWILIO_TOKEN = (process.env.TWILIO_AUTH_TOKEN || '').trim();
const TWILIO_FROM = '+13433125045'; // ReadyCar
const TENANT_ID = 'readycar';
const DELAY_MS = 2500; // 2.5s between sends (safe for Gmail + Twilio)

// ─── Lead Data ────────────────────────────────────────────────────────────────
const LEADS = [
  { first_name: 'Michael', last_name: 'MacDonald', phone: '15148094504', email: 'mjmamb2@gmail.com' },
  { first_name: 'Yadwinder', last_name: 'Singh', phone: '15195902304', email: 'yadchahal95@gmail.com' },
  { first_name: 'Daniel', last_name: 'Leshinsky', phone: '16475296902', email: 'muller4437@yahoo.com' },
  { first_name: 'Leo', last_name: 'MacLean', phone: '17826402782', email: 'leodakotamaclean@gmail.com' },
  { first_name: 'Nathan', last_name: 'Vallier', phone: '17057918713', email: 'officenate2.0@gmail.com' },
  { first_name: 'Oceanne', last_name: 'Thibodeau', phone: '17058498818', email: 'thibodeauoceanne5@icloud.com' },
  { first_name: 'Ty', last_name: 'Obomsawin', phone: '17052806299', email: 'azildascooters@gmail.com' },
  { first_name: 'Deepak', last_name: 'Ram', phone: '16472820766', email: 'dpkramnarine@gmail.com' },
  { first_name: 'Fonye', last_name: 'Jude', phone: '13828851897', email: 'fonyejud@gmail.com' },
  { first_name: 'Jorge', last_name: 'Jalpay Ayala', phone: '14372484252', email: 'ljorge97@outlook.com' },
  { first_name: 'Tee', last_name: 'Iyoha', phone: '16132525253', email: 'gbovo37@gmail.com' },
  { first_name: 'Faton', last_name: 'Gjoni', phone: '15196815021', email: 'fatongj0@gmail.com' },
  { first_name: 'Peter', last_name: 'Gallagher', phone: '12269734584', email: 'peterandjengallagher@gmail.com' },
  { first_name: 'Aleben', last_name: 'Trabasas', phone: '15196135821', email: 'trabasas15aleben@gmail.com' },
  { first_name: 'Onyeka', last_name: 'Onor', phone: '14373857544', email: 'yekasing@yahoo.com' },
  { first_name: 'Bryan', last_name: 'Rempel', phone: '12047975710', email: 'rempelbryan@gmail.com' },
  { first_name: 'Ashraf', last_name: 'Alhaddad', phone: '14372206866', email: 'info@yasata.ca' },
  { first_name: 'Anil', last_name: 'Gupta', phone: '12498994998', email: 'anil-gupta@hotmail.com' },
  { first_name: 'Sonya', last_name: 'Vadori', phone: '12267587914', email: 'sonyavadori0906@gmail.com' },
  { first_name: 'Don', last_name: 'Nevitt', phone: '17059432401', email: 'nevitt007@yahoo.com' },
  { first_name: 'Adam', last_name: 'Cleary', phone: '16138855558', email: 'adam_g.cleary1979@hotmail.com' },
  { first_name: 'Francis', last_name: 'Pearson', phone: '16475805798', email: 'pearsonfrancis4@gmail.com' },
  { first_name: 'Jeremy', last_name: 'Wernham', phone: '15878930585', email: 'jeremyedwardwernham@gmail.com' },
  { first_name: 'Olamiju', last_name: 'Barnabas', phone: '14379920974', email: 'barnabasolamijutolu@gmail.com' },
  { first_name: 'Duncan', last_name: 'Vanderwal', phone: '15193812407', email: 'dvanderwal1990@hotmail.com' },
  { first_name: 'Chelsea', last_name: 'Kane', phone: '16134843155', email: 'chelseacamrose598@gmail.com' },
  { first_name: 'Mahmoud', last_name: 'Kutsenko', phone: '19059617568', email: 'mahmoudkutsenko@gmail.com' },
  { first_name: 'Benjamin', last_name: 'Burke', phone: '15194660557', email: 'bennycburke@gmail.com' },
  { first_name: 'Bianca', last_name: 'Fenning', phone: '12498788799', email: 'bianca.barr@icloud.com' },
  { first_name: 'Blaine', last_name: 'Cox', phone: '17058178163', email: 'robsonlynn1009@gmail.com' },
  { first_name: 'Alexis', last_name: 'Weeks', phone: '16132971263', email: 'alexisweeks07@gmail.com' },
  { first_name: 'Melissa', last_name: 'Luck', phone: '15193127767', email: 'maybeluck420@gmail.com' },
  { first_name: 'Trent', last_name: 'Parks', phone: '15066635656', email: 'treacy1972@gmail.com' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const resp = await fetch(url, { ...options, headers });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Supabase ${options.method || 'GET'} ${path}: ${resp.status} ${text}`);
  }
  const ct = resp.headers.get('content-type') || '';
  if (ct.includes('application/json')) return resp.json();
  return null;
}

// ─── Step 1: Import Leads ─────────────────────────────────────────────────────
async function importLeads() {
  console.log('\n=== STEP 1: IMPORTING LEADS TO SUPABASE ===\n');
  const results = { created: 0, existing: 0, failed: 0 };

  for (const lead of LEADS) {
    const phone = normalizePhone(lead.phone);
    try {
      // Check if lead already exists
      const existing = await supabaseRequest(
        `v_funnel_submissions?tenant_id=eq.${TENANT_ID}&phone=eq.${encodeURIComponent(phone)}&limit=1`
      );

      if (existing && existing.length > 0) {
        console.log(`  EXISTS: ${lead.first_name} ${lead.last_name} (${phone})`);
        results.existing++;
        continue;
      }

      // Create lead
      await supabaseRequest('funnel_submissions', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          tenant_id: TENANT_ID,
          first_name: lead.first_name,
          last_name: lead.last_name,
          phone,
          email: lead.email,
          status: 'new',
          casl_consent: false,
          credit_situation: 'subprime',
        }),
      });

      console.log(`  CREATED: ${lead.first_name} ${lead.last_name} (${phone})`);
      results.created++;
    } catch (err) {
      console.error(`  FAIL: ${lead.first_name} ${lead.last_name} — ${err.message}`);
      results.failed++;
    }
  }

  console.log(`\nImport done: ${results.created} created, ${results.existing} existing, ${results.failed} failed`);
  return results;
}

// ─── Step 2: Send SMS ─────────────────────────────────────────────────────────
function buildSmsMessage(lead) {
  return `Hey ${lead.first_name}, it's Nico from ReadyCar. Quick question — are you still looking for a vehicle?\n\nWe just got access to a new lender program that's approving people that would've been turned down 6 months ago. Your job is your credit.\n\nIf you're interested, just reply YES and I'll check what you qualify for. No commitment, takes 2 mins.`;
}

async function sendSms(phone, message) {
  const params = new URLSearchParams({
    To: phone,
    From: TWILIO_FROM,
    Body: message,
  });

  const encoded = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio ${res.status}: ${text}`);
  }

  return res.json();
}

async function sendAllSms() {
  console.log('\n=== STEP 2: SENDING SMS VIA TWILIO (ReadyCar +13433125045) ===\n');
  const results = { sent: 0, failed: 0 };

  for (let i = 0; i < LEADS.length; i++) {
    const lead = LEADS[i];
    const phone = normalizePhone(lead.phone);
    const message = buildSmsMessage(lead);

    try {
      const result = await sendSms(phone, message);
      console.log(`  [${i + 1}/${LEADS.length}] SMS SENT to ${lead.first_name} ${lead.last_name} (${phone}) — SID: ${result.sid}`);

      // Log to Supabase transcript
      await supabaseRequest('lead_transcripts', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          tenant_id: TENANT_ID,
          lead_id: phone,
          entry_type: 'message',
          role: 'ai',
          content: message,
          channel: 'sms',
          touch_number: 1,
        }),
      });

      // Update status to contacted
      await supabaseRequest(
        `funnel_submissions?phone=eq.${encodeURIComponent(phone)}&tenant_id=eq.${TENANT_ID}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'contacted' }),
        }
      );

      results.sent++;
    } catch (err) {
      console.error(`  [${i + 1}/${LEADS.length}] SMS FAIL for ${lead.first_name} ${lead.last_name} (${phone}): ${err.message}`);
      results.failed++;
    }

    if (i < LEADS.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nSMS done: ${results.sent} sent, ${results.failed} failed`);
  return results;
}

// ─── Step 3: Send Email ───────────────────────────────────────────────────────
function buildEmailHtml(lead) {
  const fn = lead.first_name || 'there';

  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
<div style="padding:32px 24px;color:#333;line-height:1.7;font-size:15px;">
<p>Hi ${fn},</p>

<p>I'll cut straight to it.</p>

<p>We just got access to a new lender program that's approving people who would've been turned down 6 months ago. I'm talking about people with scores under 500. People who've been bankrupt. People who just landed in Canada last month.</p>

<p>I've seen 14 approvals come through this week alone from situations I would've called impossible last year.</p>

<p style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 16px;margin:20px 0;"><strong>Your income is your credit.</strong> Got a job? Got steady income? You're already halfway there. That's all our lenders need to see.</p>

<p>Now — I don't know your exact situation. But I think this new program might work for you.</p>

<p>Here's what I need from you:</p>

<p style="background:#f8f9fa;padding:16px;border-radius:8px;text-align:center;font-size:16px;"><strong>Reply "CHECK"</strong> and I'll run your info through the new program.<br>No commitment. No pressure.</p>

<p>If it comes back approved, I'll show you 3 vehicles that fit your payments. If it doesn't, I'll tell you straight — no games.</p>

<p>Either way, takes 2 minutes and costs you nothing.</p>

<p style="margin-top:32px;">
<strong>Nicolas Sayah</strong><br>
<span style="color:#666;">General Sales Manager</span><br>
ReadyCar | <a href="tel:6133634494" style="color:#10b981;">613-363-4494</a><br>
<a href="https://www.readycar.ca/inventory/used/" style="color:#10b981;font-weight:bold;">View Our Inventory &rarr;</a>
</p>

<p style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;color:#666;font-size:13px;"><strong>P.S.</strong> This lender program is new and I genuinely don't know how long they'll keep the approval criteria this loose. If you've been waiting for the right time — this might be it.</p>
</div>

<div style="background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#999;">
You're receiving this because you previously expressed interest in a vehicle.<br>
<a href="mailto:nicolas@readycar.ca?subject=Unsubscribe" style="color:#999;">Unsubscribe</a><br>
ReadyCar | 6231 Hazeldean Rd, Stittsville, ON | CASL Compliant
</div>
</div>`;
}

async function sendAllEmails() {
  console.log('\n=== STEP 3: SENDING EMAILS VIA GMAIL (nicolas@readycar.ca) ===\n');
  const results = { sent: 0, failed: 0, skipped: 0 };

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });

  try {
    await transporter.verify();
    console.log('Gmail connection verified.\n');
  } catch (err) {
    console.error(`Gmail connection FAILED: ${err.message}`);
    console.error('Skipping email step. SMS was still sent.');
    return results;
  }

  for (let i = 0; i < LEADS.length; i++) {
    const lead = LEADS[i];
    const phone = normalizePhone(lead.phone);

    if (!lead.email) {
      console.log(`  [${i + 1}/${LEADS.length}] SKIP — no email for ${lead.first_name}`);
      results.skipped++;
      continue;
    }

    try {
      const subject = `${lead.first_name}, quick question about your vehicle search`;
      const html = buildEmailHtml(lead);

      await transporter.sendMail({
        from: `"Nicolas Sayah | ReadyCar" <${GMAIL_USER}>`,
        to: lead.email,
        subject,
        html,
      });

      // Log to transcript
      await supabaseRequest('lead_transcripts', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          tenant_id: TENANT_ID,
          lead_id: phone,
          entry_type: 'message',
          role: 'ai',
          content: `Email sent: ${subject}`,
          channel: 'email',
          touch_number: 1,
        }),
      });

      console.log(`  [${i + 1}/${LEADS.length}] EMAIL SENT to ${lead.first_name} ${lead.last_name} (${lead.email})`);
      results.sent++;
    } catch (err) {
      console.error(`  [${i + 1}/${LEADS.length}] EMAIL FAIL for ${lead.email}: ${err.message}`);
      results.failed++;
    }

    if (i < LEADS.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nEmail done: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`);
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  READYCAR OUTREACH CAMPAIGN — April 1, 2026               ║');
  console.log('║  33 Leads | SMS + Email | Tenant: ReadyCar                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Preflight checks
  const missing = [];
  if (!SUPABASE_KEY) missing.push('SUPABASE_SECRET_KEY');
  if (!GMAIL_PASS) missing.push('GMAIL_PASS');
  if (!TWILIO_SID) missing.push('TWILIO_ACCOUNT_SID');
  if (!TWILIO_TOKEN) missing.push('TWILIO_AUTH_TOKEN');

  if (missing.length > 0) {
    console.error(`\nMISSING ENV VARS: ${missing.join(', ')}`);
    console.error('Set them and re-run.');
    process.exit(1);
  }

  const startTime = Date.now();

  // Step 1: Import leads
  const importResults = await importLeads();

  // Step 2: Send SMS
  const smsResults = await sendAllSms();

  // Step 3: Send emails
  const emailResults = await sendAllEmails();

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  CAMPAIGN COMPLETE                                         ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Leads imported: ${importResults.created} new, ${importResults.existing} existing       `);
  console.log(`║  SMS sent: ${smsResults.sent}/${LEADS.length}                                    `);
  console.log(`║  Emails sent: ${emailResults.sent}/${LEADS.length}                                 `);
  console.log(`║  Time: ${elapsed}s                                              `);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\nAll leads are now in the ReadyCar CRM dashboard.');
  console.log('AI agent will auto-reply to any responses via SMS webhook.');
  console.log('Monitor at: https://nexusagents.ca/readycar');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
