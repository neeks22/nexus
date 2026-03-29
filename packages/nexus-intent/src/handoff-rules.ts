// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HandoffRuleEngine — Evaluates intent results against rules
//  Now with BANT-aware scoring for lead prioritization
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { HandoffRule, IntentResult, HandoffEvaluation, BantScore } from './types.js';

// ── BANT Thresholds ─────────────────────────────────

const BANT_HOT_THRESHOLD = 10;
const BANT_WARM_THRESHOLD = 7;
const BANT_COLD_THRESHOLD = 3;

/** Intents that qualify for BANT-accelerated handoff */
const HANDOFF_INTENTS = new Set([
  'PRICE_INQUIRY',
  'FINANCING_QUESTION',
  'TEST_DRIVE_REQUEST',
  'TRADE_IN_REQUEST',
  'TIMELINE_MENTION',
  'HUMAN_REQUEST',
]);

export interface BantHandoffEvaluation extends HandoffEvaluation {
  readonly bantAccelerated: boolean;
  readonly nurtureCadence?: 'immediate' | 'accelerated' | 'weekly' | 'monthly';
}

export class HandoffRuleEngine {
  private readonly rules: readonly HandoffRule[];

  constructor(rules: readonly HandoffRule[]) {
    this.rules = rules;
  }

  evaluate(intentResult: IntentResult): HandoffEvaluation {
    const rule = this.rules.find((r) => r.intent === intentResult.intent);

    if (!rule) {
      return {
        shouldHandoff: false,
        action: 'continue',
      };
    }

    const meetsThreshold = intentResult.confidence >= rule.confidenceThreshold;

    if (!meetsThreshold) {
      return {
        shouldHandoff: false,
        action: 'continue',
      };
    }

    return {
      shouldHandoff: rule.action === 'handoff',
      action: rule.action,
      template: rule.template,
    };
  }

  /**
   * Evaluate with BANT score awareness.
   * - BANT >= 10 AND handoff intent  -> IMMEDIATE handoff (overrides confidence threshold)
   * - BANT >= 7                      -> accelerated nurture cadence
   * - BANT <= 3                      -> monthly drip only
   */
  evaluateWithBant(intentResult: IntentResult, bantScore: BantScore): BantHandoffEvaluation {
    const bantTotal = bantScore.total;

    // BANT HOT + handoff intent -> immediate handoff regardless of confidence
    if (bantTotal >= BANT_HOT_THRESHOLD && HANDOFF_INTENTS.has(intentResult.intent)) {
      const rule = this.rules.find((r) => r.intent === intentResult.intent);
      return {
        shouldHandoff: true,
        action: 'handoff',
        template: rule?.template,
        bantAccelerated: true,
        nurtureCadence: 'immediate',
      };
    }

    // Run standard evaluation first
    const baseEvaluation = this.evaluate(intentResult);

    // Determine nurture cadence based on BANT score
    let nurtureCadence: 'immediate' | 'accelerated' | 'weekly' | 'monthly';
    if (bantTotal >= BANT_HOT_THRESHOLD) {
      nurtureCadence = 'immediate';
    } else if (bantTotal >= BANT_WARM_THRESHOLD) {
      nurtureCadence = 'accelerated';
    } else if (bantTotal <= BANT_COLD_THRESHOLD) {
      nurtureCadence = 'monthly';
    } else {
      nurtureCadence = 'weekly';
    }

    return {
      ...baseEvaluation,
      bantAccelerated: bantTotal >= BANT_HOT_THRESHOLD && HANDOFF_INTENTS.has(intentResult.intent),
      nurtureCadence,
    };
  }
}
