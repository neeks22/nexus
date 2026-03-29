/**
 * PII Protection Types
 *
 * Interfaces for PII detection, redaction, and log sanitization.
 */

/** A named pattern for detecting a specific type of PII */
export interface PiiPattern {
  /** Human-readable name for the PII type (e.g., "PHONE", "EMAIL") */
  name: string;
  /** Regular expression to match PII in text */
  pattern: RegExp;
  /** Replacement token (e.g., "[REDACTED_PHONE]") */
  replacement: string;
}

/** Result of redacting PII from a string */
export interface RedactionResult {
  /** The original input string */
  original: string;
  /** The redacted output string */
  redacted: string;
  /** Names of PII patterns that matched */
  patternsMatched: string[];
}

/** Result of scanning text for PII without redacting */
export interface ScanResult {
  /** Whether any PII was found */
  containsPii: boolean;
  /** Names of PII types detected */
  typesFound: string[];
}

/** Configuration for known PII values to match (e.g., customer names) */
export interface KnownPiiConfig {
  /** Known names to redact */
  names?: string[];
}

/** Pino redact configuration */
export interface PinoRedactConfig {
  /** Paths to redact in log objects */
  paths: string[];
  /** Censor string to use */
  censor: string;
}
