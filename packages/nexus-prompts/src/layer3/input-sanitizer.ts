import type { SanitizeResult } from '../types.js';

// ─── Character Limits ───────────────────────────────────────────────────────

const CHAR_LIMIT_PROMOTION = 500;
const CHAR_LIMIT_FAQ_ANSWER = 1000;
const CHAR_LIMIT_GREETING = 200;

// ─── Prompt Injection Patterns ──────────────────────────────────────────────

const INJECTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /ignore\s+previous/i, label: 'ignore previous' },
  { pattern: /ignore\s+all/i, label: 'ignore all' },
  { pattern: /system\s+prompt/i, label: 'system prompt' },
  { pattern: /you\s+are\s+now/i, label: 'you are now' },
  { pattern: /forget\s+everything/i, label: 'forget everything' },
  { pattern: /act\s+as/i, label: 'act as' },
  { pattern: /pretend\s+to\s+be/i, label: 'pretend to be' },
  { pattern: /disregard\s+(previous|above|all)/i, label: 'disregard instructions' },
  { pattern: /override\s+(previous|system|all)/i, label: 'override instructions' },
  { pattern: /new\s+instructions?:/i, label: 'new instructions' },
  { pattern: /\bDAN\b/, label: 'DAN jailbreak' },
  { pattern: /jailbreak/i, label: 'jailbreak' },
];

// ─── Input Sanitizer ────────────────────────────────────────────────────────

export class InputSanitizer {
  /**
   * Sanitize a single string input from client-editable content.
   * Checks for prompt injection patterns and enforces character limits.
   */
  sanitize(input: string, charLimit?: number): SanitizeResult {
    // Check for prompt injection attempts
    for (const { pattern, label } of INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return {
          sanitized: '',
          blocked: true,
          reason: `Blocked: detected disallowed pattern "${label}"`,
        };
      }
    }

    // Enforce character limit if specified
    let sanitized = input.trim();
    if (charLimit !== undefined && sanitized.length > charLimit) {
      sanitized = sanitized.slice(0, charLimit);
    }

    return { sanitized, blocked: false };
  }

  /**
   * Sanitize a promotion string (max 500 chars).
   */
  sanitizePromotion(input: string): SanitizeResult {
    return this.sanitize(input, CHAR_LIMIT_PROMOTION);
  }

  /**
   * Sanitize a FAQ answer string (max 1000 chars).
   */
  sanitizeFaqAnswer(input: string): SanitizeResult {
    return this.sanitize(input, CHAR_LIMIT_FAQ_ANSWER);
  }

  /**
   * Sanitize a greeting override string (max 200 chars).
   */
  sanitizeGreeting(input: string): SanitizeResult {
    return this.sanitize(input, CHAR_LIMIT_GREETING);
  }

  /**
   * Sanitize an array of strings (e.g., promotions, highlights).
   * Returns sanitized array and whether any were blocked.
   */
  sanitizeArray(inputs: string[], charLimit?: number): { sanitized: string[]; blockedCount: number; reasons: string[] } {
    const sanitized: string[] = [];
    const reasons: string[] = [];
    let blockedCount = 0;

    for (const input of inputs) {
      const result = this.sanitize(input, charLimit);
      if (result.blocked) {
        blockedCount++;
        if (result.reason) {
          reasons.push(result.reason);
        }
      } else {
        sanitized.push(result.sanitized);
      }
    }

    return { sanitized, blockedCount, reasons };
  }
}

export const CHAR_LIMITS = {
  PROMOTION: CHAR_LIMIT_PROMOTION,
  FAQ_ANSWER: CHAR_LIMIT_FAQ_ANSWER,
  GREETING: CHAR_LIMIT_GREETING,
} as const;
