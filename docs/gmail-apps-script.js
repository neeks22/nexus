/**
 * Gmail Apps Script — Auto-forward email replies to Nexus webhook
 *
 * SETUP:
 * 1. Go to https://script.google.com
 * 2. Sign in with nicolas@readycar.ca
 * 3. Create new project → paste this entire script
 * 4. Click Run → authorize permissions
 * 5. Click Triggers (clock icon) → Add Trigger:
 *    - Function: checkForReplies
 *    - Event source: Time-driven
 *    - Type: Minutes timer
 *    - Interval: Every 2 minutes
 * 6. Save. Done. Emails are now auto-forwarded to the AI agent.
 */

const WEBHOOK_URL = 'https://nexusagents.ca/api/webhook/email';
const LABEL_PROCESSED = 'nexus-processed';

function checkForReplies() {
  // Search for unread replies to our campaign emails
  const threads = GmailApp.search('is:unread subject:re: -from:readycar.ca -from:readyride.ca -from:nexus', 0, 10);

  if (threads.length === 0) return;

  // Create label if it doesn't exist
  let label = GmailApp.getUserLabelByName(LABEL_PROCESSED);
  if (!label) {
    label = GmailApp.createLabel(LABEL_PROCESSED);
  }

  for (const thread of threads) {
    const messages = thread.getMessages();
    const lastMsg = messages[messages.length - 1];

    // Skip if already processed
    if (thread.getLabels().some(l => l.getName() === LABEL_PROCESSED)) continue;

    const from = lastMsg.getFrom();
    const subject = lastMsg.getSubject();
    const body = lastMsg.getPlainBody() || lastMsg.getBody().replace(/<[^>]*>/g, ' ');

    // Skip automated senders
    if (/noreply|no-reply|mailer-daemon|postmaster|newsletter/i.test(from)) {
      lastMsg.markRead();
      continue;
    }

    // Extract email address from "Name <email>" format
    const emailMatch = from.match(/<([^>]+)>/);
    const fromEmail = emailMatch ? emailMatch[1] : from;
    const fromName = from.replace(/<[^>]+>/, '').trim();

    // POST to webhook
    try {
      const response = UrlFetchApp.fetch(WEBHOOK_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          from: from,
          fromEmail: fromEmail,
          fromName: fromName,
          subject: subject,
          textBody: body.substring(0, 2000),
          tenant: 'readycar',
        }),
        muteHttpExceptions: true,
      });

      const result = JSON.parse(response.getContentText());

      if (result.action === 'sent' || result.skipped) {
        // Mark as read and label as processed
        lastMsg.markRead();
        thread.addLabel(label);
        Logger.log('Processed: ' + fromEmail + ' → ' + (result.action || 'skipped'));
      }
    } catch (err) {
      Logger.log('Error processing ' + fromEmail + ': ' + err);
    }
  }
}
