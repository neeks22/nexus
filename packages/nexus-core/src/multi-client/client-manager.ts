// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ClientManager — Run multiple client teams simultaneously
//  with per-client budget tracking and centralized logging
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { Team } from '../team/team.js';
import { Transcript } from '../transcript/transcript.js';
import { CostCalculator } from '../reporting/cost-calculator.js';
import { AlertManager } from '../alerts/alert-manager.js';
import { NexusStore } from '../persistence/store.js';
import type {
  TeamConfig,
  TeamRunInput,
  TeamRunResult,
  TokenUsage,
  HealthScore,
  HealingSummary,
} from '../types.js';
import { DEFAULT_MODEL } from '../config/thresholds.js';

// ── Interfaces ────────────────────────────────────

export interface ClientConfig {
  clientId: string;
  clientName: string;
  teamConfig: TeamConfig;
  budgetCents: number;
  model?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ClientStatus {
  clientId: string;
  clientName: string;
  state: 'idle' | 'running' | 'paused' | 'budget_exceeded' | 'error';
  totalRuns: number;
  totalSpentCents: number;
  budgetCents: number;
  budgetRemainingCents: number;
  budgetUsedPercent: number;
  totalTokens: TokenUsage;
  lastRunTimestamp: number | null;
  lastRunTopic: string | null;
  agentHealths: Record<string, HealthScore>;
  tags: string[];
}

export interface ClientRunResult {
  clientId: string;
  clientName: string;
  teamResult: TeamRunResult;
  costCents: number;
  budgetRemainingCents: number;
  budgetExceeded: boolean;
}

export interface ManagerSummary {
  totalClients: number;
  activeClients: number;
  pausedClients: number;
  overBudgetClients: number;
  totalSpentCents: number;
  totalBudgetCents: number;
  clients: ClientStatus[];
}

interface ClientRecord {
  config: ClientConfig;
  state: 'idle' | 'running' | 'paused' | 'budget_exceeded' | 'error';
  totalRuns: number;
  totalSpentCents: number;
  totalTokens: TokenUsage;
  lastRunTimestamp: number | null;
  lastRunTopic: string | null;
  lastAgentHealths: Record<string, HealthScore>;
  team: Team;
}

type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  clientId: string;
  clientName: string;
  message: string;
  data?: Record<string, unknown>;
}

type LogHandler = (entry: LogEntry) => void;

// ── Constants ──────────────────────────────────────

const MAX_LOG_ENTRIES = 10_000;
const MAX_CONCURRENT_CLIENTS = 5;

// ── ClientManager ─────────────────────────────────

export class ClientManager {
  readonly #clients: Map<string, ClientRecord> = new Map();
  readonly #costCalculator: CostCalculator = new CostCalculator();
  readonly #alertManager: AlertManager = new AlertManager();
  readonly #logs: LogEntry[] = [];
  readonly #logHandlers: LogHandler[] = [];
  readonly #store: NexusStore | null;

  constructor(options?: { dataDir?: string }) {
    this.#store = options?.dataDir ? new NexusStore(options.dataDir) : null;
  }

  // ── Client registration ─────────────────────────

