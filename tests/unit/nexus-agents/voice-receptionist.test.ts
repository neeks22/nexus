import { describe, it, expect, beforeEach } from "vitest";
import {
  buildVoiceReceptionistPrompt,
  buildContextFromDealershipConfig,
  VOICE_MAX_WORDS,
  type VoiceReceptionistContext,
  type AfterHoursSchedule,
} from "../../../packages/nexus-agents/src/prompts/voice-receptionist.js";
import {
  VoiceReceptionistAgent,
  type VoiceLanguageDetectorDep,
  type CallIntent,
} from "../../../packages/nexus-agents/src/voice-receptionist-agent.js";
import type { DealershipConfig } from "../../../packages/nexus-agents/src/types.js";

// --- Test Fixtures ---

function createDealershipConfig(overrides?: Partial<DealershipConfig>): DealershipConfig {
  return {
    dealershipName: "ReadyRide",
    address: "456 Auto Row, Montreal, QC H2X 1Y4",
    phone: "(514) 555-7890",
    hours: "Mon-Fri 10AM-6PM, Sat 10AM-4PM, Sun Closed",
    timezone: "America/Toronto",
    tone: "friendly",
    staff: [
      { name: "Marie Lavoie", role: "Sales Manager", email: "marie@readyride.ca" },
      { name: "James Chen", role: "Service Advisor", email: "james@readyride.ca" },
      { name: "Sophie Gagnon", role: "Parts Specialist", email: "sophie@readyride.ca" },
    ],
    escalationNumbers: ["(514) 555-0000"],
    ...overrides,
  };
}

function createAfterHoursSchedule(): AfterHoursSchedule {
  return {
    monday: { open: "10:00", close: "18:00" },
    tuesday: { open: "10:00", close: "18:00" },
    wednesday: { open: "10:00", close: "18:00" },
    thursday: { open: "10:00", close: "18:00" },
    friday: { open: "10:00", close: "18:00" },
    saturday: { open: "10:00", close: "16:00" },
    sunday: null,
  };
}

function createVoiceContext(overrides?: Partial<VoiceReceptionistContext>): VoiceReceptionistContext {
  return {
    dealershipName: "ReadyRide",
    aiName: "Alex",
    address: "456 Auto Row, Montreal, QC H2X 1Y4",
    phone: "(514) 555-7890",
    hours: "Mon-Fri 10AM-6PM, Sat 10AM-4PM, Sun Closed",
    timezone: "America/Toronto",
    tone: "friendly",
    staffDirectory: [
      { name: "Marie Lavoie", role: "Sales Manager", extension: "101" },
      { name: "James Chen", role: "Service Advisor", extension: "201" },
    ],
    transferNumbers: {
      sales: "(514) 555-1001",
      service: "(514) 555-1002",
      parts: "(514) 555-1003",
      manager: "(514) 555-0000",
    },
    afterHoursSchedule: createAfterHoursSchedule(),
    locale: "en-CA",
    ...overrides,
  };
}

function createMockLanguageDetector(locale: "en-CA" | "fr-CA" = "en-CA"): VoiceLanguageDetectorDep {
  return {
    detect: () => locale,
  };
}

// --- Prompt Builder Tests ---

