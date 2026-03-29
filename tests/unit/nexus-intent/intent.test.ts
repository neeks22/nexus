import { describe, it, expect, beforeEach } from 'vitest';
import { IntentClassifier } from '../../../packages/nexus-intent/src/intent-classifier.js';
import { HandoffRuleEngine } from '../../../packages/nexus-intent/src/handoff-rules.js';
import { renderTemplate, getTemplate, getAllTemplateKeys } from '../../../packages/nexus-intent/src/objection-templates.js';
import { Intent } from '../../../packages/nexus-intent/src/types.js';
import type { HandoffRule } from '../../../packages/nexus-intent/src/types.js';
import defaultRulesJson from '../../../packages/nexus-intent/src/default-rules.json';

// ── IntentClassifier ─────────────────────────────────

describe('IntentClassifier', () => {
  let classifier: IntentClassifier;

  beforeEach(() => {
    classifier = new IntentClassifier();
  });

  // English keywords
  describe('English keyword detection', () => {
    it('detects PRICE_INQUIRY from "how much"', () => {
      const result = classifier.classify('How much does the CR-V cost?');
      expect(result.intent).toBe(Intent.PRICE_INQUIRY);
      expect(result.confidence).toBe(0.9);
    });

    it('detects PRICE_INQUIRY from "price"', () => {
      const result = classifier.classify('What is the price?');
      expect(result.intent).toBe(Intent.PRICE_INQUIRY);
    });

    it('detects FINANCING_QUESTION from "finance"', () => {
      const result = classifier.classify('Can I finance this vehicle?');
      expect(result.intent).toBe(Intent.FINANCING_QUESTION);
    });

    it('detects FINANCING_QUESTION from "monthly"', () => {
      const result = classifier.classify('What would the monthly be?');
      expect(result.intent).toBe(Intent.FINANCING_QUESTION);
    });

    it('detects TRADE_IN_REQUEST from "trade in"', () => {
      const result = classifier.classify('I want to trade in my old car');
      expect(result.intent).toBe(Intent.TRADE_IN_REQUEST);
    });

    it('detects TRADE_IN_REQUEST from "trade-in"', () => {
      const result = classifier.classify('Do you accept trade-in?');
      expect(result.intent).toBe(Intent.TRADE_IN_REQUEST);
    });

    it('detects TEST_DRIVE_REQUEST from "test drive"', () => {
      const result = classifier.classify('Can I schedule a test drive?');
      expect(result.intent).toBe(Intent.TEST_DRIVE_REQUEST);
    });

    it('detects TIMELINE_MENTION from "this weekend"', () => {
      const result = classifier.classify('I want to come in this weekend');
      expect(result.intent).toBe(Intent.TIMELINE_MENTION);
    });

    it('detects TIMELINE_MENTION from "tomorrow"', () => {
      const result = classifier.classify('Can I come tomorrow?');
      expect(result.intent).toBe(Intent.TIMELINE_MENTION);
    });

    it('detects OBJECTION from "too expensive"', () => {
      const result = classifier.classify('That seems too expensive');
      expect(result.intent).toBe(Intent.OBJECTION);
    });

    it('detects OBJECTION from "better deal"', () => {
      const result = classifier.classify('I found a better deal elsewhere');
      expect(result.intent).toBe(Intent.OBJECTION);
    });

    it('detects FRUSTRATION from "frustrated"', () => {
      const result = classifier.classify('I am so frustrated with this process');
      expect(result.intent).toBe(Intent.FRUSTRATION);
    });

    it('detects FRUSTRATION from "terrible"', () => {
      const result = classifier.classify('This service is terrible');
      expect(result.intent).toBe(Intent.FRUSTRATION);
    });

    it('detects LEGAL_MENTION from "lawyer"', () => {
      const result = classifier.classify('I will get my lawyer involved');
      expect(result.intent).toBe(Intent.LEGAL_MENTION);
    });

    it('detects LEGAL_MENTION from "warranty"', () => {
      const result = classifier.classify('What about the warranty?');
      expect(result.intent).toBe(Intent.LEGAL_MENTION);
    });

    it('detects HUMAN_REQUEST from "real person"', () => {
      const result = classifier.classify('Can I talk to a real person?');
      expect(result.intent).toBe(Intent.HUMAN_REQUEST);
    });

    it('detects HUMAN_REQUEST from "manager"', () => {
      const result = classifier.classify('I want to speak to a manager');
      expect(result.intent).toBe(Intent.HUMAN_REQUEST);
    });

    it('detects NOT_INTERESTED from "not interested"', () => {
      const result = classifier.classify('I am not interested anymore');
      expect(result.intent).toBe(Intent.NOT_INTERESTED);
    });

    it('detects NOT_INTERESTED from "unsubscribe"', () => {
      const result = classifier.classify('Please unsubscribe me');
      expect(result.intent).toBe(Intent.NOT_INTERESTED);
    });
  });

  // French keywords
  describe('French keyword detection', () => {
    it('detects PRICE_INQUIRY from "combien"', () => {
      const result = classifier.classify('Combien coûte ce véhicule?');
      expect(result.intent).toBe(Intent.PRICE_INQUIRY);
    });

    it('detects PRICE_INQUIRY from "prix"', () => {
      const result = classifier.classify('Quel est le prix?');
      expect(result.intent).toBe(Intent.PRICE_INQUIRY);
    });

    it('detects FINANCING_QUESTION from "financement"', () => {
      const result = classifier.classify('Est-ce que le financement est disponible?');
      expect(result.intent).toBe(Intent.FINANCING_QUESTION);
    });

    it('detects TRADE_IN_REQUEST from "échange"', () => {
      const result = classifier.classify('Je voudrais faire un échange');
      expect(result.intent).toBe(Intent.TRADE_IN_REQUEST);
    });

    it('detects TEST_DRIVE_REQUEST from "essai routier"', () => {
      const result = classifier.classify("Je voudrais un essai routier s'il vous plaît");
      expect(result.intent).toBe(Intent.TEST_DRIVE_REQUEST);
    });

    it('detects TIMELINE_MENTION from "cette semaine"', () => {
      const result = classifier.classify('Je veux venir cette semaine');
      expect(result.intent).toBe(Intent.TIMELINE_MENTION);
    });

    it('detects OBJECTION from "trop cher"', () => {
      const result = classifier.classify("C'est trop cher pour moi");
      expect(result.intent).toBe(Intent.OBJECTION);
    });

    it('detects FRUSTRATION from "fâché"', () => {
      const result = classifier.classify('Je suis vraiment fâché');
      expect(result.intent).toBe(Intent.FRUSTRATION);
    });

    it('detects LEGAL_MENTION from "avocat"', () => {
      const result = classifier.classify('Je vais appeler mon avocat');
      expect(result.intent).toBe(Intent.LEGAL_MENTION);
    });

    it('detects NOT_INTERESTED from "pas intéressé"', () => {
      const result = classifier.classify('Je ne suis pas intéressé');
      expect(result.intent).toBe(Intent.NOT_INTERESTED);
    });
  });

  // Confidence scores
  describe('confidence scores', () => {
    it('returns 0.9 for exact keyword match', () => {
      const result = classifier.classify('What is the price?');
      expect(result.confidence).toBe(0.9);
    });

    it('returns 0.5 for default INFO_REQUEST', () => {
      const result = classifier.classify('Tell me about the CR-V');
      expect(result.intent).toBe(Intent.INFO_REQUEST);
      expect(result.confidence).toBe(0.5);
    });
  });

  // Default fallback
  describe('default fallback', () => {
    it('returns INFO_REQUEST when no pattern matches', () => {
      const result = classifier.classify('Tell me about the new models');
      expect(result.intent).toBe(Intent.INFO_REQUEST);
    });

    it('includes reasoning for all results', () => {
      const result = classifier.classify('random text here');
      expect(result.reasoning).toBeTruthy();
      expect(typeof result.reasoning).toBe('string');
    });
  });
});

