import { describe, it, expect, beforeEach } from "vitest";
import {
  buildAdCopyPrompt,
  detectComplianceFlag,
  validateCharLimit,
  validateStyleRules,
  META_PRIMARY_TEXT_MAX_CHARS,
  META_HEADLINE_MAX_CHARS,
  META_DESCRIPTION_MAX_CHARS,
  GOOGLE_HEADLINE_MAX_CHARS,
  GOOGLE_DESCRIPTION_MAX_CHARS,
} from "../../../packages/nexus-agents/src/prompts/ad-copy.js";
import { AdCopyAgent } from "../../../packages/nexus-agents/src/ad-copy-agent.js";
import type {
  DealershipConfig,
  CampaignType,
  AdCopyVehicle,
  AdCopyOffer,
  AdCopyAudience,
  MetaAdSet,
  GoogleAdSet,
  SocialPost,
} from "../../../packages/nexus-agents/src/types.js";
import type { AdCopyInventoryServiceDep } from "../../../packages/nexus-agents/src/ad-copy-agent.js";

// --- Test Fixtures ---

function createDealershipConfig(overrides?: Partial<DealershipConfig>): DealershipConfig {
  return {
    dealershipName: "Maple Motors",
    address: "123 Main St, Ottawa, ON K1A 0B1",
    phone: "(613) 555-1234",
    hours: "Mon-Fri 9AM-8PM, Sat 9AM-5PM",
    timezone: "America/Toronto",
    tone: "friendly",
    staff: [
      { name: "Sarah Johnson", role: "Sales Manager", email: "sarah@maplemotors.ca" },
    ],
    escalationNumbers: ["(613) 555-0000"],
    ...overrides,
  };
}

function createVehicle(overrides?: Partial<AdCopyVehicle>): AdCopyVehicle {
  return {
    year: 2023,
    make: "Honda",
    model: "CR-V",
    trim: "EX-L",
    mileage: 45000,
    price: 28900,
    weeklyPayment: 89,
    monthlyPayment: 375,
    color: "Platinum White",
    features: ["AWD", "heated seats", "backup camera"],
    ...overrides,
  };
}

function createOffer(overrides?: Partial<AdCopyOffer>): AdCopyOffer {
  return {
    title: "$0 Down Weekend Event",
    details: "Zero down payment on select vehicles this weekend",
    endDate: "2026-04-05",
    downPayment: 0,
    ...overrides,
  };
}

function createInventoryService(): AdCopyInventoryServiceDep {
  return {
    getVehicleDetails: async (_vin: string) => createVehicle(),
    getInventoryCount: async (_make?: string, _model?: string) => 215,
  };
}

// --- Tests ---

