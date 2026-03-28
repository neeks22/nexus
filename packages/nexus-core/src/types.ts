// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Nexus Types — All interfaces for the framework
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Agent ─────────────────────────────────────────

export interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  model?: string;
  tools?: Tool[];
  maxTokens?: number;
  color?: string;
  icon?: string;
}

export interface AgentRunResult {
  agentId: string;
  content: string;
  tombstone?: Tombstone;
  health: HealthScore;
  latencyMs: number;
  cached: boolean;
  tokensUsed: TokenUsage;
}

// ── Tools ─────────────────────────────────────────

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ── Team ──────────────────────────────────────────

export type TeamProtocol = 'sequential' | 'parallel' | 'debate' | 'parallel-then-synthesize';

export interface TeamConfig {
  agents: AgentConfig[];
  protocol: TeamProtocol;
  rounds?: number;
  topic?: string;
  synthesizerAgentId?: string;
}

export interface TeamRunInput {
  topic: string;
  context?: string;
}

export interface TeamRunResult {
  transcript: TranscriptEntry[];
  healingSummary: HealingSummary;
  totalLatencyMs: number;
  totalTokens: TokenUsage;
  totalCost: number;
}

// ── Graph ─────────────────────────────────────────

export interface GraphNode {
  id: string;
  agentConfig: AgentConfig;
}

export interface GraphEdge {
  from: string;
  to: string;
  condition?: (context: GraphContext) => boolean;
}

export interface GraphContext {
  transcript: TranscriptEntry[];
  currentStepId: string;
  metadata: Record<string, unknown>;
}

// ── Transcript ────────────────────────────────────

export interface TranscriptEntry {
  id: string;
  agentId: string;
  agentName: string;
  round: number;
  content: string;
  timestamp: number;
  tombstone?: Tombstone;
  metadata?: Record<string, unknown>;
}

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Self-Healing ──────────────────────────────────

export interface Tombstone {
  stepId: string;
  agentId: string;
  reason: TombstoneReason;
  timestamp: number;
  lastAttempt: unknown;
  retriesExhausted: number;
}

export type TombstoneReason =
  | 'reflection_cap_breach'
  | 'circuit_breaker_open'
  | 'total_timeout'
  | 'auth_failure'
  | 'unrecoverable_error';

// ── Health ────────────────────────────────────────

export type HealthState = 'HEALTHY' | 'DEGRADED' | 'RECOVERING' | 'FAILED';

export interface HealthScore {
  overall: number;
  successRate: number;
  avgLatencyMs: number;
  qualityScore: number;
  recoveryRate: number;
  state: HealthState;
}

export interface HealingSummary {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  recoveryCalls: number;
  tombstones: Tombstone[];
  agentHealths: Record<string, HealthScore>;
}

// ── Error Taxonomy ────────────────────────────────

export type InfraErrorType =
  | 'rate_limit'
  | 'api_overloaded'
  | 'api_timeout'
  | 'context_overflow'
  | 'server_error'
  | 'auth_error'
  | 'network_error';

export type OutputErrorType =
  | 'empty_response'
  | 'malformed_response'
  | 'off_topic'
  | 'too_long'
  | 'too_short'
  | 'refusal'
  | 'no_agent_reference'
  | 'repetition';

export type ErrorType = InfraErrorType | OutputErrorType | 'unknown';

export type RecoveryStrategy =
  | 'exponential_backoff'
  | 'exponential_backoff_with_jitter'
  | 'retry_with_reduced_tokens'
  | 'truncate_and_retry'
  | 'retry_after_delay'
  | 'tombstone'
  | 'retry_with_backoff'
  | 'reprompt'
  | 'reprompt_with_format_hint'
  | 'reprompt_with_topic_reminder'
  | 'reprompt_with_length_hint'
  | 'reprompt_with_reframe'
  | 'reprompt_with_instruction'
  | 'reprompt_with_novelty_hint';

export interface ErrorClassification {
  type: ErrorType;
  category: 'infrastructure' | 'output_quality';
  strategy: RecoveryStrategy;
  maxRetries: number;
  backoffBaseMs: number;
  description: string;
}

// ── Circuit Breaker ───────────────────────────────

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// ── Provider ──────────────────────────────────────

export interface ProviderMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProviderRequest {
  model: string;
  systemPrompt: string;
  messages: ProviderMessage[];
  maxTokens: number;
  tools?: Tool[];
  cacheBreakpoints?: boolean;
}

export interface ProviderResponse {
  content: string;
  tokensUsed: TokenUsage;
  cached: boolean;
  latencyMs: number;
  stopReason: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

// ── Logging ───────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface NexusLogger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}