// ── HandoffRuleEngine ────────────────────────────────

describe('HandoffRuleEngine', () => {
  const defaultRules: HandoffRule[] = [
    { intent: Intent.PRICE_INQUIRY, action: 'handoff', confidenceThreshold: 0.8, template: 'PRICE_INQUIRY' },
    { intent: Intent.FINANCING_QUESTION, action: 'handoff', confidenceThreshold: 0.8, template: 'FINANCING' },
    { intent: Intent.TEST_DRIVE_REQUEST, action: 'handoff', confidenceThreshold: 0.8, template: 'TEST_DRIVE' },
    { intent: Intent.OBJECTION, action: 'handoff', confidenceThreshold: 0.8, template: 'OBJECTION' },
    { intent: Intent.FRUSTRATION, action: 'handoff', confidenceThreshold: 0.8 },
    { intent: Intent.LEGAL_MENTION, action: 'handoff', confidenceThreshold: 0.8 },
    { intent: Intent.HUMAN_REQUEST, action: 'handoff', confidenceThreshold: 0.8 },
    { intent: Intent.TIMELINE_MENTION, action: 'handoff', confidenceThreshold: 0.8 },
    { intent: Intent.TRADE_IN_REQUEST, action: 'handoff', confidenceThreshold: 0.8 },
    { intent: Intent.NOT_INTERESTED, action: 'stop', confidenceThreshold: 0.7 },
    { intent: Intent.INFO_REQUEST, action: 'continue', confidenceThreshold: 0.0 },
  ];

  let engine: HandoffRuleEngine;

  beforeEach(() => {
    engine = new HandoffRuleEngine(defaultRules);
  });

  describe('handoff triggers', () => {
    it('triggers handoff for PRICE_INQUIRY at 0.9 confidence', () => {
      const result = engine.evaluate({ intent: Intent.PRICE_INQUIRY, confidence: 0.9, reasoning: 'test' });
      expect(result.shouldHandoff).toBe(true);
      expect(result.action).toBe('handoff');
      expect(result.template).toBe('PRICE_INQUIRY');
    });

    it('triggers handoff for PRICE_INQUIRY at exactly 0.8 threshold', () => {
      const result = engine.evaluate({ intent: Intent.PRICE_INQUIRY, confidence: 0.8, reasoning: 'test' });
      expect(result.shouldHandoff).toBe(true);
      expect(result.action).toBe('handoff');
    });

    it('does NOT trigger handoff for PRICE_INQUIRY below 0.8', () => {
      const result = engine.evaluate({ intent: Intent.PRICE_INQUIRY, confidence: 0.7, reasoning: 'test' });
      expect(result.shouldHandoff).toBe(false);
      expect(result.action).toBe('continue');
    });

    it('triggers handoff for FINANCING_QUESTION', () => {
      const result = engine.evaluate({ intent: Intent.FINANCING_QUESTION, confidence: 0.9, reasoning: 'test' });
      expect(result.shouldHandoff).toBe(true);
      expect(result.action).toBe('handoff');
    });

    it('triggers handoff for TEST_DRIVE_REQUEST', () => {
      const result = engine.evaluate({ intent: Intent.TEST_DRIVE_REQUEST, confidence: 0.9, reasoning: 'test' });
      expect(result.shouldHandoff).toBe(true);
      expect(result.template).toBe('TEST_DRIVE');
    });

    it('triggers handoff for OBJECTION', () => {
      const result = engine.evaluate({ intent: Intent.OBJECTION, confidence: 0.85, reasoning: 'test' });
      expect(result.shouldHandoff).toBe(true);
      expect(result.template).toBe('OBJECTION');
    });

    it('triggers handoff for FRUSTRATION', () => {
      const result = engine.evaluate({ intent: Intent.FRUSTRATION, confidence: 0.9, reasoning: 'test' });
      expect(result.shouldHandoff).toBe(true);
    });

    it('triggers handoff for HUMAN_REQUEST', () => {
      const result = engine.evaluate({ intent: Intent.HUMAN_REQUEST, confidence: 0.9, reasoning: 'test' });
      expect(result.shouldHandoff).toBe(true);
    });
  });

  describe('stop action', () => {
    it('NOT_INTERESTED triggers stop action at threshold', () => {
      const result = engine.evaluate({ intent: Intent.NOT_INTERESTED, confidence: 0.9, reasoning: 'test' });
      expect(result.shouldHandoff).toBe(false);
      expect(result.action).toBe('stop');
    });

    it('NOT_INTERESTED triggers stop at exactly 0.7', () => {
      const result = engine.evaluate({ intent: Intent.NOT_INTERESTED, confidence: 0.7, reasoning: 'test' });
      expect(result.action).toBe('stop');
    });

    it('NOT_INTERESTED below threshold defaults to continue', () => {
      const result = engine.evaluate({ intent: Intent.NOT_INTERESTED, confidence: 0.5, reasoning: 'test' });
      expect(result.action).toBe('continue');
    });
  });

  describe('continue action', () => {
    it('INFO_REQUEST triggers continue', () => {
      const result = engine.evaluate({ intent: Intent.INFO_REQUEST, confidence: 0.5, reasoning: 'test' });
      expect(result.shouldHandoff).toBe(false);
      expect(result.action).toBe('continue');
    });
  });

  describe('unknown intent', () => {
    it('returns continue for an intent not in rules', () => {
      // Cast to test edge case
      const result = engine.evaluate({
        intent: 'UNKNOWN' as Intent,
        confidence: 0.9,
        reasoning: 'test',
      });
      expect(result.shouldHandoff).toBe(false);
      expect(result.action).toBe('continue');
    });
  });
});

