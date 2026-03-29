import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, cp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AgentRegistryManager } from '../../../packages/nexus-control/src/agent-registry.js';
import {
  READYRIDE_INSTANT_RESPONSE,
  READYRIDE_COLD_WARMING,
  READYRIDE_REPLY_HANDLER,
  READYCAR_INSTANT_RESPONSE,
  READYCAR_COLD_WARMING,
  READYCAR_REPLY_HANDLER,
  ALL_PRESETS,
} from '../../../packages/nexus-control/src/agent-presets.js';
import type {
  AgentDefinition,
  AgentRegistry,
  AgentToggle,
  HandoffRule,
} from '../../../packages/nexus-control/src/types.js';

// ─── Test Helpers ──────────────────────────────────────────────────────────

const FIXTURES_DIR = join(__dirname, '../../../config/agents');

let tempDir: string;
let manager: AgentRegistryManager;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'nexus-control-test-'));
  // Copy real registry files into temp dir
  await cp(join(FIXTURES_DIR, 'readyride-agents.json'), join(tempDir, 'readyride-agents.json'));
  await cp(join(FIXTURES_DIR, 'readycar-agents.json'), join(tempDir, 'readycar-agents.json'));
  manager = new AgentRegistryManager(tempDir);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ─── Load Registry ─────────────────────────────────────────────────────────

describe('loadRegistry', () => {
  it('loads the ReadyRide registry with all 3 agents', async () => {
    const registry = await manager.loadRegistry('readyride');
    expect(registry.tenantId).toBe('readyride');
    expect(registry.agents).toHaveLength(3);
    expect(registry.agents.map((a) => a.type)).toEqual(
      expect.arrayContaining(['instant_response', 'cold_warming', 'reply_handler']),
    );
  });

  it('loads the ReadyCar registry with all 3 agents', async () => {
    const registry = await manager.loadRegistry('readycar');
    expect(registry.tenantId).toBe('readycar');
    expect(registry.agents).toHaveLength(3);
  });

  it('throws for non-existent tenant', async () => {
    await expect(manager.loadRegistry('nonexistent')).rejects.toThrow();
  });
});

// ─── Toggle Agent ──────────────────────────────────────────────────────────

describe('toggleAgent', () => {
  it('disables an agent', async () => {
    const toggle = await manager.toggleAgent('readyride', 'readyride_instant_response', false, 'Testing downtime');
    expect(toggle.enabled).toBe(false);
    expect(toggle.reason).toBe('Testing downtime');
    expect(toggle.agentId).toBe('readyride_instant_response');

    const agent = await manager.getAgent('readyride', 'readyride_instant_response');
    expect(agent?.enabled).toBe(false);
  });

  it('re-enables a disabled agent', async () => {
    await manager.toggleAgent('readyride', 'readyride_cold_warming', false);
    const toggle = await manager.toggleAgent('readyride', 'readyride_cold_warming', true, 'Back online');
    expect(toggle.enabled).toBe(true);

    const agent = await manager.getAgent('readyride', 'readyride_cold_warming');
    expect(agent?.enabled).toBe(true);
  });

  it('throws when toggling a non-existent agent', async () => {
    await expect(
      manager.toggleAgent('readyride', 'nonexistent_agent', false),
    ).rejects.toThrow('Agent "nonexistent_agent" not found');
  });

  it('persists toggle to disk', async () => {
    await manager.toggleAgent('readyride', 'readyride_instant_response', false);
    const raw = await readFile(join(tempDir, 'readyride-agents.json'), 'utf-8');
    const parsed = JSON.parse(raw) as AgentRegistry;
    const agent = parsed.agents.find((a) => a.id === 'readyride_instant_response');
    expect(agent?.enabled).toBe(false);
  });
});

// ─── Prompt Override ───────────────────────────────────────────────────────

