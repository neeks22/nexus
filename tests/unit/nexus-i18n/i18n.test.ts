import { describe, it, expect, beforeEach } from "vitest";
import { join } from "node:path";
import {
  LanguageDetector,
  MessageTemplateRepository,
} from "../../../packages/nexus-i18n/src/index.js";
import type {
  LeadForDetection,
  SupportedLocale,
  Channel,
} from "../../../packages/nexus-i18n/src/index.js";

// ---------------------------------------------------------------------------
// LanguageDetector
// ---------------------------------------------------------------------------

describe("LanguageDetector", () => {
  let detector: LanguageDetector;

  beforeEach(() => {
    detector = new LanguageDetector();
  });

  describe("locale field override", () => {
    it("returns fr-CA when locale is 'fr-CA'", () => {
      const lead: LeadForDetection = { locale: "fr-CA" };
      expect(detector.detect(lead)).toBe("fr-CA");
    });

    it("returns fr-CA when locale is 'fr'", () => {
      const lead: LeadForDetection = { locale: "fr" };
      expect(detector.detect(lead)).toBe("fr-CA");
    });

    it("returns fr-CA when locale is 'fr_CA' (underscore)", () => {
      const lead: LeadForDetection = { locale: "fr_CA" };
      expect(detector.detect(lead)).toBe("fr-CA");
    });

    it("returns en-CA when locale is 'en-CA'", () => {
      const lead: LeadForDetection = { locale: "en-CA" };
      expect(detector.detect(lead)).toBe("en-CA");
    });

    it("returns en-CA when locale is 'en'", () => {
      const lead: LeadForDetection = { locale: "en" };
      expect(detector.detect(lead)).toBe("en-CA");
    });

    it("handles case-insensitive locale", () => {
      const lead: LeadForDetection = { locale: "FR-CA" };
      expect(detector.detect(lead)).toBe("fr-CA");
    });

    it("locale takes priority over area code", () => {
      const lead: LeadForDetection = {
        locale: "en-CA",
        phones: [{ number: "5141234567" }],
      };
      expect(detector.detect(lead)).toBe("en-CA");
    });
  });

  describe("Quebec area codes", () => {
    const quebecCodes = ["418", "438", "450", "514", "579", "581", "819", "873"];

    for (const code of quebecCodes) {
      it(`detects ${code} as fr-CA`, () => {
        const lead: LeadForDetection = {
          phones: [{ number: `${code}5551234` }],
        };
        expect(detector.detect(lead)).toBe("fr-CA");
      });
    }

    it("detects Quebec code with +1 prefix", () => {
      const lead: LeadForDetection = {
        phones: [{ number: "+15141234567" }],
      };
      expect(detector.detect(lead)).toBe("fr-CA");
    });

    it("detects Quebec code with formatted phone", () => {
      const lead: LeadForDetection = {
        phones: [{ number: "(514) 123-4567" }],
      };
      expect(detector.detect(lead)).toBe("fr-CA");
    });

    it("detects Quebec code with dots", () => {
      const lead: LeadForDetection = {
        phones: [{ number: "514.123.4567" }],
      };
      expect(detector.detect(lead)).toBe("fr-CA");
    });

    it("returns en-CA for Ontario area code 416", () => {
      const lead: LeadForDetection = {
        phones: [{ number: "4161234567" }],
      };
      expect(detector.detect(lead)).toBe("en-CA");
    });

    it("returns en-CA for Ontario area code 905", () => {
      const lead: LeadForDetection = {
        phones: [{ number: "9051234567" }],
      };
      expect(detector.detect(lead)).toBe("en-CA");
    });

    it("returns en-CA for Alberta area code 403", () => {
      const lead: LeadForDetection = {
        phones: [{ number: "4031234567" }],
      };
      expect(detector.detect(lead)).toBe("en-CA");
    });

    it("checks multiple phones — first Quebec match wins", () => {
      const lead: LeadForDetection = {
        phones: [
          { number: "4161234567" },
          { number: "5141234567" },
        ],
      };
      expect(detector.detect(lead)).toBe("fr-CA");
    });
  });

  describe("postal code detection", () => {
    it("detects H2X (Montreal) as fr-CA", () => {
      const lead: LeadForDetection = { postal_code: "H2X 1Y4" };
      expect(detector.detect(lead)).toBe("fr-CA");
    });

    it("detects G1A (Quebec City) as fr-CA", () => {
      const lead: LeadForDetection = { postal_code: "G1A 1A1" };
      expect(detector.detect(lead)).toBe("fr-CA");
    });

    it("detects J prefix (Quebec suburban) as fr-CA", () => {
      const lead: LeadForDetection = { postal_code: "J4B 5G2" };
      expect(detector.detect(lead)).toBe("fr-CA");
    });

    it("detects lowercase postal code", () => {
      const lead: LeadForDetection = { postal_code: "h2x 1y4" };
      expect(detector.detect(lead)).toBe("fr-CA");
    });

    it("returns en-CA for M5V (Toronto)", () => {
      const lead: LeadForDetection = { postal_code: "M5V 2T6" };
      expect(detector.detect(lead)).toBe("en-CA");
    });

    it("returns en-CA for K prefix (Ottawa)", () => {
      const lead: LeadForDetection = { postal_code: "K1A 0B1" };
      expect(detector.detect(lead)).toBe("en-CA");
    });

    it("returns en-CA for T prefix (Alberta)", () => {
      const lead: LeadForDetection = { postal_code: "T2P 1J9" };
      expect(detector.detect(lead)).toBe("en-CA");
    });

    it("area code takes priority over postal code", () => {
      const lead: LeadForDetection = {
        phones: [{ number: "4161234567" }],  // Ontario
        postal_code: "H2X 1Y4",              // Quebec
      };
      // Area code is checked first — 416 is NOT Quebec, so falls through to postal
      expect(detector.detect(lead)).toBe("fr-CA");
    });
  });

  describe("fallback to en-CA", () => {
    it("returns en-CA when no data is provided", () => {
      const lead: LeadForDetection = {};
      expect(detector.detect(lead)).toBe("en-CA");
    });

    it("returns en-CA when locale is null", () => {
      const lead: LeadForDetection = { locale: null };
      expect(detector.detect(lead)).toBe("en-CA");
    });

    it("returns en-CA when phones is empty", () => {
      const lead: LeadForDetection = { phones: [] };
      expect(detector.detect(lead)).toBe("en-CA");
    });

    it("returns en-CA when postal_code is empty string", () => {
      const lead: LeadForDetection = { postal_code: "" };
      expect(detector.detect(lead)).toBe("en-CA");
    });

    it("returns en-CA when locale is unrecognized", () => {
      const lead: LeadForDetection = { locale: "de-DE" };
      expect(detector.detect(lead)).toBe("en-CA");
    });
  });
});

