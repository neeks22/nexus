// Types
export type {
  Layer1Config,
  Layer2Config,
  Layer3Config,
  StaffMember,
  FaqEntry,
  AssembledPrompt,
  PromptType,
  SanitizeResult,
} from './types.js';

export {
  Layer2Schema,
  Layer3Schema,
  StaffMemberSchema,
  FaqEntrySchema,
} from './types.js';

// Layer 1: Base prompts and safety rails
export {
  INSTANT_RESPONSE_BASE,
  COLD_WARMING_BASE,
  SAFETY_RAILS,
} from './layer1/base-prompts.js';

// Layer 2: Tenant config store
export { TenantConfigStore } from './layer2/tenant-config.js';

// Layer 3: Client config store and input sanitizer
export { ClientConfigStore } from './layer3/client-config.js';
export { InputSanitizer, CHAR_LIMITS } from './layer3/input-sanitizer.js';

// Prompt assembler
export { PromptAssembler } from './prompt-assembler.js';
