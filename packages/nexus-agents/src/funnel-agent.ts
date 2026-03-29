/**
 * FunnelAgent — processes applications from the multi-step lead funnel,
 * creates CRM leads, matches vehicles, and triggers instant responses.
 *
 * Works with funnel data from the /apply page (7-step wizard).
 */

import type {
  DealershipConfig,
  VehicleMatchInfo,
  ComplianceResult,
} from "./types.js";

/* ============================================
   TYPES
   ============================================ */

export interface FunnelData {
  vehicleType: string;
  budget: string;
  employment: string;
  creditSituation: string;
  tradeIn: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  caslConsent: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  completedAt?: string;
}

export interface FunnelLeadResult {
  leadId: string;
  preApprovalScore: number;
  preApprovalCategory: "high" | "medium" | "low";
  vehicleMatches: VehicleMatchInfo[];
  thankYouMessage: string;
  followUpChannel: "sms" | "email";
}

export interface VehicleMatchQuery {
  type: string;
  maxMonthlyPayment: number;
}

export interface FunnelInventoryServiceDep {
  findByTypeAndBudget(query: VehicleMatchQuery): Promise<VehicleMatchInfo[]>;
}

export interface FunnelCrmServiceDep {
  createLead(data: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    source: string;
    notes: string;
    tags: string[];
  }): Promise<{ id: string }>;
}

/* ============================================
   BUDGET MAPPING
   ============================================ */

const BUDGET_MAP: Record<string, { label: string; maxPayment: number }> = {
  "under-250": { label: "Under $250/mo", maxPayment: 250 },
  "250-350": { label: "$250-$350/mo", maxPayment: 350 },
  "350-500": { label: "$350-$500/mo", maxPayment: 500 },
  "500-plus": { label: "$500+/mo", maxPayment: 800 },
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  "self-employed": "Self-employed",
  "retired": "Retired",
  "other": "Other",
};

const CREDIT_LABELS: Record<string, string> = {
  "excellent": "Excellent",
  "good": "Good",
  "fair": "Fair",
  "rebuilding": "Rebuilding",
  "not-sure": "Not Sure",
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  "suv": "SUV",
  "sedan": "Sedan",
  "truck": "Truck",
  "van": "Van",
  "coupe": "Coupe",
  "not-sure": "Not Sure",
};

/* ============================================
   FUNNEL AGENT CLASS
   ============================================ */

export class FunnelAgent {
  private readonly dealershipConfig: DealershipConfig;
  private readonly inventoryService: FunnelInventoryServiceDep | undefined;
  private readonly crmService: FunnelCrmServiceDep | undefined;

  constructor(deps: {
    dealershipConfig: DealershipConfig;
    inventoryService?: FunnelInventoryServiceDep;
    crmService?: FunnelCrmServiceDep;
  }) {
    this.dealershipConfig = deps.dealershipConfig;
    this.inventoryService = deps.inventoryService;
    this.crmService = deps.crmService;
  }

  /**
   * Process a complete funnel application.
   * Creates CRM lead, matches vehicles, calculates pre-approval score,
   * and generates a personalized thank-you message.
   */
  async processApplication(funnelData: FunnelData): Promise<FunnelLeadResult> {
    // 1. Calculate pre-approval score
    const preApprovalScore = this.calculatePreApprovalScore(
      funnelData.employment,
      funnelData.creditSituation,
      funnelData.budget
    );

    const preApprovalCategory = this.categorizeScore(preApprovalScore);

    // 2. Match vehicles
    const vehicleMatches = await this.matchVehicle(
      funnelData.vehicleType,
      funnelData.budget
    );

    // 3. Create CRM lead (if service available)
    let leadId = `funnel-${Date.now()}`;
    if (this.crmService) {
      const tags = [
        `vehicle:${funnelData.vehicleType}`,
        `budget:${funnelData.budget}`,
        `credit:${funnelData.creditSituation}`,
        `employment:${funnelData.employment}`,
        `score:${preApprovalCategory}`,
        "source:funnel",
      ];

      if (funnelData.tradeIn === "yes") {
        tags.push("trade-in:yes");
      }

      if (funnelData.utmSource) {
        tags.push(`utm:${funnelData.utmSource}`);
      }

      const notes = this.buildLeadNotes(funnelData, preApprovalScore);

      const result = await this.crmService.createLead({
        firstName: funnelData.firstName,
        lastName: funnelData.lastName,
        phone: funnelData.phone,
        email: funnelData.email,
        source: `funnel:${funnelData.utmSource || "direct"}`,
        notes,
        tags,
      });

      leadId = result.id;
    }

    // 4. Generate thank-you message
    const thankYouMessage = this.generateThankYouMessage(
      funnelData,
      vehicleMatches
    );

    return {
      leadId,
      preApprovalScore,
      preApprovalCategory,
      vehicleMatches,
      thankYouMessage,
      followUpChannel: "sms",
    };
  }

