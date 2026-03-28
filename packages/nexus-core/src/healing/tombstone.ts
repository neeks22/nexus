// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Tombstone — Factory for terminal failure records
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Tombstone, TombstoneReason } from '../types.js';

/**
 * Create a Tombstone — the mandatory named terminal state for any
 * agent step that could not be recovered.
 *
 * @param stepId           - Unique identifier for the pipeline step
 * @param agentId          - ID of the agent that failed
 * @param reason           - Structured TombstoneReason (from the TombstoneReason union)
 * @param lastAttempt      - The last raw response or error that caused the failure
 * @param retriesExhausted - How many retry/reprompt attempts were consumed
 */
export function createTombstone(
  stepId: string,
  agentId: string,
  reason: TombstoneReason,
  lastAttempt: unknown,
  retriesExhausted: number,
): Tombstone {
  return {
    stepId,
    agentId,
    reason,
    timestamp: Date.now(),
    lastAttempt,
    retriesExhausted,
  };
}
