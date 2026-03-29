// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Cold Lead Warming Agent — Unit Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildColdWarmingPrompt } from "../../../packages/nexus-agents/src/prompts/cold-warming.js";
import { ColdWarmingAgent } from "../../../packages/nexus-agents/src/cold-warming-agent.js";
import type {
  InventoryServiceDep,
  CompliancePreFlightDep,
  LanguageDetectorDep,
  TemplateRepositoryDep,
  GenerateTouchResult,
} from "../../../packages/nexus-agents/src/cold-warming-agent.js";
import {
  TOUCH_SCHEDULE,
  getScheduleForTouch,
  calculateTouchDueDate,
  isOverdue,
  resetCadence,
} from "../../../packages/nexus-agents/src/touch-scheduler.js";
import type {
  DealershipConfig,
  LeadData,
  AgentContext,
  VehicleMatchInfo,
  ConversationEntry,
} from "../../../packages/nexus-agents/src/types.js";

// --- Test fixtures ---

function makeDealershipConfig(): DealershipConfig {
  return {
    dealershipName: "Maple Honda",
    address: "123 Auto Drive, Ottawa, ON K1A 0B1",
    phone: "613-555-0100",
    hours: "Mon-Sat 9am-8pm, Sun 11am-5pm",
    timezone: "America/Toronto",
    tone: "friendly",
    staff: [
      { name: "Alex Thompson", role: "Sales Manager", email: "alex@maplehonda.ca" },
      { name: "Marie Dupont", role: "Sales Representative", email: "marie@maplehonda.ca" },
    ],
    escalationNumbers: ["613-555-0199"],
  };
}

function makeLead(overrides?: Partial<LeadData>): LeadData {
  return {
    id: 1001,
    first_name: "Sarah",
    last_name: "Johnson",
    locale: "en-CA",
    source: "AutoTrader",
    phones: [{ number: "613-555-1234" }],
    emails: [{ address: "sarah@example.com" }],
    postal_code: "K1A 0B1",
    vehicles: [
      { make: "Honda", model: "CR-V", year: 2024, trim: "EX-L", type: "wanted" },
    ],
    ...overrides,
  };
}

function makeVehicleMatches(): VehicleMatchInfo[] {
  return [
    {
      year: 2024,
      make: "Honda",
      model: "CR-V",
      trim: "EX-L",
      color: "Platinum White",
      features: ["panoramic roof", "leather seats", "AWD"],
      vin: "1HGCV2F94RA000001",
      matchScore: 0.95,
      matchReasons: ["make_model_match", "year_match"],
    },
    {
      year: 2024,
      make: "Honda",
      model: "CR-V",
      trim: "Sport",
      color: "Rallye Red",
      features: ["Apple CarPlay", "heated seats"],
      vin: "1HGCV2F94RA000002",
      matchScore: 0.75,
      matchReasons: ["make_model_match"],
    },
  ];
}

function makeInventoryResult() {
  return [
    {
      vehicle: {
        vin: "1HGCV2F94RA000001",
        make: "Honda",
        model: "CR-V",
        year: 2024,
        trim: "EX-L",
        color: "Platinum White",
        features: ["panoramic roof", "leather seats", "AWD"],
        msrp: 42000,
        stockStatus: "available",
        daysOnLot: 12,
      },
      matchScore: 0.95,
      matchReasons: ["make_model_match", "year_match"],
    },
  ];
}

function makeContext(touchNumber: number, locale: "en-CA" | "fr-CA" = "en-CA", history?: ConversationEntry[]): AgentContext {
  return {
    lead: makeLead({ locale }),
    locale,
    vehicleMatches: makeVehicleMatches(),
    dealershipConfig: makeDealershipConfig(),
    touchNumber,
    conversationHistory: history,
  };
}

// --- Mock dependencies ---

function makeMockInventoryService(): InventoryServiceDep {
  return {
    findMatching: vi.fn().mockResolvedValue(makeInventoryResult()),
  };
}

