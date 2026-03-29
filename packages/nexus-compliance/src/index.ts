export { ConsentTracker } from "./consent-tracker.js";
export type { ConsentRecord, ConsentCheckResult, ConsentTypeValue } from "./consent-tracker.js";
export { ConsentType, ConsentRecordSchema } from "./consent-tracker.js";

export { OptOutChecker } from "./opt-out-checker.js";
export type { LeadUnsubscribeFields, OptOutCheckResult } from "./opt-out-checker.js";

export { FrequencyCapChecker } from "./frequency-cap.js";
export type { TouchRecord, FrequencyCapConfig, FrequencyCapResult } from "./frequency-cap.js";

export { ContentValidator } from "./content-validator.js";
export type { ContentValidationResult } from "./content-validator.js";

export { FeatureValidator } from "./feature-validator.js";
export type { InventoryRecord, FeatureValidationResult } from "./feature-validator.js";

export { CompliancePreFlight } from "./compliance-preflight.js";
export type {
  ComplianceFailure,
  ComplianceCheckResult,
  ComplianceLeadData,
  ComplianceLogger,
  CompliancePreFlightConfig,
} from "./compliance-preflight.js";

export { getOptOutText, appendOptOut } from "./templates/opt-out.js";
export type { OptOutTemplateParams, OptOutTemplates } from "./templates/opt-out.js";
