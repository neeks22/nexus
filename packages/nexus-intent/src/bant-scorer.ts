// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BantScorer — BANT Lead Qualification Scoring
//  Scores leads on Budget, Authority, Need, Timeline (1-3 each)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { BantScore, BantLabel } from './types.js';

// ── Signal patterns (English + French) ──────────────

const BUDGET_HIGH_PATTERNS: readonly string[] = [
  'money isn\'t an issue', 'money is not an issue', 'money isnt an issue',
  'budget is', 'pre-approved', 'preapproved', 'pre approved',
  'can afford', 'ready to spend', 'willing to pay',
  'l\'argent n\'est pas un problème', 'pré-approuvé', 'préapprouvé',
  'budget de', 'prêt à dépenser',
  '$',
];

const BUDGET_MEDIUM_PATTERNS: readonly string[] = [
  'price range', 'payment plan', 'monthly payment', 'how much',
  'financing option', 'what would the monthly', 'down payment',
  'affordable', 'within my budget',
  'gamme de prix', 'paiement mensuel', 'combien', 'option de financement',
  'versement', 'mise de fonds',
];

const AUTHORITY_HIGH_PATTERNS: readonly string[] = [
  'i\'m buying', 'i am buying', 'im buying',
  'my decision', 'i decide', 'i\'m the buyer', 'i am the buyer',
  'i\'m purchasing', 'i am purchasing', 'i\'m ready to buy', 'i am ready to buy',
  'j\'achète', 'je suis l\'acheteur', 'ma décision', 'c\'est moi qui décide',
  'je suis prêt à acheter',
];

const AUTHORITY_MEDIUM_PATTERNS: readonly string[] = [
  'need to discuss with', 'talk to my spouse', 'talk to my partner',
  'co-signer', 'cosigner', 'joint', 'check with',
  'discuss with my wife', 'discuss with my husband',
  'parler avec mon conjoint', 'parler avec ma conjointe',
  'cosignataire', 'discuter avec',
];

const AUTHORITY_LOW_PATTERNS: readonly string[] = [
  'looking for a friend', 'for my son', 'for my daughter',
  'for my parent', 'gathering info', 'just researching', 'just looking',
  'for someone else', 'on behalf of',
  'pour un ami', 'pour mon fils', 'pour ma fille',
  'je cherche pour', 'je fais des recherches', 'je regarde seulement',
];

const NEED_HIGH_PATTERNS: readonly string[] = [
  'need it by', 'car broke down', 'vehicle broke', 'accident',
  'totaled', 'need a car now', 'need a vehicle now', 'urgent',
  'must have', 'desperate', 'stranded',
  'civic', 'corolla', 'camry', 'cr-v', 'rav4', 'f-150', 'silverado',
  'mustang', 'tesla', 'model 3', 'model y',
  'besoin maintenant', 'voiture en panne', 'accident', 'urgent',
  'j\'ai besoin', 'véhicule brisé',
];

const NEED_MEDIUM_PATTERNS: readonly string[] = [
  'looking for suv', 'looking for a truck', 'looking for sedan',
  'want a new car', 'need a family car', 'looking for something',
  'interested in', 'considering a',
  'je cherche un suv', 'je cherche un camion', 'je veux une nouvelle',
  'intéressé par', 'je considère',
];

const TIMELINE_HIGH_PATTERNS: readonly string[] = [
  'this week', 'this weekend', 'today', 'tomorrow', 'asap',
  'as soon as possible', 'right now', 'immediately', 'right away',
  'cette semaine', 'ce weekend', 'aujourd\'hui', 'demain',
  'dès que possible', 'maintenant', 'immédiatement', 'tout de suite',
];

const TIMELINE_MEDIUM_PATTERNS: readonly string[] = [
  'this month', 'soon', 'next week', 'next weekend',
  'in a few weeks', 'couple of weeks', 'within 30 days',
  'ce mois-ci', 'bientôt', 'la semaine prochaine',
  'dans quelques semaines', 'prochainement',
];

// ── Helper ──────────────────────────────────────────

function matchesAny(text: string, patterns: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

// ── BantScorer ──────────────────────────────────────

export class BantScorer {
  scoreBudget(messages: readonly string[]): 1 | 2 | 3 {
    const combined = messages.join(' ');
    if (matchesAny(combined, BUDGET_HIGH_PATTERNS)) return 3;
    if (matchesAny(combined, BUDGET_MEDIUM_PATTERNS)) return 2;
    return 1;
  }

  scoreAuthority(messages: readonly string[]): 1 | 2 | 3 {
    const combined = messages.join(' ');
    if (matchesAny(combined, AUTHORITY_HIGH_PATTERNS)) return 3;
    if (matchesAny(combined, AUTHORITY_MEDIUM_PATTERNS)) return 2;
    if (matchesAny(combined, AUTHORITY_LOW_PATTERNS)) return 1;
    return 1;
  }

  scoreNeed(messages: readonly string[]): 1 | 2 | 3 {
    const combined = messages.join(' ');
    if (matchesAny(combined, NEED_HIGH_PATTERNS)) return 3;
    if (matchesAny(combined, NEED_MEDIUM_PATTERNS)) return 2;
    return 1;
  }

  scoreTimeline(messages: readonly string[]): 1 | 2 | 3 {
    const combined = messages.join(' ');
    if (matchesAny(combined, TIMELINE_HIGH_PATTERNS)) return 3;
    if (matchesAny(combined, TIMELINE_MEDIUM_PATTERNS)) return 2;
    return 1;
  }

  score(messages: readonly string[]): { bantScore: BantScore; label: BantLabel } {
    const budget = this.scoreBudget(messages);
    const authority = this.scoreAuthority(messages);
    const need = this.scoreNeed(messages);
    const timeline = this.scoreTimeline(messages);
    const total = budget + authority + need + timeline;

    const bantScore: BantScore = { budget, authority, need, timeline, total };
    const label = this.getLabel(total);

    return { bantScore, label };
  }

  getLabel(total: number): BantLabel {
    if (total >= 10) return 'HOT';
    if (total >= 7) return 'WARM';
    if (total >= 4) return 'COOL';
    return 'COLD';
  }

  getRecommendedAction(label: BantLabel): string {
    switch (label) {
      case 'HOT':
        return 'Immediate handoff to sales representative — high-intent lead';
      case 'WARM':
        return 'Accelerated nurture sequence — engage within 2 hours via SMS + email';
      case 'COOL':
        return 'Weekly nurture campaign — add to drip sequence';
      case 'COLD':
        return 'Monthly drip campaign — long-term nurture only';
    }
  }
}
