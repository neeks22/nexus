// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  NexusStore — Persists and loads runs to/from JSON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { readFile, writeFile, unlink, readdir, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import {
  TeamConfig,
  TranscriptEntry,
  HealingSummary,
  TokenUsage,
} from '../types.js';

// ── Stored run shape ──────────────────────────────

export interface StoredRun {
  id: string;
  timestamp: number;
  type: 'debate' | 'review' | 'team_run';
  topic: string;
  config: TeamConfig;
  transcript: TranscriptEntry[];
  healingSummary: HealingSummary;
  tokens: TokenUsage;
  cost: number;
  durationMs: number;
}

export interface RunListEntry {
  id: string;
  topic: string;
  timestamp: number;
  type: string;
}

// ── NexusStore ────────────────────────────────────

export class NexusStore {
  readonly #dataDir: string;

  constructor(dataDir?: string) {
    this.#dataDir = dataDir
      ? resolve(dataDir)
      : join(homedir(), '.nexus', 'data');
  }

  // ── Private helpers ───────────────────────────

  #runPath(runId: string): string {
    return join(this.#dataDir, `${runId}.json`);
  }

  async #ensureDir(): Promise<void> {
    await mkdir(this.#dataDir, { recursive: true });
  }

  // ── Public API ────────────────────────────────

  /**
   * Writes a run as JSON to disk.
   * Returns the full path to the written file.
   */
  async save(run: StoredRun): Promise<string> {
    await this.#ensureDir();
    const path = this.#runPath(run.id);
    await writeFile(path, JSON.stringify(run, null, 2), 'utf8');
    return path;
  }

  /**
   * Reads and parses a run from disk by its ID.
   * Throws if the file does not exist or cannot be parsed.
   */
  async load(runId: string): Promise<StoredRun> {
    const path = this.#runPath(runId);
    let raw: string;

    try {
      raw = await readFile(path, 'utf8');
    } catch (err) {
      throw new Error(
        `NexusStore.load: run "${runId}" not found at ${path} — ${String(err)}`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`NexusStore.load: run "${runId}" contains invalid JSON`);
    }

    return parsed as StoredRun;
  }

  /**
   * Returns lightweight metadata for all saved runs,
   * sorted by timestamp descending (newest first).
   */
  async list(): Promise<RunListEntry[]> {
    await this.#ensureDir();

    let files: string[];
    try {
      files = await readdir(this.#dataDir);
    } catch {
      return [];
    }

    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const entries: RunListEntry[] = [];

    for (const file of jsonFiles) {
      try {
        const raw = await readFile(join(this.#dataDir, file), 'utf8');
        const run = JSON.parse(raw) as Partial<StoredRun>;

        if (
          typeof run.id === 'string' &&
          typeof run.topic === 'string' &&
          typeof run.timestamp === 'number' &&
          typeof run.type === 'string'
        ) {
          entries.push({
            id: run.id,
            topic: run.topic,
            timestamp: run.timestamp,
            type: run.type,
          });
        }
      } catch {
        // Skip corrupted files silently — graceful degradation
      }
    }

    entries.sort((a, b) => b.timestamp - a.timestamp);
    return entries;
  }

  /**
   * Deletes a run from disk by its ID.
   * Throws if the file does not exist.
   */
  async delete(runId: string): Promise<void> {
    const path = this.#runPath(runId);
    try {
      await unlink(path);
    } catch (err) {
      throw new Error(
        `NexusStore.delete: run "${runId}" not found — ${String(err)}`,
      );
    }
  }

  /**
   * Returns the N most recent runs, fully loaded.
   * Defaults to 10 if n is not supplied.
   */
  async getLatest(n: number = 10): Promise<StoredRun[]> {
    const listing = await this.list();
    const slice = listing.slice(0, n);

    const runs: StoredRun[] = [];
    for (const entry of slice) {
      try {
        const run = await this.load(entry.id);
        runs.push(run);
      } catch {
        // Skip runs that fail to load — graceful degradation
      }
    }

    return runs;
  }
}
