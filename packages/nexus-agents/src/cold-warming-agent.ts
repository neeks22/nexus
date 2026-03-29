// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Cold Lead Warming Agent — Multi-touch nurture sequences
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type {
  DealershipConfig,
  LeadData,
  AgentContext,
  VehicleMatchInfo,
  ComplianceResult,
  ConversationEntry,
} from "./types.js";
import { buildColdWarmingPrompt } from "./prompts/cold-warming.js";
import {
  getScheduleForTouch,
  calculateTouchDueDate,
  isOverdue,
} from "./touch-scheduler.js";
import type { TouchChannel } from "./touch-scheduler.js";

// --- Interfaces for injected dependencies ---

export interface InventoryServiceDep {
  findMatching(query: {
    make?: string;
    model?: string;
    year?: number;
  }): Promise<Array<{
    vehicle: {
      vin: string;
      make: string;
      model: string;
      year: number;
      trim: string;
      color: string;
      features: string[];
      msrp: number;
      stockStatus: string;
      daysOnLot: number;
    };
    matchScore: number;
    matchReasons: string[];
  }>>;
}

export interface CompliancePreFlightDep {
  check(
    lead: { id: number; unsubscribe_all_date?: string | null; unsubscribe_sms_date?: string | null; unsubscribe_email_date?: string | null },
    message: string,
    channel: "sms" | "email",
    inventoryRecord?: unknown,
    touchHistory?: Array<{ leadId: number; channel: string; sentAt: Date }>,
  ): { pass: boolean; failures: Array<{ checker: string; reason: string }> };
}

export interface LanguageDetectorDep {
  detect(lead: {
    locale?: string | null;
    phones?: ReadonlyArray<{ number: string }>;
    postal_code?: string | null;
  }): "en-CA" | "fr-CA";
}

export interface TemplateRepositoryDep {
  render(
    templateId: string,
    locale: "en-CA" | "fr-CA",
    channel: "sms" | "email",
    variables: Record<string, string | undefined>,
  ): string | null;
}

// --- Touch result ---

export interface TouchResult {
  readonly message: string;
  readonly channel: TouchChannel;
  readonly locale: "en-CA" | "fr-CA";
  readonly touchNumber: number;
  readonly complianceResult: ComplianceResult;
}

export interface BlockedTouchResult {
  readonly blocked: true;
  readonly channel: TouchChannel;
  readonly locale: "en-CA" | "fr-CA";
  readonly touchNumber: number;
  readonly complianceResult: ComplianceResult;
}

export type GenerateTouchResult = TouchResult | BlockedTouchResult;

// --- Touch interval map (days from previous touch) ---

const TOUCH_INTERVALS: ReadonlyMap<number, number> = new Map([
  [2, 2],   // +2 days from touch 1
  [3, 4],   // +4 days from touch 1
  [4, 7],   // +7 days from touch 1
  [5, 14],  // +14 days from touch 1
  [6, 30],  // +30 days from touch 1
]);

const MS_PER_DAY = 86_400_000;

// --- Break-up messages ---

const BREAKUP_MESSAGES: Record<"en-CA" | "fr-CA", string> = {
  "en-CA": "Looks like the timing might not be right — no worries, I'm here when you're ready. If anything changes or you'd like to chat about what's available, just reach out anytime.",
  "fr-CA": "On dirait que le moment n'est peut-etre pas ideal — pas de souci, je suis la quand vous serez pret. Si quelque chose change ou si vous aimeriez discuter de ce qui est disponible, n'hesitez pas a me contacter.",
};

// --- ColdWarmingAgent ---

export class ColdWarmingAgent {
  private readonly dealershipConfig: DealershipConfig;
  private readonly inventoryService: InventoryServiceDep;
  private readonly compliancePreFlight: CompliancePreFlightDep;
  private readonly languageDetector: LanguageDetectorDep;
  private readonly templateRepository: TemplateRepositoryDep;

