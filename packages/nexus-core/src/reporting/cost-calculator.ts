// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CostCalculator — Real API cost computation
//  Pricing in USD per million tokens (MTok)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { TokenUsage } from '../types.js';

// ── Model pricing table (USD per million tokens) ──

interface ModelPricing {
  inputPerMTok: number;  // USD
  outputPerMTok: number; // USD
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // Sonnet 4 family
  'claude-sonnet-4-20250514': { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'claude-sonnet-4': { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  // Haiku 4.5 family
  'claude-haiku-4-5-20251001': { inputPerMTok: 1.0, outputPerMTok: 5.0 },
  'claude-haiku-4-5': { inputPerMTok: 1.0, outputPerMTok: 5.0 },
  'claude-haiku-4': { inputPerMTok: 1.0, outputPerMTok: 5.0 },
};

// Cache pricing multipliers relative to base input price
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.10;

// Fallback pricing when model is unrecognised
const FALLBACK_PRICING: ModelPricing = { inputPerMTok: 3.0, outputPerMTok: 15.0 };

export class CostCalculator {
  // ── Internal helpers ────────────────────────────

  private getPricing(model: string): ModelPricing {
    // Exact match first
    if (model in MODEL_PRICING) {
      return MODEL_PRICING[model] as ModelPricing;
    }
    // Prefix match for versioned variants
    for (const key of Object.keys(MODEL_PRICING)) {
      if (model.startsWith(key) || key.startsWith(model)) {
        return MODEL_PRICING[key] as ModelPricing;
      }
    }
    return FALLBACK_PRICING;
  }

  // ── Public API ───────────────────────────────────

  /**
   * Calculate total cost in USD cents for a token usage object.
   *
   * Cache write tokens are billed at 1.25x the input rate.
   * Cache read tokens are billed at 0.10x the input rate.
   * Regular input tokens are billed at the base input rate.
   * Output tokens are billed at the output rate.
   */
  calculateCost(tokens: TokenUsage, model: string): number {
    const pricing = this.getPricing(model);

    const inputCostUsd =
      (tokens.inputTokens / 1_000_000) * pricing.inputPerMTok;
    const outputCostUsd =
      (tokens.outputTokens / 1_000_000) * pricing.outputPerMTok;
    const cacheWriteCostUsd =
      (tokens.cacheWriteTokens / 1_000_000) *
      pricing.inputPerMTok *
      CACHE_WRITE_MULTIPLIER;
    const cacheReadCostUsd =
      (tokens.cacheReadTokens / 1_000_000) *
      pricing.inputPerMTok *
      CACHE_READ_MULTIPLIER;

    const totalUsd =
      inputCostUsd + outputCostUsd + cacheWriteCostUsd + cacheReadCostUsd;

    // Return in USD cents (2 decimal precision kept as a float)
    return totalUsd * 100;
  }

  /**
   * Format a cost in USD cents as a dollar string, e.g. "$0.03".
   */
  formatCost(cents: number): string {
    const dollars = cents / 100;
    if (dollars < 0.005) {
      // Sub-cent — show 4 decimal places to avoid "$0.00"
      return `$${dollars.toFixed(4)}`;
    }
    return `$${dollars.toFixed(2)}`;
  }

  /**
   * Calculate the cost savings achieved by prompt caching.
   *
   * "Without caching" scenario: all cache-read tokens are priced as
   * regular input tokens (i.e. the 0.10x discount is removed).
   */
  calculateSavingsFromCaching(
    tokens: TokenUsage,
    model: string,
  ): {
    withoutCaching: number;
    withCaching: number;
    saved: number;
    percentSaved: number;
  } {
    const pricing = this.getPricing(model);

    // Cost WITH caching (actual bill)
    const withCaching = this.calculateCost(tokens, model);

    // Cost WITHOUT caching: cache-read tokens billed at full input price
    const cacheReadDeltaUsd =
      (tokens.cacheReadTokens / 1_000_000) *
      pricing.inputPerMTok *
      (1 - CACHE_READ_MULTIPLIER); // the discount we'd lose

    const withoutCachingUsd = withCaching / 100 + cacheReadDeltaUsd;
    const withoutCaching = withoutCachingUsd * 100;

    const saved = withoutCaching - withCaching;
    const percentSaved =
      withoutCaching > 0 ? (saved / withoutCaching) * 100 : 0;

    return {
      withoutCaching,
      withCaching,
      saved,
      percentSaved,
    };
  }
}