describe('updatePromptOverride', () => {
  it('sets a new prompt override key', async () => {
    await manager.updatePromptOverride('readyride', 'readyride_instant_response', 'greeting', 'Hey there!');
    const agent = await manager.getAgent('readyride', 'readyride_instant_response');
    expect(agent?.promptOverrides['greeting']).toBe('Hey there!');
  });

  it('overwrites an existing prompt override', async () => {
    await manager.updatePromptOverride('readyride', 'readyride_instant_response', 'greeting', 'Hello');
    await manager.updatePromptOverride('readyride', 'readyride_instant_response', 'greeting', 'Bonjour');
    const agent = await manager.getAgent('readyride', 'readyride_instant_response');
    expect(agent?.promptOverrides['greeting']).toBe('Bonjour');
  });

  it('throws for non-existent agent', async () => {
    await expect(
      manager.updatePromptOverride('readyride', 'fake_agent', 'key', 'val'),
    ).rejects.toThrow('Agent "fake_agent" not found');
  });
});

// ─── Personality ───────────────────────────────────────────────────────────

describe('updatePersonality', () => {
  it('changes the personality of an agent', async () => {
    const newPersonality = 'Ultra formal, uses sir/madam at all times.';
    await manager.updatePersonality('readyride', 'readyride_reply_handler', newPersonality);
    const agent = await manager.getAgent('readyride', 'readyride_reply_handler');
    expect(agent?.personality).toBe(newPersonality);
  });

  it('throws for non-existent agent', async () => {
    await expect(
      manager.updatePersonality('readyride', 'fake_agent', 'test'),
    ).rejects.toThrow('Agent "fake_agent" not found');
  });
});

// ─── Restrictions ──────────────────────────────────────────────────────────

describe('addRestriction / removeRestriction', () => {
  it('adds a new restriction', async () => {
    await manager.addRestriction('readyride', 'readyride_instant_response', 'Never use emojis');
    const agent = await manager.getAgent('readyride', 'readyride_instant_response');
    expect(agent?.restrictions).toContain('Never use emojis');
  });

  it('does not duplicate an existing restriction', async () => {
    const existing = 'Never quote specific pricing or out-the-door figures';
    await manager.addRestriction('readyride', 'readyride_instant_response', existing);
    const agent = await manager.getAgent('readyride', 'readyride_instant_response');
    const count = agent?.restrictions.filter((r) => r === existing).length;
    expect(count).toBe(1);
  });

  it('removes a restriction', async () => {
    const target = 'Never make claims about trade-in values';
    await manager.removeRestriction('readyride', 'readyride_instant_response', target);
    const agent = await manager.getAgent('readyride', 'readyride_instant_response');
    expect(agent?.restrictions).not.toContain(target);
  });

  it('removing a non-existent restriction is a no-op', async () => {
    const before = await manager.getAgent('readyride', 'readyride_instant_response');
    const countBefore = before?.restrictions.length;
    await manager.removeRestriction('readyride', 'readyride_instant_response', 'Something that does not exist');
    const after = await manager.getAgent('readyride', 'readyride_instant_response');
    expect(after?.restrictions.length).toBe(countBefore);
  });
});

// ─── Handoff Rules ─────────────────────────────────────────────────────────

describe('updateHandoffRules', () => {
  it('replaces handoff rules for an agent', async () => {
    const newRules: HandoffRule[] = [
      { trigger: 'Customer says goodbye', target: 'archive', priority: 5, message: 'Conversation complete.' },
    ];
    await manager.updateHandoffRules('readyride', 'readyride_instant_response', newRules);
    const agent = await manager.getAgent('readyride', 'readyride_instant_response');
    expect(agent?.handoffRules).toHaveLength(1);
    expect(agent?.handoffRules[0].trigger).toBe('Customer says goodbye');
  });
});

// ─── Active Agents ─────────────────────────────────────────────────────────

describe('getActiveAgents', () => {
  it('returns all agents when all are enabled', async () => {
    const active = await manager.getActiveAgents('readyride');
    expect(active).toHaveLength(3);
  });

  it('excludes disabled agents', async () => {
    await manager.toggleAgent('readyride', 'readyride_cold_warming', false);
    const active = await manager.getActiveAgents('readyride');
    expect(active).toHaveLength(2);
    expect(active.find((a) => a.id === 'readyride_cold_warming')).toBeUndefined();
  });

  it('returns empty array when all agents are disabled', async () => {
    await manager.toggleAgent('readyride', 'readyride_instant_response', false);
    await manager.toggleAgent('readyride', 'readyride_cold_warming', false);
    await manager.toggleAgent('readyride', 'readyride_reply_handler', false);
    const active = await manager.getActiveAgents('readyride');
    expect(active).toHaveLength(0);
  });
});

