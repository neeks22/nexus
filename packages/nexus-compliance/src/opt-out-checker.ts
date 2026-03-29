// --- Types ---

export interface LeadUnsubscribeFields {
  unsubscribe_all_date?: string | null;
  unsubscribe_sms_date?: string | null;
  unsubscribe_email_date?: string | null;
}

export interface OptOutCheckResult {
  allowed: boolean;
  reason: string;
}

// --- OptOutChecker ---

export class OptOutChecker {
  canContact(lead: LeadUnsubscribeFields, channel: "sms" | "email"): OptOutCheckResult {
    // Check global unsubscribe first
    if (lead.unsubscribe_all_date) {
      return {
        allowed: false,
        reason: `Lead unsubscribed from all communications on ${lead.unsubscribe_all_date}`,
      };
    }

    // Check channel-specific unsubscribe
    if (channel === "sms" && lead.unsubscribe_sms_date) {
      return {
        allowed: false,
        reason: `Lead unsubscribed from SMS on ${lead.unsubscribe_sms_date}`,
      };
    }

    if (channel === "email" && lead.unsubscribe_email_date) {
      return {
        allowed: false,
        reason: `Lead unsubscribed from email on ${lead.unsubscribe_email_date}`,
      };
    }

    return {
      allowed: true,
      reason: `Lead has not opted out of ${channel}`,
    };
  }
}
