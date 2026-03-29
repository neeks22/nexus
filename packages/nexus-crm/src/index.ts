// --- Types ---
export {
  CrmProvider,
} from "./types.js";
export type {
  CrmLead,
  CrmVehicle,
  CrmAdvisor,
  CrmAdapter,
  MessagingAdapter,
  LeadFilters,
  CreateLeadInput,
  UpdateLeadInput,
  CommunicationEntry,
  InboundMessage,
  MessageResult,
  LeadStatus,
} from "./types.js";

// --- Adapters ---
export { ActivixCrmAdapter, activixLeadToCrmLead } from "./adapters/activix-adapter.js";
export { GoHighLevelCrmAdapter, ghlContactToCrmLead } from "./adapters/ghl-adapter.js";
export type { GhlAdapterConfig } from "./adapters/ghl-adapter.js";
export { TwilioMessagingAdapter } from "./adapters/twilio-messaging.js";
export type { TwilioMessagingConfig } from "./adapters/twilio-messaging.js";
export { GhlMessagingAdapter } from "./adapters/ghl-messaging.js";
export type { GhlMessagingConfig } from "./adapters/ghl-messaging.js";

// --- Factory ---
export { createCrmAdapter, createMessagingAdapter } from "./crm-factory.js";
export type { MessagingProviderType } from "./crm-factory.js";
