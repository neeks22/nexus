import { describe, it, expect, beforeEach } from "vitest";
import { ConsentTracker } from "../../../packages/nexus-compliance/src/consent-tracker.js";
import { OptOutChecker } from "../../../packages/nexus-compliance/src/opt-out-checker.js";
import { FrequencyCapChecker } from "../../../packages/nexus-compliance/src/frequency-cap.js";
import { ContentValidator } from "../../../packages/nexus-compliance/src/content-validator.js";
import { FeatureValidator } from "../../../packages/nexus-compliance/src/feature-validator.js";
import { CompliancePreFlight } from "../../../packages/nexus-compliance/src/compliance-preflight.js";
import { getOptOutText, appendOptOut } from "../../../packages/nexus-compliance/src/templates/opt-out.js";
import type { TouchRecord } from "../../../packages/nexus-compliance/src/frequency-cap.js";
import type { InventoryRecord } from "../../../packages/nexus-compliance/src/feature-validator.js";

// ── ConsentTracker ──────────────────────────────────

describe("ConsentTracker", () => {
  let tracker: ConsentTracker;

  beforeEach(() => {
    tracker = new ConsentTracker();
  });

  it("returns invalid when no consent record exists", () => {
    const result = tracker.isConsentValid(999);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("No consent record");
  });

  it("validates active express consent", () => {
    tracker.recordConsent({
      leadId: 1,
      consentType: "express",
      consentDate: "2026-01-15T00:00:00Z",
      consentSource: "web_form",
    });

    const result = tracker.isConsentValid(1);
    expect(result.valid).toBe(true);
    expect(result.reason).toContain("Express consent is active");
  });

  it("validates implied consent within 6-month window", () => {
    // Consent granted 2 months ago
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    tracker.recordConsent({
      leadId: 2,
      consentType: "implied",
      consentDate: twoMonthsAgo.toISOString(),
      consentSource: "walk_in",
    });

    const result = tracker.isConsentValid(2);
    expect(result.valid).toBe(true);
    expect(result.reason).toContain("within 6-month window");
  });

  it("rejects expired implied consent (>6 months)", () => {
    // Consent granted 7 months ago
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    tracker.recordConsent({
      leadId: 3,
      consentType: "implied",
      consentDate: sevenMonthsAgo.toISOString(),
      consentSource: "phone_call",
    });

    const result = tracker.isConsentValid(3);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("expired");
  });

  it("rejects revoked consent", () => {
    tracker.recordConsent({
      leadId: 4,
      consentType: "express",
      consentDate: "2026-01-15T00:00:00Z",
      consentSource: "web_form",
    });
    tracker.revokeConsent(4, "2026-02-01T00:00:00Z");

    const result = tracker.isConsentValid(4);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("revoked");
  });

  it("auto-calculates implied consent expiry", () => {
    const now = new Date("2026-03-01T00:00:00Z");
    tracker.recordConsent({
      leadId: 5,
      consentType: "implied",
      consentDate: "2026-03-01T00:00:00Z",
      consentSource: "walk_in",
    });

    const record = tracker.getConsent(5);
    expect(record).toBeDefined();
    expect(record!.consentExpiry).toBeDefined();
  });
});

// ── OptOutChecker ──────────────────────────────────