  addClient(config: ClientConfig): void {
    if (this.#clients.has(config.clientId)) {
      throw new Error(`Client "${config.clientId}" is already registered`);
    }

    const team = new Team(config.teamConfig);

    this.#clients.set(config.clientId, {
      config,
      state: 'idle',
      totalRuns: 0,
      totalSpentCents: 0,
      totalTokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      lastRunTimestamp: null,
      lastRunTopic: null,
      lastAgentHealths: {},
      team,
    });

    this.#log('info', config.clientId, config.clientName, `Client registered with budget ${this.#costCalculator.formatCost(config.budgetCents)}`);
  }

  removeClient(clientId: string): void {
    const record = this.#getRecord(clientId);
    if (record.state === 'running') {
      throw new Error(`Cannot remove client "${clientId}" while a run is in progress`);
    }
    this.#clients.delete(clientId);
    this.#log('info', clientId, record.config.clientName, 'Client removed');
  }

  pauseClient(clientId: string): void {
    const record = this.#getRecord(clientId);
    record.state = 'paused';
    this.#log('warn', clientId, record.config.clientName, 'Client paused');
  }

  resumeClient(clientId: string): void {
    const record = this.#getRecord(clientId);
    if (record.state === 'budget_exceeded') {
      throw new Error(`Cannot resume "${clientId}" — budget exceeded. Add budget first.`);
    }
    record.state = 'idle';
    this.#log('info', clientId, record.config.clientName, 'Client resumed');
  }

  addBudget(clientId: string, additionalCents: number): void {
    const record = this.#getRecord(clientId);
    record.config.budgetCents += additionalCents;
    if (record.state === 'budget_exceeded') {
      record.state = 'idle';
    }
    this.#log('info', clientId, record.config.clientName,
      `Budget increased by ${this.#costCalculator.formatCost(additionalCents)} → total ${this.#costCalculator.formatCost(record.config.budgetCents)}`);
  }

  // ── Running teams ───────────────────────────────

  async runClient(clientId: string, input: TeamRunInput): Promise<ClientRunResult> {
    const record = this.#getRecord(clientId);

    if (record.state === 'paused') {
      throw new Error(`Client "${clientId}" is paused. Resume before running.`);
    }
    if (record.state === 'budget_exceeded') {
      throw new Error(`Client "${clientId}" has exceeded its budget. Add budget before running.`);
    }
    if (record.state === 'running') {
      throw new Error(`Client "${clientId}" already has a run in progress.`);
    }

    // Pre-run budget check
    const remaining = record.config.budgetCents - record.totalSpentCents;
    if (remaining <= 0) {
      record.state = 'budget_exceeded';
      this.#log('error', clientId, record.config.clientName, 'Budget exceeded — run blocked');
      throw new Error(`Client "${clientId}" has no budget remaining.`);
    }

    record.state = 'running';
    this.#log('info', clientId, record.config.clientName, `Starting run: "${input.topic}"`);

    let teamResult: TeamRunResult;
    try {
      teamResult = await record.team.run(input);
    } catch (err) {
      record.state = 'error';
      const message = err instanceof Error ? err.message : String(err);
      this.#log('error', clientId, record.config.clientName, `Run failed: ${message}`);
      throw err;
    }

    // Calculate cost
    const model = record.config.model ?? DEFAULT_MODEL;
    const costCents = this.#costCalculator.calculateCost(teamResult.totalTokens, model);

    // Update record
    record.totalRuns += 1;
    record.totalSpentCents += costCents;
    record.totalTokens = this.#addTokens(record.totalTokens, teamResult.totalTokens);
    record.lastRunTimestamp = Date.now();
    record.lastRunTopic = input.topic;
    record.lastAgentHealths = { ...teamResult.healingSummary.agentHealths };

    // Check budget after run
    const budgetRemaining = record.config.budgetCents - record.totalSpentCents;
    const budgetExceeded = budgetRemaining <= 0;

    if (budgetExceeded) {
      record.state = 'budget_exceeded';
      this.#log('warn', clientId, record.config.clientName,
        `Budget exceeded after run — spent ${this.#costCalculator.formatCost(record.totalSpentCents)} of ${this.#costCalculator.formatCost(record.config.budgetCents)}`);
    } else if (budgetRemaining < record.config.budgetCents * 0.2) {
      record.state = 'idle';
      this.#log('warn', clientId, record.config.clientName,
        `Budget low — ${this.#costCalculator.formatCost(budgetRemaining)} remaining (${((budgetRemaining / record.config.budgetCents) * 100).toFixed(0)}%)`);
    } else {
      record.state = 'idle';
    }

    // Check agent healths for alerts
    for (const [agentId, health] of Object.entries(teamResult.healingSummary.agentHealths)) {
      this.#alertManager.checkHealth(agentId, agentId, health);
    }

    this.#log('info', clientId, record.config.clientName,
      `Run complete — cost ${this.#costCalculator.formatCost(costCents)}, budget remaining ${this.#costCalculator.formatCost(Math.max(0, budgetRemaining))}`);

    // Persist if store available
    if (this.#store) {
      try {
        await this.#store.save({
          id: `${clientId}-${Date.now()}`,
          timestamp: Date.now(),
          type: 'team_run',
          topic: input.topic,
          config: record.config.teamConfig,
          transcript: teamResult.transcript,
          healingSummary: teamResult.healingSummary,
          tokens: teamResult.totalTokens,
          cost: costCents,
          durationMs: teamResult.totalLatencyMs,
        });
      } catch {
        this.#log('warn', clientId, record.config.clientName, 'Failed to persist run data');
      }
    }

    return {
      clientId,
      clientName: record.config.clientName,
      teamResult,
      costCents,
      budgetRemainingCents: Math.max(0, budgetRemaining),
      budgetExceeded,
    };
  }

  async runMultiple(
    runs: Array<{ clientId: string; input: TeamRunInput }>,
  ): Promise<Array<ClientRunResult | { clientId: string; error: string }>> {
    const results: Array<ClientRunResult | { clientId: string; error: string }> = [];

    // Process in batches of MAX_CONCURRENT_CLIENTS to bound concurrency
    for (let i = 0; i < runs.length; i += MAX_CONCURRENT_CLIENTS) {
      const chunk = runs.slice(i, i + MAX_CONCURRENT_CLIENTS);
      const chunkPromises = chunk.map(async ({ clientId, input }) => {
        try {
          return await this.runClient(clientId, input);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { clientId, error: message };
        }
      });

      const settled = await Promise.allSettled(chunkPromises);
      for (const r of settled) {
        results.push(r.status === 'fulfilled' ? r.value : { clientId: 'unknown', error: String(r.reason) });
      }
    }

    return results;
  }

  // ── Status & reporting ──────────────────────────

  getClientStatus(clientId: string): ClientStatus {
    const record = this.#getRecord(clientId);
    const budgetRemaining = Math.max(0, record.config.budgetCents - record.totalSpentCents);

    return {
      clientId: record.config.clientId,
      clientName: record.config.clientName,
      state: record.state,
      totalRuns: record.totalRuns,
      totalSpentCents: record.totalSpentCents,
      budgetCents: record.config.budgetCents,
      budgetRemainingCents: budgetRemaining,
      budgetUsedPercent: record.config.budgetCents > 0
        ? ((record.totalSpentCents / record.config.budgetCents) * 100)
        : 0,
      totalTokens: { ...record.totalTokens },
      lastRunTimestamp: record.lastRunTimestamp,
      lastRunTopic: record.lastRunTopic,
      agentHealths: { ...record.lastAgentHealths },
      tags: record.config.tags ?? [],
    };
  }

  getSummary(): ManagerSummary {
    const clients = Array.from(this.#clients.keys()).map((id) => this.getClientStatus(id));

    return {
      totalClients: clients.length,
      activeClients: clients.filter((c) => c.state === 'idle' || c.state === 'running').length,
      pausedClients: clients.filter((c) => c.state === 'paused').length,
      overBudgetClients: clients.filter((c) => c.state === 'budget_exceeded').length,
      totalSpentCents: clients.reduce((sum, c) => sum + c.totalSpentCents, 0),
      totalBudgetCents: clients.reduce((sum, c) => sum + c.budgetCents, 0),
      clients,
    };
  }

  getClientIds(): string[] {
    return Array.from(this.#clients.keys());
  }

  hasClient(clientId: string): boolean {
    return this.#clients.has(clientId);
  }

  // ── Logging ─────────────────────────────────────

  onLog(handler: LogHandler): void {
    this.#logHandlers.push(handler);
  }

  getLogs(filter?: { clientId?: string; level?: LogLevel; since?: number }): ReadonlyArray<LogEntry> {
    let logs = this.#logs;

    if (filter?.clientId) {
      logs = logs.filter((l) => l.clientId === filter.clientId);
    }
    if (filter?.level) {
      logs = logs.filter((l) => l.level === filter.level);
    }
    if (filter?.since) {
      logs = logs.filter((l) => l.timestamp >= filter.since!);
    }

    return Object.freeze([...logs]);
  }

  // ── Alerts passthrough ──────────────────────────

  get alerts(): AlertManager {
    return this.#alertManager;
  }

  // ── Private helpers ─────────────────────────────

  #getRecord(clientId: string): ClientRecord {
    const record = this.#clients.get(clientId);
    if (!record) {
      throw new Error(`Client "${clientId}" not found. Register it with addClient() first.`);
    }
    return record;
  }

  #log(level: LogLevel, clientId: string, clientName: string, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      clientId,
      clientName,
      message,
      data,
    };
    this.#logs.push(entry);
    if (this.#logs.length > MAX_LOG_ENTRIES) {
      this.#logs.splice(0, this.#logs.length - MAX_LOG_ENTRIES);
    }

    for (const handler of this.#logHandlers) {
      try {
        handler(entry);
      } catch {
        // never let a log handler crash the manager
      }
    }
  }

  #addTokens(a: TokenUsage, b: TokenUsage): TokenUsage {
    return {
      inputTokens: a.inputTokens + b.inputTokens,
      outputTokens: a.outputTokens + b.outputTokens,
      cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
      cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    };
  }
}