describe("Ad Copy Prompt Builder", () => {
  it("builds a prompt with role, campaign brief, and output requirements", () => {
    const config = createDealershipConfig();
    const prompt = buildAdCopyPrompt({
      dealershipConfig: config,
      campaignType: "new_inventory",
      locale: "en-CA",
    });

    expect(prompt).toContain("<role>");
    expect(prompt).toContain("senior automotive advertising copywriter");
    expect(prompt).toContain("<campaign_brief>");
    expect(prompt).toContain("Maple Motors");
    expect(prompt).toContain("<output_requirements>");
    expect(prompt).toContain("<style_rules>");
    expect(prompt).toContain("<compliance_rules>");
  });

  it("includes vehicle details in campaign brief when provided", () => {
    const config = createDealershipConfig();
    const vehicle = createVehicle();
    const prompt = buildAdCopyPrompt({
      dealershipConfig: config,
      campaignType: "used_inventory",
      locale: "en-CA",
      vehicle,
    });

    expect(prompt).toContain("2023 Honda CR-V EX-L");
    expect(prompt).toContain("45000 km");
    expect(prompt).toContain("$89/week");
  });

  it("includes offer details when provided", () => {
    const config = createDealershipConfig();
    const offer = createOffer();
    const prompt = buildAdCopyPrompt({
      dealershipConfig: config,
      campaignType: "seasonal",
      locale: "en-CA",
      offer,
    });

    expect(prompt).toContain("$0 Down Weekend Event");
    expect(prompt).toContain("2026-04-05");
  });

  it("includes conquest section when campaign type is conquest", () => {
    const config = createDealershipConfig();
    const prompt = buildAdCopyPrompt({
      dealershipConfig: config,
      campaignType: "conquest",
      locale: "en-CA",
      competitorName: "AutoMax",
    });

    expect(prompt).toContain("Competitor Target: AutoMax");
    expect(prompt).toContain("CONQUEST ADS");
  });

  it("builds French prompt with Quebec conventions", () => {
    const config = createDealershipConfig();
    const prompt = buildAdCopyPrompt({
      dealershipConfig: config,
      campaignType: "new_inventory",
      locale: "fr-CA",
    });

    expect(prompt).toContain("<french_conventions>");
    expect(prompt).toContain("Quebec French");
    expect(prompt).toContain("essai routier");
    expect(prompt).toContain("mise de fonds");
    expect(prompt).toContain("Loi 101");
    expect(prompt).toContain("francais quebecois");
  });

  it("includes subprime hooks in English", () => {
    const config = createDealershipConfig();
    const prompt = buildAdCopyPrompt({
      dealershipConfig: config,
      campaignType: "used_inventory",
      locale: "en-CA",
    });

    expect(prompt).toContain("Your Job Is Your Credit");
    expect(prompt).toContain("$0 Down");
    expect(prompt).toContain("Fresh Start Program");
  });

  it("includes subprime hooks in French", () => {
    const config = createDealershipConfig();
    const prompt = buildAdCopyPrompt({
      dealershipConfig: config,
      campaignType: "used_inventory",
      locale: "fr-CA",
    });

    expect(prompt).toContain("Ton emploi, c'est ta cle");
    expect(prompt).toContain("Programme Nouveau Depart");
    expect(prompt).toContain("0$ de mise de fonds");
  });

  it("specifies character limits in output requirements", () => {
    const config = createDealershipConfig();
    const prompt = buildAdCopyPrompt({
      dealershipConfig: config,
      campaignType: "new_inventory",
      locale: "en-CA",
    });

    expect(prompt).toContain(`${META_PRIMARY_TEXT_MAX_CHARS} chars max`);
    expect(prompt).toContain(`${META_HEADLINE_MAX_CHARS} chars max`);
    expect(prompt).toContain(`${META_DESCRIPTION_MAX_CHARS} chars max`);
    expect(prompt).toContain(`${GOOGLE_HEADLINE_MAX_CHARS} chars each`);
    expect(prompt).toContain(`${GOOGLE_DESCRIPTION_MAX_CHARS} chars each`);
  });
});

describe("Compliance Flag Detection", () => {
  it("flags text containing 'bad credit' as FLAGGED", () => {
    expect(detectComplianceFlag("Bad credit? We can help!")).toBe("FLAGGED");
  });

  it("flags text containing 'guaranteed approval' as FLAGGED", () => {
    expect(detectComplianceFlag("Guaranteed approval for everyone")).toBe("FLAGGED");
  });

  it("flags text with 'no credit check' as FLAGGED", () => {
    expect(detectComplianceFlag("No credit check required")).toBe("FLAGGED");
  });

  it("marks text with 'all credit situations' as REVIEW", () => {
    expect(detectComplianceFlag("We welcome all credit situations")).toBe("REVIEW");
  });

  it("marks text with 'rebuild your credit' as REVIEW", () => {
    expect(detectComplianceFlag("Rebuild your credit while you drive")).toBe("REVIEW");
  });

  it("marks compliant text as COMPLIANT", () => {
    expect(detectComplianceFlag("2023 Honda CR-V now available in Ottawa. Financing options available.")).toBe("COMPLIANT");
  });

  it("detects French flagged phrases", () => {
    expect(detectComplianceFlag("Mauvais credit? On peut aider!")).toBe("FLAGGED");
  });

  it("detects French review phrases", () => {
    expect(detectComplianceFlag("Reconstruction de credit en roulant")).toBe("REVIEW");
  });
});

describe("Character Limit Validation", () => {
  it("validates text within limit", () => {
    expect(validateCharLimit("Short text", 125)).toBe(true);
  });

  it("rejects text exceeding limit", () => {
    const longText = "A".repeat(126);
    expect(validateCharLimit(longText, 125)).toBe(false);
  });

  it("accepts text exactly at limit", () => {
    const exactText = "A".repeat(125);
    expect(validateCharLimit(exactText, 125)).toBe(true);
  });
});

describe("Style Rules Validation", () => {
  it("passes clean text", () => {
    const result = validateStyleRules("Check out this 2023 Honda CR-V. Financing available.");
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("detects ALL CAPS words (3+ chars)", () => {
    const result = validateStyleRules("HUGE SALE on all vehicles TODAY");
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("ALL CAPS"))).toBe(true);
  });

  it("allows known acronyms like SUV, AWD", () => {
    const result = validateStyleRules("This SUV has AWD and GPS navigation.");
    expect(result.valid).toBe(true);
  });

  it("detects excessive exclamation marks", () => {
    const result = validateStyleRules("Amazing deal! Don't miss out! Apply now!");
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("exclamation"))).toBe(true);
  });

  it("allows single exclamation mark", () => {
    const result = validateStyleRules("Amazing deal! Apply now.");
    expect(result.valid).toBe(true);
  });
});

