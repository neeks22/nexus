import { describe, it, expect, beforeEach } from "vitest";
import { buildInstantResponsePrompt, SMS_MAX_CHARS } from "../../../packages/nexus-agents/src/prompts/instant-response.js";
import { InstantResponseAgent } from "../../../packages/nexus-agents/src/instant-response-agent.js";
import type {
  AgentContext,
  DealershipConfig,
  LeadData,
  VehicleMatchInfo,
} from "../../../packages/nexus-agents/src/types.js";
import type {
  LanguageDetectorDep,
  InventoryServiceDep,
  CompliancePreFlightDep,
  TemplateRepositoryDep,
  VehicleMatchResult,
} from "../../../packages/nexus-agents/src/instant-response-agent.js";

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
      { name: "Marc Dupont", role: "Sales Advisor", email: "marc@maplemotors.ca" },
    ],
    escalationNumbers: ["(613) 555-0000"],
    ...overrides,
  };
}

function createVehicleMatch(overrides?: Partial<VehicleMatchInfo>): VehicleMatchInfo {
  return {
    year: 2024,
    make: "Honda",
    model: "CR-V",
    trim: "EX-L",
    color: "Platinum White",
    features: ["panoramic roof", "leather seats", "AWD"],
    vin: "1HGCV2F34RA000001",
    matchScore: 0.92,
    matchReasons: ["make match", "model match"],
    ...overrides,
  };
}

function createLead(overrides?: Partial<LeadData>): LeadData {
  return {
    id: 12345,
    first_name: "Jean",
    last_name: "Tremblay",
    locale: null,
    source: "autoTrader.ca",
    phones: [{ number: "6135551111" }],
    emails: [{ address: "jean@example.com" }],
    postal_code: "K1A 0B1",
    vehicles: [{ make: "Honda", model: "CR-V", year: 2024, type: "wanted" }],
    ...overrides,
  };
}

function createAgentContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    lead: createLead(),
    locale: "en-CA",
    vehicleMatches: [createVehicleMatch()],
    dealershipConfig: createDealershipConfig(),
    touchNumber: 1,
    ...overrides,
  };
}

// --- Mock Dependencies ---

function createMockLanguageDetector(locale: "en-CA" | "fr-CA" = "en-CA"): LanguageDetectorDep {
  return {
    detect: () => locale,
  };
}

function createMockInventoryService(results: VehicleMatchResult[] = []): InventoryServiceDep {
  return {
    findMatching: async () => results,
  };
}

function createMockCompliancePreFlight(pass: boolean = true, failures: Array<{ checker: string; reason: string }> = []): CompliancePreFlightDep {
  return {
    check: () => ({ pass, failures }),
  };
}

function createMockTemplateRepository(template: string | null = null): TemplateRepositoryDep {
  return {
    render: (_templateId: string, _locale: "en-CA" | "fr-CA", _channel: "sms" | "email", variables: Record<string, string | undefined>) => {
      if (template === null) return null;
      // Simple variable substitution like the real template repository
      let result = template;
      for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value ?? "");
      }
      return result;
    },
  };
}

function createDefaultVehicleMatchResult(): VehicleMatchResult {
  return {
    vehicle: {
      vin: "1HGCV2F34RA000001",
      make: "Honda",
      model: "CR-V",
      year: 2024,
      trim: "EX-L",
      color: "Platinum White",
      features: ["panoramic roof", "leather seats", "AWD"],
      msrp: 42000,
      stockStatus: "available",
      daysOnLot: 15,
    },
    matchScore: 0.92,
    matchReasons: ["make match", "model match"],
  };
}

// ═══════════════════════════════════════════════════════
// System Prompt Tests
// ═══════════════════════════════════════════════════════

