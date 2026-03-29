import { describe, it, expect, beforeEach } from "vitest";
import { buildServiceBdcPrompt, SERVICE_SMS_MAX_CHARS, SERVICE_EMAIL_MAX_WORDS } from "../../../packages/nexus-agents/src/prompts/service-bdc.js";
import { ServiceBdcAgent } from "../../../packages/nexus-agents/src/service-bdc-agent.js";
import type { ServiceBdcContext } from "../../../packages/nexus-agents/src/prompts/service-bdc.js";
import type {
  DealershipConfig,
  LeadData,
} from "../../../packages/nexus-agents/src/types.js";
import type {
  LanguageDetectorDep,
  CompliancePreFlightDep,
  TemplateRepositoryDep,
  ServiceInquiry,
  ServiceStatusResult,
  RecallInfo,
} from "../../../packages/nexus-agents/src/service-bdc-agent.js";

// --- Test Fixtures ---

function createDealershipConfig(overrides?: Partial<DealershipConfig>): DealershipConfig {
  return {
    dealershipName: "Maple Motors",
    address: "123 Main St, Ottawa, ON K1A 0B1",
    phone: "(613) 555-1234",
    hours: "Mon-Fri 7AM-6PM, Sat 8AM-2PM",
    timezone: "America/Toronto",
    tone: "friendly",
    staff: [
      { name: "Pierre Lavoie", role: "Service Manager", email: "pierre@maplemotors.ca" },
      { name: "Sarah Johnson", role: "Service Advisor", email: "sarah@maplemotors.ca" },
      { name: "Marc Dupont", role: "Sales Advisor", email: "marc@maplemotors.ca" },
    ],
    escalationNumbers: ["(613) 555-0000"],
    ...overrides,
  };
}

function createLead(overrides?: Partial<LeadData>): LeadData {
  return {
    id: 12345,
    first_name: "Jean",
    last_name: "Tremblay",
    locale: null,
    source: "service-portal",
    phones: [{ number: "6135551111" }],
    emails: [{ address: "jean@example.com" }],
    postal_code: "K1A 0B1",
    vehicles: [{ make: "Honda", model: "CR-V", year: 2022, type: "wanted" }],
    ...overrides,
  };
}

function createServiceBdcContext(overrides?: Partial<ServiceBdcContext>): ServiceBdcContext {
  return {
    dealershipConfig: createDealershipConfig(),
    locale: "en-CA",
    serviceHours: "Mon-Fri 7AM-6PM, Sat 8AM-2PM",
    shuttleInfo: "Free shuttle within 10km",
    loanerInfo: "Loaner vehicles available for major repairs",
    waitTime: "Approximately 1 hour for oil changes",
    ...overrides,
  };
}

function createServiceInquiry(overrides?: Partial<ServiceInquiry>): ServiceInquiry {
  return {
    type: "general",
    description: "I need an oil change for my Honda CR-V",
    vehicleYear: 2022,
    vehicleMake: "Honda",
    vehicleModel: "CR-V",
    vehicleMileage: 45000,
    ...overrides,
  };
}

// --- Mock Dependencies ---

function createMockLanguageDetector(locale: "en-CA" | "fr-CA" = "en-CA"): LanguageDetectorDep {
  return { detect: () => locale };
}

function createMockCompliancePreFlight(
  pass: boolean = true,
  failures: Array<{ checker: string; reason: string }> = [],
): CompliancePreFlightDep {
  return { check: () => ({ pass, failures }) };
}

function createMockTemplateRepository(template: string | null = null): TemplateRepositoryDep {
  return {
    render: (
      _templateId: string,
      _locale: "en-CA" | "fr-CA",
      _channel: "sms" | "email",
      variables: Record<string, string | undefined>,
    ) => {
      if (template === null) return null;
      let result = template;
      for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value ?? "");
      }
      return result;
    },
  };
}

// ===============================================================
// System Prompt Tests (buildServiceBdcPrompt)
// ===============================================================

