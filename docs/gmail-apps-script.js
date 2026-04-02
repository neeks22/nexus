/**
 * Gmail Apps Script — Auto-forward VEHICLE LEAD replies to Nexus AI webhook
 *
 * ONLY replies to emails about vehicle inquiries get forwarded.
 * Random "Re:" emails (receipts, newsletters, personal) are ignored.
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
 * 6. Save. Done.
 */

var WEBHOOK_URL = 'https://nexusagents.ca/api/webhook/email';
var LABEL_PROCESSED = 'nexus-processed';

// Keywords that indicate this is a vehicle/lead inquiry reply
var VEHICLE_KEYWORDS = [
  'vehicle', 'car', 'truck', 'suv', 'sedan', 'van', 'auto',
  'credit', 'approval', 'approved', 'finance', 'payment', 'income',
  'trade', 'trade-in', 'tradein', 'down payment',
  'inventory', 'stock', 'available', 'looking for',
  'interested', 'check', 'yes', 'yeah',
  'readycar', 'ready car', 'lender', 'pre-approval', 'pre-approved',
  'test drive', 'come in', 'visit', 'appointment',
  'véhicule', 'voiture', 'camion', 'crédit', 'paiement',
  'budget', 'mileage', 'km', 'prix', 'price', 'cost',
  'job', 'employed', 'work', 'salary', 'biweekly',
  'driver', 'license', 'permis',
  'option', 'deal', 'offer', 'program', 'lender program',
  'score', 'beacon', 'fico', 'equifax', 'transunion'
];

// Keywords that indicate this is NOT a lead (skip these)
var SKIP_KEYWORDS = [
  'invoice', 'receipt', 'order confirmation', 'shipping',
  'password reset', 'verify your email', 'confirm your account',
  'unsubscribe successful', 'subscription',
  'meeting invite', 'calendar event',
  'out of office', 'auto-reply', 'automatic reply'
];

function isVehicleLeadReply(subject, body) {
  var text = (subject + ' ' + body).toLowerCase();

  // Check if it matches any skip keywords first
  for (var i = 0; i < SKIP_KEYWORDS.length; i++) {
    if (text.indexOf(SKIP_KEYWORDS[i]) !== -1) return false;
  }

  // Check if the original subject was from our campaign
  if (text.indexOf('pre-approval') !== -1 ||
      text.indexOf('something changed') !== -1 ||
      text.indexOf('readycar') !== -1 ||
      text.indexOf('lender program') !== -1 ||
      text.indexOf('your income is your credit') !== -1) {
    return true;
  }

  // Check if the reply body contains vehicle/lead keywords
  var matchCount = 0;
  for (var j = 0; j < VEHICLE_KEYWORDS.length; j++) {
    if (text.indexOf(VEHICLE_KEYWORDS[j]) !== -1) {
      matchCount++;
      if (matchCount >= 1) return true; // At least 1 keyword match
    }
  }

  return false;
}

function checkForReplies() {
  // Search for unread replies — exclude internal and automated
  var threads = GmailApp.search('is:unread subject:re: -from:readycar.ca -from:readyride.ca -from:nexus -from:noreply -from:no-reply -from:mailer-daemon -from:postmaster -from:google.com -from:facebook.com -from:facebookmail.com -from:meta.com', 0, 10);

  if (threads.length === 0) return;

  // Create label if it doesn't exist
  var label = GmailApp.getUserLabelByName(LABEL_PROCESSED);
  if (!label) {
    label = GmailApp.createLabel(LABEL_PROCESSED);
  }

  for (var t = 0; t < threads.length; t++) {
    var thread = threads[t];
    var messages = thread.getMessages();
    var lastMsg = messages[messages.length - 1];

    // Skip if already processed
    var labels = thread.getLabels();
    var alreadyProcessed = false;
    for (var l = 0; l < labels.length; l++) {
      if (labels[l].getName() === LABEL_PROCESSED) { alreadyProcessed = true; break; }
    }
    if (alreadyProcessed) continue;

    var from = lastMsg.getFrom();
    var subject = lastMsg.getSubject();
    var body = lastMsg.getPlainBody() || lastMsg.getBody().replace(/<[^>]*>/g, ' ');

    // Check if this is actually a vehicle lead reply
    if (!isVehicleLeadReply(subject, body)) {
      Logger.log('Skipped (not vehicle lead): ' + from + ' | ' + subject);
      // Don't mark as read — let Nico handle it manually
      continue;
    }

    // Extract email address
    var emailMatch = from.match(/<([^>]+)>/);
    var fromEmail = emailMatch ? emailMatch[1] : from;
    var fromName = from.replace(/<[^>]+>/, '').trim();

    // POST to Nexus webhook
    try {
      var response = UrlFetchApp.fetch(WEBHOOK_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          from: from,
          fromEmail: fromEmail,
          fromName: fromName,
          subject: subject,
          textBody: body.substring(0, 2000),
          tenant: 'readycar'
        }),
        muteHttpExceptions: true
      });

      var result = JSON.parse(response.getContentText());

      if (result.action === 'sent' || result.skipped) {
        lastMsg.markRead();
        thread.addLabel(label);
        Logger.log('AI replied to: ' + fromEmail + ' | Intent: ' + (result.intent || 'N/A'));
      }
    } catch (err) {
      Logger.log('Error: ' + fromEmail + ' — ' + err);
    }
  }
}
