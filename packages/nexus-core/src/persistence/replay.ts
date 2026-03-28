// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ReplayEngine — Replays saved debates in the terminal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { TranscriptEntry } from '../types.js';
import { StoredRun } from './store.js';

// ── Options ───────────────────────────────────────

export interface ReplayOptions {
  /**
   * Playback speed multiplier.
   * 1.0 = real time, 2.0 = 2x speed, 0 = instant (no delays).
   */
  speed: number;
  /** Whether to prefix each entry with its original ISO timestamp. */
  showTimestamps: boolean;
  /** Whether to include health state after each entry. */
  showHealth: boolean;
}

const DEFAULT_OPTIONS: ReplayOptions = {
  speed: 1.0,
  showTimestamps: true,
  showHealth: false,
};

// ── ReplayEngine ──────────────────────────────────

export class ReplayEngine {
  /**
   * Yields TranscriptEntry objects one at a time, with delays that simulate
   * the original timing between responses (scaled by `speed`).
   *
   * If speed === 0 every entry is yielded immediately with no await.
   */
  async *replay(
    run: StoredRun,
    options?: Partial<ReplayOptions>,
  ): AsyncGenerator<TranscriptEntry> {
    const opts: ReplayOptions = { ...DEFAULT_OPTIONS, ...options };
    const entries = run.transcript;

    if (entries.length === 0) {
      return;
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i] as TranscriptEntry;

      // ── Compute delay ────────────────────────
      if (opts.speed > 0 && i > 0) {
        const prev = entries[i - 1] as TranscriptEntry;
        const gapMs = Math.max(0, entry.timestamp - prev.timestamp);
        const scaledMs = gapMs / opts.speed;

        // Cap the maximum single delay at 8 seconds so replays
        // don't stall when the original run had long pauses.
        const cappedMs = Math.min(scaledMs, 8_000);

        if (cappedMs > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, cappedMs));
        }
      }

      yield entry;
    }
  }

  /**
   * Formats a single TranscriptEntry as a human-readable string
   * suitable for terminal output.
   */
  format(entry: TranscriptEntry, opts: Partial<ReplayOptions> = {}): string {
    const mergedOpts: ReplayOptions = { ...DEFAULT_OPTIONS, ...opts };
    const lines: string[] = [];

    const roundLabel = `Round ${entry.round}`;
    const tombstoneTag = entry.tombstone ? ' [TOMBSTONED]' : '';
    const tsPrefix = mergedOpts.showTimestamps
      ? `[${new Date(entry.timestamp).toISOString()}] `
      : '';

    lines.push(`${tsPrefix}${roundLabel} — ${entry.agentName}${tombstoneTag}`);
    lines.push(entry.content);

    return lines.join('\n');
  }
}