  constructor(
    dealershipConfig: DealershipConfig,
    inventoryService: InventoryServiceDep,
    compliancePreFlight: CompliancePreFlightDep,
    languageDetector: LanguageDetectorDep,
    templateRepository: TemplateRepositoryDep,
  ) {
    this.dealershipConfig = dealershipConfig;
    this.inventoryService = inventoryService;
    this.compliancePreFlight = compliancePreFlight;
    this.languageDetector = languageDetector;
    this.templateRepository = templateRepository;
  }

  /**
   * Generates the message for a specific touch in the cold lead warming sequence.
   *
   * 1. Detects language
   * 2. Queries fresh inventory matches
   * 3. Checks CompliancePreFlight (consent expiry, opt-out, frequency cap)
   * 4. If compliance fails, returns blocked result
   * 5. Determines channel based on touch schedule
   * 6. Renders appropriate template with personalization
   * 7. Returns touch result
   */
  async generateTouch(
    lead: LeadData,
    touchNumber: number,
    transcriptHistory?: ConversationEntry[],
  ): Promise<GenerateTouchResult> {
    // 1. Detect language
    const locale = this.languageDetector.detect(lead);

    // 2. Query fresh inventory matches
    const vehicleMatches = await this.queryInventoryForLead(lead);

    // 3. Determine channel from touch schedule
    const schedule = getScheduleForTouch(touchNumber);
    const channel = schedule.channel;

    // 4. Check compliance BEFORE generating message
    const preCheckResult = this.compliancePreFlight.check(
      lead,
      "", // empty message for pre-check (consent, opt-out, frequency)
      channel,
    );

    if (!preCheckResult.pass) {
      return {
        blocked: true,
        channel,
        locale,
        touchNumber,
        complianceResult: {
          pass: false,
          failures: preCheckResult.failures,
        },
      };
    }

    // 5. Build the message
    const message = this.buildMessage(
      lead,
      touchNumber,
      locale,
      channel,
      vehicleMatches,
      transcriptHistory,
    );

    // 6. Run full compliance check on the actual message
    const fullCheckResult = this.compliancePreFlight.check(
      lead,
      message,
      channel,
    );

    if (!fullCheckResult.pass) {
      return {
        blocked: true,
        channel,
        locale,
        touchNumber,
        complianceResult: {
          pass: false,
          failures: fullCheckResult.failures,
        },
      };
    }

    return {
      message,
      channel,
      locale,
      touchNumber,
      complianceResult: {
        pass: true,
        failures: [],
      },
    };
  }

  /**
   * Calculates when the next touch is due, relative to a reference date.
   */
  getNextTouchDate(currentTouch: number, lastTouchDate: Date): Date {
    const nextTouch = currentTouch + 1;

    if (nextTouch <= 6) {
      // Use the TOUCH_INTERVALS difference
      const nextSchedule = getScheduleForTouch(nextTouch);
      const currentSchedule = getScheduleForTouch(currentTouch);
      const daysDelta = nextSchedule.daysFromStart - currentSchedule.daysFromStart;
      return new Date(lastTouchDate.getTime() + daysDelta * MS_PER_DAY);
    }

    // Touch 7+: monthly (30 days from last touch)
    return new Date(lastTouchDate.getTime() + 30 * MS_PER_DAY);
  }

  /**
   * Returns true if the lead is due for this touch based on when the lead was created.
   */
  shouldSendTouch(lead: LeadData, touchNumber: number, lastTouchDate: Date): boolean {
    if (touchNumber <= 1) {
      return true; // Touch 1 is always immediate
    }

    const nextDueDate = this.getNextTouchDate(touchNumber - 1, lastTouchDate);
    return new Date().getTime() >= nextDueDate.getTime();
  }

  /**
   * Returns the touch 6 break-up message in the correct language.
   */
  getBreakupMessage(locale: "en-CA" | "fr-CA"): string {
    return BREAKUP_MESSAGES[locale];
  }

  /**
   * Builds the system prompt for the cold warming agent.
   * Exposed for testing and external use.
   */
  buildPrompt(context: AgentContext): string {
    return buildColdWarmingPrompt(context);
  }

  // --- Private helpers ---