function makeMockCompliancePassing(): CompliancePreFlightDep {
  return {
    check: vi.fn().mockReturnValue({ pass: true, failures: [] }),
  };
}

function makeMockComplianceFailing(): CompliancePreFlightDep {
  return {
    check: vi.fn().mockReturnValue({
      pass: false,
      failures: [{ checker: "opt-out", reason: "Lead unsubscribed from SMS" }],
    }),
  };
}

function makeMockLanguageDetector(locale: "en-CA" | "fr-CA" = "en-CA"): LanguageDetectorDep {
  return {
    detect: vi.fn().mockReturnValue(locale),
  };
}

function makeMockTemplateRepository(): TemplateRepositoryDep {
  return {
    render: vi.fn().mockImplementation(
      (templateId: string, locale: string, channel: string, variables: Record<string, string | undefined>) => {
        const firstName = variables["firstName"] ?? "there";
        const vehicleMake = variables["vehicleMake"] ?? "";
        const vehicleModel = variables["vehicleModel"] ?? "";
        const vehicleColor = variables["vehicleColor"] ?? "";
        const inventoryDetail = variables["inventoryDetail"] ?? "";
        const repName = variables["repName"] ?? "our team";

        if (templateId === "touch_2_followup") {
          return `Hi ${firstName}! Just following up — did you get a chance to look at the ${vehicleMake} ${vehicleModel} in ${vehicleColor}? ${inventoryDetail} - ${repName}`;
        }
        if (templateId === "touch_3_feature") {
          return `Hi ${firstName}, the ${vehicleMake} ${vehicleModel} comes with ${inventoryDetail}. Based on our current listings we have one available.`;
        }
        if (templateId === "touch_4_persistence") {
          return `Hi ${firstName}, just wanted to make sure you saw my note about the ${vehicleMake} ${vehicleModel}. ${inventoryDetail}`;
        }
        if (templateId === "touch_5_value") {
          return `Hi ${firstName}, we just got some new arrivals — the ${vehicleMake} ${vehicleModel} in ${vehicleColor} with ${inventoryDetail}. Based on our current listings.`;
        }
        if (templateId === "touch_7_monthly") {
          return `Hi ${firstName}, just a quick update — we have new inventory including a ${vehicleMake} ${vehicleModel} in ${vehicleColor}. Based on our current listings. No rush at all!`;
        }
        return null;
      },
    ),
  };
}