describe("buildInstantResponsePrompt", () => {
  it("includes customer first name", () => {
    const context = createAgentContext({ lead: createLead({ first_name: "Jean" }) });
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("Jean");
    expect(prompt).toContain('first name: "Jean"');
  });

  it("uses fallback name when first_name is null", () => {
    const context = createAgentContext({ lead: createLead({ first_name: null }) });
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain('"there"');
  });

  it("uses French fallback name when locale is fr-CA and first_name is null", () => {
    const context = createAgentContext({
      lead: createLead({ first_name: null }),
      locale: "fr-CA",
    });
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain('"vous"');
  });

  it("includes vehicle details from inventory", () => {
    const context = createAgentContext({
      vehicleMatches: [createVehicleMatch({ year: 2024, make: "Honda", model: "CR-V", trim: "EX-L", color: "Platinum White" })],
    });
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("2024");
    expect(prompt).toContain("Honda");
    expect(prompt).toContain("CR-V");
    expect(prompt).toContain("EX-L");
    expect(prompt).toContain("Platinum White");
  });

  it("includes vehicle features in inventory section", () => {
    const context = createAgentContext({
      vehicleMatches: [createVehicleMatch({ features: ["panoramic roof", "leather seats", "AWD"] })],
    });
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("panoramic roof");
    expect(prompt).toContain("leather seats");
    expect(prompt).toContain("AWD");
  });

  it("includes safety rails — forbids pricing language", () => {
    const context = createAgentContext();
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("STRICTLY FORBIDDEN");
    expect(prompt).toContain("pricing negotiation");
    expect(prompt).toContain("monthly payments");
    expect(prompt).toContain("financing terms");
    expect(prompt).toContain("interest rates");
    expect(prompt).toContain("credit scores");
    expect(prompt).toContain("insurance");
  });

  it("includes redirect-to-rep instruction in safety rails", () => {
    const context = createAgentContext();
    const prompt = buildInstantResponsePrompt(context);

    // Should mention a staff member for redirect
    expect(prompt).toContain("Sarah Johnson");
    expect(prompt).toContain("specializes in that");
  });

  it("adapts to en-CA locale", () => {
    const context = createAgentContext({ locale: "en-CA" });
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("Canadian English");
    expect(prompt).toContain("en-CA");
    expect(prompt).toContain("## Role");
    // The bilingual protocol section is always present (for language switching),
    // but the Language directive section should be English-only
    expect(prompt).not.toContain("francais canadien");
  });

  it("adapts to fr-CA locale", () => {
    const context = createAgentContext({ locale: "fr-CA" });
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("francais canadien");
    expect(prompt).toContain("fr-CA");
    expect(prompt).toContain("quebecois");
    // The bilingual protocol is always present, but the Language directive
    // section should instruct response generation in French
    expect(prompt).toContain("## Langue");
  });

  it("adapts to professional tone", () => {
    const context = createAgentContext({
      dealershipConfig: createDealershipConfig({ tone: "professional" }),
    });
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("polished");
    expect(prompt).toContain("respectful");
  });

  it("adapts to friendly tone", () => {
    const context = createAgentContext({
      dealershipConfig: createDealershipConfig({ tone: "friendly" }),
    });
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("warm");
    expect(prompt).toContain("approachable");
  });

  it("adapts to casual tone", () => {
    const context = createAgentContext({
      dealershipConfig: createDealershipConfig({ tone: "casual" }),
    });
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("relaxed");
    expect(prompt).toContain("casual");
  });

  it("includes SMS length constraint", () => {
    const context = createAgentContext();
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("480 characters");
    expect(prompt).toContain("160");
  });

  it("includes email length constraint", () => {
    const context = createAgentContext();
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("200 words");
  });

  it("includes freshness qualifier for inventory", () => {
    const context = createAgentContext();
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("based on our current listings");
  });

  it("handles no inventory matches gracefully", () => {
    const context = createAgentContext({ vehicleMatches: [] });
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("No specific vehicle matches");
    expect(prompt).toContain("Do NOT invent specific vehicles");
  });

  it("includes dealership name in role section", () => {
    const config = createDealershipConfig({ dealershipName: "Test Motors Inc" });
    const context = createAgentContext({ dealershipConfig: config });
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("Test Motors Inc");
  });

  it("includes dealership address and phone", () => {
    const context = createAgentContext();
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("123 Main St, Ottawa, ON K1A 0B1");
    expect(prompt).toContain("(613) 555-1234");
  });

  it("includes soft CTA requirement", () => {
    const context = createAgentContext();
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("test drive");
    expect(prompt).toContain("call-to-action");
  });

  it("forbids inventing vehicle features", () => {
    const context = createAgentContext();
    const prompt = buildInstantResponsePrompt(context);

    expect(prompt).toContain("NEVER invent");
  });
});

// ═══════════════════════════════════════════════════════
// Personalization Tests
// ═══════════════════════════════════════════════════════