  private async queryInventoryForLead(lead: LeadData): Promise<VehicleMatchInfo[]> {
    const wantedVehicle = lead.vehicles?.find((v) => v.type === "wanted");
    if (!wantedVehicle) {
      return [];
    }

    const matches = await this.inventoryService.findMatching({
      make: wantedVehicle.make,
      model: wantedVehicle.model,
      year: wantedVehicle.year,
    });

    return matches.map((m) => ({
      year: m.vehicle.year,
      make: m.vehicle.make,
      model: m.vehicle.model,
      trim: m.vehicle.trim,
      color: m.vehicle.color,
      features: m.vehicle.features,
      vin: m.vehicle.vin,
      matchScore: m.matchScore,
      matchReasons: m.matchReasons,
    }));
  }

  private buildMessage(
    lead: LeadData,
    touchNumber: number,
    locale: "en-CA" | "fr-CA",
    channel: TouchChannel,
    vehicleMatches: VehicleMatchInfo[],
    transcriptHistory?: ConversationEntry[],
  ): string {
    // Touch 6 uses the hardcoded break-up message
    if (touchNumber === 6) {
      return this.getBreakupMessage(locale);
    }

    // Map touch number to template ID
    const templateId = this.getTemplateIdForTouch(touchNumber);

    // Build personalization variables
    const primaryVehicle = vehicleMatches[0];
    const variables: Record<string, string | undefined> = {
      firstName: lead.first_name ?? undefined,
      dealershipName: this.dealershipConfig.dealershipName,
      dealershipPhone: this.dealershipConfig.phone,
      repName: this.getRepName(),
      vehicleYear: primaryVehicle ? String(primaryVehicle.year) : undefined,
      vehicleMake: primaryVehicle?.make,
      vehicleModel: primaryVehicle?.model,
      vehicleTrim: primaryVehicle?.trim,
      vehicleColor: primaryVehicle?.color,
      inventoryDetail: primaryVehicle?.features.slice(0, 2).join(", ") ?? undefined,
    };

    // Try template first
    const rendered = this.templateRepository.render(
      templateId,
      locale,
      channel,
      variables,
    );

    if (rendered !== null) {
      return rendered;
    }

    // Fallback: build from prompt context (would normally go through LLM)
    return this.buildFallbackMessage(lead, touchNumber, locale, vehicleMatches);
  }

  private getTemplateIdForTouch(touchNumber: number): string {
    switch (touchNumber) {
      case 1:
        return "instant_response";
      case 2:
        return "touch_2_followup";
      case 3:
        return "touch_3_feature";
      case 4:
        return "touch_4_persistence";
      case 5:
        return "touch_5_value";
      case 6:
        return "touch_6_breakup";
      default:
        return "touch_7_monthly";
    }
  }

  private getRepName(): string {
    const salesRep = this.dealershipConfig.staff.find(
      (s) => s.role.toLowerCase().includes("sales") || s.role.toLowerCase().includes("vente"),
    );
    return salesRep?.name ?? this.dealershipConfig.staff[0]?.name ?? "our team";
  }

  private buildFallbackMessage(
    lead: LeadData,
    touchNumber: number,
    locale: "en-CA" | "fr-CA",
    vehicleMatches: VehicleMatchInfo[],
  ): string {
    const firstName = lead.first_name ?? (locale === "en-CA" ? "there" : "vous");
    const vehicle = vehicleMatches[0];

    if (locale === "fr-CA") {
      if (vehicle) {
        return `Bonjour ${firstName}! Nous avons un ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} en ${vehicle.color} disponible selon nos annonces actuelles. N'hesitez pas a nous contacter pour plus d'informations.`;
      }
      return `Bonjour ${firstName}! Nous avons de nouveaux vehicules en inventaire qui pourraient vous interesser. Contactez-nous pour en savoir plus.`;
    }

    if (vehicle) {
      return `Hi ${firstName}! Based on our current listings, we have a ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} in ${vehicle.color} available. Feel free to reach out if you'd like more details.`;
    }
    return `Hi ${firstName}! We have some great new vehicles in stock that might interest you. Reach out anytime if you'd like to learn more.`;
  }
}
