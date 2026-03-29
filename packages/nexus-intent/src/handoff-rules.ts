// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HandoffRuleEngine — Evaluates intent results against rules
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { HandoffRule, IntentResult, HandoffEvaluation } from './types.js';

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
}
