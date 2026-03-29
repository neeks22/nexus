// --- Types ---
export type {
  DealershipConfig,
  StaffMember,
  AgentContext,
  AgentResponse,
  ComplianceResult,
  ConversationEntry,
  LeadData,
  PersonalizationVariables,
  VehicleMatchInfo,
} from "./types.js";

// --- Instant Response Agent ---
export { InstantResponseAgent } from "./instant-response-agent.js";
export type {
  LanguageDetectorDep,
  InventoryServiceDep,
  CompliancePreFlightDep,
  TemplateRepositoryDep,
  VehicleMatchResult,
} from "./instant-response-agent.js";

// --- Prompt Builders ---
export { buildInstantResponsePrompt, SMS_MAX_CHARS, EMAIL_MAX_WORDS } from "./prompts/instant-response.js";

// --- Cold Warming Agent (Epic 8) ---
export { buildColdWarmingPrompt } from "./prompts/cold-warming.js";
export { ColdWarmingAgent } from "./cold-warming-agent.js";
export type {
  InventoryServiceDep as ColdWarmingInventoryServiceDep,
  CompliancePreFlightDep as ColdWarmingCompliancePreFlightDep,
  LanguageDetectorDep as ColdWarmingLanguageDetectorDep,
  TemplateRepositoryDep as ColdWarmingTemplateRepositoryDep,
  TouchResult,
  BlockedTouchResult,
  GenerateTouchResult,
} from "./cold-warming-agent.js";

// --- Touch Scheduler ---
export {
  TOUCH_SCHEDULE,
  getScheduleForTouch,
  calculateTouchDueDate,
  isOverdue,
  resetCadence,
} from "./touch-scheduler.js";
export type { TouchChannel, TouchStrategy, TouchScheduleEntry } from "./touch-scheduler.js";
