// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Output Validator — Structural validation of agent responses
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { OutputErrorType } from '../types.js';

const MAX_RESPONSE_LENGTH = 5_000;
const MIN_RESPONSE_LENGTH = 10;

// Patterns that indicate the model refused to answer
const REFUSAL_PATTERNS: RegExp[] = [
  /\bI('m| am) (unable|not able) to\b/i,
  /\bI (can't|cannot|won't|will not)\b/i,
  /\bI (must|need to) (decline|refuse)\b/i,
  /\bas an AI (language model|assistant)?,? I\b/i,
  /\bI('m| am) not (able|allowed|permitted) to\b/i,
  /\bthat (falls outside|is outside|is beyond) (my|what I)\b/i,
];

// Patterns that indicate empty/stub responses masquerading as content
const EMPTY_CONTENT_PATTERNS: RegExp[] = [
  /^\s*\[.*\]\s*$/,     // [placeholder]
  /^\s*\.{3,}\s*$/,     // ...
  /^\s*N\/A\s*$/i,
  /^\s*TBD\s*$/i,
  /^\s*TODO\s*$/i,
];

/**
 * Validate the structural and content quality of an agent's response.
 *
 * @param content  - The raw text returned by the agent
 * @param agentId  - The ID of the producing agent (used for reference checks)
 * @param round    - The debate/sequential round number (1-indexed)
 * @returns null when the output is valid, or the first OutputErrorType found
 */
export function validateOutput(
  content: string,
  agentId: string,
  round: number,
): OutputErrorType | null {
  // ── 1. Empty / stub check ──────────────────────
  if (isEffectivelyEmpty(content)) {
    return 'empty_response';
  }

  // ── 2. Length checks ───────────────────────────
  const trimmed = content.trim();

  if (trimmed.length < MIN_RESPONSE_LENGTH) {
    return 'too_short';
  }

  if (trimmed.length > MAX_RESPONSE_LENGTH) {
    return 'too_long';
  }

  // ── 3. Malformed check ─────────────────────────
  if (isMalformed(trimmed)) {
    return 'malformed_response';
  }

  // ── 4. Refusal check ──────────────────────────
  if (isRefusal(trimmed)) {
    return 'refusal';
  }

  // ── 5. Agent reference check (rounds > 1) ─────
  // In multi-round contexts agents are expected to build on prior turns.
  // We require at least one reference to another agent or prior content.
  if (round > 1 && !hasAgentReference(trimmed, agentId)) {
    return 'no_agent_reference';
  }

  return null;
}

// ── Helpers ───────────────────────────────────────

function isEffectivelyEmpty(content: string): boolean {
  if (!content || content.trim().length === 0) return true;
  return EMPTY_CONTENT_PATTERNS.some((pattern) => pattern.test(content));
}

function isMalformed(content: string): boolean {
  // Detect responses that are only code fences with no inner content
  if (/^```\s*```$/.test(content.trim())) return true;

  // Detect extremely high ratio of non-printable characters (binary garbage)
  const nonPrintable = (content.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g) ?? []).length;
  if (content.length > 0 && nonPrintable / content.length > 0.1) return true;

  // Detect response that is purely repeated single character (e.g. "aaaa...")
  if (content.length >= MIN_RESPONSE_LENGTH) {
    const firstChar = content[0];
    if (content.split('').every((c) => c === firstChar)) return true;
  }

  return false;
}

function isRefusal(content: string): boolean {
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Check whether the response references prior agents or prior content.
 * Strategy: look for agent-reference keywords. Round > 1 content should
 * acknowledge prior perspectives, disagreements, builds-on, etc.
 *
 * We intentionally keep this heuristic simple — the ReflectionLoop handles
 * deeper semantic evaluation.
 */
function hasAgentReference(content: string, _agentId: string): boolean {
  const referencePatterns: RegExp[] = [
    /\b(as|like|mentioned|noted|stated|argued|suggested|pointed out)\b/i,
    /\b(building on|agree(s|d)?|disagree(s|d)?|counter(s|ed)?)\b/i,
    /\b(previous|prior|earlier|above|preceding)\b/i,
    /\b(colleague|peer|agent|participant|speaker|response)\b/i,
    /\b(I (agree|disagree|concur|challenge|build))\b/i,
    /\b(in response|in reply|to (that|this) point|on the contrary|furthermore)\b/i,
  ];

  return referencePatterns.some((pattern) => pattern.test(content));
}
