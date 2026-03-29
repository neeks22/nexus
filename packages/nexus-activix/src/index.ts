export {
  ActivixClient,
  ActivixApiError,
  ActivixRateLimitError,
  ActivixCircuitOpenError,
} from "./activix-client.js";
export type { ActivixClientConfig, LeadsApi } from "./activix-client.js";

export {
  ActivixLeadSchema,
  ActivixLeadCreateSchema,
  ActivixLeadUpdateSchema,
  ActivixEmailSchema,
  ActivixPhoneSchema,
  ActivixVehicleSchema,
  ActivixAdvisorSchema,
  PaginationMetaSchema,
  LeadType,
  LeadStatus,
  LeadResult,
  LeadDivision,
  LeadSegment,
  VehicleType,
  EmailType,
  PhoneType,
} from "./schemas.js";

export type {
  ActivixLead,
  ActivixLeadCreate,
  ActivixLeadUpdate,
  ActivixEmail,
  ActivixPhone,
  ActivixVehicle,
  ActivixAdvisor,
  PaginationMeta,
  PaginatedResponse,
  LeadListFilters,
} from "./schemas.js";
