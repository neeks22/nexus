/**
 * Types for the Nexus dealership AI agents.
 */

// --- Dealership Configuration ---

export interface StaffMember {
  name: string;
  role: string;
  email: string;
}

export interface DealershipConfig {
  dealershipName: string;
  address: string;
  phone: string;
  hours: string;
  timezone: string;
  tone: "professional" | "friendly" | "casual";
  staff: StaffMember[];
  escalationNumbers: string[];
}

// --- Agent Context ---

export interface VehicleMatchInfo {
  year: number;
  make: string;
  model: string;
  trim: string;
  color: string;
  features: string[];
  vin: string;
  matchScore: number;
  matchReasons: string[];
}

export interface ConversationEntry {
  role: "ai" | "customer";
  content: string;
  timestamp: number;
}

export interface AgentContext {
  lead: LeadData;
  locale: "en-CA" | "fr-CA";
  vehicleMatches: VehicleMatchInfo[];
  dealershipConfig: DealershipConfig;
  touchNumber: number;
  conversationHistory?: ConversationEntry[];
}

/**
 * Minimal lead data shape needed by the agent.
 * Compatible with ActivixLead from nexus-activix.
 */
export interface LeadData {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  locale?: string | null;
  source?: string | null;
  phones?: ReadonlyArray<{ number: string }>;
  emails?: ReadonlyArray<{ address: string }>;
  postal_code?: string | null;
  vehicles?: ReadonlyArray<{
    make?: string;
    model?: string;
    year?: number;
    trim?: string;
    type?: "wanted" | "exchange";
  }>;
  unsubscribe_all_date?: string | null;
  unsubscribe_sms_date?: string | null;
  unsubscribe_email_date?: string | null;
}

// --- Agent Response ---

export interface AgentResponse {
  message: string;
  channel: "sms" | "email";
  locale: "en-CA" | "fr-CA";
  vehicleMatches: VehicleMatchInfo[];
  complianceResult: ComplianceResult;
}

export interface ComplianceResult {
  pass: boolean;
  failures: Array<{ checker: string; reason: string }>;
}

// --- Personalization Variables ---

export interface PersonalizationVariables {
  firstName: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleTrim: string;
  vehicleColor: string;
  inventoryDetail: string;
  repName: string;
  dealershipName: string;
  dealershipPhone: string;
  dealershipAddress: string;
}

// --- Ad Copy Types ---

export type CampaignType = "new_inventory" | "used_inventory" | "service" | "seasonal" | "conquest" | "retention";

export type ComplianceFlag = "COMPLIANT" | "REVIEW" | "FLAGGED";

export type CtaButton = "Shop Now" | "Learn More" | "Book Now" | "Get Offer" | "Apply Now";

export interface MetaAdSet {
  primaryText: string;
  headline: string;
  description: string;
  ctaButton: CtaButton;
  imageGuidance: string;
  complianceFlag: ComplianceFlag;
  locale: "en-CA" | "fr-CA";
  specialAdCategory: "Credit";
}

export interface GoogleAdSet {
  headlines: string[];
  descriptions: string[];
  displayUrlPath: string;
  sitelinkExtensions: string[];
  complianceFlag: ComplianceFlag;
}

export interface SocialPost {
  platform: "facebook" | "instagram" | "linkedin";
  caption: string;
  imageDescription: string;
  hashtags: string[];
  cta: string;
  postTime: string;
  complianceFlag: ComplianceFlag;
  locale: "en-CA" | "fr-CA";
}

export interface AdCopyVehicle {
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage?: number;
  price?: number;
  weeklyPayment?: number;
  monthlyPayment?: number;
  color?: string;
  features?: string[];
}

export interface AdCopyOffer {
  title: string;
  details: string;
  endDate?: string;
  downPayment?: number;
}

export interface AdCopyAudience {
  type: "first_time_buyers" | "families" | "professionals" | "truck_owners" | "credit_rebuilders" | "general";
  location?: string;
  language?: "en" | "fr" | "both";
}
