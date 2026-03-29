// --- Constants ---

interface ForbiddenPattern {
  name: string;
  pattern: RegExp;
  description: string;
}

const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  // Interest rates
  {
    name: "interest_rate",
    pattern: /\d+\.?\d*%\s*(?:APR|apr|interest|rate|financing)/i,
    description: "Interest rate or APR reference",
  },
  {
    name: "interest_rate_standalone",
    pattern: /(?:interest|APR|financing)\s+(?:rate\s+)?(?:of\s+)?\d+\.?\d*%/i,
    description: "Interest rate mentioned with percentage",
  },
  // Monthly payments
  {
    name: "monthly_payment_dollar",
    pattern: /\$\s?\d[\d,]*\s*\/?\s*(?:mo(?:nth)?|per\s+month|monthly|bi-?weekly)/i,
    description: "Specific dollar amount for monthly/bi-weekly payment",
  },
  {
    name: "payments_as_low_as",
    pattern: /payments?\s+(?:as\s+low\s+as|starting\s+(?:at|from)|(?:of\s+)?only)/i,
    description: "Payment solicitation language",
  },
  // Financing terms
  {
    name: "financing_term_months",
    pattern: /(?:financed?|financing|loan|term)\s+(?:over|for|of)?\s*\d+\s*(?:months?|yrs?|years?)/i,
    description: "Specific financing term length",
  },
  {
    name: "down_payment",
    pattern: /(?:down\s+payment|deposit)\s+(?:of\s+)?\$\s?\d/i,
    description: "Specific down payment amount",
  },
  // Credit scores
  {
    name: "credit_score",
    pattern: /(?:credit\s+score|beacon\s+score|fico)\s*(?:of\s+)?\d{3}/i,
    description: "Credit score reference",
  },
  {
    name: "credit_approval",
    pattern: /(?:guaranteed|pre-?approved|approved)\s+(?:for\s+)?(?:credit|financing|loan)/i,
    description: "Credit approval guarantee",
  },
  // Insurance
  {
    name: "insurance_cost",
    pattern: /insurance\s+(?:(?:cost|rate|premium)s?\s+)?(?:of\s+|starting\s+(?:at|from)\s+)?\$\s?\d/i,
    description: "Insurance cost reference",
  },
  // Negotiation language
  {
    name: "negotiation_i_can_do",
    pattern: /\bI\s+can\s+do\b/i,
    description: "Negotiation language: 'I can do'",
  },
  {
    name: "negotiation_let_me_see",
    pattern: /\blet\s+me\s+see\s+what\b/i,
    description: "Negotiation language: 'let me see what'",
  },
  {
    name: "negotiation_best_price",
    pattern: /\bbest\s+price\b/i,
    description: "Negotiation language: 'best price'",
  },
  {
    name: "negotiation_discount",
    pattern: /\bdiscount(?:ed)?\b/i,
    description: "Negotiation language: 'discount'",
  },
  {
    name: "negotiation_deal",
    pattern: /\b(?:make|cut|give)\s+(?:you\s+)?a\s+deal\b/i,
    description: "Negotiation language: 'make a deal'",
  },
];

// --- Types ---

export interface ContentValidationResult {
  valid: boolean;
  violations: string[];
}

// --- ContentValidator ---

export class ContentValidator {
  private readonly patterns: ForbiddenPattern[];

  constructor(additionalPatterns?: ForbiddenPattern[]) {
    this.patterns = [...FORBIDDEN_PATTERNS, ...(additionalPatterns ?? [])];
  }

  validateContent(message: string): ContentValidationResult {
    const violations: string[] = [];

    for (const rule of this.patterns) {
      if (rule.pattern.test(message)) {
        violations.push(`[${rule.name}] ${rule.description}`);
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }
}
