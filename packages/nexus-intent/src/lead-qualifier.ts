// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LeadQualifier — Single entry point combining
//  IntentClassifier + BantScorer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { LeadQualification } from './types.js';
import type { IntentClassifier } from './intent-classifier.js';
import type { BantScorer } from './bant-scorer.js';

export class LeadQualifier {
  private readonly classifier: IntentClassifier;
  private readonly scorer: BantScorer;

  constructor(classifier: IntentClassifier, scorer: BantScorer) {
    this.classifier = classifier;
    this.scorer = scorer;
  }

  qualify(message: string, conversationHistory?: readonly string[]): LeadQualification {
    const intent = this.classifier.classify(message);

    // Build full message list for BANT scoring — history + current message
    const allMessages: string[] = conversationHistory
      ? [...conversationHistory, message]
      : [message];

    const { bantScore, label } = this.scorer.score(allMessages);
    const recommendedAction = this.scorer.getRecommendedAction(label);

    // Attach bantScore to the intent result
    const intentWithBant = { ...intent, bantScore };

    return {
      intent: intentWithBant,
      bant: bantScore,
      label,
      recommendedAction,
    };
  }
}
