/**
 * InstantResponseAgent — generates personalized first-touch responses
 * for new leads using template-based rendering with compliance checks.
 *
 * Claude API integration is handled natively via auto-response and follow-up crons.
 * This agent uses the MessageTemplateRepository for template-based generation.
 */

import type {
  AgentContext,
  AgentResponse,
  ComplianceResult,
  DealershipConfig,
  LeadData,
  PersonalizationVariables,
  VehicleMatchInfo,
} from "./types.js";

// --- Dependency interfaces (structurally typed, no hard import needed) ---

export interface LanguageDetectorDep {
  detect(lead: { locale?: string | null; phones?: ReadonlyArray<{ number: string }>; postal_code?: string | null }): "en-CA" | "fr-CA";
}

export interface InventoryServiceDep {
  findMatching(query: { make?: string; model?: string; year?: number }): Promise<VehicleMatchResult[]>;
}

export interface VehicleMatchResult {
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
}

export interface CompliancePreFlightDep {
  check(
    lead: { id: number; unsubscribe_all_date?: string | null; unsubscribe_sms_date?: string | null; unsubscribe_email_date?: string | null },
    message: string,
    channel: "sms" | "email",
    inventoryRecord?: { vin: string; make: string; model: string; year: number; trim?: string; features: string[] },
  ): { pass: boolean; failures: Array<{ checker: string; reason: string }> };
}

export interface TemplateRepositoryDep {
  render(
    templateId: string,
    locale: "en-CA" | "fr-CA",
    channel: "sms" | "email",
    variables: Record<string, string | undefined>,
  ): string | null;
}

// --- InstantResponseAgent ---

export class InstantResponseAgent {
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
   * Main response method — detects language, queries inventory, builds context,
   * generates a template-based response, and runs compliance checks.
   */
  async respond(lead: LeadData, channel: "sms" | "email" = "sms"): Promise<AgentResponse> {
    // 1. Detect language
    const locale = this.languageDetector.detect(lead);

    // 2. Query inventory for matching vehicles
    const vehicleMatches = await this.queryInventoryForLead(lead);

    // 3. Build agent context
    const context: AgentContext = {
      lead,
      locale,
      vehicleMatches,
      dealershipConfig: this.dealershipConfig,
      touchNumber: 1,
    };

    // 4. Generate personalization variables and render template
    const variables = this.generatePersonalization(lead, vehicleMatches);
    let message = this.templateRepository.render("instant_response", locale, channel, variables);

    // Fallback if template not found — generate a minimal response
    if (message === null) {
      message = this.buildFallbackMessage(variables, locale, channel);
    }

    // 5. Run compliance check
    const inventoryRecord = vehicleMatches.length > 0
      ? {
          vin: vehicleMatches[0]!.vin,
          make: vehicleMatches[0]!.make,
          model: vehicleMatches[0]!.model,
          year: vehicleMatches[0]!.year,
          trim: vehicleMatches[0]!.trim,
          features: vehicleMatches[0]!.features,
        }
      : undefined;

    const complianceCheck = this.compliancePreFlight.check(
      {
        id: lead.id,
        unsubscribe_all_date: lead.unsubscribe_all_date,
        unsubscribe_sms_date: lead.unsubscribe_sms_date,
        unsubscribe_email_date: lead.unsubscribe_email_date,
      },
      message,
      channel,
      inventoryRecord,
    );

    const complianceResult: ComplianceResult = {
      pass: complianceCheck.pass,
      failures: complianceCheck.failures,
    };

    return {
      message,
      channel,
      locale,
      vehicleMatches,
      complianceResult,
    };
  }

  /**
   * Extracts personalization variables from lead data and inventory matches.
   * Returns a flat object of template variables ready for substitution.
   */
  generatePersonalization(lead: LeadData, vehicleMatches: VehicleMatchInfo[]): PersonalizationVariables {
    const firstName = lead.first_name ?? (lead.locale?.startsWith("fr") ? "Client" : "there");
    const repName = this.getAssignedRepName();

    if (vehicleMatches.length === 0) {
      return {
        firstName,
        vehicleYear: "",
        vehicleMake: "",
        vehicleModel: "",
        vehicleTrim: "",
        vehicleColor: "",
        inventoryDetail: this.getGenericInventoryDetail(lead.locale),
        repName,
        dealershipName: this.dealershipConfig.dealershipName,
        dealershipPhone: this.dealershipConfig.phone,
        dealershipAddress: this.dealershipConfig.address,
      };
    }

    const topMatch = vehicleMatches[0]!;
    const inventoryDetail = this.buildInventoryDetail(topMatch, lead.locale);

    return {
      firstName,
      vehicleYear: String(topMatch.year),
      vehicleMake: topMatch.make,
      vehicleModel: topMatch.model,
      vehicleTrim: topMatch.trim,
      vehicleColor: topMatch.color,
      inventoryDetail,
      repName,
      dealershipName: this.dealershipConfig.dealershipName,
      dealershipPhone: this.dealershipConfig.phone,
      dealershipAddress: this.dealershipConfig.address,
    };
  }

