import { randomUUID } from 'node:crypto';
import { ApiCostEntry, TwilioCostEntry } from './types.js';
import { CostStore } from './cost-store.js';

interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-opus-4': { inputPerMillion: 15, outputPerMillion: 75 },
  'claude-sonnet-4': { inputPerMillion: 3, outputPerMillion: 15 },
  'claude-haiku-3.5': { inputPerMillion: 0.80, outputPerMillion: 4 },
};

function generateId(): string {
  return `cost_${randomUUID()}`;
}

export class CostLogger {
  private store: CostStore;

  constructor(store: CostStore) {
    this.store = store;
  }

  static calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      return 0;
    }
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
    return inputCost + outputCost;
  }

  async logApiCall(entry: Omit<ApiCostEntry, 'id'>): Promise<ApiCostEntry> {
    const fullEntry: ApiCostEntry = {
      ...entry,
      id: generateId(),
    };
    await this.store.saveApiCost(fullEntry);
    return fullEntry;
  }

  async logTwilioMessage(entry: Omit<TwilioCostEntry, 'id'>): Promise<TwilioCostEntry> {
    const fullEntry: TwilioCostEntry = {
      ...entry,
      id: generateId(),
    };
    await this.store.saveTwilioCost(fullEntry);
    return fullEntry;
  }
}