describe("buildVoiceReceptionistPrompt", () => {
  it("should include dealership name and AI name in the prompt", () => {
    const context = createVoiceContext();
    const prompt = buildVoiceReceptionistPrompt(context);

    expect(prompt).toContain("ReadyRide");
    expect(prompt).toContain("Alex");
  });

  it("should include voice-specific rules about short sentences", () => {
    const context = createVoiceContext();
    const prompt = buildVoiceReceptionistPrompt(context);

    expect(prompt).toContain("SHORT sentences");
    expect(prompt).toContain(String(VOICE_MAX_WORDS));
    expect(prompt).toContain("NEVER monologue");
  });

  it("should include the greeting template", () => {
    const context = createVoiceContext();
    const prompt = buildVoiceReceptionistPrompt(context);

    expect(prompt).toContain("Thank you for calling ReadyRide, this is Alex");
    expect(prompt).toContain("How can I help you today?");
  });

  it("should include the after-hours greeting", () => {
    const context = createVoiceContext();
    const prompt = buildVoiceReceptionistPrompt(context);

    expect(prompt).toContain("We're currently closed but I can help you right now");
    expect(prompt).toContain("call you back first thing in the morning");
  });

  it("should include warm transfer protocol", () => {
    const context = createVoiceContext();
    const prompt = buildVoiceReceptionistPrompt(context);

    expect(prompt).toContain("Warm Transfer Protocol");
    expect(prompt).toContain("Brief the rep BEFORE connecting");
    expect(prompt).toContain("NEVER cold-transfer without context");
  });

  it("should include safety rails forbidding pricing discussion", () => {
    const context = createVoiceContext();
    const prompt = buildVoiceReceptionistPrompt(context);

    expect(prompt).toContain("STRICTLY FORBIDDEN");
    expect(prompt).toContain("pricing or exact dollar amounts");
    expect(prompt).toContain("financing terms or interest rates");
  });

  it("should include caller safety protocol for aggressive callers", () => {
    const context = createVoiceContext();
    const prompt = buildVoiceReceptionistPrompt(context);

    expect(prompt).toContain("Caller Safety Protocol");
    expect(prompt).toContain("end this call");
    expect(prompt).toContain("call 911");
  });

  it("should include language detection instructions", () => {
    const context = createVoiceContext();
    const prompt = buildVoiceReceptionistPrompt(context);

    expect(prompt).toContain("Start every call in English");
    expect(prompt).toContain("switch to French immediately");
  });

  it("should generate French prompt when locale is fr-CA", () => {
    const context = createVoiceContext({ locale: "fr-CA" });
    const prompt = buildVoiceReceptionistPrompt(context);

    expect(prompt).toContain("receptionniste IA");
    expect(prompt).toContain("Merci d'avoir appele ReadyRide");
    expect(prompt).toContain("STRICTEMENT INTERDIT");
  });

  it("should include the schedule with Sunday closed", () => {
    const context = createVoiceContext();
    const prompt = buildVoiceReceptionistPrompt(context);

    expect(prompt).toContain("Sunday: Closed");
    expect(prompt).toContain("Saturday: 10:00 - 16:00");
  });

  it("should include staff directory and transfer numbers", () => {
    const context = createVoiceContext();
    const prompt = buildVoiceReceptionistPrompt(context);

    expect(prompt).toContain("Marie Lavoie: Sales Manager");
    expect(prompt).toContain("(514) 555-1001");
    expect(prompt).toContain("(514) 555-1002");
  });

  it("should include capabilities section", () => {
    const context = createVoiceContext();
    const prompt = buildVoiceReceptionistPrompt(context);

    expect(prompt).toContain("Book test drive appointments");
    expect(prompt).toContain("Transfer calls");
    expect(prompt).toContain("You CANNOT");
  });
});

// --- buildContextFromDealershipConfig Tests ---

describe("buildContextFromDealershipConfig", () => {
  it("should map DealershipConfig fields to VoiceReceptionistContext", () => {
    const config = createDealershipConfig();
    const voiceContext = buildContextFromDealershipConfig(config, {
      aiName: "Alex",
      transferNumbers: {
        sales: "(514) 555-1001",
        service: "(514) 555-1002",
        parts: "(514) 555-1003",
        manager: "(514) 555-0000",
      },
      afterHoursSchedule: createAfterHoursSchedule(),
      locale: "en-CA",
    });

    expect(voiceContext.dealershipName).toBe("ReadyRide");
    expect(voiceContext.aiName).toBe("Alex");
    expect(voiceContext.staffDirectory).toHaveLength(3);
    expect(voiceContext.staffDirectory[0]!.name).toBe("Marie Lavoie");
    expect(voiceContext.tone).toBe("friendly");
  });
});