  /**
   * Match vehicles based on type and budget preferences.
   * Returns top 3 matches from inventory.
   */
  async matchVehicle(
    vehicleType: string,
    budget: string
  ): Promise<VehicleMatchInfo[]> {
    const budgetInfo = BUDGET_MAP[budget] ?? BUDGET_MAP["250-350"] ?? { label: "$250-$350/mo", maxPayment: 350 };

    if (this.inventoryService) {
      const matches = await this.inventoryService.findByTypeAndBudget({
        type: vehicleType === "not-sure" ? "" : vehicleType,
        maxMonthlyPayment: budgetInfo.maxPayment,
      });
      return matches.slice(0, 3);
    }

    // Return empty when no inventory service is configured
    return [];
  }

  /**
   * Calculate a pre-approval likelihood score based on employment,
   * credit situation, and budget.
   *
   * Score: 0-100 where higher = more likely to be approved.
   */
  calculatePreApprovalScore(
    employment: string,
    creditSituation: string,
    budget: string
  ): number {
    let score = 50; // Base score

    // Employment scoring
    const employmentScores: Record<string, number> = {
      "full-time": 25,
      "part-time": 15,
      "self-employed": 18,
      "retired": 20,
      "other": 10,
    };
    score += employmentScores[employment] || 10;

    // Credit scoring
    const creditScores: Record<string, number> = {
      "excellent": 25,
      "good": 20,
      "fair": 12,
      "rebuilding": 5,
      "not-sure": 10,
    };
    score += creditScores[creditSituation] || 10;

    // Budget range adjustment (higher budgets = more flexibility for lenders)
    const budgetBonus: Record<string, number> = {
      "under-250": 0,
      "250-350": 2,
      "350-500": 4,
      "500-plus": 5,
    };
    score += budgetBonus[budget] || 0;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate a personalized thank-you / confirmation message
   * with vehicle recommendations.
   */
  generateThankYouMessage(
    funnelData: FunnelData,
    vehicleMatches: VehicleMatchInfo[]
  ): string {
    const firstStaff = this.dealershipConfig.staff[0];
    const repName = firstStaff !== undefined
      ? firstStaff.name
      : "our financing team";

    const vehicleTypeLabel =
      VEHICLE_TYPE_LABELS[funnelData.vehicleType] ?? "vehicle";
    const budgetLabel =
      BUDGET_MAP[funnelData.budget]?.label ?? "your budget";

    let message = `Hi ${funnelData.firstName}! Your application has been received. `;

    if (vehicleMatches.length > 0 && vehicleMatches[0] !== undefined) {
      const topMatch = vehicleMatches[0];
      message += `Based on your preferences, we found a ${topMatch.year} ${topMatch.make} ${topMatch.model} that fits your ${budgetLabel} budget. `;
    } else {
      message += `We have several ${vehicleTypeLabel} options within ${budgetLabel} that would be perfect for you. `;
    }

    message += `${repName} from ${this.dealershipConfig.dealershipName} will reach out within 5 minutes to discuss your options.`;

    if (funnelData.tradeIn === "yes") {
      message += ` We'll include your trade-in valuation in the offer.`;
    }

    return message;
  }

  /* ── Private helpers ───────── */

  private categorizeScore(score: number): "high" | "medium" | "low" {
    if (score >= 75) return "high";
    if (score >= 50) return "medium";
    return "low";
  }

  private buildLeadNotes(funnelData: FunnelData, score: number): string {
    const vehicleLabel = VEHICLE_TYPE_LABELS[funnelData.vehicleType] || funnelData.vehicleType;
    const budgetLabel = BUDGET_MAP[funnelData.budget]?.label || funnelData.budget;
    const employmentLabel = EMPLOYMENT_LABELS[funnelData.employment] || funnelData.employment;
    const creditLabel = CREDIT_LABELS[funnelData.creditSituation] || funnelData.creditSituation;

    const lines = [
      `[FUNNEL APPLICATION]`,
      `Vehicle Interest: ${vehicleLabel}`,
      `Budget: ${budgetLabel}`,
      `Employment: ${employmentLabel}`,
      `Credit: ${creditLabel}`,
      `Trade-In: ${funnelData.tradeIn === "yes" ? "Yes" : "No"}`,
      `Pre-Approval Score: ${score}/100 (${this.categorizeScore(score)})`,
      `CASL Consent: Yes (${funnelData.completedAt || new Date().toISOString()})`,
    ];

    if (funnelData.utmSource) {
      lines.push(`Source: ${funnelData.utmSource}/${funnelData.utmMedium || ""}/${funnelData.utmCampaign || ""}`);
    }

    return lines.join("\n");
  }
}

/* ============================================
   COMPLIANCE CHECK (stub for pipeline integration)
   ============================================ */

export function validateFunnelCompliance(funnelData: FunnelData): ComplianceResult {
  const failures: Array<{ checker: string; reason: string }> = [];

  if (!funnelData.caslConsent) {
    failures.push({ checker: "casl", reason: "CASL consent not provided" });
  }

  if (!funnelData.phone && !funnelData.email) {
    failures.push({
      checker: "contact",
      reason: "No contact method provided",
    });
  }

  return {
    pass: failures.length === 0,
    failures,
  };
}