function makeAgent(overrides?: {
  inventoryService?: InventoryServiceDep;
  compliance?: CompliancePreFlightDep;
  languageDetector?: LanguageDetectorDep;
  templateRepository?: TemplateRepositoryDep;
}): ColdWarmingAgent {
  return new ColdWarmingAgent(
    makeDealershipConfig(),
    overrides?.inventoryService ?? makeMockInventoryService(),
    overrides?.compliance ?? makeMockCompliancePassing(),
    overrides?.languageDetector ?? makeMockLanguageDetector(),
    overrides?.templateRepository ?? makeMockTemplateRepository(),
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Prompt Builder Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("buildColdWarmingPrompt", () => {
  it("adapts tone for touch 1 — enthusiastic keywords", () => {
    const prompt = buildColdWarmingPrompt(makeContext(1));
    expect(prompt).toContain("ENTHUSIASTIC");
    expect(prompt).toContain("enthusiastic");
    expect(prompt).toContain("eager");
    expect(prompt).toContain("Touch 1");
  });

  it("adapts tone for touch 2 — enthusiastic keywords", () => {
    const prompt = buildColdWarmingPrompt(makeContext(2));
    expect(prompt).toContain("ENTHUSIASTIC");
    expect(prompt).toContain("Touch 2");
  });

  it("adapts tone for touch 3 — consultative keywords", () => {
    const prompt = buildColdWarmingPrompt(makeContext(3));
    expect(prompt).toContain("CONSULTATIVE");
    expect(prompt).toContain("consultative");
    expect(prompt).toContain("add value");
    expect(prompt).toContain("Touch 3");
  });

  it("adapts tone for touch 4 — consultative keywords", () => {
    const prompt = buildColdWarmingPrompt(makeContext(4));
    expect(prompt).toContain("CONSULTATIVE");
    expect(prompt).toContain("Touch 4");
  });

  it("adapts tone for touch 5 — consultative keywords", () => {
    const prompt = buildColdWarmingPrompt(makeContext(5));
    expect(prompt).toContain("CONSULTATIVE");
    expect(prompt).toContain("Touch 5");
  });

  it("adapts tone for touch 6 — respectful close keywords", () => {
    const prompt = buildColdWarmingPrompt(makeContext(6));
    expect(prompt).toContain("RESPECTFUL CLOSE");
    expect(prompt).toContain("break-up");
    expect(prompt).toContain("timing might not be right");
    expect(prompt).toContain("Touch 6");
  });

  it("adapts tone for touch 7+ — informational / monthly nurture", () => {
    const prompt = buildColdWarmingPrompt(makeContext(7));
    expect(prompt).toContain("INFORMATIONAL");
    expect(prompt).toContain("Monthly Nurture");
    expect(prompt).toContain("no-pressure");
    expect(prompt).toContain("Touch 7");
  });

  it("adapts tone for touch 10 — still informational", () => {
    const prompt = buildColdWarmingPrompt(makeContext(10));
    expect(prompt).toContain("INFORMATIONAL");
    expect(prompt).toContain("Touch 10");
  });

  it("includes safety rails — no pricing, no financing", () => {
    const prompt = buildColdWarmingPrompt(makeContext(3));
    expect(prompt).toContain("SAFETY RAILS");
    expect(prompt).toContain("Pricing negotiation");
    expect(prompt).toContain("Financing terms");
    expect(prompt).toContain("Monthly payment");
    expect(prompt).toContain("interest rates");
  });

  it("includes no-repeat instruction in every prompt", () => {
    for (const touch of [1, 3, 5, 6, 7, 10]) {
      const prompt = buildColdWarmingPrompt(makeContext(touch));
      expect(prompt).toContain("Never repeat the same message angle");
      expect(prompt).toContain("different approach each time");
    }
  });

  it("includes language directive for en-CA", () => {
    const prompt = buildColdWarmingPrompt(makeContext(2, "en-CA"));
    expect(prompt).toContain("Canadian English");
  });

  it("includes language directive for fr-CA", () => {
    const prompt = buildColdWarmingPrompt(makeContext(2, "fr-CA"));
    expect(prompt).toContain("Quebec French");
    expect(prompt).toContain("essai routier");
  });

  it("includes vehicle inventory references", () => {
    const prompt = buildColdWarmingPrompt(makeContext(3));
    expect(prompt).toContain("2024 Honda CR-V EX-L in Platinum White");
    expect(prompt).toContain("panoramic roof");
    expect(prompt).toContain("based on our current listings");
  });

  it("handles empty vehicle matches gracefully", () => {
    const ctx = makeContext(3);
    (ctx as { vehicleMatches: VehicleMatchInfo[] }).vehicleMatches = [];
    const prompt = buildColdWarmingPrompt(ctx);
    expect(prompt).toContain("No specific vehicle matches");
    expect(prompt).toContain("new arrivals");
  });

  it("includes conversation history when provided", () => {
    const history: ConversationEntry[] = [
      { role: "ai", content: "Hi Sarah! Excited about the CR-V!", timestamp: Date.now() - 100000 },
      { role: "customer", content: "Thanks, I'll think about it", timestamp: Date.now() - 50000 },
    ];
    const prompt = buildColdWarmingPrompt(makeContext(3, "en-CA", history));
    expect(prompt).toContain("You (AI): Hi Sarah!");
    expect(prompt).toContain("Customer: Thanks");
    expect(prompt).toContain("Do NOT repeat the same angle");
  });

  it("shows empty history message when no conversation", () => {
    const prompt = buildColdWarmingPrompt(makeContext(1));
    expect(prompt).toContain("No previous messages");
  });

  it("includes dealership info", () => {
    const prompt = buildColdWarmingPrompt(makeContext(2));
    expect(prompt).toContain("Maple Honda");
    expect(prompt).toContain("613-555-0100");
  });

  it("includes customer name", () => {
    const prompt = buildColdWarmingPrompt(makeContext(2));
    expect(prompt).toContain("Sarah");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ColdWarmingAgent Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("ColdWarmingAgent", () => {
  describe("generateTouch", () => {
    it("generates touch 2 with SMS channel", async () => {
      const agent = makeAgent();
      const result = await agent.generateTouch(makeLead(), 2);

      expect("blocked" in result).toBe(false);
      const touchResult = result as { message: string; channel: string; locale: string; touchNumber: number };
      expect(touchResult.channel).toBe("sms");
      expect(touchResult.touchNumber).toBe(2);
      expect(touchResult.locale).toBe("en-CA");
      expect(touchResult.message).toBeTruthy();
    });

    it("generates touch 3 with email channel", async () => {
      const agent = makeAgent();
      const result = await agent.generateTouch(makeLead(), 3);

      expect("blocked" in result).toBe(false);
      const touchResult = result as { message: string; channel: string };
      expect(touchResult.channel).toBe("email");
    });

    it("generates touch 4 with SMS channel", async () => {
      const agent = makeAgent();
      const result = await agent.generateTouch(makeLead(), 4);

      const touchResult = result as { channel: string };
      expect(touchResult.channel).toBe("sms");
    });

    it("generates touch 5 with email channel", async () => {
      const agent = makeAgent();
      const result = await agent.generateTouch(makeLead(), 5);

      const touchResult = result as { channel: string };
      expect(touchResult.channel).toBe("email");
    });

    it("generates touch 6 with SMS channel (break-up)", async () => {
      const agent = makeAgent();
      const result = await agent.generateTouch(makeLead(), 6);

      expect("blocked" in result).toBe(false);
      const touchResult = result as { message: string; channel: string };
      expect(touchResult.channel).toBe("sms");
      expect(touchResult.message).toContain("timing might not be right");
    });

    it("generates touch 7+ with email channel", async () => {
      const agent = makeAgent();
      const result = await agent.generateTouch(makeLead(), 7);

      const touchResult = result as { channel: string };
      expect(touchResult.channel).toBe("email");
    });

    it("channel selection: SMS for even touches, email for odd (3+)", async () => {
      const agent = makeAgent();

      // Touch 2: SMS (even)
      const t2 = await agent.generateTouch(makeLead(), 2);
      expect((t2 as { channel: string }).channel).toBe("sms");

      // Touch 3: Email (odd, 3+)
      const t3 = await agent.generateTouch(makeLead(), 3);
      expect((t3 as { channel: string }).channel).toBe("email");

      // Touch 4: SMS (even)
      const t4 = await agent.generateTouch(makeLead(), 4);
      expect((t4 as { channel: string }).channel).toBe("sms");

      // Touch 5: Email (odd)
      const t5 = await agent.generateTouch(makeLead(), 5);
      expect((t5 as { channel: string }).channel).toBe("email");

      // Touch 6: SMS (even)
      const t6 = await agent.generateTouch(makeLead(), 6);
      expect((t6 as { channel: string }).channel).toBe("sms");

      // Touch 7: Email (odd)
      const t7 = await agent.generateTouch(makeLead(), 7);
      expect((t7 as { channel: string }).channel).toBe("email");
    });

    it("compliance block prevents message generation", async () => {
      const agent = makeAgent({
        compliance: makeMockComplianceFailing(),
      });
      const result = await agent.generateTouch(makeLead(), 2);

      expect("blocked" in result && result.blocked).toBe(true);
      expect(result.complianceResult.pass).toBe(false);
      expect(result.complianceResult.failures.length).toBeGreaterThan(0);
      expect(result.complianceResult.failures[0]!.checker).toBe("opt-out");
    });

    it("detects language via language detector", async () => {
      const agent = makeAgent({
        languageDetector: makeMockLanguageDetector("fr-CA"),
      });
      const result = await agent.generateTouch(makeLead({ locale: "fr-CA" }), 6);

      expect(result.locale).toBe("fr-CA");
    });

    it("queries inventory service for vehicle matches", async () => {
      const inventoryService = makeMockInventoryService();
      const agent = makeAgent({ inventoryService });
      await agent.generateTouch(makeLead(), 2);

      expect(inventoryService.findMatching).toHaveBeenCalledWith({
        make: "Honda",
        model: "CR-V",
        year: 2024,
      });
    });

    it("inventory references present in template-rendered touches", async () => {
      const agent = makeAgent();
      const result = await agent.generateTouch(makeLead(), 2);

      expect("blocked" in result).toBe(false);
      const touchResult = result as { message: string };
      // Template includes vehicle make/model from variables
      expect(touchResult.message).toContain("Honda");
      expect(touchResult.message).toContain("CR-V");
    });
  });

  describe("getBreakupMessage", () => {
    it("returns English break-up message for en-CA", () => {
      const agent = makeAgent();
      const msg = agent.getBreakupMessage("en-CA");
      expect(msg).toContain("timing might not be right");
      expect(msg).toContain("no worries");
      expect(msg).toContain("when you're ready");
    });

    it("returns French break-up message for fr-CA", () => {
      const agent = makeAgent();
      const msg = agent.getBreakupMessage("fr-CA");
      expect(msg).toContain("moment n'est peut-etre pas ideal");
      expect(msg).toContain("pas de souci");
      expect(msg).toContain("quand vous serez pret");
    });
  });

  describe("getNextTouchDate", () => {
    const baseDate = new Date("2026-03-01T09:00:00Z");

    it("touch 1 → touch 2: +2 days", () => {
      const agent = makeAgent();
      const nextDate = agent.getNextTouchDate(1, baseDate);
      const expected = new Date("2026-03-03T09:00:00Z");
      expect(nextDate.getTime()).toBe(expected.getTime());
    });

    it("touch 2 → touch 3: +2 days (day 2 to day 4)", () => {
      const agent = makeAgent();
      const touch2Date = new Date("2026-03-03T09:00:00Z");
      const nextDate = agent.getNextTouchDate(2, touch2Date);
      const expected = new Date("2026-03-05T09:00:00Z");
      expect(nextDate.getTime()).toBe(expected.getTime());
    });

    it("touch 3 → touch 4: +3 days (day 4 to day 7)", () => {
      const agent = makeAgent();
      const touch3Date = new Date("2026-03-05T09:00:00Z");
      const nextDate = agent.getNextTouchDate(3, touch3Date);
      const expected = new Date("2026-03-08T09:00:00Z");
      expect(nextDate.getTime()).toBe(expected.getTime());
    });

    it("touch 4 → touch 5: +7 days (day 7 to day 14)", () => {
      const agent = makeAgent();
      const touch4Date = new Date("2026-03-08T09:00:00Z");
      const nextDate = agent.getNextTouchDate(4, touch4Date);
      const expected = new Date("2026-03-15T09:00:00Z");
      expect(nextDate.getTime()).toBe(expected.getTime());
    });

    it("touch 5 → touch 6: +16 days (day 14 to day 30)", () => {
      const agent = makeAgent();
      const touch5Date = new Date("2026-03-15T09:00:00Z");
      const nextDate = agent.getNextTouchDate(5, touch5Date);
      const expected = new Date("2026-03-31T09:00:00Z");
      expect(nextDate.getTime()).toBe(expected.getTime());
    });

    it("touch 6 → touch 7: +30 days (monthly)", () => {
      const agent = makeAgent();
      const touch6Date = new Date("2026-03-31T09:00:00Z");
      const nextDate = agent.getNextTouchDate(6, touch6Date);
      const expected = new Date("2026-04-30T09:00:00Z");
      expect(nextDate.getTime()).toBe(expected.getTime());
    });

    it("touch 7 → touch 8: +30 days (monthly)", () => {
      const agent = makeAgent();
      const touch7Date = new Date("2026-04-30T09:00:00Z");
      const nextDate = agent.getNextTouchDate(7, touch7Date);
      const expected = new Date("2026-05-30T09:00:00Z");
      expect(nextDate.getTime()).toBe(expected.getTime());
    });
  });

  describe("shouldSendTouch", () => {
    it("touch 1 is always sendable", () => {
      const agent = makeAgent();
      const result = agent.shouldSendTouch(makeLead(), 1, new Date());
      expect(result).toBe(true);
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Touch Scheduler Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("TouchScheduler", () => {
  describe("TOUCH_SCHEDULE", () => {
    it("has 7 predefined entries", () => {
      expect(TOUCH_SCHEDULE.size).toBe(7);
    });

    it("touch 1 is day 0, sms, enthusiastic", () => {
      const entry = TOUCH_SCHEDULE.get(1);
      expect(entry).toEqual({ daysFromStart: 0, channel: "sms", strategy: "enthusiastic" });
    });

    it("touch 2 is day 2, sms, enthusiastic", () => {
      const entry = TOUCH_SCHEDULE.get(2);
      expect(entry).toEqual({ daysFromStart: 2, channel: "sms", strategy: "enthusiastic" });
    });

    it("touch 3 is day 4, email, consultative", () => {
      const entry = TOUCH_SCHEDULE.get(3);
      expect(entry).toEqual({ daysFromStart: 4, channel: "email", strategy: "consultative" });
    });

    it("touch 4 is day 7, sms, consultative", () => {
      const entry = TOUCH_SCHEDULE.get(4);
      expect(entry).toEqual({ daysFromStart: 7, channel: "sms", strategy: "consultative" });
    });

    it("touch 5 is day 14, email, consultative", () => {
      const entry = TOUCH_SCHEDULE.get(5);
      expect(entry).toEqual({ daysFromStart: 14, channel: "email", strategy: "consultative" });
    });

    it("touch 6 is day 30, sms, respectful_close", () => {
      const entry = TOUCH_SCHEDULE.get(6);
      expect(entry).toEqual({ daysFromStart: 30, channel: "sms", strategy: "respectful_close" });
    });

    it("touch 7 is day 60, email, informational", () => {
      const entry = TOUCH_SCHEDULE.get(7);
      expect(entry).toEqual({ daysFromStart: 60, channel: "email", strategy: "informational" });
    });
  });

  describe("getScheduleForTouch", () => {
    it("returns predefined entry for touches 1-7", () => {
      for (let i = 1; i <= 7; i++) {
        const entry = getScheduleForTouch(i);
        expect(entry).toEqual(TOUCH_SCHEDULE.get(i));
      }
    });

    it("returns monthly entry for touch 8 (day 90)", () => {
      const entry = getScheduleForTouch(8);
      expect(entry.daysFromStart).toBe(90);
      expect(entry.channel).toBe("email");
      expect(entry.strategy).toBe("informational");
    });

    it("returns monthly entry for touch 10 (day 150)", () => {
      const entry = getScheduleForTouch(10);
      expect(entry.daysFromStart).toBe(150);
      expect(entry.channel).toBe("email");
      expect(entry.strategy).toBe("informational");
    });

    it("handles touch < 1 gracefully (returns touch 1)", () => {
      const entry = getScheduleForTouch(0);
      expect(entry).toEqual(TOUCH_SCHEDULE.get(1));
    });
  });

  describe("calculateTouchDueDate", () => {
    const created = new Date("2026-03-01T09:00:00Z");

    it("touch 1 due immediately (day 0)", () => {
      const due = calculateTouchDueDate(1, created);
      expect(due.getTime()).toBe(created.getTime());
    });

    it("touch 2 due on day 2", () => {
      const due = calculateTouchDueDate(2, created);
      expect(due).toEqual(new Date("2026-03-03T09:00:00Z"));
    });

    it("touch 3 due on day 4", () => {
      const due = calculateTouchDueDate(3, created);
      expect(due).toEqual(new Date("2026-03-05T09:00:00Z"));
    });

    it("touch 4 due on day 7", () => {
      const due = calculateTouchDueDate(4, created);
      expect(due).toEqual(new Date("2026-03-08T09:00:00Z"));
    });

    it("touch 5 due on day 14", () => {
      const due = calculateTouchDueDate(5, created);
      expect(due).toEqual(new Date("2026-03-15T09:00:00Z"));
    });

    it("touch 6 due on day 30", () => {
      const due = calculateTouchDueDate(6, created);
      expect(due).toEqual(new Date("2026-03-31T09:00:00Z"));
    });

    it("touch 7 due on day 60", () => {
      const due = calculateTouchDueDate(7, created);
      expect(due).toEqual(new Date("2026-04-30T09:00:00Z"));
    });
  });

  describe("isOverdue", () => {
    const created = new Date("2026-03-01T09:00:00Z");

    it("touch 2 is overdue after day 2", () => {
      const now = new Date("2026-03-04T09:00:00Z"); // Day 3
      expect(isOverdue(2, created, now)).toBe(true);
    });

    it("touch 2 is not overdue before day 2", () => {
      const now = new Date("2026-03-02T09:00:00Z"); // Day 1
      expect(isOverdue(2, created, now)).toBe(false);
    });

    it("touch 2 is overdue on exactly day 2", () => {
      const now = new Date("2026-03-03T09:00:00Z"); // Day 2
      expect(isOverdue(2, created, now)).toBe(true);
    });

    it("touch 6 is not overdue at day 15", () => {
      const now = new Date("2026-03-16T09:00:00Z"); // Day 15
      expect(isOverdue(6, created, now)).toBe(false);
    });

    it("touch 6 is overdue at day 31", () => {
      const now = new Date("2026-04-01T09:00:00Z"); // Day 31
      expect(isOverdue(6, created, now)).toBe(true);
    });
  });

  describe("resetCadence", () => {
    it("resets cadence based on customer reply date", () => {
      // Customer replied on day 5 during touch 2
      const replyDate = new Date("2026-03-06T09:00:00Z");
      const newCreatedDate = resetCadence(replyDate, 2);

      // With touch 2 at day 2, the "effective creation" should be replyDate - 2 days
      const expected = new Date("2026-03-04T09:00:00Z");
      expect(newCreatedDate.getTime()).toBe(expected.getTime());

      // Now touch 3 (day 4) should be due at effective_creation + 4 = March 8
      const touch3Due = calculateTouchDueDate(3, newCreatedDate);
      expect(touch3Due).toEqual(new Date("2026-03-08T09:00:00Z"));
    });

    it("reply after touch 4 shifts remaining schedule", () => {
      // Customer replied on day 10 during touch 4
      const replyDate = new Date("2026-03-11T09:00:00Z");
      const newCreatedDate = resetCadence(replyDate, 4);

      // Touch 4 is at day 7, so effective creation = replyDate - 7 days
      const expected = new Date("2026-03-04T09:00:00Z");
      expect(newCreatedDate.getTime()).toBe(expected.getTime());

      // Touch 5 (day 14) should be due at effective_creation + 14 = March 18
      const touch5Due = calculateTouchDueDate(5, newCreatedDate);
      expect(touch5Due).toEqual(new Date("2026-03-18T09:00:00Z"));
    });

    it("cadence reset prevents immediate next touch after reply", () => {
      // Lead created March 1. Customer replies on day 5 (March 6) after touch 2.
      const originalCreated = new Date("2026-03-01T09:00:00Z");
      const replyDate = new Date("2026-03-06T09:00:00Z");

      // Without reset, touch 3 is due March 5 (already overdue!)
      expect(isOverdue(3, originalCreated, replyDate)).toBe(true);

      // With reset, touch 3 is due later
      const newCreatedDate = resetCadence(replyDate, 2);
      const touch3Due = calculateTouchDueDate(3, newCreatedDate);

      // Touch 3 should be March 8 — NOT overdue yet on March 6
      expect(touch3Due.getTime()).toBeGreaterThan(replyDate.getTime());
      expect(isOverdue(3, newCreatedDate, replyDate)).toBe(false);
    });
  });
});
