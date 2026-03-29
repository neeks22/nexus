import { z } from "zod";

// --- Constants ---

const IMPLIED_CONSENT_DURATION_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months in ms

// --- Schemas ---

export const ConsentType = z.enum(["express", "implied"]);

export const ConsentRecordSchema = z.object({
  leadId: z.number(),
  consentType: ConsentType,
  consentDate: z.string(), // ISO 8601
  consentExpiry: z.string().nullable().optional(), // ISO 8601, null = no expiry (express)
  consentSource: z.string(), // e.g. "web_form", "phone_call", "walk_in"
  revokedAt: z.string().nullable().optional(), // ISO 8601, null = not revoked
});

// --- Types ---

export type ConsentTypeValue = z.infer<typeof ConsentType>;

export interface ConsentRecord {
  leadId: number;
  consentType: ConsentTypeValue;
  consentDate: string;
  consentExpiry?: string | null;
  consentSource: string;
  revokedAt?: string | null;
}

export interface ConsentCheckResult {
  valid: boolean;
  reason: string;
}

// --- ConsentTracker ---

export class ConsentTracker {
  private readonly records: Map<number, ConsentRecord>;

  constructor() {
    this.records = new Map();
  }

  recordConsent(record: ConsentRecord): void {
    const validated = ConsentRecordSchema.parse(record);

    // Auto-calculate expiry for implied consent if not provided
    if (validated.consentType === "implied" && !validated.consentExpiry) {
      const consentDate = new Date(validated.consentDate);
      const expiry = new Date(consentDate.getTime() + IMPLIED_CONSENT_DURATION_MS);
      validated.consentExpiry = expiry.toISOString();
    }

    this.records.set(validated.leadId, validated as ConsentRecord);
  }

  registerImpliedConsent(
    leadId: number,
    source: string,
    consentDate?: string,
  ): ConsentRecord {
    const now = consentDate ?? new Date().toISOString();
    const expiry = new Date(
      new Date(now).getTime() + IMPLIED_CONSENT_DURATION_MS,
    ).toISOString();
    const record: ConsentRecord = {
      leadId,
      consentType: "implied",
      consentDate: now,
      consentExpiry: expiry,
      consentSource: source,
      revokedAt: null,
    };
    this.recordConsent(record);
    return record;
  }

  revokeConsent(leadId: number, revokedAt?: string): void {
    const record = this.records.get(leadId);
    if (record) {
      record.revokedAt = revokedAt ?? new Date().toISOString();
    }
  }

  getConsent(leadId: number): ConsentRecord | undefined {
    return this.records.get(leadId);
  }

  isConsentValid(leadId: number, now?: Date): ConsentCheckResult {
    const record = this.records.get(leadId);

    if (!record) {
      return { valid: false, reason: "No consent record found for lead" };
    }

    // Check revocation first
    if (record.revokedAt) {
      return { valid: false, reason: "Consent has been revoked" };
    }

    const currentTime = now ?? new Date();

    // Express consent = valid until revoked (already checked above)
    if (record.consentType === "express") {
      return { valid: true, reason: "Express consent is active" };
    }

    // Implied consent = check expiry
    if (record.consentType === "implied") {
      const expiry = record.consentExpiry
        ? new Date(record.consentExpiry)
        : new Date(new Date(record.consentDate).getTime() + IMPLIED_CONSENT_DURATION_MS);

      if (currentTime > expiry) {
        return {
          valid: false,
          reason: `Implied consent expired on ${expiry.toISOString()}`,
        };
      }

      return { valid: true, reason: "Implied consent is still within 6-month window" };
    }

    return { valid: false, reason: "Unknown consent type" };
  }
}
