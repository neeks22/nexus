// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  IntentClassifier — Keyword/pattern-based classification
//  (Claude API classification comes in Epic 7)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { Intent } from './types.js';
import type { IntentResult } from './types.js';

interface PatternRule {
  intent: Intent;
  exactPatterns: string[];
  partialPatterns: string[];
  wordBoundaryPatterns?: string[];
}

function matchesWord(text: string, word: string): boolean {
  const regex = new RegExp(`\\b${word}\\b`, 'i');
  return regex.test(text);
}

const PATTERN_RULES: readonly PatternRule[] = [
  {
    intent: Intent.PRICE_INQUIRY,
    exactPatterns: ['how much', 'price', 'cost', 'pricing', 'combien', 'prix'],
    partialPatterns: ['pric', 'cost', 'combien', 'prix'],
  },
  {
    intent: Intent.FINANCING_QUESTION,
    exactPatterns: ['finance', 'payment', 'monthly', 'apr', 'financement'],
    partialPatterns: ['financ', 'payment', 'financement'],
    wordBoundaryPatterns: ['lease'],
  },
  {
    intent: Intent.TRADE_IN_REQUEST,
    exactPatterns: ['trade in', 'trade-in', 'my car', 'current vehicle', 'échange'],
    partialPatterns: ['trade', 'échange'],
  },
  {
    intent: Intent.TEST_DRIVE_REQUEST,
    exactPatterns: [
      'test drive', 'come see', 'visit', 'essai routier', 'voir le véhicule',
    ],
    partialPatterns: ['test driv', 'essai', 'visit'],
  },
  {
    intent: Intent.TIMELINE_MENTION,
    exactPatterns: [
      'this week', 'this weekend', 'today', 'tomorrow', 'soon',
      'cette semaine', 'bientôt',
    ],
    partialPatterns: ['this week', 'today', 'tomorrow', 'soon', 'bientôt'],
  },
  {
    intent: Intent.OBJECTION,
    exactPatterns: ['too expensive', 'better deal', 'competitor', 'trop cher'],
    partialPatterns: ['expensive', 'better deal', 'competitor', 'trop cher'],
  },
  {
    intent: Intent.FRUSTRATION,
    exactPatterns: ['frustrated', 'angry', 'terrible', 'worst', 'stop', 'fâché'],
    partialPatterns: ['frustrat', 'angry', 'terrible', 'worst', 'fâché'],
  },
  {
    intent: Intent.LEGAL_MENTION,
    exactPatterns: ['lemon', 'warranty', 'lawyer', 'sue', 'garantie', 'avocat'],
    partialPatterns: ['lemon', 'warrant', 'lawyer', 'sue', 'garantie', 'avocat'],
  },
  {
    intent: Intent.HUMAN_REQUEST,
    exactPatterns: [
      'talk to someone', 'real person', 'manager', 'parler à quelqu\'un',
    ],
    partialPatterns: ['real person', 'manager', 'talk to', 'parler à'],
  },
  {
    intent: Intent.NOT_INTERESTED,
    exactPatterns: ['not interested', 'remove me', 'unsubscribe', 'pas intéressé'],
    partialPatterns: ['not interested', 'unsubscribe', 'remove me', 'pas intéressé'],
  },
];

const EXACT_CONFIDENCE = 0.9;
const PARTIAL_CONFIDENCE = 0.7;
const DEFAULT_CONFIDENCE = 0.5;

export class IntentClassifier {
  classify(message: string, _conversationContext?: string): IntentResult {
    const normalized = message.toLowerCase();

    // Check each rule — exact substring patterns first (highest priority)
    for (const rule of PATTERN_RULES) {
      for (const pattern of rule.exactPatterns) {
        if (normalized.includes(pattern)) {
          return {
            intent: rule.intent,
            confidence: EXACT_CONFIDENCE,
            reasoning: `Exact keyword match: "${pattern}"`,
          };
        }
      }
      // Word-boundary patterns (exact confidence, but avoids false positives like "please" matching "lease")
      if (rule.wordBoundaryPatterns) {
        for (const word of rule.wordBoundaryPatterns) {
          if (matchesWord(normalized, word)) {
            return {
              intent: rule.intent,
              confidence: EXACT_CONFIDENCE,
              reasoning: `Exact keyword match: "${word}"`,
            };
          }
        }
      }
    }

    // Check partial patterns
    for (const rule of PATTERN_RULES) {
      for (const pattern of rule.partialPatterns) {
        if (normalized.includes(pattern)) {
          return {
            intent: rule.intent,
            confidence: PARTIAL_CONFIDENCE,
            reasoning: `Partial keyword match: "${pattern}"`,
          };
        }
      }
    }

    // Default: INFO_REQUEST
    return {
      intent: Intent.INFO_REQUEST,
      confidence: DEFAULT_CONFIDENCE,
      reasoning: 'No specific intent pattern matched, defaulting to INFO_REQUEST',
    };
  }
}