  /**
   * Queries the inventory service using the lead's vehicle interests.
   * Returns VehicleMatchInfo[] from the top matches.
   */
  private async queryInventoryForLead(lead: LeadData): Promise<VehicleMatchInfo[]> {
    const wantedVehicles = (lead.vehicles ?? []).filter(
      (v) => v.type === "wanted" || v.type === undefined,
    );

    if (wantedVehicles.length === 0) {
      // Try a broad search with no filters
      const results = await this.inventoryService.findMatching({});
      return results.map((r) => this.toVehicleMatchInfo(r));
    }

    // Search for the first wanted vehicle
    const wanted = wantedVehicles[0]!;
    const results = await this.inventoryService.findMatching({
      make: wanted.make,
      model: wanted.model,
      year: wanted.year,
    });

    return results.map((r) => this.toVehicleMatchInfo(r));
  }

  private toVehicleMatchInfo(result: VehicleMatchResult): VehicleMatchInfo {
    return {
      year: result.vehicle.year,
      make: result.vehicle.make,
      model: result.vehicle.model,
      trim: result.vehicle.trim,
      color: result.vehicle.color,
      features: result.vehicle.features,
      vin: result.vehicle.vin,
      matchScore: result.matchScore,
      matchReasons: result.matchReasons,
    };
  }

  private buildInventoryDetail(match: VehicleMatchInfo, locale?: string | null): string {
    const isEnglish = !locale?.startsWith("fr");
    const feature = match.features.length > 0 ? match.features[0]! : null;

    if (feature) {
      if (isEnglish) {
        return `Based on our current listings, we have a beautiful ${match.color} model with ${feature}.`;
      }
      return `Selon nos annonces actuelles, nous avons un magnifique modele ${match.color} avec ${feature}.`;
    }

    if (isEnglish) {
      return `Based on our current listings, we have a ${match.color} model available.`;
    }
    return `Selon nos annonces actuelles, nous avons un modele ${match.color} disponible.`;
  }

  private getGenericInventoryDetail(locale?: string | null): string {
    const isEnglish = !locale?.startsWith("fr");
    if (isEnglish) {
      return "We have a great selection of vehicles available right now — I'd love to help you find the perfect match.";
    }
    return "Nous avons une excellente selection de vehicules disponibles en ce moment — j'aimerais vous aider a trouver le match parfait.";
  }

  private getAssignedRepName(): string {
    const salesRep = this.dealershipConfig.staff.find(
      (s) => s.role.toLowerCase().includes("sales") || s.role.toLowerCase().includes("vente"),
    );
    return salesRep?.name ?? this.dealershipConfig.staff[0]?.name ?? "our team";
  }

  private buildFallbackMessage(
    variables: PersonalizationVariables,
    locale: "en-CA" | "fr-CA",
    channel: "sms" | "email",
  ): string {
    if (locale === "en-CA") {
      if (channel === "sms") {
        return `Hi ${variables.firstName}! Thanks for your interest. ${variables.inventoryDetail} Would you like to schedule a visit? ${variables.repName} is here to help. - ${variables.dealershipName}`;
      }
      return `Hi ${variables.firstName},\n\nThank you for your interest! ${variables.inventoryDetail}\n\nWould you like to schedule a visit? ${variables.repName} on our team is ready to help.\n\nBest regards,\n${variables.repName}\n${variables.dealershipName}\n${variables.dealershipPhone}`;
    }

    if (channel === "sms") {
      return `Bonjour ${variables.firstName}! Merci pour votre interet. ${variables.inventoryDetail} Aimeriez-vous planifier une visite? ${variables.repName} est la pour vous aider. - ${variables.dealershipName}`;
    }
    return `Bonjour ${variables.firstName},\n\nMerci pour votre interet! ${variables.inventoryDetail}\n\nAimeriez-vous planifier une visite? ${variables.repName} de notre equipe est pret a vous aider.\n\nCordialement,\n${variables.repName}\n${variables.dealershipName}\n${variables.dealershipPhone}`;
  }
}