describe("InstantResponseAgent.generatePersonalization", () => {
  let agent: InstantResponseAgent;

  beforeEach(() => {
    agent = new InstantResponseAgent(
      createDealershipConfig(),
      createMockInventoryService(),
      createMockCompliancePreFlight(),
      createMockLanguageDetector(),
      createMockTemplateRepository(),
    );
  });

  it("extracts firstName from lead data", () => {
    const lead = createLead({ first_name: "Marie" });
    const vars = agent.generatePersonalization(lead, [createVehicleMatch()]);

    expect(vars.firstName).toBe("Marie");
  });

  it("uses fallback firstName when lead has no first_name", () => {
    const lead = createLead({ first_name: null });
    const vars = agent.generatePersonalization(lead, [createVehicleMatch()]);

    expect(vars.firstName).toBe("there");
  });

  it("uses French fallback for fr locale", () => {
    const lead = createLead({ first_name: null, locale: "fr-CA" });
    const vars = agent.generatePersonalization(lead, [createVehicleMatch()]);

    expect(vars.firstName).toBe("Client");
  });

  it("extracts vehicle details from top match", () => {
    const match = createVehicleMatch({
      year: 2025,
      make: "Toyota",
      model: "RAV4",
      trim: "Limited",
      color: "Midnight Black",
    });
    const vars = agent.generatePersonalization(createLead(), [match]);

    expect(vars.vehicleYear).toBe("2025");
    expect(vars.vehicleMake).toBe("Toyota");
    expect(vars.vehicleModel).toBe("RAV4");
    expect(vars.vehicleTrim).toBe("Limited");
    expect(vars.vehicleColor).toBe("Midnight Black");
  });

  it("includes inventory detail with vehicle feature", () => {
    const match = createVehicleMatch({ features: ["heated seats", "AWD"], color: "Silver" });
    const vars = agent.generatePersonalization(createLead(), [match]);

    expect(vars.inventoryDetail).toContain("heated seats");
    expect(vars.inventoryDetail).toContain("Silver");
    expect(vars.inventoryDetail.toLowerCase()).toContain("based on our current listings");
  });

  it("includes dealership info", () => {
    const vars = agent.generatePersonalization(createLead(), [createVehicleMatch()]);

    expect(vars.dealershipName).toBe("Maple Motors");
    expect(vars.dealershipPhone).toBe("(613) 555-1234");
    expect(vars.dealershipAddress).toBe("123 Main St, Ottawa, ON K1A 0B1");
  });

  it("assigns rep name from staff", () => {
    const vars = agent.generatePersonalization(createLead(), [createVehicleMatch()]);

    // Should pick the sales manager or sales advisor
    expect(vars.repName).toBe("Sarah Johnson");
  });

  it("handles no vehicle matches with generic detail", () => {
    const vars = agent.generatePersonalization(createLead(), []);

    expect(vars.vehicleYear).toBe("");
    expect(vars.vehicleModel).toBe("");
    expect(vars.inventoryDetail).toContain("great selection");
  });
});

// ═══════════════════════════════════════════════════════
// respond() Integration Tests
// ═══════════════════════════════════════════════════════

