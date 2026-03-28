// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Named Constants — Every threshold in one place
//  Change a number here, it changes everywhere.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Health Score Thresholds ───────────────────────
export const HEALTH_HEALTHY_THRESHOLD = 0.85;
export const HEALTH_DEGRADED_THRESHOLD = 0.40;
export const HEALTH_RECOVERING_THRESHOLD = 0.15;

// ── Health Score Weights (must sum to 1.0) ────────
export const HEALTH_WEIGHT_SUCCESS_RATE = 0.30;
export const HEALTH_WEIGHT_LATENCY = 0.15;
export const HEALTH_WEIGHT_QUALITY = 0.30;
export const HEALTH_WEIGHT_RECOVERY = 0.25;

// ── Circuit Breaker ───────────────────────────────
export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
export const CIRCUIT_BREAKER_RESET_MS = 60_000;

// ── Reflection Loop ───────────────────────────────
export const REFLECTION_MAX_RETRIES = 2;
export const REFLECTION_MODEL = 'claude-haiku-4-5-20251001';

// ── API Call Defaults ─────────────────────────────
export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
export const DEFAULT_MAX_TOKENS = 2048;
export const DEFAULT_TIMEOUT_MS = 30_000;

// ── Retry Configuration ───────────────────────────
export const RETRY_RATE_LIMIT_MAX = 5;
export const RETRY_RATE_LIMIT_BACKOFF_MS = 2_000;

export const RETRY_OVERLOADED_MAX = 3;
export const RETRY_OVERLOADED_BACKOFF_MS = 5_000;

export const RETRY_TIMEOUT_MAX = 2;
export const RETRY_TIMEOUT_BACKOFF_MS = 1_000;

export const RETRY_CONTEXT_OVERFLOW_MAX = 1;
export const RETRY_CONTEXT_OVERFLOW_BACKOFF_MS = 0;

export const RETRY_SERVER_ERROR_MAX = 3;
export const RETRY_SERVER_ERROR_BACKOFF_MS = 3_000;

export const RETRY_NETWORK_MAX = 3;
export const RETRY_NETWORK_BACKOFF_MS = 2_000;

export const RETRY_OUTPUT_QUALITY_MAX = 2;
export const RETRY_OUTPUT_QUALITY_BACKOFF_MS = 0;

// ── Health Tracker ────────────────────────────────
export const HEALTH_WINDOW_SIZE = 20;

// ── Latency Score Breakpoints (ms) ────────────────
export const LATENCY_EXCELLENT_MS = 2_000;
export const LATENCY_GOOD_MS = 5_000;
export const LATENCY_ACCEPTABLE_MS = 10_000;
export const LATENCY_POOR_MS = 20_000;

// ── Debate Defaults ───────────────────────────────
export const DEFAULT_DEBATE_ROUNDS = 3;
export const DEFAULT_MAX_AGENTS = 10;
