/**
 * Pino Log Redaction Integration
 *
 * Provides pino-compatible redact paths and serializers that strip PII from log output.
 */

import { PiiRedactor } from './pii-redactor.js';
import { KnownPiiConfig, PinoRedactConfig } from './types.js';

/** Common log field paths that may contain PII */
const DEFAULT_REDACT_PATHS: string[] = [
  'phone',
  'email',
  'name',
  'address',
  'firstName',
  'lastName',
  'customerName',
  'customerEmail',
  'customerPhone',
  'lead.phone',
  'lead.email',
  'lead.name',
  'lead.address',
  'lead.firstName',
  'lead.lastName',
  'req.headers.authorization',
  'req.query.email',
  'req.query.phone',
  'msg',
];

/**
 * Returns a pino redact configuration with paths for common PII fields.
 * Use with pino({ redact: createPiiRedactPaths() }).
 */
export function createPiiRedactPaths(additionalPaths?: string[]): PinoRedactConfig {
  const paths = [...DEFAULT_REDACT_PATHS];
  if (additionalPaths) {
    paths.push(...additionalPaths);
  }
  return {
    paths,
    censor: '[REDACTED]',
  };
}

/**
 * Creates a pino serializer function that redacts PII from log values.
 * Use with pino({ serializers: { msg: createPiiSerializer() } }).
 *
 * Unlike path-based redaction, this performs regex-based PII detection
 * on string values, catching PII that appears in free-text fields.
 */
export function createPiiSerializer(knownPii?: KnownPiiConfig): (value: unknown) => unknown {
  const redactor = new PiiRedactor(knownPii);

  return function piiSerializer(value: unknown): unknown {
    if (typeof value === 'string') {
      return redactor.redact(value).redacted;
    }

    if (value !== null && value !== undefined && typeof value === 'object') {
      return redactor.redactObject(value);
    }

    return value;
  };
}