describe("InstantResponseAgent.respond", () => {
  it("returns correct structure", async () => {
    const agent = new InstantResponseAgent(
      createDealershipConfig(),
      createMockInventoryService([createDefaultVehicleMatchResult()]),
      createMockCompliancePreFlight(true),
      createMockLanguageDetector("en-CA"),
      createMockTemplateRepository(
        "Hi {{firstName}}! We have a {{vehicleYear}} {{vehicleModel}} {{vehicleTrim}} available. - {{dealershipName}}",
      ),
    );

    const result = await agent.respond(createLead());

    expect(result).toHaveProperty("message");
    expect(result).toHaveProperty("channel");
    expect(result).toHaveProperty("locale");
    expect(result).toHaveProperty("vehicleMatches");
    expect(result).toHaveProperty("complianceResult");
    expect(result.channel).toBe("sms");
    expect(result.locale).toBe("en-CA");
    expect(result.complianceResult.pass).toBe(true);
  });

  it("uses detected locale", async () => {
    const agent = new InstantResponseAgent(
      createDealershipConfig(),
      createMockInventoryService([createDefaultVehicleMatchResult()]),
      createMockCompliancePreFlight(true),
      createMockLanguageDetector("fr-CA"),
      createMockTemplateRepository("Bonjour {{firstName}}! - {{dealershipName}}"),
    );

    const result = await agent.respond(createLead({ locale: "fr-CA" }));

    expect(result.locale).toBe("fr-CA");
  });

  it("populates vehicleMatches from inventory service", async () => {
    const agent = new InstantResponseAgent(
      createDealershipConfig(),
      createMockInventoryService([createDefaultVehicleMatchResult()]),
      createMockCompliancePreFlight(true),
      createMockLanguageDetector("en-CA"),
      createMockTemplateRepository("Hi {{firstName}}! {{inventoryDetail}} - {{dealershipName}}"),
    );

    const result = await agent.respond(createLead());

    expect(result.vehicleMatches.length).toBe(1);
    expect(result.vehicleMatches[0]!.make).toBe("Honda");
    expect(result.vehicleMatches[0]!.model).toBe("CR-V");
  });

  it("includes personalized message with customer name", async () => {
    const agent = new InstantResponseAgent(
      createDealershipConfig(),
      createMockInventoryService([createDefaultVehicleMatchResult()]),
      createMockCompliancePreFlight(true),
      createMockLanguageDetector("en-CA"),
      createMockTemplateRepository("Hi {{firstName}}! Check out the {{vehicleYear}} {{vehicleModel}}."),
    );

    const result = await agent.respond(createLead({ first_name: "Alex" }));

    expect(result.message).toContain("Alex");
    expect(result.message).toContain("2024");
    expect(result.message).toContain("CR-V");
  });

  it("returns compliance failure when compliance check fails", async () => {
    const failures = [{ checker: "content", reason: "Forbidden content: monthly payment" }];
    const agent = new InstantResponseAgent(
      createDealershipConfig(),
      createMockInventoryService([createDefaultVehicleMatchResult()]),
      createMockCompliancePreFlight(false, failures),
      createMockLanguageDetector("en-CA"),
      createMockTemplateRepository("Hi {{firstName}}! - {{dealershipName}}"),
    );

    const result = await agent.respond(createLead());

    expect(result.complianceResult.pass).toBe(false);
    expect(result.complianceResult.failures).toHaveLength(1);
    expect(result.complianceResult.failures[0]!.checker).toBe("content");
    expect(result.complianceResult.failures[0]!.reason).toContain("monthly payment");
  });

  it("generates response even with no inventory matches", async () => {
    const agent = new InstantResponseAgent(
      createDealershipConfig(),
      createMockInventoryService([]), // No matches
      createMockCompliancePreFlight(true),
      createMockLanguageDetector("en-CA"),
      createMockTemplateRepository(null), // No template — forces fallback
    );

    const result = await agent.respond(createLead());

    expect(result.message).toBeTruthy();
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.vehicleMatches).toHaveLength(0);
    // Fallback message should still mention the customer
    expect(result.message).toContain("Jean");
  });

  it("uses fallback message when template is not found", async () => {
    const agent = new InstantResponseAgent(
      createDealershipConfig(),
      createMockInventoryService([createDefaultVehicleMatchResult()]),
      createMockCompliancePreFlight(true),
      createMockLanguageDetector("en-CA"),
      createMockTemplateRepository(null), // Template not found
    );

    const result = await agent.respond(createLead({ first_name: "Sophie" }));

    expect(result.message).toContain("Sophie");
    expect(result.message).toContain("Maple Motors");
  });

  it("respects channel parameter for email", async () => {
    const agent = new InstantResponseAgent(
      createDealershipConfig(),
      createMockInventoryService([createDefaultVehicleMatchResult()]),
      createMockCompliancePreFlight(true),
      createMockLanguageDetector("en-CA"),
      createMockTemplateRepository(null), // Use fallback
    );

    const result = await agent.respond(createLead(), "email");

    expect(result.channel).toBe("email");
    // Email fallback should have more structure
    expect(result.message).toContain("Best regards");
  });

  it("SMS fallback response is under 480 characters", async () => {
    const agent = new InstantResponseAgent(
      createDealershipConfig(),
      createMockInventoryService([createDefaultVehicleMatchResult()]),
      createMockCompliancePreFlight(true),
      createMockLanguageDetector("en-CA"),
      createMockTemplateRepository(null),
    );

    const result = await agent.respond(createLead(), "sms");

    expect(result.message.length).toBeLessThanOrEqual(SMS_MAX_CHARS);
  });

  it("queries inventory with lead vehicle interest", async () => {
    let capturedQuery: { make?: string; model?: string; year?: number } | undefined;
    const inventoryService: InventoryServiceDep = {
      findMatching: async (query) => {
        capturedQuery = query;
        return [createDefaultVehicleMatchResult()];
      },
    };

    const agent = new InstantResponseAgent(
      createDealershipConfig(),
      inventoryService,
      createMockCompliancePreFlight(true),
      createMockLanguageDetector("en-CA"),
      createMockTemplateRepository("Hi {{firstName}}!"),
    );

    await agent.respond(createLead({ vehicles: [{ make: "Toyota", model: "Camry", year: 2025, type: "wanted" }] }));

    expect(capturedQuery).toBeDefined();
    expect(capturedQuery!.make).toBe("Toyota");
    expect(capturedQuery!.model).toBe("Camry");
    expect(capturedQuery!.year).toBe(2025);
  });
});