// ---------------------------------------------------------------------------
// MessageTemplateRepository
// ---------------------------------------------------------------------------

const TEMPLATES_DIR = join(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "nexus-i18n",
  "src",
  "templates",
);

describe("MessageTemplateRepository", () => {
  let repo: MessageTemplateRepository;

  beforeEach(() => {
    repo = new MessageTemplateRepository(TEMPLATES_DIR);
    repo.clearCache();
  });

  describe("template loading", () => {
    it("loads en-CA SMS instant_response template", () => {
      const template = repo.get("instant_response", "en-CA", "sms");
      expect(template).not.toBeNull();
      expect(template).toContain("{{firstName}}");
      expect(template).toContain("{{vehicleModel}}");
      expect(template).toContain("{{dealershipName}}");
    });

    it("loads fr-CA SMS instant_response template", () => {
      const template = repo.get("instant_response", "fr-CA", "sms");
      expect(template).not.toBeNull();
      expect(template).toContain("Bonjour");
      expect(template).toContain("essai routier");
    });

    it("loads en-CA email instant_response template", () => {
      const template = repo.get("instant_response", "en-CA", "email");
      expect(template).not.toBeNull();
      expect(template).toContain("Subject:");
      expect(template).toContain("{{firstName}}");
    });

    it("loads fr-CA email instant_response template", () => {
      const template = repo.get("instant_response", "fr-CA", "email");
      expect(template).not.toBeNull();
      expect(template).toContain("Objet:");
      expect(template).toContain("Bonjour");
    });

    it("returns null for missing template", () => {
      const template = repo.get("nonexistent_template", "en-CA", "sms");
      expect(template).toBeNull();
    });

    it("caches templates on second load", () => {
      const first = repo.get("instant_response", "en-CA", "sms");
      const second = repo.get("instant_response", "en-CA", "sms");
      expect(first).toBe(second);
    });
  });

  describe("all templates exist for both locales", () => {
    const smsTemplateIds = [
      "instant_response",
      "touch_2_followup",
      "touch_3_feature",
      "touch_4_persistence",
      "touch_5_value",
      "touch_6_breakup",
      "touch_7_monthly",
      "handoff_price",
      "handoff_objection",
      "handoff_test_drive",
      "handoff_financing",
      "handoff_general",
      "opt_out_confirmation",
    ];

    const emailTemplateIds = [
      "instant_response",
      "touch_3_feature",
      "touch_5_value",
      "touch_7_monthly",
    ];

    const locales: SupportedLocale[] = ["en-CA", "fr-CA"];

    for (const locale of locales) {
      for (const templateId of smsTemplateIds) {
        it(`${locale}/sms/${templateId} exists`, () => {
          const template = repo.get(templateId, locale, "sms");
          expect(template).not.toBeNull();
          expect(template!.length).toBeGreaterThan(0);
        });
      }

      for (const templateId of emailTemplateIds) {
        it(`${locale}/email/${templateId} exists`, () => {
          const template = repo.get(templateId, locale, "email");
          expect(template).not.toBeNull();
          expect(template!.length).toBeGreaterThan(0);
        });
      }
    }
  });

  describe("template listing", () => {
    it("lists en-CA SMS templates", () => {
      const templates = repo.listTemplates("en-CA", "sms");
      expect(templates).toContain("instant_response");
      expect(templates).toContain("touch_6_breakup");
      expect(templates).toContain("handoff_price");
      expect(templates).toContain("opt_out_confirmation");
      expect(templates.length).toBeGreaterThanOrEqual(13);
    });

    it("lists fr-CA SMS templates", () => {
      const templates = repo.listTemplates("fr-CA", "sms");
      expect(templates.length).toBeGreaterThanOrEqual(13);
    });

    it("lists en-CA email templates", () => {
      const templates = repo.listTemplates("en-CA", "email");
      expect(templates.length).toBeGreaterThanOrEqual(4);
    });

    it("returns empty array for nonexistent locale/channel", () => {
      const templates = repo.listTemplates("en-CA" as SupportedLocale, "smoke_signal" as Channel);
      expect(templates).toEqual([]);
    });
  });

  describe("template rendering", () => {
    it("fills all variables in en-CA SMS instant_response", () => {
      const result = repo.render("instant_response", "en-CA", "sms", {
        firstName: "Sarah",
        vehicleYear: "2024",
        vehicleModel: "CR-V",
        vehicleTrim: "EX-L",
        inventoryDetail:
          "We have one in Platinum White with the panoramic roof.",
        repName: "Alex",
        dealershipName: "Maple Honda",
      });

      expect(result).not.toBeNull();
      expect(result).toContain("Sarah");
      expect(result).toContain("2024");
      expect(result).toContain("CR-V");
      expect(result).toContain("EX-L");
      expect(result).toContain("Platinum White");
      expect(result).toContain("Alex");
      expect(result).toContain("Maple Honda");
      expect(result).not.toContain("{{");
    });

    it("fills all variables in fr-CA SMS instant_response", () => {
      const result = repo.render("instant_response", "fr-CA", "sms", {
        firstName: "Jean",
        vehicleYear: "2024",
        vehicleModel: "Civic",
        vehicleTrim: "Sport",
        inventoryDetail:
          "Nous en avons un en Rouge Rallye avec les sieges en cuir.",
        repName: "Marie",
        dealershipName: "Concessionnaire Laval",
      });

      expect(result).not.toBeNull();
      expect(result).toContain("Bonjour Jean");
      expect(result).toContain("Civic");
      expect(result).toContain("Marie");
      expect(result).toContain("Concessionnaire Laval");
      expect(result).not.toContain("{{");
    });

    it("handles missing variables gracefully (replaces with empty string)", () => {
      const result = repo.render("instant_response", "en-CA", "sms", {
        firstName: "Sarah",
      });

      expect(result).not.toBeNull();
      expect(result).toContain("Sarah");
      // Missing variables should be replaced with empty strings
      expect(result).not.toContain("{{vehicleModel}}");
      expect(result).not.toContain("{{");
    });

    it("returns null for nonexistent template", () => {
      const result = repo.render("nonexistent", "en-CA", "sms", {
        firstName: "Sarah",
      });
      expect(result).toBeNull();
    });

    it("renders email template with all variables", () => {
      const result = repo.render("instant_response", "en-CA", "email", {
        firstName: "Sarah",
        vehicleYear: "2024",
        vehicleModel: "CR-V",
        vehicleTrim: "EX-L",
        inventoryDetail: "We have several in stock.",
        repName: "Alex",
        dealershipName: "Maple Honda",
        dealershipPhone: "416-555-0100",
      });

      expect(result).not.toBeNull();
      expect(result).toContain("Subject:");
      expect(result).toContain("Sarah");
      expect(result).toContain("Maple Honda");
      expect(result).toContain("416-555-0100");
      expect(result).not.toContain("{{");
    });

    it("renders handoff template", () => {
      const result = repo.render("handoff_price", "en-CA", "sms", {
        firstName: "Sarah",
        repName: "Alex",
        vehicleModel: "CR-V",
        dealershipName: "Maple Honda",
      });

      expect(result).not.toBeNull();
      expect(result).toContain("Sarah");
      expect(result).toContain("Alex");
      expect(result).toContain("CR-V");
      expect(result).not.toContain("{{");
    });

    it("renders opt-out confirmation", () => {
      const enResult = repo.render("opt_out_confirmation", "en-CA", "sms", {
        firstName: "Sarah",
        dealershipName: "Maple Honda",
      });
      expect(enResult).not.toBeNull();
      expect(enResult).toContain("unsubscribed");
      expect(enResult).not.toContain("{{");

      const frResult = repo.render("opt_out_confirmation", "fr-CA", "sms", {
        firstName: "Jean",
        dealershipName: "Concessionnaire Laval",
      });
      expect(frResult).not.toBeNull();
      expect(frResult).toContain("desabonne");
      expect(frResult).not.toContain("{{");
    });
  });

  describe("email templates are longer than SMS", () => {
    it("en-CA email instant_response is longer than SMS version", () => {
      const sms = repo.get("instant_response", "en-CA", "sms");
      const email = repo.get("instant_response", "en-CA", "email");
      expect(sms).not.toBeNull();
      expect(email).not.toBeNull();
      expect(email!.length).toBeGreaterThan(sms!.length);
    });

    it("fr-CA email instant_response is longer than SMS version", () => {
      const sms = repo.get("instant_response", "fr-CA", "sms");
      const email = repo.get("instant_response", "fr-CA", "email");
      expect(sms).not.toBeNull();
      expect(email).not.toBeNull();
      expect(email!.length).toBeGreaterThan(sms!.length);
    });
  });
});
