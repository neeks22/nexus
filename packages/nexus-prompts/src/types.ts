import { z } from 'zod/v4';

// ─── Layer 1: Immutable base prompts (git-controlled) ───────────────────────

export interface Layer1Config {
  /** Core system prompt with conversation logic and persona */
  baseSystemPrompt: string;
  /** Non-negotiable safety rules that Layer 3 cannot override */
  safetyRails: string;
  /** Conversation flow instructions (e.g., touch-aware logic) */
  conversationLogic: string;
}

// ─── Layer 2: Per-tenant config (database-controlled) ───────────────────────

export interface StaffMember {
  name: string;
  role: string;
  phone?: string;
  email?: string;
}

export interface Layer2Config {
  dealershipName: string;
  hours: string;
  staff: StaffMember[];
  address: string;
  phone: string;
  timezone: string;
  tone: 'professional' | 'friendly' | 'casual';
  escalationNumbers: string[];
  inventorySourceUrl: string;
  crmApiUrl: string;
}

// ─── Layer 3: Client-editable config (database-controlled) ──────────────────

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface Layer3Config {
  activePromotions: string[];
  inventoryHighlights: string[];
  blacklistedTopics: string[];
  customFaq: FaqEntry[];
  greetingOverride?: string;
  signatureOverride?: string;
}

// ─── Assembled prompt output ────────────────────────────────────────────────

export interface AssembledPrompt {
  systemPrompt: string;
  layer1Hash: string;
  layer2Hash: string;
  layer3Hash: string;
  assembledAt: Date;
}

// ─── Prompt types ───────────────────────────────────────────────────────────

export type PromptType = 'instant_response' | 'cold_warming';

// ─── Sanitization result ────────────────────────────────────────────────────

export interface SanitizeResult {
  sanitized: string;
  blocked: boolean;
  reason?: string;
}

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const StaffMemberSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const Layer2Schema = z.object({
  dealershipName: z.string().min(1),
  hours: z.string().min(1),
  staff: z.array(StaffMemberSchema).min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  timezone: z.string().min(1),
  tone: z.enum(['professional', 'friendly', 'casual']),
  escalationNumbers: z.array(z.string().min(1)).min(1),
  inventorySourceUrl: z.string().url(),
  crmApiUrl: z.string().url(),
});

export const FaqEntrySchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1).max(1000),
});

export const Layer3Schema = z.object({
  activePromotions: z.array(z.string().min(1).max(500)),
  inventoryHighlights: z.array(z.string().min(1).max(500)),
  blacklistedTopics: z.array(z.string().min(1)),
  customFaq: z.array(FaqEntrySchema),
  greetingOverride: z.string().max(200).optional(),
  signatureOverride: z.string().max(500).optional(),
});
