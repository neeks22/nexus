import { describe, it, expect, beforeEach } from 'vitest';
import { Transcript } from '../../packages/nexus-core/src/transcript/transcript.js';

// Minimal entry payload (omits id and timestamp — Transcript generates them)
const AGENT_A = { agentId: 'agent-a', agentName: 'Agent Alpha', round: 1, content: 'Hello from Alpha' };
const AGENT_B = { agentId: 'agent-b', agentName: 'Agent Beta',  round: 1, content: 'Hello from Beta' };
const AGENT_A_R2 = { agentId: 'agent-a', agentName: 'Agent Alpha', round: 2, content: 'Round 2 from Alpha' };

describe('Transcript', () => {
  let transcript: Transcript;

  beforeEach(() => {
    transcript = new Transcript();
  });

  // ── append ─────────────────────────────────────────

  it('append adds entries with a generated UUID id', () => {
    const entry = transcript.append(AGENT_A);
    expect(entry.id).toBeTruthy();
    expect(typeof entry.id).toBe('string');
    // Basic UUID v4 shape: 8-4-4-4-12 hex chars
    expect(entry.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('append adds entries with a timestamp close to Date.now()', () => {
    const before = Date.now();
    const entry = transcript.append(AGENT_A);
    const after = Date.now();
    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry.timestamp).toBeLessThanOrEqual(after);
  });

  it('append increments length', () => {
    expect(transcript.length).toBe(0);
    transcript.append(AGENT_A);
    expect(transcript.length).toBe(1);
    transcript.append(AGENT_B);
    expect(transcript.length).toBe(2);
  });

  it('appended entries are frozen (immutable)', () => {
    const entry = transcript.append(AGENT_A);
    expect(Object.isFrozen(entry)).toBe(true);
  });

  // ── entries() ──────────────────────────────────────

  it('entries() returns a copy — mutations do not affect the transcript', () => {
    transcript.append(AGENT_A);
    const copy = transcript.entries() as unknown as Array<unknown>;
    expect(() => {
      // Attempt to push to the frozen array — should throw in strict mode
      copy.push({} as never);
    }).toThrow();
    // Internal length unchanged
    expect(transcript.length).toBe(1);
  });

  it('entries() returns all appended entries in order', () => {
    transcript.append(AGENT_A);
    transcript.append(AGENT_B);
    const entries = transcript.entries();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.agentId).toBe('agent-a');
    expect(entries[1]?.agentId).toBe('agent-b');
  });

  // ── getByAgent ─────────────────────────────────────

  it('getByAgent filters entries by agentId', () => {
    transcript.append(AGENT_A);
    transcript.append(AGENT_B);
    transcript.append(AGENT_A_R2);

    const alphaEntries = transcript.getByAgent('agent-a');
    expect(alphaEntries).toHaveLength(2);
    expect(alphaEntries.every((e) => e.agentId === 'agent-a')).toBe(true);
  });

  it('getByAgent returns empty array for unknown agentId', () => {
    transcript.append(AGENT_A);
    expect(transcript.getByAgent('agent-z')).toHaveLength(0);
  });

  // ── getByRound ─────────────────────────────────────

  it('getByRound filters entries by round number', () => {
    transcript.append(AGENT_A);
    transcript.append(AGENT_B);
    transcript.append(AGENT_A_R2);

    const round1 = transcript.getByRound(1);
    expect(round1).toHaveLength(2);
    expect(round1.every((e) => e.round === 1)).toBe(true);

    const round2 = transcript.getByRound(2);
    expect(round2).toHaveLength(1);
    expect(round2[0]?.agentId).toBe('agent-a');
  });

  it('getByRound returns empty array for non-existent round', () => {
    transcript.append(AGENT_A);
    expect(transcript.getByRound(99)).toHaveLength(0);
  });

  // ── toMessages() ───────────────────────────────────

  it('toMessages() formats each entry as {role: "user", content: "[AgentName]: content"}', () => {
    transcript.append(AGENT_A);
    transcript.append(AGENT_B);

    const messages = transcript.toMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: 'user', content: '[Agent Alpha]: Hello from Alpha' });
    expect(messages[1]).toEqual({ role: 'user', content: '[Agent Beta]: Hello from Beta' });
  });

  it('toMessages() returns empty array when no entries', () => {
    expect(transcript.toMessages()).toEqual([]);
  });

  // ── serialize / deserialize ────────────────────────

  it('serialize() returns a valid JSON string', () => {
    transcript.append(AGENT_A);
    const json = transcript.serialize();
    expect(() => JSON.parse(json)).not.toThrow();
    expect(Array.isArray(JSON.parse(json))).toBe(true);
  });

  it('deserialize() round-trips all fields', () => {
    const original = transcript.append(AGENT_A);
    const json = transcript.serialize();
    const restored = Transcript.deserialize(json);

    expect(restored.length).toBe(1);
    const restoredEntry = restored.entries()[0];
    expect(restoredEntry?.id).toBe(original.id);
    expect(restoredEntry?.agentId).toBe(original.agentId);
    expect(restoredEntry?.agentName).toBe(original.agentName);
    expect(restoredEntry?.round).toBe(original.round);
    expect(restoredEntry?.content).toBe(original.content);
    expect(restoredEntry?.timestamp).toBe(original.timestamp);
  });

  it('deserialize() preserves multiple entries in order', () => {
    transcript.append(AGENT_A);
    transcript.append(AGENT_B);
    transcript.append(AGENT_A_R2);
    const json = transcript.serialize();
    const restored = Transcript.deserialize(json);

    expect(restored.length).toBe(3);
    const entries = restored.entries();
    expect(entries[0]?.agentId).toBe('agent-a');
    expect(entries[1]?.agentId).toBe('agent-b');
    expect(entries[2]?.round).toBe(2);
  });

  it('deserialize() throws on non-array JSON', () => {
    expect(() => Transcript.deserialize('"not an array"')).toThrow();
    expect(() => Transcript.deserialize('{"key": "value"}')).toThrow();
  });

  it('deserialize() throws on malformed entry (missing required fields)', () => {
    const bad = JSON.stringify([{ id: '123' }]); // missing agentId, agentName, round, content, timestamp
    expect(() => Transcript.deserialize(bad)).toThrow();
  });

  // ── tombstones() ───────────────────────────────────

  it('tombstones() returns empty array when no tombstoned entries', () => {
    transcript.append(AGENT_A);
    transcript.append(AGENT_B);
    expect(transcript.tombstones()).toHaveLength(0);
  });

  it('tombstones() returns only entries that have a tombstone', () => {
    transcript.append(AGENT_A);
    transcript.append({
      ...AGENT_B,
      tombstone: {
        stepId: 'step-1',
        agentId: 'agent-b',
        reason: 'auth_failure',
        timestamp: Date.now(),
        lastAttempt: null,
        retriesExhausted: 3,
      },
    });

    const tombstones = transcript.tombstones();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]?.agentId).toBe('agent-b');
    expect(tombstones[0]?.reason).toBe('auth_failure');
  });

  it('tombstones() returns all tombstones when multiple entries are tombstoned', () => {
    for (const agent of [AGENT_A, AGENT_B]) {
      transcript.append({
        ...agent,
        tombstone: {
          stepId: `step-${agent.agentId}`,
          agentId: agent.agentId,
          reason: 'unrecoverable_error',
          timestamp: Date.now(),
          lastAttempt: null,
          retriesExhausted: 2,
        },
      });
    }
    expect(transcript.tombstones()).toHaveLength(2);
  });

  // ── getLatestRound ─────────────────────────────────

  it('getLatestRound() returns 0 for an empty transcript', () => {
    expect(transcript.getLatestRound()).toBe(0);
  });

  it('getLatestRound() returns the highest round number', () => {
    transcript.append(AGENT_A);
    transcript.append(AGENT_A_R2);
    transcript.append({ ...AGENT_B, round: 3 });
    expect(transcript.getLatestRound()).toBe(3);
  });
});
