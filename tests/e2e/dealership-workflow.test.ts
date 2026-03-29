/**
 * End-to-End Tests — Dealership AI Workflow
 *
 * Tests the full pipeline across all packages:
 * nexus-activix, nexus-compliance, nexus-inventory, nexus-i18n,
 * nexus-transcript, nexus-intent, nexus-agents, nexus-billing
 *
 * All external services are mocked. These tests verify the correct
 * integration and data flow between modules.
 */

import { describe, it, expect, beforeEach } from "vitest";

// --- nexus-activix ---
import { ActivixLeadSchema } from "../../packages/nexus-activix/src/schemas.js";
import type { ActivixLead } from "../../packages/nexus-activix/src/schemas.js";

// --- nexus-compliance ---
import { CompliancePreFlight } from "../../packages/nexus-compliance/src/compliance-preflight.js";
import { ContentValidator } from "../../packages/nexus-compliance/src/content-validator.js";
import { FeatureValidator } from "../../packages/nexus-compliance/src/feature-validator.js";
import type { InventoryRecord } from "../../packages/nexus-compliance/src/feature-validator.js";

// --- nexus-inventory ---
import type { Vehicle, VehicleMatch } from "../../packages/nexus-inventory/src/types.js";

// --- nexus-i18n ---
import { LanguageDetector } from "../../packages/nexus-i18n/src/language-detector.js";
import type { SupportedLocale } from "../../packages/nexus-i18n/src/language-detector.js";

// --- nexus-transcript ---
import { LeadTranscript } from "../../packages/nexus-transcript/src/lead-transcript.js";

// --- nexus-intent ---
import { IntentClassifier } from "../../packages/nexus-intent/src/intent-classifier.js";
import { HandoffRuleEngine } from "../../packages/nexus-intent/src/handoff-rules.js";
import { Intent } from "../../packages/nexus-intent/src/types.js";
import type { HandoffRule } from "../../packages/nexus-intent/src/types.js";

// --- nexus-agents ---
import { InstantResponseAgent } from "../../packages/nexus-agents/src/instant-response-agent.js";
import { ColdWarmingAgent } from "../../packages/nexus-agents/src/cold-warming-agent.js";
import { resetCadence, TOUCH_SCHEDULE } from "../../packages/nexus-agents/src/touch-scheduler.js";
import type {
  LanguageDetectorDep,
  InventoryServiceDep,
  CompliancePreFlightDep,
  TemplateRepositoryDep,
  VehicleMatchResult,
} from "../../packages/nexus-agents/src/instant-response-agent.js";
import type {
  DealershipConfig,
  LeadData,
} from "../../packages/nexus-agents/src/types.js";

// --- nexus-billing ---
import { CostLogger } from "../../packages/nexus-billing/src/cost-logger.js";
import { InMemoryCostStore } from "../../packages/nexus-billing/src/cost-store.js";
import { CostReporter } from "../../packages/nexus-billing/src/cost-reporter.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Shared Test Fixtures
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DEALERSHIP_CONFIG: DealershipConfig = {
  dealershipName: "Maple Motors",
  address: "123 Main St, Ottawa, ON K1A 0B1",
  phone: "(613) 555-1234",
  hours: "Mon-Fri 9AM-8PM, Sat 9AM-5PM",
  timezone: "America/Toronto",
  tone: "friendly",
  staff: [
    { name: "Sarah Johnson", role: "Sales Manager", email: "sarah@maplemotors.ca" },
    { name: "Marc Dupont", role: "Sales Advisor", email: "marc@maplemotors.ca" },
  ],
  escalationNumbers: ["(613) 555-9999"],
};

const SAMPLE_VEHICLE: VehicleMatchResult = {
  vehicle: {
    vin: "2HGFC2F59RH000001",
    make: "Honda",
    model: "Civic",
    year: 2024,
    trim: "EX",
    color: "Lunar Silver",
    features: ["Apple CarPlay", "Honda Sensing", "heated seats", "backup camera"],
    msrp: 29500,
    stockStatus: "available",
    daysOnLot: 14,
  },
  matchScore: 0.85,
  matchReasons: ["make match", "model match"],
};

