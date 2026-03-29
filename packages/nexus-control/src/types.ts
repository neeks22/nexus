/**
 * Agent control panel types — per-tenant agent configuration and management.
 */

// ─── Agent Type ────────────────────────────────────────────────────────────

export type AgentType =
  | 'instant_response'
  | 'cold_warming'
  | 'reply_handler'
  | 'receptionist'
  | 'service_bdc';

// ─── Channel ───────────────────────────────────────────────────────────────

export type AgentChannel = 'sms' | 'email' | 'voice';

// ─── Handoff Rules ─────────────────────────────────────────────────────────

export interface HandoffRule {
  /** The condition that triggers handoff (e.g., "customer expresses anger") */
  trigger: string;
  /** Target for handoff (e.g., "sales_manager", "human_agent") */
  target: string;
  /** Priority of this rule — lower number = higher priority */
  priority: number;
  /** Optional message to include when handing off */
  message?: string;
}

// ─── Touch Schedule (for warming agents) ───────────────────────────────────

export interface TouchScheduleEntry {
  /** Touch number (1-based) */
  touchNumber: number;
  /** Delay in hours from the previous touch (or from lead creation for touch 1) */
  delayHours: number;
  /** Channel to use for this touch */
  channel: AgentChannel;
  /** Strategy label (e.g., "enthusiastic", "consultative", "break-up") */
  strategy: string;
}

// ─── Agent Definition ──────────────────────────────────────────────────────

export interface AgentDefinition {
  /** Unique agent identifier (e.g., "readyride_instant_response") */
  id: string;
  /** Human-readable name */
  name: string;
  /** What this agent does */
  description: string;
  /** Agent classification */
  type: AgentType;
  /** Whether this agent is currently active */
  enabled: boolean;
  /** Runtime prompt variable overrides (key -> value) */
  promptOverrides: Record<string, string>;
  /** Tone/voice description for this agent */
  personality: string;
  /** Things this agent must NEVER do */
  restrictions: string[];
  /** Things this agent CAN do */
  capabilities: string[];
  /** Rules for when to hand off to a human */
  handoffRules: HandoffRule[];
  /** Touch sequence config (only relevant for warming agents) */
  touchSchedule: TouchScheduleEntry[];
  /** Channels this agent operates on */
  channels: AgentChannel[];
}

// ─── Agent Registry ────────────────────────────────────────────────────────

export interface AgentRegistry {
  /** Tenant this registry belongs to */
  tenantId: string;
  /** All agent definitions for this tenant */
  agents: AgentDefinition[];
  /** ISO timestamp of last update */
  lastUpdated: string;
  /** Who made the last change */
  updatedBy: string;
}

// ─── Agent Toggle ──────────────────────────────────────────────────────────

export interface AgentToggle {
  /** Which agent was toggled */
  agentId: string;
  /** New enabled state */
  enabled: boolean;
  /** Optional reason for the toggle */
  reason?: string;
  /** ISO timestamp of the toggle */
  toggledAt: string;
  /** Who toggled it */
  toggledBy: string;
}

// ─── Agent Status ──────────────────────────────────────────────────────────

export interface AgentStatus {
  agentId: string;
  name: string;
  type: AgentType;
  enabled: boolean;
  lastToggle?: AgentToggle;
}