// ─── Agent Status with Toggle History ──────────────────────────────────────

describe('getAgentStatus', () => {
  it('returns status for all agents', async () => {
    const statuses = await manager.getAgentStatus('readyride');
    expect(statuses).toHaveLength(3);
    for (const status of statuses) {
      expect(status.agentId).toBeDefined();
      expect(status.name).toBeDefined();
      expect(status.type).toBeDefined();
      expect(typeof status.enabled).toBe('boolean');
    }
  });

  it('includes last toggle info after a toggle', async () => {
    await manager.toggleAgent('readyride', 'readyride_instant_response', false, 'maintenance');
    const statuses = await manager.getAgentStatus('readyride');
    const irStatus = statuses.find((s) => s.agentId === 'readyride_instant_response');
    expect(irStatus?.enabled).toBe(false);
    expect(irStatus?.lastToggle).toBeDefined();
    expect(irStatus?.lastToggle?.reason).toBe('maintenance');
    expect(irStatus?.lastToggle?.toggledBy).toBe('control-panel');
  });

  it('tracks multiple toggles and shows the latest', async () => {
    await manager.toggleAgent('readyride', 'readyride_instant_response', false, 'first toggle');
    await manager.toggleAgent('readyride', 'readyride_instant_response', true, 'second toggle');
    const statuses = await manager.getAgentStatus('readyride');
    const irStatus = statuses.find((s) => s.agentId === 'readyride_instant_response');
    expect(irStatus?.enabled).toBe(true);
    expect(irStatus?.lastToggle?.reason).toBe('second toggle');
  });
});

// ─── Preset Agents have all required fields ────────────────────────────────

describe('agent presets', () => {
  const requiredFields: (keyof AgentDefinition)[] = [
    'id',
    'name',
    'description',
    'type',
    'enabled',
    'promptOverrides',
    'personality',
    'restrictions',
    'capabilities',
    'handoffRules',
    'touchSchedule',
    'channels',
  ];

  const presets: [string, AgentDefinition][] = [
    ['READYRIDE_INSTANT_RESPONSE', READYRIDE_INSTANT_RESPONSE],
    ['READYRIDE_COLD_WARMING', READYRIDE_COLD_WARMING],
    ['READYRIDE_REPLY_HANDLER', READYRIDE_REPLY_HANDLER],
    ['READYCAR_INSTANT_RESPONSE', READYCAR_INSTANT_RESPONSE],
    ['READYCAR_COLD_WARMING', READYCAR_COLD_WARMING],
    ['READYCAR_REPLY_HANDLER', READYCAR_REPLY_HANDLER],
  ];

  it.each(presets)('%s has all required fields', (_name, preset) => {
    for (const field of requiredFields) {
      expect(preset[field]).toBeDefined();
    }
  });

  it.each(presets)('%s has non-empty personality', (_name, preset) => {
    expect(preset.personality.length).toBeGreaterThan(10);
  });

  it.each(presets)('%s has at least one restriction', (_name, preset) => {
    expect(preset.restrictions.length).toBeGreaterThan(0);
  });

  it.each(presets)('%s has at least one capability', (_name, preset) => {
    expect(preset.capabilities.length).toBeGreaterThan(0);
  });

  it.each(presets)('%s has at least one handoff rule', (_name, preset) => {
    expect(preset.handoffRules.length).toBeGreaterThan(0);
  });

  it.each(presets)('%s has at least one channel', (_name, preset) => {
    expect(preset.channels.length).toBeGreaterThan(0);
  });

  it('ALL_PRESETS contains all 6 presets', () => {
    expect(Object.keys(ALL_PRESETS)).toHaveLength(6);
  });

  it('warming agents have a touch schedule', () => {
    expect(READYRIDE_COLD_WARMING.touchSchedule.length).toBe(7);
    expect(READYCAR_COLD_WARMING.touchSchedule.length).toBe(7);
  });

  it('warming agents have break-up message at touch 6', () => {
    const rrTouch6 = READYRIDE_COLD_WARMING.touchSchedule.find((t) => t.touchNumber === 6);
    expect(rrTouch6?.strategy).toBe('break-up');

    const rcTouch6 = READYCAR_COLD_WARMING.touchSchedule.find((t) => t.touchNumber === 6);
    expect(rcTouch6?.strategy).toBe('break-up');
  });
});
