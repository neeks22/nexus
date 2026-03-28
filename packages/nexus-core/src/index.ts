// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  nexus-core — Public API
//  This is the single entry point developers import from.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Core classes ──────────────────────────────────
export { Agent } from './agent/index.js';
export { Transcript } from './transcript/index.js';

// ── Provider ──────────────────────────────────────
export { AnthropicProvider, NexusProviderError } from './provider/index.js';
export type { NexusProviderErrorInfo } from './provider/index.js';

// ── Self-healing engine ───────────────────────────
export {
  CircuitBreaker,
  HealthTracker,
  classifyError,
  classifyOutputError,
  getInfraClassification,
  getOutputClassification,
  getClassification,
  getRecoveryAction,
  validateOutput,
  ReflectionLoop,
  isReflectionCapBreach,
  createTombstone,
} from './healing/index.js';
export type {
  RecoveryAction,
  ReflectionResult,
  ReflectionCapBreachError,
} from './healing/index.js';

// ── Config / thresholds ───────────────────────────
export * from './config/thresholds.js';

// ── All types ─────────────────────────────────────
export type * from './types.js';

// ── Orchestration ────────────────────────────────
export { Team } from './team/index.js';
export { Graph } from './graph/index.js';
