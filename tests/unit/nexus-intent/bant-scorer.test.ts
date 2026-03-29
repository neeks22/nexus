import { describe, it, expect, beforeEach } from 'vitest';
import { BantScorer } from '../../../packages/nexus-intent/src/bant-scorer.js';
import { IntentClassifier } from '../../../packages/nexus-intent/src/intent-classifier.js';
import { LeadQualifier } from '../../../packages/nexus-intent/src/lead-qualifier.js';
import { HandoffRuleEngine } from '../../../packages/nexus-intent/src/handoff-rules.js';
import { Intent } from '../../../packages/nexus-intent/src/types.js';
import type { HandoffRule } from '../../../packages/nexus-intent/src/types.js';

// ── BantScorer ──────────────────────────────────────

describe('BantScorer', () => {
  let scorer: BantScorer;

  beforeEach(() => {
    scorer = new BantScorer();
  });

  // ── Budget dimension ────────────────────────────────

  describe('scoreBudget', () => {
    it('returns HIGH (3) for specific budget mention', () => {
      expect(scorer.scoreBudget(['My budget is $35,000'])).toBe(3);
    });

    it('returns HIGH (3) for "money isn\'t an issue"', () => {
      expect(scorer.scoreBudget(["Money isn't an issue, I want the best"])).toBe(3);
    });

    it('returns HIGH (3) for pre-approval', () => {
      expect(scorer.scoreBudget(['I am pre-approved for financing'])).toBe(3);
    });

    it('returns MEDIUM (2) for price range inquiry', () => {
      expect(scorer.scoreBudget(['What price range are we looking at?'])).toBe(2);
    });

    it('returns MEDIUM (2) for monthly payment question', () => {
      expect(scorer.scoreBudget(['What would the monthly payment be?'])).toBe(2);
    });

    it('returns LOW (1) for no budget signals', () => {
      expect(scorer.scoreBudget(['Tell me about the new models'])).toBe(1);
    });

    it('returns MEDIUM (2) for French "combien"', () => {
      expect(scorer.scoreBudget(['Combien coute ce vehicule?'])).toBe(2);
    });

    it('returns HIGH (3) for French "pré-approuvé"', () => {
      expect(scorer.scoreBudget(['Je suis pré-approuvé pour le financement'])).toBe(3);
    });
  });

  // ── Authority dimension ─────────────────────────────

  describe('scoreAuthority', () => {
    it('returns HIGH (3) for "I\'m buying"', () => {
      expect(scorer.scoreAuthority(["I'm buying this car today"])).toBe(3);
    });

    it('returns HIGH (3) for "my decision"', () => {
      expect(scorer.scoreAuthority(['This is my decision to make'])).toBe(3);
    });

    it('returns MEDIUM (2) for spouse discussion', () => {
      expect(scorer.scoreAuthority(['I need to discuss with my spouse first'])).toBe(2);
    });

    it('returns MEDIUM (2) for co-signer mention', () => {
      expect(scorer.scoreAuthority(['Will I need a co-signer?'])).toBe(2);
    });

    it('returns LOW (1) for "looking for a friend"', () => {
      expect(scorer.scoreAuthority(['Looking for a friend who needs a car'])).toBe(1);
    });

    it('returns LOW (1) for "just researching"', () => {
      expect(scorer.scoreAuthority(['Just researching options for now'])).toBe(1);
    });

    it('returns LOW (1) for no authority signals', () => {
      expect(scorer.scoreAuthority(['What colors are available?'])).toBe(1);
    });

    it('returns HIGH (3) for French "j\'achete"', () => {
      expect(scorer.scoreAuthority(["J'achète cette voiture"])).toBe(3);
    });
  });

  // ── Need dimension ──────────────────────────────────

  describe('scoreNeed', () => {
    it('returns HIGH (3) for specific vehicle', () => {
      expect(scorer.scoreNeed(['I want the 2026 CR-V EX-L'])).toBe(3);
    });

    it('returns HIGH (3) for urgent language', () => {
      expect(scorer.scoreNeed(['My car broke down and I need a vehicle now'])).toBe(3);
    });

    it('returns HIGH (3) for "need it by"', () => {
      expect(scorer.scoreNeed(['I need it by Friday'])).toBe(3);
    });

    it('returns MEDIUM (2) for general category', () => {
      expect(scorer.scoreNeed(['I am looking for SUV options'])).toBe(2);
    });

    it('returns MEDIUM (2) for "interested in"', () => {
      expect(scorer.scoreNeed(['I am interested in your trucks'])).toBe(2);
    });

    it('returns LOW (1) for vague browsing', () => {
      expect(scorer.scoreNeed(['Just checking out your website'])).toBe(1);
    });

    it('returns HIGH (3) for French urgency', () => {
      expect(scorer.scoreNeed(["Ma voiture en panne, j'ai besoin d'aide"])).toBe(3);
    });
  });

  // ── Timeline dimension ──────────────────────────────

  describe('scoreTimeline', () => {
    it('returns HIGH (3) for "this week"', () => {
      expect(scorer.scoreTimeline(['I want to buy this week'])).toBe(3);
    });

    it('returns HIGH (3) for "ASAP"', () => {
      expect(scorer.scoreTimeline(['Need something ASAP'])).toBe(3);
    });

    it('returns HIGH (3) for "today"', () => {
      expect(scorer.scoreTimeline(['Can I come in today?'])).toBe(3);
    });

    it('returns MEDIUM (2) for "this month"', () => {
      expect(scorer.scoreTimeline(['Looking to buy this month'])).toBe(2);
    });

    it('returns MEDIUM (2) for "soon"', () => {
      expect(scorer.scoreTimeline(['I want to buy soon'])).toBe(2);
    });

    it('returns LOW (1) for no timeline signals', () => {
      expect(scorer.scoreTimeline(['What models do you have?'])).toBe(1);
    });

    it('returns HIGH (3) for French "cette semaine"', () => {
      expect(scorer.scoreTimeline(['Je veux venir cette semaine'])).toBe(3);
    });

    it('returns MEDIUM (2) for French "bientot"', () => {
      expect(scorer.scoreTimeline(["Je veux acheter bientôt"])).toBe(2);
    });
  });

  // ── Full scoring ────────────────────────────────────

  describe('score (full BANT)', () => {
    it('calculates correct total for all-HIGH signals', () => {
      const messages = [
        "Money isn't an issue, I'm buying a CR-V this week",
      ];
      const { bantScore } = scorer.score(messages);
      expect(bantScore.budget).toBe(3);
      expect(bantScore.authority).toBe(3);
      expect(bantScore.need).toBe(3);
      expect(bantScore.timeline).toBe(3);
      expect(bantScore.total).toBe(12);
    });

    it('calculates correct total for all-LOW signals', () => {
      const messages = ['Tell me about your dealership'];
      const { bantScore } = scorer.score(messages);
      expect(bantScore.budget).toBe(1);
      expect(bantScore.authority).toBe(1);
      expect(bantScore.need).toBe(1);
      expect(bantScore.timeline).toBe(1);
      expect(bantScore.total).toBe(4);
    });

    it('calculates correct total for mixed signals', () => {
      const messages = [
        'I am pre-approved for financing',  // budget HIGH
        'Need to discuss with my spouse',    // authority MEDIUM
        'Looking for SUV options',           // need MEDIUM
        // no timeline signal                // timeline LOW
      ];
      const { bantScore } = scorer.score(messages);
      expect(bantScore.budget).toBe(3);
      expect(bantScore.authority).toBe(2);
      expect(bantScore.need).toBe(2);
      expect(bantScore.timeline).toBe(1);
      expect(bantScore.total).toBe(8);
    });
  });

  // ── Labels ──────────────────────────────────────────

  describe('getLabel', () => {
    it('returns HOT for total 12', () => {
      expect(scorer.getLabel(12)).toBe('HOT');
    });

    it('returns HOT for total 10 (boundary)', () => {
      expect(scorer.getLabel(10)).toBe('HOT');
    });

    it('returns WARM for total 9 (boundary)', () => {
      expect(scorer.getLabel(9)).toBe('WARM');
    });

    it('returns WARM for total 7 (boundary)', () => {
      expect(scorer.getLabel(7)).toBe('WARM');
    });

    it('returns COOL for total 6 (boundary)', () => {
      expect(scorer.getLabel(6)).toBe('COOL');
    });

    it('returns COOL for total 4 (boundary)', () => {
      expect(scorer.getLabel(4)).toBe('COOL');
    });

    it('returns COLD for total 3 (boundary)', () => {
      expect(scorer.getLabel(3)).toBe('COLD');
    });

    it('returns COLD for total 1', () => {
      expect(scorer.getLabel(1)).toBe('COLD');
    });
  });

  // ── Recommended actions ─────────────────────────────

  describe('getRecommendedAction', () => {
    it('returns immediate handoff for HOT', () => {
      const action = scorer.getRecommendedAction('HOT');
      expect(action).toContain('Immediate handoff');
    });

    it('returns accelerated nurture for WARM', () => {
      const action = scorer.getRecommendedAction('WARM');
      expect(action).toContain('Accelerated nurture');
    });

    it('returns weekly nurture for COOL', () => {
      const action = scorer.getRecommendedAction('COOL');
      expect(action).toContain('Weekly nurture');
    });

    it('returns monthly drip for COLD', () => {
      const action = scorer.getRecommendedAction('COLD');
      expect(action).toContain('Monthly drip');
    });
  });

  // ── Bilingual signals ──────────────────────────────

  describe('bilingual (French) signals', () => {
    it('detects French buying authority "c\'est moi qui decide"', () => {
      expect(scorer.scoreAuthority(["C'est moi qui décide"])).toBe(3);
    });

    it('detects French urgency "tout de suite"', () => {
      expect(scorer.scoreTimeline(['Je le veux tout de suite'])).toBe(3);
    });

    it('detects French budget "prêt à dépenser"', () => {
      expect(scorer.scoreBudget(['Je suis prêt à dépenser'])).toBe(3);
    });

    it('scores full BANT for French conversation', () => {
      const messages = [
        "Je suis pré-approuvé pour le financement",  // budget HIGH
        "C'est moi qui décide",                       // authority HIGH
        "J'ai besoin d'une voiture, la mienne est en panne", // need HIGH
        "Je veux acheter cette semaine",              // timeline HIGH
      ];
      const { bantScore, label } = scorer.score(messages);
      expect(bantScore.total).toBeGreaterThanOrEqual(10);
      expect(label).toBe('HOT');
    });
  });
});