describe("OptOutChecker", () => {
  let checker: OptOutChecker;

  beforeEach(() => {
    checker = new OptOutChecker();
  });

  it("blocks SMS when unsubscribe_sms_date is set", () => {
    const result = checker.canContact(
      { unsubscribe_sms_date: "2026-02-15T00:00:00Z" },
      "sms",
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("unsubscribed from SMS");
  });

  it("blocks email when unsubscribe_email_date is set", () => {
    const result = checker.canContact(
      { unsubscribe_email_date: "2026-02-15T00:00:00Z" },
      "email",
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("unsubscribed from email");
  });

  it("blocks all channels when unsubscribe_all_date is set", () => {
    const lead = { unsubscribe_all_date: "2026-02-15T00:00:00Z" };

    const smsResult = checker.canContact(lead, "sms");
    const emailResult = checker.canContact(lead, "email");

    expect(smsResult.allowed).toBe(false);
    expect(emailResult.allowed).toBe(false);
    expect(smsResult.reason).toContain("all communications");
    expect(emailResult.reason).toContain("all communications");
  });

  it("allows contact when no unsubscribe dates are set", () => {
    const result = checker.canContact({}, "sms");
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("has not opted out");
  });

  it("allows SMS when only email is unsubscribed", () => {
    const result = checker.canContact(
      { unsubscribe_email_date: "2026-02-15T00:00:00Z" },
      "sms",
    );
    expect(result.allowed).toBe(true);
  });

  it("allows email when only SMS is unsubscribed", () => {
    const result = checker.canContact(
      { unsubscribe_sms_date: "2026-02-15T00:00:00Z" },
      "email",
    );
    expect(result.allowed).toBe(true);
  });
});

// ── FrequencyCapChecker ──────────────────────────────

describe("FrequencyCapChecker", () => {
  it("allows contact when under the limit", () => {
    const checker = new FrequencyCapChecker();
    const history: TouchRecord[] = [
      { leadId: 1, timestamp: new Date().toISOString(), channel: "sms" },
      { leadId: 1, timestamp: new Date().toISOString(), channel: "email" },
    ];

    const result = checker.isWithinCap(1, history);
    expect(result.allowed).toBe(true);
    expect(result.touchesUsed).toBe(2);
    expect(result.limit).toBe(7);
  });

  it("blocks contact when at the limit", () => {
    const checker = new FrequencyCapChecker();
    const history: TouchRecord[] = Array.from({ length: 7 }, (_, i) => ({
      leadId: 1,
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      channel: "sms" as const,
    }));

    const result = checker.isWithinCap(1, history);
    expect(result.allowed).toBe(false);
    expect(result.touchesUsed).toBe(7);
  });

  it("blocks contact when over the limit", () => {
    const checker = new FrequencyCapChecker();
    const history: TouchRecord[] = Array.from({ length: 10 }, (_, i) => ({
      leadId: 1,
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      channel: "sms" as const,
    }));

    const result = checker.isWithinCap(1, history);
    expect(result.allowed).toBe(false);
    expect(result.touchesUsed).toBe(10);
  });

  it("respects custom limits", () => {
    const checker = new FrequencyCapChecker({ maxTouches: 3, windowDays: 7 });
    const history: TouchRecord[] = [
      { leadId: 1, timestamp: new Date().toISOString(), channel: "sms" },
      { leadId: 1, timestamp: new Date().toISOString(), channel: "email" },
      { leadId: 1, timestamp: new Date().toISOString(), channel: "sms" },
    ];

    const result = checker.isWithinCap(1, history);
    expect(result.allowed).toBe(false);
    expect(result.touchesUsed).toBe(3);
    expect(result.limit).toBe(3);
  });

  it("ignores touches outside the window", () => {
    const checker = new FrequencyCapChecker({ maxTouches: 3, windowDays: 7 });
    // 10 days ago — outside 7-day window
    const oldDate = new Date(Date.now() - 10 * 86400000).toISOString();
    const history: TouchRecord[] = [
      { leadId: 1, timestamp: oldDate, channel: "sms" },
      { leadId: 1, timestamp: oldDate, channel: "email" },
      { leadId: 1, timestamp: oldDate, channel: "sms" },
    ];

    const result = checker.isWithinCap(1, history);
    expect(result.allowed).toBe(true);
    expect(result.touchesUsed).toBe(0);
  });

  it("only counts touches for the specified lead", () => {
    const checker = new FrequencyCapChecker({ maxTouches: 2 });
    const history: TouchRecord[] = [
      { leadId: 1, timestamp: new Date().toISOString(), channel: "sms" },
      { leadId: 2, timestamp: new Date().toISOString(), channel: "sms" },
      { leadId: 3, timestamp: new Date().toISOString(), channel: "sms" },
    ];

    const result = checker.isWithinCap(1, history);
    expect(result.allowed).toBe(true);
    expect(result.touchesUsed).toBe(1);
  });
});

// ── ContentValidator ──────────────────────────────────

describe("ContentValidator", () => {
  let validator: ContentValidator;

  beforeEach(() => {
    validator = new ContentValidator();
  });

  it("passes clean messages", () => {
    const result = validator.validateContent(
      "Hi John! We have a 2024 Toyota Camry SE in Midnight Blue that just arrived. Would you like to schedule a visit?",
    );
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("catches interest rate references", () => {
    const result = validator.validateContent(
      "We can offer you 3.9% APR on this vehicle!",
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("interest_rate"))).toBe(true);
  });

  it("catches monthly payment references", () => {
    const result = validator.validateContent(
      "This could be yours for $399/month with our special financing.",
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("monthly_payment"))).toBe(true);
  });

  it("catches 'payments as low as' language", () => {
    const result = validator.validateContent(
      "Payments as low as $299 for qualified buyers.",
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("payments_as_low_as"))).toBe(true);
  });

  it("catches negotiation language: 'I can do'", () => {
    const result = validator.validateContent(
      "I can do a better number on this one for you.",
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("negotiation_i_can_do"))).toBe(true);
  });

  it("catches negotiation language: 'let me see what'", () => {
    const result = validator.validateContent(
      "Let me see what I can work out with my manager.",
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("negotiation_let_me_see"))).toBe(true);
  });

  it("catches negotiation language: 'best price'", () => {
    const result = validator.validateContent(
      "I'll give you the best price in the city.",
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("negotiation_best_price"))).toBe(true);
  });

  it("catches negotiation language: 'discount'", () => {
    const result = validator.validateContent(
      "We have a special discount available this week.",
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("negotiation_discount"))).toBe(true);
  });

  it("catches credit score references", () => {
    const result = validator.validateContent(
      "With a credit score of 720 or above, you qualify.",
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("credit_score"))).toBe(true);
  });

  it("catches financing term lengths", () => {
    const result = validator.validateContent(
      "This can be financed over 72 months at a great rate.",
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("financing_term"))).toBe(true);
  });

  it("detects multiple violations in one message", () => {
    const result = validator.validateContent(
      "I can do $399/month with 2.9% APR financing. Let me see what discount I can get you.",
    );
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
  });
});

