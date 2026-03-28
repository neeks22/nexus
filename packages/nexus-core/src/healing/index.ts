// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Healing — Public surface of the self-healing engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Error taxonomy
export {
  classifyError,
  classifyOutputError,
  getInfraClassification,
  getOutputClassification,
  getClassification,
} from './error-taxonomy.js';

// Circuit breaker
export { CircuitBreaker } from './circuit-breaker.js';

// Health tracker
export { HealthTracker } from './health-tracker.js';

// Output validator
export { validateOutput } from './output-validator.js';

// Recovery strategies
export { getRecoveryAction } from './recovery-strategies.js';
export type { RecoveryAction } from './recovery-strategies.js';

// Reflection loop
export { ReflectionLoop, isReflectionCapBreach } from './reflection-loop.js';
export type { ReflectionResult, ReflectionCapBreachError } from './reflection-loop.js';

// Tombstone factory
export { createTombstone } from './tombstone.js';