describe("buildServiceBdcPrompt", () => {
  it("includes dealership name in role section", () => {
    const context = createServiceBdcContext();
    const prompt = buildServiceBdcPrompt(context);

    expect(prompt).toContain("Maple Motors");
    expect(prompt).toContain("Service Department AI Assistant");
  });

  it("includes dealership address and phone", () => {
    const context = createServiceBdcContext();
    const prompt = buildServiceBdcPrompt(context);

    expect(prompt).toContain("123 Main St, Ottawa, ON K1A 0B1");
    expect(prompt).toContain("(613) 555-1234");
  });

  it("includes all four capability sections in English", () => {
    const context = createServiceBdcContext({ locale: "en-CA" });
    const prompt = buildServiceBdcPrompt(context);

    expect(prompt).toContain("BOOK SERVICE APPOINTMENTS");
    expect(prompt).toContain("CHECK SERVICE STATUS");
    expect(prompt).toContain("HANDLE RECALLS");
    expect(prompt).toContain("ANSWER COMMON QUESTIONS");
  });

  it("includes all four capability sections in French", () => {
    const context = createServiceBdcContext({ locale: "fr-CA" });
    const prompt = buildServiceBdcPrompt(context);

    expect(prompt).toContain("PRISE DE RENDEZ-VOUS");
    expect(prompt).toContain("VERIFICATION DU STATUT");
    expect(prompt).toContain("GESTION DES RAPPELS");
    expect(prompt).toContain("REPONSES AUX QUESTIONS");
  });

  it("includes escalation triggers", () => {
    const context = createServiceBdcContext();
    const prompt = buildServiceBdcPrompt(context);

    expect(prompt).toContain("Escalation Triggers");
    expect(prompt).toContain("angry or frustrated");
    expect(prompt).toContain("Warranty dispute");
    expect(prompt).toContain("Safety concern");
    expect(prompt).toContain("speak with a manager");
  });

  it("includes safety rails forbidding cost estimates", () => {
    const context = createServiceBdcContext();
    const prompt = buildServiceBdcPrompt(context);

    expect(prompt).toContain("STRICTLY FORBIDDEN");
    expect(prompt).toContain("repair cost estimates");
    expect(prompt).toContain("warranty coverage determinations");
    expect(prompt).toContain("diagnostic conclusions");
  });

  it("includes upsell opportunities", () => {
    const context = createServiceBdcContext();
    const prompt = buildServiceBdcPrompt(context);

    expect(prompt).toContain("Multi-point inspection");
    expect(prompt).toContain("tire changeover");
    expect(prompt).toContain("Prepaid maintenance");
  });

  it("adapts to fr-CA locale fully", () => {
    const context = createServiceBdcContext({ locale: "fr-CA" });
    const prompt = buildServiceBdcPrompt(context);

    expect(prompt).toContain("francais canadien");
    expect(prompt).toContain("quebecois");
    expect(prompt).toContain("departement de service");
    // Bilingual protocol includes both language guidelines for language switching,
    // but the primary language directive should be French
    expect(prompt).toContain("Generez votre reponse entierement en francais canadien");
  });

  it("includes service context with shuttle and loaner info", () => {
    const context = createServiceBdcContext({
      shuttleInfo: "Free shuttle within 15km",
      loanerInfo: "4 loaner vehicles available",
      waitTime: "30 minutes for express service",
    });
    const prompt = buildServiceBdcPrompt(context);

    expect(prompt).toContain("Free shuttle within 15km");
    expect(prompt).toContain("4 loaner vehicles available");
    expect(prompt).toContain("30 minutes for express service");
  });

  it("includes SMS and email length constraints", () => {
    const context = createServiceBdcContext();
    const prompt = buildServiceBdcPrompt(context);

    expect(prompt).toContain(`${SERVICE_SMS_MAX_CHARS} characters`);
    expect(prompt).toContain(`${SERVICE_EMAIL_MAX_WORDS} words`);
  });

  it("references service advisor for escalation redirect", () => {
    const context = createServiceBdcContext();
    const prompt = buildServiceBdcPrompt(context);

    // Should pick Pierre Lavoie (Service Manager) as service advisor
    expect(prompt).toContain("Pierre Lavoie");
  });

  it("includes personality section", () => {
    const context = createServiceBdcContext();
    const prompt = buildServiceBdcPrompt(context);

    expect(prompt).toContain("Professional but warm");
    expect(prompt).toContain("Patient with frustrated customers");
  });
});

