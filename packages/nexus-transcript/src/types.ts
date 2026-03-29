// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Lead Transcript Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type TranscriptRole = 'ai' | 'customer' | 'system';

export type TranscriptChannel = 'sms' | 'email' | 'voice';

export interface TranscriptEntry {
  readonly id: string;
  readonly leadId: string;
  readonly timestamp: number;
  readonly role: TranscriptRole;
  readonly content: string;
  readonly channel: TranscriptChannel;
  readonly touchNumber: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface HandoffEvent {
  readonly timestamp: number;
  readonly intent: string;
  readonly confidence: number;
  readonly repName: string;
  readonly transcriptSummary: string;
}

export interface ComplianceCheckResult {
  readonly timestamp: number;
  readonly pass: boolean;
  readonly failures: readonly string[];
}
