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
  CampaignType,
  ComplianceFlag,
  CtaButton,
  MetaAdSet,
  GoogleAdSet,
  SocialPost,
  AdCopyVehicle,
  AdCopyOffer,
  AdCopyAudience,
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

// --- Service BDC Agent ---
export { buildServiceBdcPrompt, SERVICE_SMS_MAX_CHARS, SERVICE_EMAIL_MAX_WORDS } from "./prompts/service-bdc.js";
export type { ServiceBdcContext } from "./prompts/service-bdc.js";
export { ServiceBdcAgent } from "./service-bdc-agent.js";
export type {
  LanguageDetectorDep as ServiceBdcLanguageDetectorDep,
  CompliancePreFlightDep as ServiceBdcCompliancePreFlightDep,
  TemplateRepositoryDep as ServiceBdcTemplateRepositoryDep,
  ServiceInquiry,
  ServiceAppointmentRequest,
  ServiceStatusResult,
  RecallInfo,
  ServiceResponse,
} from "./service-bdc-agent.js";

// --- Voice Receptionist Agent ---
export { buildVoiceReceptionistPrompt, buildContextFromDealershipConfig, VOICE_MAX_WORDS, VOICE_REFLECTION_CAP } from "./prompts/voice-receptionist.js";
export type { VoiceReceptionistContext, AfterHoursSchedule } from "./prompts/voice-receptionist.js";
export { VoiceReceptionistAgent } from "./voice-receptionist-agent.js";
export type {
  VoiceLanguageDetectorDep,
  RetellVoiceConfig,
  CallIntent,
  WarmTransferBriefing,
} from "./voice-receptionist-agent.js";

// --- Ad Copy Agent ---
export {
  buildAdCopyPrompt,
  detectComplianceFlag,
  validateCharLimit,
  validateStyleRules,
  META_PRIMARY_TEXT_MAX_CHARS,
  META_HEADLINE_MAX_CHARS,
  META_DESCRIPTION_MAX_CHARS,
  GOOGLE_HEADLINE_MAX_CHARS,
  GOOGLE_DESCRIPTION_MAX_CHARS,
} from "./prompts/ad-copy.js";
export type { AdCopyPromptContext } from "./prompts/ad-copy.js";
export { AdCopyAgent } from "./ad-copy-agent.js";
export type { AdCopyInventoryServiceDep } from "./ad-copy-agent.js";

// --- Funnel Agent ---
export { FunnelAgent, validateFunnelCompliance } from "./funnel-agent.js";
export type {
  FunnelData,
  FunnelLeadResult,
  VehicleMatchQuery,
  FunnelInventoryServiceDep,
  FunnelCrmServiceDep,
} from "./funnel-agent.js";
export { buildFunnelFollowupPrompt, FUNNEL_SMS_MAX_CHARS, FUNNEL_EMAIL_MAX_WORDS } from "./prompts/funnel-followup.js";
export type { FunnelFollowupContext } from "./prompts/funnel-followup.js";

// --- Touch Scheduler ---
export {
  TOUCH_SCHEDULE,
  getScheduleForTouch,
  calculateTouchDueDate,
  isOverdue,
  resetCadence,
} from "./touch-scheduler.js";
export type { TouchChannel, TouchStrategy, TouchScheduleEntry } from "./touch-scheduler.js";