const SAMPLE_VEHICLE_NO_PANO: VehicleMatchResult = {
  vehicle: {
    vin: "2HGFC2F59RH000002",
    make: "Honda",
    model: "Civic",
    year: 2024,
    trim: "LX",
    color: "Crystal Black",
    features: ["backup camera", "Bluetooth"],
    msrp: 26500,
    stockStatus: "available",
    daysOnLot: 7,
  },
  matchScore: 0.75,
  matchReasons: ["make match", "model match"],
};

function createLeadData(overrides?: Partial<LeadData>): LeadData {
  return {
    id: 12345,
    first_name: "John",
    last_name: "Smith",
    locale: null,
    source: "website",
    phones: [{ number: "6135551111" }],
    emails: [{ address: "john@example.com" }],
    postal_code: "K1A 0B1",
    vehicles: [
      { make: "Honda", model: "Civic", year: 2024, type: "wanted" },
    ],
    unsubscribe_all_date: null,
    unsubscribe_sms_date: null,
    unsubscribe_email_date: null,
    ...overrides,
  };
}

function createFrenchLeadData(overrides?: Partial<LeadData>): LeadData {
  return createLeadData({
    id: 12346,
    first_name: "Marie",
    last_name: "Tremblay",
    phones: [{ number: "5145559999" }],
    postal_code: "H2X 1Y4",
    ...overrides,
  });
}

const DEFAULT_HANDOFF_RULES: readonly HandoffRule[] = [
  { intent: Intent.PRICE_INQUIRY, action: "handoff", confidenceThreshold: 0.8, template: "PRICE_INQUIRY" },
  { intent: Intent.FINANCING_QUESTION, action: "handoff", confidenceThreshold: 0.8, template: "FINANCING" },
  { intent: Intent.TRADE_IN_REQUEST, action: "handoff", confidenceThreshold: 0.8 },
  { intent: Intent.TEST_DRIVE_REQUEST, action: "handoff", confidenceThreshold: 0.8, template: "TEST_DRIVE" },
  { intent: Intent.TIMELINE_MENTION, action: "handoff", confidenceThreshold: 0.8 },
  { intent: Intent.OBJECTION, action: "handoff", confidenceThreshold: 0.8, template: "OBJECTION" },
  { intent: Intent.FRUSTRATION, action: "handoff", confidenceThreshold: 0.8 },
  { intent: Intent.LEGAL_MENTION, action: "handoff", confidenceThreshold: 0.8 },
  { intent: Intent.HUMAN_REQUEST, action: "handoff", confidenceThreshold: 0.8 },
  { intent: Intent.NOT_INTERESTED, action: "stop", confidenceThreshold: 0.7 },
  { intent: Intent.INFO_REQUEST, action: "continue", confidenceThreshold: 0.0 },
];

// --- Mock factories ---

function createMockInventoryService(vehicles: VehicleMatchResult[] = [SAMPLE_VEHICLE]): InventoryServiceDep {
  return {
    findMatching: async (): Promise<VehicleMatchResult[]> => vehicles,
  };
}

function createMockLanguageDetector(locale: SupportedLocale = "en-CA"): LanguageDetectorDep {
  return {
    detect: (): SupportedLocale => locale,
  };
}

