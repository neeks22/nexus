import { ApiCostEntry, TwilioCostEntry, DateRange } from './types.js';

export interface CostStore {
  saveApiCost(entry: ApiCostEntry): Promise<void>;
  saveTwilioCost(entry: TwilioCostEntry): Promise<void>;
  getApiCosts(tenantId: string, dateRange?: DateRange): Promise<ApiCostEntry[]>;
  getTwilioCosts(tenantId: string, dateRange?: DateRange): Promise<TwilioCostEntry[]>;
}

export class InMemoryCostStore implements CostStore {
  private apiCosts: ApiCostEntry[] = [];
  private twilioCosts: TwilioCostEntry[] = [];

  async saveApiCost(entry: ApiCostEntry): Promise<void> {
    this.apiCosts.push(entry);
  }

  async saveTwilioCost(entry: TwilioCostEntry): Promise<void> {
    this.twilioCosts.push(entry);
  }

  async getApiCosts(tenantId: string, dateRange?: DateRange): Promise<ApiCostEntry[]> {
    return this.apiCosts.filter((entry) => {
      if (entry.tenantId !== tenantId) return false;
      if (dateRange) {
        const ts = entry.timestamp.getTime();
        if (ts < dateRange.start.getTime() || ts > dateRange.end.getTime()) return false;
      }
      return true;
    });
  }

  async getTwilioCosts(tenantId: string, dateRange?: DateRange): Promise<TwilioCostEntry[]> {
    return this.twilioCosts.filter((entry) => {
      if (entry.tenantId !== tenantId) return false;
      if (dateRange) {
        const ts = entry.timestamp.getTime();
        if (ts < dateRange.start.getTime() || ts > dateRange.end.getTime()) return false;
      }
      return true;
    });
  }
}
