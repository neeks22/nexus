// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Transcript — Immutable, append-only conversation memory
//
//  "Shared mutable state is the global variable of the AI world."
//  Once an entry is written, it CANNOT be modified.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { randomUUID } from 'node:crypto';
import { TranscriptEntry, TranscriptMessage, Tombstone } from '../types.js';

export class Transcript {
  readonly #entries: TranscriptEntry[] = [];

  // ── Append ────────────────────────────────────────

  append(entry: Omit<TranscriptEntry, 'id' | 'timestamp'>): TranscriptEntry {
    const sealed: TranscriptEntry = Object.freeze({
      ...entry,
      id: randomUUID(),
      timestamp: Date.now(),
    });

    this.#entries.push(sealed);
    return sealed;
  }

  // ── Queries ───────────────────────────────────────

  entries(): ReadonlyArray<TranscriptEntry> {
    return Object.freeze([...this.#entries]);
  }

  getByAgent(agentId: string): ReadonlyArray<TranscriptEntry> {
    return Object.freeze(this.#entries.filter((e) => e.agentId === agentId));
  }

  getByRound(round: number): ReadonlyArray<TranscriptEntry> {
    return Object.freeze(this.#entries.filter((e) => e.round === round));
  }

  getLatestRound(): number {
    if (this.#entries.length === 0) {
      return 0;
    }
    return Math.max(...this.#entries.map((e) => e.round));
  }

  get length(): number {
    return this.#entries.length;
  }

  // ── Tombstones ────────────────────────────────────

  tombstones(): ReadonlyArray<Tombstone> {
    return Object.freeze(
      this.#entries
        .filter((e): e is TranscriptEntry & { tombstone: Tombstone } => e.tombstone !== undefined)
        .map((e) => e.tombstone),
    );
  }

  // ── Conversion ────────────────────────────────────

  /**
   * Converts entries to {role, content} message format for API calls.
   * Each entry becomes a user message with format: "[AgentName]: content"
   */
  toMessages(): TranscriptMessage[] {
    return this.#entries.map((e) => ({
      role: 'user' as const,
      content: `[${e.agentName}]: ${e.content}`,
    }));
  }

  /**
   * Formats the full transcript as a readable string for injecting into prompts.
   * Groups entries by round for clarity.
   */
  toContext(): string {
    if (this.#entries.length === 0) {
      return '(no transcript entries)';
    }

    const latestRound = this.getLatestRound();
    const lines: string[] = [];

    for (let round = 1; round <= latestRound; round++) {
      const roundEntries = this.#entries.filter((e) => e.round === round);
      if (roundEntries.length === 0) {
        continue;
      }

      lines.push(`--- Round ${round} ---`);

      for (const entry of roundEntries) {
        const ts = new Date(entry.timestamp).toISOString();
        const tombstoneTag = entry.tombstone ? ' [TOMBSTONED]' : '';
        lines.push(`[${ts}] ${entry.agentName}${tombstoneTag}:`);
        lines.push(entry.content);
        lines.push('');
      }
    }

    return lines.join('\n').trimEnd();
  }

  // ── Serialization ─────────────────────────────────

  serialize(): string {
    return JSON.stringify(this.#entries);
  }

  static deserialize(data: string): Transcript {
    const parsed: unknown = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      throw new Error('Transcript.deserialize: expected a JSON array');
    }

    const transcript = new Transcript();

    for (const raw of parsed) {
      if (
        typeof raw !== 'object' ||
        raw === null ||
        typeof (raw as Record<string, unknown>)['id'] !== 'string' ||
        typeof (raw as Record<string, unknown>)['agentId'] !== 'string' ||
        typeof (raw as Record<string, unknown>)['agentName'] !== 'string' ||
        typeof (raw as Record<string, unknown>)['round'] !== 'number' ||
        typeof (raw as Record<string, unknown>)['content'] !== 'string' ||
        typeof (raw as Record<string, unknown>)['timestamp'] !== 'number'
      ) {
        throw new Error(
          `Transcript.deserialize: malformed entry — ${JSON.stringify(raw)}`,
        );
      }

      // Push directly to bypass id/timestamp generation — we are restoring existing state
      const entry: TranscriptEntry = Object.freeze(raw as TranscriptEntry);
      transcript.#entries.push(entry);
    }

    return transcript;
  }
}
