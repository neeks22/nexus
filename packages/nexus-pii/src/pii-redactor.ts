/**
 * PII Redactor
 *
 * Detects and redacts personally identifiable information from text and objects.
 * Supports phone numbers (North American), emails, postal/zip codes, credit cards,
 * SIN/SSN, and known names.
 */

import { KnownPiiConfig, PiiPattern, RedactionResult, ScanResult } from './types.js';

/** North American phone: (xxx) xxx-xxxx */
const PHONE_PARENS = /\(\d{3}\)\s?\d{3}[- ]?\d{4}/g;

/** North American phone: xxx-xxx-xxxx or xxx.xxx.xxxx */
const PHONE_DASHED = /\b\d{3}[-.]\d{3}[-.]\d{4}\b/g;

/** North American phone: +1xxxxxxxxxx or 1xxxxxxxxxx */
const PHONE_PLUS = /\+?1\d{10}\b/g;

/** Email addresses */
const EMAIL = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;

/** Canadian postal code: A1A 1A1 or A1A1A1 */
const CANADIAN_POSTAL = /\b[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d\b/g;

/** US zip code: 5 digits or 5+4, only when near contextual keywords */
const US_ZIP = /(?:(?:zip|postal|zip\s*code)\s*[:.]?\s*)\d{5}(?:-\d{4})?|(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s+\d{5}(?:-\d{4})?/gi;

/** Street address: number + street name + street suffix */
const STREET_ADDRESS = /\b\d{1,6}\s+[A-Za-z][A-Za-z\s]{1,30}\b(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane|Ct|Court|Pl|Place|Way|Cir|Circle|Terr|Terrace|Cres|Crescent|Pkwy|Parkway)\b\.?/gi;

/** Date of birth: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD, YYYY/MM/DD */
const DOB_MDY = /\b(?:0[1-9]|1[0-2])[/-](?:0[1-9]|[12]\d|3[01])[/-](?:19|20)\d{2}\b/g;
const DOB_YMD = /\b(?:19|20)\d{2}[/-](?:0[1-9]|1[0-2])[/-](?:0[1-9]|[12]\d|3[01])\b/g;

/** Credit card: 16 digits with optional spaces or dashes (groups of 4) */
const CREDIT_CARD = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g;

/** SIN/SSN: 9 digits with optional spaces or dashes (xxx-xx-xxxx or xxx xxx xxx) */
const SIN_SSN_DASHED = /\b\d{3}[- ]\d{2,3}[- ]\d{3,4}\b/g;

/** SIN/SSN: 9 consecutive digits */
const SIN_SSN_PLAIN = /\b\d{9}\b/g;

/** Default PII patterns in priority order (more specific first) */
const DEFAULT_PATTERNS: PiiPattern[] = [
  { name: 'CREDIT_CARD', pattern: CREDIT_CARD, replacement: '[REDACTED_CREDIT_CARD]' },
  { name: 'PHONE', pattern: PHONE_PARENS, replacement: '[REDACTED_PHONE]' },
  { name: 'PHONE', pattern: PHONE_DASHED, replacement: '[REDACTED_PHONE]' },
  { name: 'PHONE', pattern: PHONE_PLUS, replacement: '[REDACTED_PHONE]' },
  { name: 'EMAIL', pattern: EMAIL, replacement: '[REDACTED_EMAIL]' },
  { name: 'ADDRESS', pattern: STREET_ADDRESS, replacement: '[REDACTED_ADDRESS]' },
  { name: 'DOB', pattern: DOB_MDY, replacement: '[REDACTED_DOB]' },
  { name: 'DOB', pattern: DOB_YMD, replacement: '[REDACTED_DOB]' },
  { name: 'POSTAL_CODE', pattern: CANADIAN_POSTAL, replacement: '[REDACTED_POSTAL_CODE]' },
  { name: 'ZIP_CODE', pattern: US_ZIP, replacement: '[REDACTED_ZIP_CODE]' },
  { name: 'SIN_SSN', pattern: SIN_SSN_DASHED, replacement: '[REDACTED_SIN_SSN]' },
  { name: 'SIN_SSN', pattern: SIN_SSN_PLAIN, replacement: '[REDACTED_SIN_SSN]' },
];

export class PiiRedactor {
  private readonly patterns: PiiPattern[];
  private readonly knownNames: string[];

  constructor(knownPii?: KnownPiiConfig) {
    this.patterns = [...DEFAULT_PATTERNS];
    this.knownNames = knownPii?.names ?? [];

    // Add name patterns for each known name (case-insensitive, word boundary)
    for (const name of this.knownNames) {
      if (name.trim().length === 0) {
        continue;
      }
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      this.patterns.push({
        name: 'NAME',
        pattern: new RegExp(`\\b${escaped}\\b`, 'gi'),
        replacement: '[REDACTED_NAME]',
      });
    }
  }

  /** Redact all PII from a text string */
  redact(text: string): RedactionResult {
    const matchedNames = new Set<string>();
    let redacted = text;

    for (const piiPattern of this.patterns) {
      // Create a fresh regex to reset lastIndex
      const regex = new RegExp(piiPattern.pattern.source, piiPattern.pattern.flags);
      if (regex.test(redacted)) {
        matchedNames.add(piiPattern.name);
        // Reset and replace
        const replaceRegex = new RegExp(piiPattern.pattern.source, piiPattern.pattern.flags);
        redacted = redacted.replace(replaceRegex, piiPattern.replacement);
      }
    }

    return {
      original: text,
      redacted,
      patternsMatched: [...matchedNames],
    };
  }

  /** Recursively redact all string values in a nested object */
  redactObject<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.redact(obj).redacted as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item: unknown) => this.redactObject(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        result[key] = this.redactObject(value);
      }
      return result as T;
    }

    return obj;
  }

  /** Check whether text contains any PII */
  containsPii(text: string): boolean {
    for (const piiPattern of this.patterns) {
      const regex = new RegExp(piiPattern.pattern.source, piiPattern.pattern.flags);
      if (regex.test(text)) {
        return true;
      }
    }
    return false;
  }

  /** Scan text and return the types of PII found without redacting */
  scan(text: string): ScanResult {
    const typesFound = new Set<string>();

    for (const piiPattern of this.patterns) {
      const regex = new RegExp(piiPattern.pattern.source, piiPattern.pattern.flags);
      if (regex.test(text)) {
        typesFound.add(piiPattern.name);
      }
    }

    const types = [...typesFound];
    return {
      containsPii: types.length > 0,
      typesFound: types,
    };
  }
}
