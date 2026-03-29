/**
 * AgentRegistryManager — loads, saves, and mutates per-tenant agent registries.
 *
 * Registry files live at: config/agents/{tenantId}-agents.json
 * Toggle logs live at:    config/agents/{tenantId}-toggles.json
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type {
  AgentDefinition,
  AgentRegistry,
  AgentStatus,
  AgentToggle,
  HandoffRule,
} from './types.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function registryPath(basePath: string, tenantId: string): string {
  return join(basePath, `${tenantId}-agents.json`);
}

function toggleLogPath(basePath: string, tenantId: string): string {
  return join(basePath, `${tenantId}-toggles.json`);
}

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

// ─── AgentRegistryManager ──────────────────────────────────────────────────

export class AgentRegistryManager {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  // ── Load / Save ────────────────────────────────────────────────────────

  async loadRegistry(tenantId: string): Promise<AgentRegistry> {
    const path = registryPath(this.basePath, tenantId);
    const raw = await readFile(path, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    return parsed as AgentRegistry;
  }

  async saveRegistry(tenantId: string, registry: AgentRegistry): Promise<void> {
    const path = registryPath(this.basePath, tenantId);
    await ensureDir(path);
    const updated: AgentRegistry = {
      ...registry,
      lastUpdated: new Date().toISOString(),
    };
    await writeFile(path, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
  }

  // ── Single Agent ───────────────────────────────────────────────────────

  async getAgent(tenantId: string, agentId: string): Promise<AgentDefinition | undefined> {
    const registry = await this.loadRegistry(tenantId);
    return registry.agents.find((a) => a.id === agentId);
  }

  // ── Toggle ─────────────────────────────────────────────────────────────

  async toggleAgent(
    tenantId: string,
    agentId: string,
    enabled: boolean,
    reason?: string,
  ): Promise<AgentToggle> {
    const registry = await this.loadRegistry(tenantId);
    const agent = registry.agents.find((a) => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found in tenant "${tenantId}"`);
    }
    agent.enabled = enabled;
    registry.updatedBy = 'control-panel';
    await this.saveRegistry(tenantId, registry);

    const toggle: AgentToggle = {
      agentId,
      enabled,
      reason,
      toggledAt: new Date().toISOString(),
      toggledBy: 'control-panel',
    };
    await this.appendToggleLog(tenantId, toggle);
    return toggle;
  }

  // ── Prompt Overrides ───────────────────────────────────────────────────

  async updatePromptOverride(
    tenantId: string,
    agentId: string,
    key: string,
    value: string,
  ): Promise<void> {
    const registry = await this.loadRegistry(tenantId);
    const agent = registry.agents.find((a) => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found in tenant "${tenantId}"`);
    }
    agent.promptOverrides[key] = value;
    registry.updatedBy = 'control-panel';
    await this.saveRegistry(tenantId, registry);
  }

  // ── Personality ────────────────────────────────────────────────────────

  async updatePersonality(
    tenantId: string,
    agentId: string,
    personality: string,
  ): Promise<void> {
    const registry = await this.loadRegistry(tenantId);
    const agent = registry.agents.find((a) => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found in tenant "${tenantId}"`);
    }
    agent.personality = personality;
    registry.updatedBy = 'control-panel';
    await this.saveRegistry(tenantId, registry);
  }

  // ── Restrictions ───────────────────────────────────────────────────────

  async addRestriction(
    tenantId: string,
    agentId: string,
    restriction: string,
  ): Promise<void> {
    const registry = await this.loadRegistry(tenantId);
    const agent = registry.agents.find((a) => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found in tenant "${tenantId}"`);
    }
    if (!agent.restrictions.includes(restriction)) {
      agent.restrictions.push(restriction);
    }
    registry.updatedBy = 'control-panel';
    await this.saveRegistry(tenantId, registry);
  }

  async removeRestriction(
    tenantId: string,
    agentId: string,
    restriction: string,
  ): Promise<void> {
    const registry = await this.loadRegistry(tenantId);
    const agent = registry.agents.find((a) => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found in tenant "${tenantId}"`);
    }
    agent.restrictions = agent.restrictions.filter((r) => r !== restriction);
    registry.updatedBy = 'control-panel';
    await this.saveRegistry(tenantId, registry);
  }

  // ── Handoff Rules ──────────────────────────────────────────────────────

  async updateHandoffRules(
    tenantId: string,
    agentId: string,
    rules: HandoffRule[],
  ): Promise<void> {
    const registry = await this.loadRegistry(tenantId);
    const agent = registry.agents.find((a) => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found in tenant "${tenantId}"`);
    }
    agent.handoffRules = rules;
    registry.updatedBy = 'control-panel';
    await this.saveRegistry(tenantId, registry);
  }

  // ── Queries ────────────────────────────────────────────────────────────

  async getActiveAgents(tenantId: string): Promise<AgentDefinition[]> {
    const registry = await this.loadRegistry(tenantId);
    return registry.agents.filter((a) => a.enabled);
  }

  async getAgentStatus(tenantId: string): Promise<AgentStatus[]> {
    const registry = await this.loadRegistry(tenantId);
    const toggles = await this.loadToggleLog(tenantId);

    return registry.agents.map((agent) => {
      const agentToggles = toggles.filter((t) => t.agentId === agent.id);
      const lastToggle = agentToggles.length > 0
        ? agentToggles[agentToggles.length - 1]
        : undefined;

      return {
        agentId: agent.id,
        name: agent.name,
        type: agent.type,
        enabled: agent.enabled,
        lastToggle,
      };
    });
  }

  // ── Toggle Log Persistence ─────────────────────────────────────────────

  private async loadToggleLog(tenantId: string): Promise<AgentToggle[]> {
    const path = toggleLogPath(this.basePath, tenantId);
    try {
      const raw = await readFile(path, 'utf-8');
      return JSON.parse(raw) as AgentToggle[];
    } catch {
      return [];
    }
  }

  private async appendToggleLog(tenantId: string, toggle: AgentToggle): Promise<void> {
    const path = toggleLogPath(this.basePath, tenantId);
    await ensureDir(path);
    const existing = await this.loadToggleLog(tenantId);
    existing.push(toggle);
    await writeFile(path, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
  }
}