// ===============================================================
// ServiceBdcAgent — respond() Tests
// ===============================================================

describe("ServiceBdcAgent.respond", () => {
  let agent: ServiceBdcAgent;

  beforeEach(() => {
    agent = new ServiceBdcAgent(
      createDealershipConfig(),
      createMockCompliancePreFlight(),
      createMockLanguageDetector(),
      createMockTemplateRepository(null),
    );
  });

  it("returns correct response structure", async () => {
    const result = await agent.respond(createLead(), createServiceInquiry());

    expect(result).toHaveProperty("message");
    expect(result).toHaveProperty("channel");
    expect(result).toHaveProperty("locale");
    expect(result).toHaveProperty("complianceResult");
    expect(result).toHaveProperty("serviceType");
    expect(result).toHaveProperty("escalationRequired");
  });

  it("defaults to SMS channel", async () => {
    const result = await agent.respond(createLead(), createServiceInquiry());

    expect(result.channel).toBe("sms");
  });

  it("uses detected locale", async () => {
    const frAgent = new ServiceBdcAgent(
      createDealershipConfig(),
      createMockCompliancePreFlight(),
      createMockLanguageDetector("fr-CA"),
      createMockTemplateRepository(null),
    );

    const result = await frAgent.respond(createLead({ locale: "fr-CA" }), createServiceInquiry());

    expect(result.locale).toBe("fr-CA");
    expect(result.message).toContain("Bonjour");
  });

  it("includes customer name in response", async () => {
    const result = await agent.respond(createLead({ first_name: "Sophie" }), createServiceInquiry());

    expect(result.message).toContain("Sophie");
  });

  it("uses fallback name when first_name is null", async () => {
    const result = await agent.respond(createLead({ first_name: null }), createServiceInquiry());

    expect(result.message).toContain("there");
  });

  it("returns compliance failure when check fails", async () => {
    const failures = [{ checker: "consent", reason: "No active consent" }];
    const failAgent = new ServiceBdcAgent(
      createDealershipConfig(),
      createMockCompliancePreFlight(false, failures),
      createMockLanguageDetector(),
      createMockTemplateRepository(null),
    );

    const result = await failAgent.respond(createLead(), createServiceInquiry());

    expect(result.complianceResult.pass).toBe(false);
    expect(result.complianceResult.failures).toHaveLength(1);
    expect(result.complianceResult.failures[0]!.reason).toContain("No active consent");
  });

  it("detects escalation for angry customer", async () => {
    const inquiry = createServiceInquiry({
      description: "This is unacceptable! I am furious about the service I received.",
    });

    const result = await agent.respond(createLead(), inquiry);

    expect(result.escalationRequired).toBe(true);
    expect(result.escalationReason).toContain("anger");
  });

  it("detects escalation for safety concern", async () => {
    const inquiry = createServiceInquiry({
      description: "My brakes feel unsafe and dangerous when I drive.",
    });

    const result = await agent.respond(createLead(), inquiry);

    expect(result.escalationRequired).toBe(true);
    expect(result.escalationReason).toContain("Safety");
  });

  it("detects escalation for manager request", async () => {
    const inquiry = createServiceInquiry({
      description: "I want to speak to someone in charge, a manager please.",
    });

    const result = await agent.respond(createLead(), inquiry);

    expect(result.escalationRequired).toBe(true);
    expect(result.escalationReason).toContain("manager");
  });

  it("detects escalation for warranty dispute", async () => {
    const inquiry = createServiceInquiry({
      description: "They refuse warranty coverage and won't cover the repair.",
    });

    const result = await agent.respond(createLead(), inquiry);

    expect(result.escalationRequired).toBe(true);
    expect(result.escalationReason).toContain("Warranty");
  });

  it("does not escalate for normal inquiry", async () => {
    const inquiry = createServiceInquiry({
      description: "I need an oil change for my Honda CR-V",
    });

    const result = await agent.respond(createLead(), inquiry);

    expect(result.escalationRequired).toBe(false);
    expect(result.escalationReason).toBeUndefined();
  });

  it("uses template when available", async () => {
    const templateAgent = new ServiceBdcAgent(
      createDealershipConfig(),
      createMockCompliancePreFlight(),
      createMockLanguageDetector(),
      createMockTemplateRepository("Service response for {{firstName}} regarding {{serviceType}}. - {{dealershipName}}"),
    );

    const result = await templateAgent.respond(createLead({ first_name: "Alex" }), createServiceInquiry());

    expect(result.message).toContain("Alex");
    expect(result.message).toContain("Maple Motors");
  });

  it("generates email fallback with more structure", async () => {
    const result = await agent.respond(createLead(), createServiceInquiry(), "email");

    expect(result.channel).toBe("email");
    expect(result.message).toContain("Best regards");
    expect(result.message).toContain("Service Team");
  });
});

