/**
 * nexus-pii — PII Protection Module
 *
 * Detects, redacts, and sanitizes personally identifiable information
 * from text, objects, and log output.
 */

export { PiiRedactor } from './pii-redactor.js';
export { createPiiRedactPaths, createPiiSerializer } from './pino-redactor.js';
export type {
  KnownPiiConfig,
  PiiPattern,
  PinoRedactConfig,
  RedactionResult,
  ScanResult,
} from './types.js';