// --- VoiceReceptionistAgent Tests ---

describe("VoiceReceptionistAgent", () => {
  let agent: VoiceReceptionistAgent;

  beforeEach(() => {
    agent = new VoiceReceptionistAgent(
      createDealershipConfig(),
      createMockLanguageDetector(),
      {
        aiName: "Alex",
        transferNumbers: {
          sales: "(514) 555-1001",
          service: "(514) 555-1002",
          parts: "(514) 555-1003",
          manager: "(514) 555-0000",
        },
        afterHoursSchedule: createAfterHoursSchedule(),
      },
    );
  });

  describe("generateGreeting", () => {
    it("should return business hours greeting", () => {
      const greeting = agent.generateGreeting(false);

      expect(greeting).toContain("Thank you for calling ReadyRide");
      expect(greeting).toContain("this is Alex");
      expect(greeting).toContain("How can I help you today?");
    });

    it("should return after-hours greeting", () => {
      const greeting = agent.generateGreeting(true);

      expect(greeting).toContain("We're currently closed");
      expect(greeting).toContain("book an appointment");
      expect(greeting).toContain("call you back first thing in the morning");
    });

    it("should include French greetings", () => {
      const greeting = agent.generateGreetingFr(false);
      expect(greeting).toContain("Merci d'avoir appele ReadyRide");
      expect(greeting).toContain("ici Alex");

      const afterHoursGreeting = agent.generateGreetingFr(true);
      expect(afterHoursGreeting).toContain("Nous sommes presentement fermes");
    });
  });

  describe("handleInquiry", () => {
    it("should respond to sales inquiries", () => {
      const response = agent.handleInquiry("I'm looking for a new SUV", "sales_inquiry");
      expect(response).toContain("find the right vehicle");
    });

    it("should respond to service inquiries", () => {
      const response = agent.handleInquiry("My car needs an oil change", "service_inquiry");
      expect(response).toContain("service appointment");
    });

    it("should respond to parts inquiries", () => {
      const response = agent.handleInquiry("I need a new bumper", "parts_inquiry");
      expect(response).toContain("parts department");
    });

    it("should respond to test drive requests", () => {
      const response = agent.handleInquiry("I want to test drive a CR-V", "test_drive");
      expect(response).toContain("test driving");
    });

    it("should respond with hours and location", () => {
      const response = agent.handleInquiry("What are your hours?", "hours_location");
      expect(response).toContain("456 Auto Row");
      expect(response).toContain("Mon-Fri");
    });

    it("should handle speak-to-human requests", () => {
      const response = agent.handleInquiry("Can I speak to a person?", "speak_to_human");
      expect(response).toContain("connect you");
    });

    it("should handle complaints", () => {
      const response = agent.handleInquiry("I have a complaint", "complaint");
      expect(response).toContain("manager");
    });

    it("should handle unknown intents gracefully", () => {
      const response = agent.handleInquiry("blah blah", "unknown");
      expect(response).toContain("tell me a bit more");
    });

    it("should respond in French when language detector returns fr-CA", () => {
      const frAgent = new VoiceReceptionistAgent(
        createDealershipConfig(),
        createMockLanguageDetector("fr-CA"),
      );
      const response = frAgent.handleInquiry("Je cherche un VUS", "sales_inquiry");
      expect(response).toContain("vehicule");
    });
  });

  describe("initiateWarmTransfer", () => {
    it("should generate a warm transfer briefing with vehicle interest", () => {
      const briefing = agent.initiateWarmTransfer(
        {
          firstName: "Sarah",
          vehicleInterest: "2024 CR-V",
          questions: ["financing options", "available colors"],
        },
        "Marie Lavoie",
      );

      expect(briefing.customerName).toBe("Sarah");
      expect(briefing.vehicleInterest).toBe("2024 CR-V");
      expect(briefing.repBriefing).toContain("Sarah");
      expect(briefing.repBriefing).toContain("2024 CR-V");
      expect(briefing.repBriefing).toContain("financing options");
      expect(briefing.customerTransitionMessage).toContain("Marie Lavoie");
      expect(briefing.transferNumber).toBe("(514) 555-1001"); // sales
    });

    it("should route service-related transfers to service number", () => {
      const briefing = agent.initiateWarmTransfer(
        { firstName: "Jean", vehicleInterest: "service appointment for maintenance" },
        "James Chen",
      );

      expect(briefing.transferNumber).toBe("(514) 555-1002");
    });

    it("should handle transfer with no questions", () => {
      const briefing = agent.initiateWarmTransfer(
        { firstName: "Mike" },
        "Marie Lavoie",
      );

      expect(briefing.vehicleInterest).toBe("general inquiry");
      expect(briefing.keyQuestions).toEqual([]);
      expect(briefing.repBriefing).not.toContain("They asked about:");
    });
  });

  describe("generateAfterHoursResponse", () => {
    it("should offer appointment booking and callback", () => {
      const response = agent.generateAfterHoursResponse("I want to see the new Civics");
      expect(response).toContain("currently closed");
      expect(response).toContain("appointment");
      expect(response).toContain("call you back");
    });

    it("should respond in French when detected", () => {
      const frAgent = new VoiceReceptionistAgent(
        createDealershipConfig(),
        createMockLanguageDetector("fr-CA"),
      );
      const response = frAgent.generateAfterHoursResponse("Je veux voir les Civic");
      expect(response).toContain("fermes");
      expect(response).toContain("rendez-vous");
    });
  });

  describe("getVoiceConfig", () => {
    it("should return a valid Retell configuration", () => {
      const config = agent.getVoiceConfig();

      expect(config.agent_name).toBe("ReadyRide AI Receptionist");
      expect(config.language).toBe("en-CA");
      expect(config.fallback_language).toBe("fr-CA");
      expect(config.response_speed).toBe("normal");
      expect(config.max_call_duration_seconds).toBe(600);
      expect(config.silence_timeout_seconds).toBe(10);
      expect(config.enable_backchannel).toBe(true);
      expect(config.post_call_analysis).toBe(true);
      expect(config.system_prompt).toContain("ReadyRide");
      expect(config.system_prompt).toContain("Alex");
    });

    it("should generate French config when fr-CA is specified", () => {
      const config = agent.getVoiceConfig("fr-CA");

      expect(config.language).toBe("fr-CA");
      expect(config.fallback_language).toBe("en-CA");
      expect(config.system_prompt).toContain("receptionniste IA");
    });

    it("should include voicemail message with dealership name", () => {
      const config = agent.getVoiceConfig();
      expect(config.voicemail_message).toContain("ReadyRide");
    });
  });

  describe("getSystemPrompt", () => {
    it("should return a non-empty prompt string", () => {
      const prompt = agent.getSystemPrompt();
      expect(prompt.length).toBeGreaterThan(100);
      expect(prompt).toContain("ReadyRide");
    });
  });

  describe("getMaxWordsPerResponse", () => {
    it("should return VOICE_MAX_WORDS constant", () => {
      expect(agent.getMaxWordsPerResponse()).toBe(30);
    });
  });

  describe("default options", () => {
    it("should use default AI name and schedule when no options provided", () => {
      const defaultAgent = new VoiceReceptionistAgent(
        createDealershipConfig(),
        createMockLanguageDetector(),
      );
      const config = defaultAgent.getVoiceConfig();
      expect(config.system_prompt).toContain("Alex");
      expect(config.agent_name).toBe("ReadyRide AI Receptionist");
    });
  });
});

// --- Constants Tests ---

describe("VOICE_MAX_WORDS", () => {
  it("should be 30 for natural phone conversation flow", () => {
    expect(VOICE_MAX_WORDS).toBe(30);
  });
});