describe("AdCopyAgent", () => {
  let agent: AdCopyAgent;
  let config: DealershipConfig;
  let inventoryService: AdCopyInventoryServiceDep;

  beforeEach(() => {
    config = createDealershipConfig();
    inventoryService = createInventoryService();
    agent = new AdCopyAgent(config, inventoryService);
  });

  describe("generateMetaAds", () => {
    const campaignTypes: CampaignType[] = [
      "new_inventory", "used_inventory", "service",
      "seasonal", "conquest", "retention",
    ];

    for (const campaignType of campaignTypes) {
      it(`generates Meta ads for ${campaignType} campaign`, () => {
        const vehicle = createVehicle();
        const ads = agent.generateMetaAds(campaignType, vehicle);

        expect(ads.length).toBeGreaterThanOrEqual(3);
        for (const ad of ads) {
          expect(ad.primaryText).toBeTruthy();
          expect(ad.headline).toBeTruthy();
          expect(ad.description).toBeTruthy();
          expect(ad.ctaButton).toBeTruthy();
          expect(ad.imageGuidance).toBeTruthy();
          expect(["COMPLIANT", "REVIEW", "FLAGGED"]).toContain(ad.complianceFlag);
          expect(ad.specialAdCategory).toBe("Credit");
          expect(ad.locale).toBe("en-CA");
        }
      });
    }

    it("interpolates vehicle details into templates", () => {
      const vehicle = createVehicle();
      const ads = agent.generateMetaAds("used_inventory", vehicle);

      const allText = ads.map((a) => `${a.primaryText} ${a.headline}`).join(" ");
      expect(allText).toContain("Honda");
      expect(allText).toContain("CR-V");
      expect(allText).toContain("2023");
    });

    it("interpolates dealership name into templates", () => {
      const ads = agent.generateMetaAds("new_inventory");

      const allText = ads.map((a) => `${a.primaryText} ${a.headline}`).join(" ");
      expect(allText).toContain("Maple Motors");
    });

    it("generates French Meta ads", () => {
      const vehicle = createVehicle();
      const ads = agent.generateMetaAds("new_inventory", vehicle, undefined, undefined, "fr-CA");

      expect(ads.length).toBeGreaterThanOrEqual(3);
      for (const ad of ads) {
        expect(ad.locale).toBe("fr-CA");
        expect(ad.specialAdCategory).toBe("Credit");
      }
      // Check for French content
      const allText = ads.map((a) => a.primaryText).join(" ");
      expect(allText).toMatch(/financement|vehicule|demande|appliquez/i);
    });
  });

  describe("generateGoogleAds", () => {
    it("generates Google RSA ads with 5 headlines and 3 descriptions", () => {
      const vehicle = createVehicle();
      const ads = agent.generateGoogleAds(
        ["bad credit car loans ottawa", "car financing ottawa"],
        "used_inventory",
        vehicle,
      );

      expect(ads.length).toBe(1);
      const ad = ads[0];
      expect(ad.headlines).toHaveLength(5);
      expect(ad.descriptions).toHaveLength(3);
      expect(ad.displayUrlPath).toBeTruthy();
      expect(ad.sitelinkExtensions.length).toBeGreaterThanOrEqual(4);
      expect(["COMPLIANT", "REVIEW", "FLAGGED"]).toContain(ad.complianceFlag);
    });

    it("generates French Google ads", () => {
      const ads = agent.generateGoogleAds(
        ["financement auto gatineau"],
        "new_inventory",
        undefined,
        undefined,
        "fr-CA",
      );

      expect(ads.length).toBe(1);
      const ad = ads[0];
      expect(ad.headlines).toHaveLength(5);
      const allText = [...ad.headlines, ...ad.descriptions].join(" ");
      expect(allText).toMatch(/financement|vehicule|demande/i);
    });

    it("includes sitelink extensions", () => {
      const ads = agent.generateGoogleAds(
        ["car loans ottawa"],
        "used_inventory",
      );

      const ad = ads[0];
      expect(ad.sitelinkExtensions.length).toBeGreaterThanOrEqual(4);
      expect(ad.sitelinkExtensions.some((s) => s.includes("Apply") || s.includes("Inventory"))).toBe(true);
    });
  });

  describe("generateRetargetingAds", () => {
    it("generates retargeting ads referencing the specific vehicle", () => {
      const vehicle = createVehicle();
      const ads = agent.generateRetargetingAds(vehicle);

      expect(ads.length).toBe(2);
      for (const ad of ads) {
        expect(ad.primaryText).toContain("Honda");
        expect(ad.primaryText).toContain("CR-V");
        expect(ad.specialAdCategory).toBe("Credit");
        expect(["COMPLIANT", "REVIEW", "FLAGGED"]).toContain(ad.complianceFlag);
      }
    });

    it("generates French retargeting ads", () => {
      const vehicle = createVehicle();
      const ads = agent.generateRetargetingAds(vehicle, "fr-CA");

      expect(ads.length).toBe(2);
      for (const ad of ads) {
        expect(ad.locale).toBe("fr-CA");
        expect(ad.primaryText).toContain("Honda");
      }
    });

    it("uses urgency and availability angles", () => {
      const vehicle = createVehicle();
      const ads = agent.generateRetargetingAds(vehicle);

      const allText = ads.map((a) => a.primaryText).join(" ");
      expect(allText).toMatch(/still|hasn't sold|not for long/i);
    });
  });

  describe("generateConquestAds", () => {
    it("generates conquest ads mentioning the competitor", () => {
      const ads = agent.generateConquestAds("AutoMax");

      expect(ads.length).toBe(2);
      // At least one ad references the competitor by name
      const allPrimaryText = ads.map((a) => a.primaryText).join(" ");
      expect(allPrimaryText).toContain("AutoMax");
      expect(allPrimaryText).toContain("Maple Motors");
      for (const ad of ads) {
        expect(ad.specialAdCategory).toBe("Credit");
      }
    });

    it("does not badmouth the competitor", () => {
      const ads = agent.generateConquestAds("AutoMax");

      for (const ad of ads) {
        const allText = `${ad.primaryText} ${ad.headline} ${ad.description}`;
        expect(allText).not.toMatch(/worse|terrible|avoid|scam/i);
      }
    });

    it("generates French conquest ads", () => {
      const ads = agent.generateConquestAds("AutoMax", "fr-CA");

      expect(ads.length).toBe(2);
      const allPrimaryText = ads.map((a) => a.primaryText).join(" ");
      expect(allPrimaryText).toContain("AutoMax");
      for (const ad of ads) {
        expect(ad.locale).toBe("fr-CA");
      }
    });
  });

  describe("generateSocialPost", () => {
    it("generates a social post with all required fields", () => {
      const vehicle = createVehicle();
      const post = agent.generateSocialPost("Monday", vehicle);

      expect(post.platform).toBe("facebook");
      expect(post.caption).toBeTruthy();
      expect(post.imageDescription).toBeTruthy();
      expect(post.hashtags.length).toBeGreaterThan(0);
      expect(post.cta).toBeTruthy();
      expect(post.postTime).toBeTruthy();
      expect(["COMPLIANT", "REVIEW", "FLAGGED"]).toContain(post.complianceFlag);
      expect(post.locale).toBe("en-CA");
    });

    it("includes day-of-week theme", () => {
      const post = agent.generateSocialPost("Friday");
      expect(post.caption).toContain("Feature Friday");
    });

    it("includes vehicle details when provided", () => {
      const vehicle = createVehicle();
      const post = agent.generateSocialPost("Tuesday", vehicle);

      expect(post.caption).toContain("Honda");
      expect(post.caption).toContain("CR-V");
      expect(post.caption).toContain("375");
    });

    it("generates French social post", () => {
      const vehicle = createVehicle();
      const post = agent.generateSocialPost("Monday", vehicle, undefined, "fr-CA");

      expect(post.locale).toBe("fr-CA");
      expect(post.caption).toContain("Lundi Motivation");
      expect(post.hashtags.some((h) => h.includes("Financement") || h.includes("Roulez"))).toBe(true);
    });

    it("includes promotion text when provided", () => {
      const post = agent.generateSocialPost("Saturday", undefined, "Weekend clearance event");
      expect(post.caption).toContain("Weekend clearance event");
    });

    it("sets optimal posting time based on day", () => {
      const mondayPost = agent.generateSocialPost("Monday");
      expect(mondayPost.postTime).toBe("11:00");

      const saturdayPost = agent.generateSocialPost("Saturday");
      expect(saturdayPost.postTime).toBe("09:00");
    });
  });

  describe("getSystemPrompt", () => {
    it("returns a complete system prompt for AI integration", () => {
      const prompt = agent.getSystemPrompt(
        "used_inventory",
        "en-CA",
        createVehicle(),
        createOffer(),
      );

      expect(prompt).toContain("<role>");
      expect(prompt).toContain("<campaign_brief>");
      expect(prompt).toContain("<output_requirements>");
      expect(prompt).toContain("<compliance_rules>");
      expect(prompt).toContain("Meta Special Ad Category");
    });
  });
});
