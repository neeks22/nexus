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
