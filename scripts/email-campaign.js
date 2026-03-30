#!/usr/bin/env node

/**
 * ReadyCar Email Campaign Script
 *
 * Sends up to 200 emails per run with 2-second delays to stay within Gmail limits.
 * Reads leads from Supabase v_funnel_submissions (decrypted view).
 * Logs each send to lead_transcripts and updates lead status to 'contacted'.
 *
 * Usage: node scripts/email-campaign.js
 * Schedule daily via cron: 0 9 * * * cd /Users/sayah/nexus && node scripts/email-campaign.js
 */

import nodemailer from 'nodemailer';

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://arnczuspgedxsxiyueup.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || 'SET_IN_ENV';
const GMAIL_USER = process.env.GMAIL_USER || 'nicolas@readycar.ca';
const GMAIL_PASS = process.env.GMAIL_PASS || 'SET_IN_ENV';
const TENANT_ID = 'readycar';
const MAX_EMAILS_PER_RUN = 20;
const DELAY_MS = 2000; // 2 seconds between sends

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    throw new Error(`Supabase ${options.method || 'GET'} ${path} failed: ${resp.status} ${text}`);
  }
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return resp.json();
  }
  return null;
}

async function fetchNewLeads() {
  // Query decrypted view for new leads belonging to readycar tenant
  const leads = await supabaseRequest(
    `v_funnel_submissions?status=eq.new&tenant_id=eq.${TENANT_ID}&select=*&limit=${MAX_EMAILS_PER_RUN}&order=created_at.asc`
  );
  return leads || [];
}

async function logTranscript(leadId, content, role = 'ai') {
  await supabaseRequest('lead_transcripts', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      tenant_id: TENANT_ID,
      lead_id: leadId,
      entry_type: 'message',
      role,
      content,
      channel: 'email',
    }),
  });
}

async function updateLeadStatus(phone, status) {
  await supabaseRequest(`funnel_submissions?phone=eq.${encodeURIComponent(phone)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status }),
  });
}

function buildEmailHtml(lead) {
  const firstName = lead.first_name || '';
  const fn = firstName || 'there';

  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
<div style="padding:32px 24px;color:#333;line-height:1.7;font-size:15px;">
<p>Hi ${fn},</p>

<p>I'll cut straight to it.</p>

<p>Since you last reached out to us, something changed.</p>

<p>We just got access to a new lender program that's approving people who would've been turned down 6 months ago. I'm talking about people with scores under 500. People who've been bankrupt. People who just landed in Canada last month.</p>

<p>I've seen 14 approvals come through this week alone from situations I would've called impossible last year.</p>

<p style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 16px;margin:20px 0;"><strong>Your income is your credit.</strong> Got a job? Got steady income? You're already halfway there. That's all our lenders need to see.</p>

<p>Now — I don't know your exact situation. But I kept your file. And I think this new program might work for you.</p>

<p>Here's what I need from you:</p>

<p style="background:#f8f9fa;padding:16px;border-radius:8px;text-align:center;font-size:16px;"><strong>Reply "CHECK"</strong> and I'll run your info through the new program.<br>No commitment. No pressure.</p>

<p>If it comes back approved, I'll show you 3 vehicles that fit your payments. If it doesn't, I'll tell you straight — no games.</p>

<p>Either way, takes 2 minutes and costs you nothing.</p>

<p style="margin-top:32px;">
<strong>Nicolas</strong><br>
<span style="color:#666;">General Sales Manager</span><br>
ReadyCar | <a href="tel:6133634494" style="color:#10b981;">613-363-4494</a><br>
<a href="https://www.readycar.ca/inventory/used/" style="color:#10b981;font-weight:bold;">View Our Inventory →</a>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[${new Date().toISOString()}] ReadyCar Email Campaign starting...`);

  // Fetch leads
  const leads = await fetchNewLeads();
  console.log(`Found ${leads.length} new leads to email (max ${MAX_EMAILS_PER_RUN})`);

  if (leads.length === 0) {
    console.log('No new leads. Exiting.');
    return;
  }

  // Set up Gmail transport
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });

  // Verify connection
  try {
    await transporter.verify();
    console.log('Gmail connection verified.');
  } catch (err) {
    console.error('Gmail connection failed:', err.message);
    process.exit(1);
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const email = lead.email;
    const phone = lead.phone;
    const firstName = lead.first_name || 'there';

    if (!email) {
      console.log(`  [${i + 1}/${leads.length}] SKIP — no email for lead ${phone || lead.id}`);
      failed++;
      continue;
    }

    try {
      const htmlBody = buildEmailHtml(lead);
      const subject = firstName && firstName !== 'there' ? `${firstName}, something changed since we last talked` : 'Something changed since we last talked';

      await transporter.sendMail({
        from: `"Nicolas Sayah | ReadyCar" <${GMAIL_USER}>`,
        to: email,
        subject,
        html: htmlBody,
      });

      // Log to Supabase transcript
      const leadId = phone || email;
      await logTranscript(leadId, `Email sent: ${subject}`);

      // Update status to contacted
      if (phone) {
        await updateLeadStatus(phone, 'contacted');
      }

      sent++;
      console.log(`  [${i + 1}/${leads.length}] SENT to ${email} (${firstName})`);
    } catch (err) {
      failed++;
      console.error(`  [${i + 1}/${leads.length}] FAIL for ${email}: ${err.message}`);
    }

    // Throttle: 2 second delay between sends
    if (i < leads.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n[${new Date().toISOString()}] Campaign complete: ${sent} sent, ${failed} failed out of ${leads.length} leads.`);
}

main().catch((err) => {
  console.error('Campaign fatal error:', err);
  process.exit(1);
});