// ── LeadQualifier ───────────────────────────────────

describe('LeadQualifier', () => {
  let qualifier: LeadQualifier;

  beforeEach(() => {
    qualifier = new LeadQualifier(new IntentClassifier(), new BantScorer());
  });

  it('combines intent classification + BANT scoring', () => {
    const result = qualifier.qualify("I'm buying a CR-V this week, money isn't an issue");
    expect(result.intent.intent).toBeDefined();
    expect(result.bant.total).toBeGreaterThan(0);
    expect(result.label).toBeDefined();
    expect(result.recommendedAction).toBeTruthy();
  });

  it('attaches bantScore to the intent result', () => {
    const result = qualifier.qualify('How much is the CR-V?');
    expect(result.intent.bantScore).toBeDefined();
    expect(result.intent.bantScore!.total).toBeGreaterThan(0);
  });

  it('uses conversation history for BANT scoring', () => {
    const history = [
      "I'm pre-approved for financing",
      "I'm the buyer, this is my decision",
    ];
    const result = qualifier.qualify('I need the CR-V this week', history);
    // With strong signals across all dimensions, should be HOT
    expect(result.bant.total).toBeGreaterThanOrEqual(10);
    expect(result.label).toBe('HOT');
  });

  it('returns COLD for vague messages with no history', () => {
    const result = qualifier.qualify('Hello');
    expect(result.bant.total).toBeLessThanOrEqual(4);
    expect(['COLD', 'COOL']).toContain(result.label);
  });

  it('classifies intent correctly alongside BANT', () => {
    const result = qualifier.qualify('How much does the CR-V cost?');
    expect(result.intent.intent).toBe(Intent.PRICE_INQUIRY);
    expect(result.bant).toBeDefined();
  });
});