// ── Default Rules JSON ───────────────────────────────

describe('default-rules.json', () => {
  it('loads all 11 intent rules', () => {
    expect(defaultRulesJson).toHaveLength(11);
  });

  it('contains PRICE_INQUIRY with handoff action', () => {
    const rule = defaultRulesJson.find((r: Record<string, unknown>) => r.intent === 'PRICE_INQUIRY');
    expect(rule).toBeDefined();
    expect(rule!.action).toBe('handoff');
    expect(rule!.confidenceThreshold).toBe(0.8);
  });

  it('contains NOT_INTERESTED with stop action', () => {
    const rule = defaultRulesJson.find((r: Record<string, unknown>) => r.intent === 'NOT_INTERESTED');
    expect(rule).toBeDefined();
    expect(rule!.action).toBe('stop');
    expect(rule!.confidenceThreshold).toBe(0.7);
  });

  it('contains INFO_REQUEST with continue action', () => {
    const rule = defaultRulesJson.find((r: Record<string, unknown>) => r.intent === 'INFO_REQUEST');
    expect(rule).toBeDefined();
    expect(rule!.action).toBe('continue');
  });
});

// ── Objection Templates ──────────────────────────────

describe('Objection Templates', () => {
  describe('renderTemplate', () => {
    it('renders PRICE_INQUIRY template with variables (en-CA)', () => {
      const result = renderTemplate('PRICE_INQUIRY', {
        repName: 'Alex',
        dealershipName: 'Honda West',
      });
      expect(result).toContain('Alex');
      expect(result).toContain('Honda West');
      expect(result).toContain('pricing');
    });

    it('renders OBJECTION template with variables (en-CA)', () => {
      const result = renderTemplate('OBJECTION', {
        repName: 'Sarah',
        dealershipName: 'Auto Plus',
      });
      expect(result).toContain('Sarah');
      expect(result).toContain('Auto Plus');
      expect(result).toContain('pricing is important');
    });

    it('renders TEST_DRIVE template with variables (en-CA)', () => {
      const result = renderTemplate('TEST_DRIVE', {
        repName: 'Mike',
        dealershipName: 'City Motors',
      });
      expect(result).toContain('Mike');
      expect(result).toContain('City Motors');
    });

    it('renders FINANCING template with variables (en-CA)', () => {
      const result = renderTemplate('FINANCING', {
        repName: 'Jen',
        dealershipName: 'Quick Auto',
      });
      expect(result).toContain('Jen');
      expect(result).toContain('financing');
    });

    it('renders GENERAL template with variables (en-CA)', () => {
      const result = renderTemplate('GENERAL', {
        repName: 'Bob',
        dealershipName: 'BestCars',
      });
      expect(result).toContain('Bob');
      expect(result).toContain('BestCars');
    });
  });

  describe('French (fr-CA) templates', () => {
    it('renders PRICE_INQUIRY in French', () => {
      const result = renderTemplate('PRICE_INQUIRY', {
        repName: 'Marc',
        dealershipName: 'Honda Laval',
      }, 'fr-CA');
      expect(result).toContain('Marc');
      expect(result).toContain('Honda Laval');
      expect(result).toContain('prix');
    });

    it('renders OBJECTION in French', () => {
      const result = renderTemplate('OBJECTION', {
        repName: 'Julie',
        dealershipName: 'Auto Québec',
      }, 'fr-CA');
      expect(result).toContain('Julie');
      expect(result).toContain('prix est important');
    });

    it('renders TEST_DRIVE in French', () => {
      const result = renderTemplate('TEST_DRIVE', {
        repName: 'Pierre',
        dealershipName: 'Autos MTL',
      }, 'fr-CA');
      expect(result).toContain('Pierre');
      expect(result).toContain('Autos MTL');
    });

    it('renders FINANCING in French', () => {
      const result = renderTemplate('FINANCING', {
        repName: 'Luc',
        dealershipName: 'Garage Plus',
      }, 'fr-CA');
      expect(result).toContain('Luc');
      expect(result).toContain('financement');
    });

    it('renders GENERAL in French', () => {
      const result = renderTemplate('GENERAL', {
        repName: 'Anne',
        dealershipName: 'Auto Centre',
      }, 'fr-CA');
      expect(result).toContain('Anne');
      expect(result).toContain('Auto Centre');
    });
  });

  describe('getTemplate', () => {
    it('returns raw template with placeholders', () => {
      const raw = getTemplate('PRICE_INQUIRY');
      expect(raw).toContain('{{repName}}');
      expect(raw).toContain('{{dealershipName}}');
    });

    it('all template keys have both en-CA and fr-CA versions', () => {
      const keys = getAllTemplateKeys();
      for (const key of keys) {
        expect(getTemplate(key, 'en-CA')).toBeTruthy();
        expect(getTemplate(key, 'fr-CA')).toBeTruthy();
      }
    });
  });
});