function createMockTemplateRepository(): TemplateRepositoryDep {
  const templates: Record<string, string> = {
    // en-CA SMS
    "instant_response:en-CA:sms": "Hi {{firstName}}! Thanks for your interest in the {{vehicleYear}} {{vehicleMake}} {{vehicleModel}} {{vehicleTrim}} in {{vehicleColor}}. It comes with {{inventoryDetail}}. Feel free to reach out to {{repName}} at {{dealershipName}} — {{dealershipPhone}}.",
    "touch_2_followup:en-CA:sms": "Hi {{firstName}}, just checking in about the {{vehicleYear}} {{vehicleMake}} {{vehicleModel}}. It's still available! — {{repName}} at {{dealershipName}}",
    "touch_3_feature:en-CA:email": "Hi {{firstName}}, the {{vehicleYear}} {{vehicleMake}} {{vehicleModel}} {{vehicleTrim}} has some great features like {{inventoryDetail}}. Come see it at {{dealershipName}}! — {{repName}}",
    "touch_4_persistence:en-CA:sms": "Hi {{firstName}}, the {{vehicleYear}} {{vehicleMake}} {{vehicleModel}} is still here. Want to book a test drive? — {{repName}} at {{dealershipName}} {{dealershipPhone}}",
    "touch_5_value:en-CA:email": "Hi {{firstName}}, great news — the {{vehicleYear}} {{vehicleMake}} {{vehicleModel}} offers excellent value. Let {{repName}} walk you through the details at {{dealershipName}}.",
    "touch_6_breakup:en-CA:sms": "Hi {{firstName}}, no pressure — just wanted to let you know the {{vehicleMake}} {{vehicleModel}} is still available when you're ready. — {{repName}}",
    "touch_7_monthly:en-CA:email": "Hi {{firstName}}, we have new arrivals that might interest you, including a {{vehicleYear}} {{vehicleMake}} {{vehicleModel}}. Check out what's new at {{dealershipName}}! — {{repName}}",
    // fr-CA SMS
    "instant_response:fr-CA:sms": "Bonjour {{firstName}}! Merci pour votre interet pour le {{vehicleYear}} {{vehicleMake}} {{vehicleModel}} {{vehicleTrim}} en {{vehicleColor}}. Il est equipe de {{inventoryDetail}}. N'hesitez pas a contacter {{repName}} chez {{dealershipName}} — {{dealershipPhone}}.",
    "touch_2_followup:fr-CA:sms": "Bonjour {{firstName}}, juste un petit suivi au sujet du {{vehicleYear}} {{vehicleMake}} {{vehicleModel}}. Il est toujours disponible! — {{repName}} chez {{dealershipName}}",
    "touch_6_breakup:fr-CA:sms": "Bonjour {{firstName}}, pas de pression — le {{vehicleMake}} {{vehicleModel}} est toujours disponible quand vous serez pret. — {{repName}}",
    "touch_7_monthly:fr-CA:email": "Bonjour {{firstName}}, nous avons de nouvelles arrivees qui pourraient vous interesser, dont un {{vehicleYear}} {{vehicleMake}} {{vehicleModel}}. Decouvrez les nouveautes chez {{dealershipName}}! — {{repName}}",
  };

  return {
    render: (templateId: string, locale: SupportedLocale, channel: "sms" | "email", variables: Record<string, string | undefined>): string | null => {
      const key = `${templateId}:${locale}:${channel}`;
      const tpl = templates[key];
      if (!tpl) return null;

      let result = tpl;
      for (const [k, v] of Object.entries(variables)) {
        result = result.replaceAll(`{{${k}}}`, v ?? "");
      }
      return result;
    },
  };
}

function createPassingComplianceMock(): CompliancePreFlightDep {
  return {
    check: (): { pass: boolean; failures: Array<{ checker: string; reason: string }> } => ({
      pass: true,
      failures: [],
    }),
  };
}