// ── HandoffRuleEngine BANT integration ──────────────

describe('HandoffRuleEngine BANT integration', () => {
  const rules: HandoffRule[] = [
    { intent: Intent.PRICE_INQUIRY, action: 'handoff', confidenceThreshold: 0.8, template: 'PRICE_INQUIRY' },
    { intent: Intent.TEST_DRIVE_REQUEST, action: 'handoff', confidenceThreshold: 0.8, template: 'TEST_DRIVE' },
    { intent: Intent.INFO_REQUEST, action: 'continue', confidenceThreshold: 0.0 },
    { intent: Intent.NOT_INTERESTED, action: 'stop', confidenceThreshold: 0.7 },
  ];

  let engine: HandoffRuleEngine;

  beforeEach(() => {
    engine = new HandoffRuleEngine(rules);
  });

  it('triggers immediate handoff for BANT >= 10 with handoff intent', () => {
    const result = engine.evaluateWithBant(
      { intent: Intent.PRICE_INQUIRY, confidence: 0.6, reasoning: 'test' },
      { budget: 3, authority: 3, need: 2, timeline: 3, total: 11 },
    );
    expect(result.shouldHandoff).toBe(true);
    expect(result.bantAccelerated).toBe(true);
    expect(result.nurtureCadence).toBe('immediate');
  });

  it('sets accelerated nurture for BANT 7-9', () => {
    const result = engine.evaluateWithBant(
      { intent: Intent.INFO_REQUEST, confidence: 0.5, reasoning: 'test' },
      { budget: 2, authority: 2, need: 2, timeline: 2, total: 8 },
    );
    expect(result.nurtureCadence).toBe('accelerated');
  });

  it('sets monthly cadence for BANT <= 3', () => {
    const result = engine.evaluateWithBant(
      { intent: Intent.INFO_REQUEST, confidence: 0.5, reasoning: 'test' },
      { budget: 1, authority: 1, need: 1, timeline: 1, total: 4 },
    );
    // Total 4 is COOL -> weekly
    expect(result.nurtureCadence).toBe('weekly');

    const coldResult = engine.evaluateWithBant(
      { intent: Intent.INFO_REQUEST, confidence: 0.5, reasoning: 'test' },
      { budget: 1, authority: 1, need: 1, timeline: 1, total: 3 },
    );
    expect(coldResult.nurtureCadence).toBe('monthly');
  });

  it('does not BANT-accelerate non-handoff intents even at high score', () => {
    const result = engine.evaluateWithBant(
      { intent: Intent.NOT_INTERESTED, confidence: 0.9, reasoning: 'test' },
      { budget: 3, authority: 3, need: 3, timeline: 3, total: 12 },
    );
    // NOT_INTERESTED is not in HANDOFF_INTENTS, so bantAccelerated = false
    expect(result.bantAccelerated).toBe(false);
    expect(result.action).toBe('stop');
  });

  it('preserves template when BANT-accelerating', () => {
    const result = engine.evaluateWithBant(
      { intent: Intent.TEST_DRIVE_REQUEST, confidence: 0.5, reasoning: 'test' },
      { budget: 3, authority: 3, need: 2, timeline: 3, total: 11 },
    );
    expect(result.template).toBe('TEST_DRIVE');
    expect(result.bantAccelerated).toBe(true);
  });
});