// ===============================================================
// ServiceBdcAgent — bookAppointment() Tests
// ===============================================================

describe("ServiceBdcAgent.bookAppointment", () => {
  let agent: ServiceBdcAgent;

  beforeEach(() => {
    agent = new ServiceBdcAgent(
      createDealershipConfig(),
      createMockCompliancePreFlight(),
      createMockLanguageDetector(),
      createMockTemplateRepository(null),
    );
  });

  it("returns booking confirmation with service type and date", async () => {
    const result = await agent.bookAppointment(createLead(), "Oil Change", "2026-04-01");

    expect(result.serviceType).toBe("booking");
    expect(result.message).toContain("Oil Change");
    expect(result.message).toContain("2026-04-01");
  });

  it("includes customer name in booking confirmation", async () => {
    const result = await agent.bookAppointment(
      createLead({ first_name: "Marie" }),
      "Tire Rotation",
      "2026-04-05",
    );

    expect(result.message).toContain("Marie");
  });

  it("includes service advisor name", async () => {
    const result = await agent.bookAppointment(createLead(), "Oil Change", "2026-04-01");

    expect(result.message).toContain("Pierre Lavoie");
  });

  it("generates French booking confirmation", async () => {
    const frAgent = new ServiceBdcAgent(
      createDealershipConfig(),
      createMockCompliancePreFlight(),
      createMockLanguageDetector("fr-CA"),
      createMockTemplateRepository(null),
    );

    const result = await frAgent.bookAppointment(createLead(), "Changement d'huile", "2026-04-01");

    expect(result.locale).toBe("fr-CA");
    expect(result.message).toContain("Bonjour");
    expect(result.message).toContain("confirme");
  });

  it("runs compliance check on booking message", async () => {
    const failures = [{ checker: "frequency", reason: "Too many messages in 24h" }];
    const failAgent = new ServiceBdcAgent(
      createDealershipConfig(),
      createMockCompliancePreFlight(false, failures),
      createMockLanguageDetector(),
      createMockTemplateRepository(null),
    );

    const result = await failAgent.bookAppointment(createLead(), "Oil Change", "2026-04-01");

    expect(result.complianceResult.pass).toBe(false);
  });
});

// ===============================================================
// ServiceBdcAgent — checkStatus() Tests
// ===============================================================

describe("ServiceBdcAgent.checkStatus", () => {
  let agent: ServiceBdcAgent;

  beforeEach(() => {
    agent = new ServiceBdcAgent(
      createDealershipConfig(),
      createMockCompliancePreFlight(),
      createMockLanguageDetector(),
      createMockTemplateRepository(null),
    );
  });

  it("returns status message with RO number", async () => {
    const status: ServiceStatusResult = {
      roNumber: "RO-12345",
      status: "in_progress",
    };
    const result = await agent.checkStatus(createLead(), "RO-12345", status);

    expect(result.serviceType).toBe("status");
    expect(result.message).toContain("RO-12345");
    expect(result.message).toContain("In progress");
  });

  it("returns ready-for-pickup message with hours", async () => {
    const status: ServiceStatusResult = {
      roNumber: "RO-99999",
      status: "ready_for_pickup",
    };
    const result = await agent.checkStatus(createLead(), "RO-99999", status);

    expect(result.message).toContain("ready");
    expect(result.message).toContain("RO-99999");
  });

  it("handles not-found RO gracefully", async () => {
    const result = await agent.checkStatus(createLead(), "RO-00000");

    expect(result.message).toContain("RO-00000");
    expect(result.message).toContain("couldn't find");
  });

  it("returns French status labels", async () => {
    const frAgent = new ServiceBdcAgent(
      createDealershipConfig(),
      createMockCompliancePreFlight(),
      createMockLanguageDetector("fr-CA"),
      createMockTemplateRepository(null),
    );
    const status: ServiceStatusResult = {
      roNumber: "RO-55555",
      status: "waiting_for_parts",
    };

    const result = await frAgent.checkStatus(createLead(), "RO-55555", status);

    expect(result.message).toContain("En attente de pieces");
  });
});