// ── FeatureValidator ──────────────────────────────────

describe("FeatureValidator", () => {
  let validator: FeatureValidator;

  const sampleInventory: InventoryRecord = {
    vin: "1HGCG5658WA041389",
    make: "Toyota",
    model: "Camry",
    year: 2024,
    trim: "SE",
    features: [
      "leather seats",
      "sunroof",
      "Apple CarPlay",
      "Android Auto",
      "backup camera",
      "Bluetooth",
      "heated seats",
    ],
  };

  beforeEach(() => {
    validator = new FeatureValidator();
  });

  it("passes when all mentioned features are in inventory", () => {
    const result = validator.validateFeatures(
      "This Camry comes with leather seats and a sunroof, plus Apple CarPlay integration.",
      sampleInventory,
    );
    expect(result.valid).toBe(true);
    expect(result.unverifiedFeatures).toHaveLength(0);
  });

  it("catches unverified feature claims", () => {
    const result = validator.validateFeatures(
      "This Camry features a panoramic roof and adaptive cruise control.",
      sampleInventory,
    );
    expect(result.valid).toBe(false);
    expect(result.unverifiedFeatures).toContain("panoramic roof");
    expect(result.unverifiedFeatures).toContain("adaptive cruise");
  });

  it("flags all features when no inventory record provided", () => {
    const result = validator.validateFeatures(
      "This vehicle has AWD and a turbo engine.",
    );
    expect(result.valid).toBe(false);
    expect(result.unverifiedFeatures).toContain("AWD");
    expect(result.unverifiedFeatures).toContain("turbo");
  });

  it("passes message with no feature claims and no inventory", () => {
    const result = validator.validateFeatures(
      "Hi John! We have a great vehicle for you. Come visit us!",
    );
    expect(result.valid).toBe(true);
    expect(result.unverifiedFeatures).toHaveLength(0);
  });

  it("handles mixed verified and unverified features", () => {
    const result = validator.validateFeatures(
      "Enjoy the leather seats with heated steering wheel and navigation system.",
      sampleInventory,
    );
    expect(result.valid).toBe(false);
    // leather seats is verified, but heated steering and navigation are not
    expect(result.unverifiedFeatures).toContain("heated steering");
    expect(result.unverifiedFeatures).toContain("navigation");
    expect(result.unverifiedFeatures).not.toContain("leather seats");
  });
});

// ── Opt-Out Templates ──────────────────────────────────

describe("OptOut Templates", () => {
  const params = { dealershipName: "Metro Toyota", phone: "514-555-1234" };

  it("generates English opt-out text", () => {
    const text = getOptOutText("en-CA", params);
    expect(text).toContain("Reply STOP to unsubscribe");
    expect(text).toContain("Metro Toyota");
    expect(text).toContain("514-555-1234");
  });

  it("generates French opt-out text", () => {
    const text = getOptOutText("fr-CA", params);
    expect(text).toContain("Répondez STOP pour vous désabonner");
    expect(text).toContain("Metro Toyota");
    expect(text).toContain("514-555-1234");
  });

  it("appends opt-out to a message", () => {
    const message = "Hi John! Come see us today.";
    const result = appendOptOut(message, "en-CA", params);
    expect(result).toContain(message);
    expect(result).toContain("Reply STOP to unsubscribe");
    expect(result).toContain("\n\n");
  });
});

// ── CompliancePreFlight ──────────────────────────────────