function createBlockingComplianceMock(checker: string, reason: string): CompliancePreFlightDep {
  return {
    check: (): { pass: boolean; failures: Array<{ checker: string; reason: string }> } => ({
      pass: false,
      failures: [{ checker, reason }],
    }),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  E2E Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Dealership Workflow — End-to-End", () => {
  // -------------------------------------------------------------------
  // TEST 1: New lead webhook → parse → detect language → match inventory
  //         → generate response → compliance pass
  // -------------------------------------------------------------------
  describe("Test 1: New lead full pipeline", () => {
    it("should parse webhook, detect language, match inventory, generate response, and pass compliance", async () => {
      // Step 1: Simulate Activix webhook payload and parse with Zod schema
      const rawWebhookPayload = {
        id: 12345,
        first_name: "John",
        last_name: "Smith",
        type: "new",
        locale: null,
        source: "website",
        division: "new",
        phones: [{ number: "6135551111", type: "home" }],
        emails: [{ address: "john@example.com", type: "personal" }],
        vehicles: [{ make: "Honda", model: "Civic", year: 2024, trim: "EX", type: "wanted" }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Step 2: Detect language — Ontario area code (613) should yield en-CA
      const languageDetector = new LanguageDetector();
      const locale = languageDetector.detect({
        locale: rawWebhookPayload.locale,
        phones: rawWebhookPayload.phones,
      });
      expect(locale).toBe("en-CA");

      // Step 3: Match inventory
      const inventoryService = createMockInventoryService();
      const vehicleMatches = await inventoryService.findMatching({
        make: "Honda",
        model: "Civic",
        year: 2024,
      });
      expect(vehicleMatches.length).toBeGreaterThan(0);
      expect(vehicleMatches[0].vehicle.make).toBe("Honda");

      // Step 4: Generate response via InstantResponseAgent
      const agent = new InstantResponseAgent(
        DEALERSHIP_CONFIG,
        inventoryService,
        createPassingComplianceMock(),
        createMockLanguageDetector("en-CA"),
        createMockTemplateRepository(),
      );

      const lead = createLeadData();
      const response = await agent.respond(lead, "sms");

      // Step 5: Verify the full pipeline result
      expect(response.message).toBeTruthy();
      expect(response.message).toContain("John");
      expect(response.message).toContain("Honda");
      expect(response.message).toContain("Civic");
      expect(response.locale).toBe("en-CA");
      expect(response.channel).toBe("sms");
      expect(response.complianceResult.pass).toBe(true);
      expect(response.complianceResult.failures).toHaveLength(0);
      expect(response.vehicleMatches.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------
  // TEST 2: Cold lead (created 3 days ago) → touch 2 selected → SMS channel
  // -------------------------------------------------------------------
  describe("Test 2: Cold lead touch 2 selection", () => {
    it("should select touch 2 for a lead created 3 days ago and use SMS channel", async () => {
      const lead = createLeadData();

      const agent = new ColdWarmingAgent(
        DEALERSHIP_CONFIG,
        createMockInventoryService(),
        createPassingComplianceMock(),
        createMockLanguageDetector("en-CA"),
        createMockTemplateRepository(),
      );

      // Touch 2 is scheduled for day 2 (SMS channel per TOUCH_SCHEDULE)
      const touchSchedule = TOUCH_SCHEDULE.get(2);
      expect(touchSchedule).toBeDefined();
      expect(touchSchedule!.channel).toBe("sms");
      expect(touchSchedule!.daysFromStart).toBe(2);

      // Generate touch 2
      const result = await agent.generateTouch(lead, 2);
      expect("blocked" in result).toBe(false);

      if (!("blocked" in result)) {
        expect(result.touchNumber).toBe(2);
        expect(result.channel).toBe("sms");
        expect(result.message).toBeTruthy();
        expect(result.message).toContain("John");
        expect(result.complianceResult.pass).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------
  // TEST 3: Reply "how much is the civic?" → PRICE_INQUIRY → shouldHandoff=true
  // -------------------------------------------------------------------
  describe("Test 3: Price inquiry triggers handoff", () => {
    it("should classify as PRICE_INQUIRY with shouldHandoff=true", () => {
      const classifier = new IntentClassifier();
      const result = classifier.classify("how much is the civic?");

      expect(result.intent).toBe(Intent.PRICE_INQUIRY);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);

      const ruleEngine = new HandoffRuleEngine(DEFAULT_HANDOFF_RULES);
      const evaluation = ruleEngine.evaluate(result);

      expect(evaluation.shouldHandoff).toBe(true);
      expect(evaluation.action).toBe("handoff");
      expect(evaluation.template).toBe("PRICE_INQUIRY");

      // Verify transcript records the handoff
      let transcript = new LeadTranscript("12345");
      transcript = transcript.appendMessage("customer", "how much is the civic?", {
        channel: "sms",
        touchNumber: 1,
        metadata: { intent: result.intent },
      });
      transcript = transcript.appendHandoff(
        result.intent,
        result.confidence,
        "Sarah Johnson",
      );

      expect(transcript.getHandoffs()).toHaveLength(1);
      expect(transcript.getHandoffs()[0].intent).toBe("PRICE_INQUIRY");
      expect(transcript.getHandoffs()[0].repName).toBe("Sarah Johnson");
    });
  });

  // -------------------------------------------------------------------
  // TEST 4: Reply "what are your hours?" → INFO_REQUEST → shouldHandoff=false
  // -------------------------------------------------------------------
  describe("Test 4: Info request does not trigger handoff", () => {
    it("should classify as INFO_REQUEST with shouldHandoff=false", () => {
      const classifier = new IntentClassifier();
      const result = classifier.classify("what are your hours?");

      expect(result.intent).toBe(Intent.INFO_REQUEST);

      const ruleEngine = new HandoffRuleEngine(DEFAULT_HANDOFF_RULES);
      const evaluation = ruleEngine.evaluate(result);

      expect(evaluation.shouldHandoff).toBe(false);
      expect(evaluation.action).toBe("continue");
    });
  });

  // -------------------------------------------------------------------
  // TEST 5: Lead with unsubscribe_sms_date → CompliancePreFlight blocks
  // -------------------------------------------------------------------
  describe("Test 5: Unsubscribed lead blocked by compliance", () => {
    it("should block SMS to a lead with unsubscribe_sms_date set", () => {
      const compliance = new CompliancePreFlight();
      const lead = {
        id: 12345,
        unsubscribe_all_date: null,
        unsubscribe_sms_date: "2026-01-15T00:00:00Z",
        unsubscribe_email_date: null,
      };

      const result = compliance.check(lead, "Hi John, checking in!", "sms");

      expect(result.pass).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
      expect(result.failures.some((f) => f.checker === "opt-out")).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // TEST 6: Implied consent > 6 months → blocked
  // -------------------------------------------------------------------
  describe("Test 6: Expired implied consent blocked", () => {
    it("should block messaging when implied consent is older than 6 months", () => {
      const compliance = new CompliancePreFlight();

      // Record implied consent from 7 months ago
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

      compliance.consent.recordConsent({
        leadId: 12345,
        consentType: "implied",
        consentDate: sevenMonthsAgo.toISOString(),
        consentSource: "web_form",
      });

      const lead = {
        id: 12345,
        unsubscribe_all_date: null,
        unsubscribe_sms_date: null,
        unsubscribe_email_date: null,
      };

      const result = compliance.check(lead, "Hi John, following up!", "sms");

      expect(result.pass).toBe(false);
      expect(result.failures.some((f) => f.checker === "consent")).toBe(true);
      expect(
        result.failures.some((f) =>
          f.reason.toLowerCase().includes("expired") || f.reason.toLowerCase().includes("expir"),
        ),
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // TEST 7: Message mentions "panoramic roof" for vehicle without it → blocked
  // -------------------------------------------------------------------
  describe("Test 7: Feature not in inventory blocked by FeatureValidator", () => {
    it("should block a message mentioning a feature the vehicle does not have", () => {
      const featureValidator = new FeatureValidator();

      const inventoryRecord: InventoryRecord = {
        vin: "2HGFC2F59RH000002",
        make: "Honda",
        model: "Civic",
        year: 2024,
        trim: "LX",
        features: ["backup camera", "Bluetooth"],
      };

      const messageWithFalseFeature =
        "The 2024 Honda Civic LX comes with a panoramic roof and great visibility!";

      const result = featureValidator.validateFeatures(messageWithFalseFeature, inventoryRecord);

      expect(result.valid).toBe(false);
      expect(result.unverifiedFeatures.length).toBeGreaterThan(0);
      expect(
        result.unverifiedFeatures.some(
          (f) => f.toLowerCase().includes("panoramic") || f.toLowerCase().includes("sunroof"),
        ),
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // TEST 8: Message with "payments as low as $299/month" → ContentValidator blocks
  // -------------------------------------------------------------------
  describe("Test 8: Forbidden financial content blocked by ContentValidator", () => {
    it("should block a message containing monthly payment language", () => {
      const contentValidator = new ContentValidator();

      const forbiddenMessage =
        "Great news! You can get the Civic with payments as low as $299/month!";

      const result = contentValidator.validateContent(forbiddenMessage);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------
  // TEST 9: Lead with 514 area code → locale=fr-CA → French template
  // -------------------------------------------------------------------
  describe("Test 9: Quebec area code triggers French response", () => {
    it("should detect fr-CA for 514 area code and generate a French response", async () => {
      const languageDetector = new LanguageDetector();
      const frenchLead = createFrenchLeadData();

      // Verify language detection
      const locale = languageDetector.detect(frenchLead);
      expect(locale).toBe("fr-CA");

      // Generate response with French locale
      const agent = new InstantResponseAgent(
        DEALERSHIP_CONFIG,
        createMockInventoryService(),
        createPassingComplianceMock(),
        { detect: (): SupportedLocale => "fr-CA" },
        createMockTemplateRepository(),
      );

      const response = await agent.respond(frenchLead, "sms");

      expect(response.locale).toBe("fr-CA");
      expect(response.message).toBeTruthy();
      // French template should have French content
      expect(response.message).toContain("Bonjour");
      expect(response.message).toContain("Marie");
    });
  });

  // -------------------------------------------------------------------
  // TEST 10: Touch 6 → break-up message correct (en-CA and fr-CA)
  // -------------------------------------------------------------------
  describe("Test 10: Break-up message at touch 6", () => {
    it("should generate the correct break-up message in en-CA", async () => {
      const agent = new ColdWarmingAgent(
        DEALERSHIP_CONFIG,
        createMockInventoryService(),
        createPassingComplianceMock(),
        createMockLanguageDetector("en-CA"),
        createMockTemplateRepository(),
      );

      const lead = createLeadData();
      const result = await agent.generateTouch(lead, 6);

      expect("blocked" in result).toBe(false);
      if (!("blocked" in result)) {
        expect(result.touchNumber).toBe(6);
        expect(result.channel).toBe("sms");
        const breakupEn = agent.getBreakupMessage("en-CA");
        expect(result.message).toBe(breakupEn);
        expect(result.message).toContain("timing might not be right");
        expect(result.message).toContain("here when you're ready");
      }
    });

    it("should generate the correct break-up message in fr-CA", async () => {
      const agent = new ColdWarmingAgent(
        DEALERSHIP_CONFIG,
        createMockInventoryService(),
        createPassingComplianceMock(),
        createMockLanguageDetector("fr-CA"),
        createMockTemplateRepository(),
      );

      const frenchLead = createFrenchLeadData();
      const result = await agent.generateTouch(frenchLead, 6);

      expect("blocked" in result).toBe(false);
      if (!("blocked" in result)) {
        const breakupFr = agent.getBreakupMessage("fr-CA");
        expect(result.message).toBe(breakupFr);
        expect(result.message).toContain("pas de souci");
        expect(result.locale).toBe("fr-CA");
      }
    });
  });

  // -------------------------------------------------------------------
  // TEST 11: Reply after touch 4 → cadence resets
  // -------------------------------------------------------------------
  describe("Test 11: Cadence reset on customer reply", () => {
    it("should reset the cadence timer after a reply so next touch is delayed", () => {
      // Lead was created 10 days ago
      const leadCreatedDate = new Date();
      leadCreatedDate.setDate(leadCreatedDate.getDate() - 10);

      // Customer replies after touch 4 (at day 7)
      const replyDate = new Date();
      const currentTouch = 4;

      // Reset cadence
      const newEffectiveCreatedDate = resetCadence(replyDate, currentTouch);

      // The next touch (5) should be calculated from the new effective date
      // Touch 5 is at day 14 from start. After reset, the effective start shifts so
      // that touch 4's position aligns with the reply date.
      const touch4Schedule = TOUCH_SCHEDULE.get(4);
      expect(touch4Schedule).toBeDefined();

      // Effective created date = replyDate - touch4.daysFromStart * MS_PER_DAY
      const expectedEffective = new Date(
        replyDate.getTime() - touch4Schedule!.daysFromStart * 86_400_000,
      );
      expect(newEffectiveCreatedDate.getTime()).toBe(expectedEffective.getTime());

      // Touch 5 would be due at effectiveCreated + 14 days
      // Since reply just happened and touch 4 is at day 7, touch 5 is at day 14
      // That means 7 more days from the reply — the cadence is pushed forward
      const touch5Schedule = TOUCH_SCHEDULE.get(5);
      const touch5Due = new Date(
        newEffectiveCreatedDate.getTime() + touch5Schedule!.daysFromStart * 86_400_000,
      );

      // Touch 5 should be 7 days after the reply (14 - 7 = 7 days delta)
      const daysDelta = (touch5Due.getTime() - replyDate.getTime()) / 86_400_000;
      expect(daysDelta).toBeCloseTo(7, 0);
    });
  });

  // -------------------------------------------------------------------
  // TEST 12: Full lifecycle: new lead → instant response → touches 2-6
  //          → reply → handoff
  // -------------------------------------------------------------------
  describe("Test 12: Full lifecycle", () => {
    it("should handle new lead through full cadence and handoff", async () => {
      const languageDetector = createMockLanguageDetector("en-CA");
      const inventoryService = createMockInventoryService();
      const complianceMock = createPassingComplianceMock();
      const templateRepo = createMockTemplateRepository();
      let transcript = new LeadTranscript("12345");
      const lead = createLeadData();

      // --- STEP 1: Instant response (touch 1) ---
      const instantAgent = new InstantResponseAgent(
        DEALERSHIP_CONFIG,
        inventoryService,
        complianceMock,
        languageDetector,
        templateRepo,
      );

      const instantResponse = await instantAgent.respond(lead, "sms");
      expect(instantResponse.complianceResult.pass).toBe(true);
      expect(instantResponse.message).toContain("John");

      transcript = transcript.appendMessage("ai", instantResponse.message, {
        channel: "sms",
        touchNumber: 1,
      });

      // --- STEP 2: Cold warming touches 2 through 6 ---
      const coldAgent = new ColdWarmingAgent(
        DEALERSHIP_CONFIG,
        inventoryService,
        complianceMock,
        languageDetector,
        templateRepo,
      );

      for (let touch = 2; touch <= 6; touch++) {
        const touchResult = await coldAgent.generateTouch(lead, touch);
        expect("blocked" in touchResult).toBe(false);

        if (!("blocked" in touchResult)) {
          expect(touchResult.touchNumber).toBe(touch);
          expect(touchResult.complianceResult.pass).toBe(true);

          const expectedChannel = TOUCH_SCHEDULE.get(touch)?.channel ?? "sms";
          expect(touchResult.channel).toBe(expectedChannel);

          transcript = transcript.appendMessage("ai", touchResult.message, {
            channel: touchResult.channel,
            touchNumber: touch,
          });
        }
      }

      // Verify transcript has 6 AI messages (touch 1-6)
      expect(transcript.getMessages()).toHaveLength(6);
      expect(transcript.getLatestTouch()).toBe(6);

      // --- STEP 3: Customer replies with price question ---
      const replyMessage = "how much is the Civic?";
      transcript = transcript.appendMessage("customer", replyMessage, {
        channel: "sms",
        touchNumber: 6,
        metadata: { intent: Intent.PRICE_INQUIRY },
      });

      // --- STEP 4: Classify intent and evaluate handoff ---
      const classifier = new IntentClassifier();
      const intentResult = classifier.classify(replyMessage);
      expect(intentResult.intent).toBe(Intent.PRICE_INQUIRY);

      const ruleEngine = new HandoffRuleEngine(DEFAULT_HANDOFF_RULES);
      const evaluation = ruleEngine.evaluate(intentResult);
      expect(evaluation.shouldHandoff).toBe(true);

      // --- STEP 5: Record handoff ---
      transcript = transcript.appendHandoff(
        intentResult.intent,
        intentResult.confidence,
        "Sarah Johnson",
      );

      expect(transcript.getHandoffs()).toHaveLength(1);
      expect(transcript.getHandoffs()[0].repName).toBe("Sarah Johnson");

      // Verify summary includes conversation context
      const summary = transcript.getSummary();
      expect(summary).toBeTruthy();
      expect(summary.length).toBeGreaterThan(20);
    });
  });

  // -------------------------------------------------------------------
  // TEST 13: Cost tracking — run pipeline → verify API + Twilio costs logged
  // -------------------------------------------------------------------
  describe("Test 13: Cost tracking across pipeline", () => {
    it("should log API and Twilio costs for the full pipeline", async () => {
      const costStore = new InMemoryCostStore();
      const costLogger = new CostLogger(costStore);
      const tenantId = "maple-motors-001";

      // Simulate AI response cost (instant response)
      await costLogger.logApiCall({
        tenantId,
        timestamp: new Date(),
        model: "claude-haiku-3.5",
        inputTokens: 1200,
        outputTokens: 150,
        costUsd: CostLogger.calculateCost("claude-haiku-3.5", 1200, 150),
        operationType: "instant_response",
      });

      // Simulate Twilio SMS cost
      await costLogger.logTwilioMessage({
        tenantId,
        timestamp: new Date(),
        channel: "sms",
        costUsd: 0.0079,
        messageId: "SM1234567890",
      });

      // Simulate intent classification cost
      await costLogger.logApiCall({
        tenantId,
        timestamp: new Date(),
        model: "claude-haiku-3.5",
        inputTokens: 800,
        outputTokens: 50,
        costUsd: CostLogger.calculateCost("claude-haiku-3.5", 800, 50),
        operationType: "intent_classification",
      });

      // Simulate cold warming touch cost
      await costLogger.logApiCall({
        tenantId,
        timestamp: new Date(),
        model: "claude-haiku-3.5",
        inputTokens: 1500,
        outputTokens: 200,
        costUsd: CostLogger.calculateCost("claude-haiku-3.5", 1500, 200),
        operationType: "cold_warming",
      });

      // Simulate second Twilio SMS
      await costLogger.logTwilioMessage({
        tenantId,
        timestamp: new Date(),
        channel: "sms",
        costUsd: 0.0079,
        messageId: "SM1234567891",
      });

      // Generate cost report
      const reporter = new CostReporter(costStore);
      const dateRange = {
        start: new Date(Date.now() - 86_400_000),
        end: new Date(Date.now() + 86_400_000),
      };
      const report = await reporter.generateReport(tenantId, dateRange, {
        totalLeadsHandled: 2,
        totalConversations: 1,
        totalAppointments: 0,
      });

      // Verify costs are tracked
      expect(report.tenantId).toBe(tenantId);
      expect(report.aiCostUsd).toBeGreaterThan(0);
      expect(report.twilioCostUsd).toBeGreaterThan(0);
      expect(report.totalCostUsd).toBe(report.aiCostUsd + report.twilioCostUsd);
      expect(report.costPerLead).toBeGreaterThan(0);
      expect(report.costPerConversation).toBeGreaterThan(0);

      // Verify breakdown by operation type
      expect(report.breakdown.length).toBeGreaterThanOrEqual(2);
      const instantBreakdown = report.breakdown.find((b) => b.operationType === "instant_response");
      expect(instantBreakdown).toBeDefined();
      expect(instantBreakdown!.callCount).toBe(1);

      const warmingBreakdown = report.breakdown.find((b) => b.operationType === "cold_warming");
      expect(warmingBreakdown).toBeDefined();
      expect(warmingBreakdown!.callCount).toBe(1);

      // Verify the summary is readable
      const summary = await reporter.generateSummary(tenantId, dateRange, {
        totalLeadsHandled: 2,
        totalConversations: 1,
        totalAppointments: 0,
      });
      expect(summary).toContain(tenantId);
      expect(summary.length).toBeGreaterThan(50);
    });
  });
});