// ===============================================================
// ServiceBdcAgent — handleRecall() Tests
// ===============================================================

describe("ServiceBdcAgent.handleRecall", () => {
  let agent: ServiceBdcAgent;

  beforeEach(() => {
    agent = new ServiceBdcAgent(
      createDealershipConfig(),
      createMockCompliancePreFlight(),
      createMockLanguageDetector(),
      createMockTemplateRepository(null),
    );
  });

  it("returns no-recall message when no recalls found", async () => {
    const recallInfo: RecallInfo = { vin: "1HGCV2F34RA000001", recalls: [] };
    const result = await agent.handleRecall(createLead(), "1HGCV2F34RA000001", recallInfo);

    expect(result.serviceType).toBe("recall");
    expect(result.message).toContain("no open recalls");
  });

  it("returns recall count and free repair emphasis", async () => {
    const recallInfo: RecallInfo = {
      vin: "1HGCV2F34RA000001",
      recalls: [
        {
          campaignNumber: "24V-123",
          component: "Fuel Pump",
          summary: "Fuel pump may fail causing engine stall",
          remedy: "Replace fuel pump assembly",
          isOpen: true,
        },
      ],
    };
    const result = await agent.handleRecall(createLead(), "1HGCV2F34RA000001", recallInfo);

    expect(result.message).toContain("1");
    expect(result.message).toContain("FREE");
  });

  it("handles no recallInfo provided (defaults to empty)", async () => {
    const result = await agent.handleRecall(createLead(), "1HGCV2F34RA000001");

    expect(result.serviceType).toBe("recall");
    expect(result.message).toContain("no open recalls");
  });

  it("generates French recall message", async () => {
    const frAgent = new ServiceBdcAgent(
      createDealershipConfig(),
      createMockCompliancePreFlight(),
      createMockLanguageDetector("fr-CA"),
      createMockTemplateRepository(null),
    );
    const recallInfo: RecallInfo = {
      vin: "1HGCV2F34RA000001",
      recalls: [
        {
          campaignNumber: "24V-456",
          component: "Airbag",
          summary: "Airbag may not deploy",
          remedy: "Replace airbag module",
          isOpen: true,
        },
      ],
    };

    const result = await frAgent.handleRecall(createLead(), "1HGCV2F34RA000001", recallInfo);

    expect(result.locale).toBe("fr-CA");
    expect(result.message).toContain("GRATUITES");
  });

  it("only counts open recalls", async () => {
    const recallInfo: RecallInfo = {
      vin: "1HGCV2F34RA000001",
      recalls: [
        {
          campaignNumber: "24V-100",
          component: "Brake Light",
          summary: "Brake light wiring issue",
          remedy: "Replace wiring harness",
          isOpen: true,
        },
        {
          campaignNumber: "23V-200",
          component: "Seatbelt",
          summary: "Seatbelt retractor issue",
          remedy: "Replace retractor",
          isOpen: false,
        },
      ],
    };
    const result = await agent.handleRecall(createLead(), "1HGCV2F34RA000001", recallInfo);

    // Should only count the 1 open recall, not the closed one
    expect(result.message).toContain("1 open recall");
  });

  it("includes email recall details with campaign numbers", async () => {
    const recallInfo: RecallInfo = {
      vin: "1HGCV2F34RA000001",
      recalls: [
        {
          campaignNumber: "24V-789",
          component: "Transmission",
          summary: "Transmission may slip under load",
          remedy: "Software update and transmission flush",
          isOpen: true,
        },
      ],
    };
    const result = await agent.handleRecall(createLead(), "1HGCV2F34RA000001", recallInfo, "email");

    expect(result.channel).toBe("email");
    expect(result.message).toContain("24V-789");
    expect(result.message).toContain("Transmission");
  });
});