describe("CompliancePreFlight", () => {
  let preflight: CompliancePreFlight;
  const silentLogger = {
    info(_msg: string, _data?: Record<string, unknown>): void {},
    warn(_msg: string, _data?: Record<string, unknown>): void {},
  };

  beforeEach(() => {
    preflight = new CompliancePreFlight({ logger: silentLogger });
  });

  it("passes when all checks clear", () => {
    // Register valid express consent
    preflight.consent.recordConsent({
      leadId: 100,
      consentType: "express",
      consentDate: "2026-01-01T00:00:00Z",
      consentSource: "web_form",
    });

    const result = preflight.check(
      { id: 100 },
      "Hi John! We have a 2024 Camry that just arrived. Would you like to visit?",
      "sms",
    );

    expect(result.pass).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("fails when consent is missing", () => {
    const result = preflight.check(
      { id: 200 },
      "Hi there! Come visit us.",
      "sms",
    );

    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.checker === "consent")).toBe(true);
  });

  it("fails when lead has opted out of SMS", () => {
    preflight.consent.recordConsent({
      leadId: 300,
      consentType: "express",
      consentDate: "2026-01-01T00:00:00Z",
      consentSource: "web_form",
    });

    const result = preflight.check(
      { id: 300, unsubscribe_sms_date: "2026-02-15T00:00:00Z" },
      "Hi there! Come visit us.",
      "sms",
    );

    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.checker === "opt-out")).toBe(true);
  });

  it("fails when content contains forbidden patterns", () => {
    preflight.consent.recordConsent({
      leadId: 400,
      consentType: "express",
      consentDate: "2026-01-01T00:00:00Z",
      consentSource: "web_form",
    });

    const result = preflight.check(
      { id: 400 },
      "We can offer you 3.9% APR financing with payments as low as $299/month!",
      "sms",
    );

    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.checker === "content")).toBe(true);
  });

  it("fails when frequency cap exceeded", () => {
    const preflight3 = new CompliancePreFlight({
      frequencyCap: { maxTouches: 3, windowDays: 30 },
      logger: silentLogger,
    });

    preflight3.consent.recordConsent({
      leadId: 500,
      consentType: "express",
      consentDate: "2026-01-01T00:00:00Z",
      consentSource: "web_form",
    });

    const touchHistory: TouchRecord[] = [
      { leadId: 500, timestamp: new Date().toISOString(), channel: "sms" },
      { leadId: 500, timestamp: new Date().toISOString(), channel: "email" },
      { leadId: 500, timestamp: new Date().toISOString(), channel: "sms" },
    ];

    const result = preflight3.check(
      { id: 500 },
      "Hi there! Just checking in.",
      "sms",
      undefined,
      touchHistory,
    );

    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.checker === "frequency-cap")).toBe(true);
  });

  it("fails when unverified features are mentioned", () => {
    preflight.consent.recordConsent({
      leadId: 600,
      consentType: "express",
      consentDate: "2026-01-01T00:00:00Z",
      consentSource: "web_form",
    });

    const inventory: InventoryRecord = {
      vin: "1HGCG5658WA041389",
      make: "Toyota",
      model: "Camry",
      year: 2024,
      features: ["Bluetooth", "backup camera"],
    };

    const result = preflight.check(
      { id: 600 },
      "This Camry comes with AWD and a panoramic roof!",
      "sms",
      inventory,
    );

    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.checker === "features")).toBe(true);
  });

  it("reports multiple failures at once", () => {
    // No consent + forbidden content + opted out
    const result = preflight.check(
      { id: 700, unsubscribe_sms_date: "2026-02-15T00:00:00Z" },
      "I can do 3.9% APR for you! Best price guaranteed with a discount.",
      "sms",
    );

    expect(result.pass).toBe(false);
    expect(result.failures.length).toBeGreaterThanOrEqual(3);

    const checkers = result.failures.map((f) => f.checker);
    expect(checkers).toContain("consent");
    expect(checkers).toContain("opt-out");
    expect(checkers).toContain("content");
  });

  it("passes with inventory record when features match", () => {
    preflight.consent.recordConsent({
      leadId: 800,
      consentType: "express",
      consentDate: "2026-01-01T00:00:00Z",
      consentSource: "web_form",
    });

    const inventory: InventoryRecord = {
      vin: "1HGCG5658WA041389",
      make: "Toyota",
      model: "Camry",
      year: 2024,
      features: ["leather seats", "sunroof", "Bluetooth"],
    };

    const result = preflight.check(
      { id: 800 },
      "This Camry has leather seats and Bluetooth connectivity.",
      "sms",
      inventory,
    );

    expect(result.pass).toBe(true);
    expect(result.failures).toHaveLength(0);
  });
});
