// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Intent Classification Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export enum Intent {
  INFO_REQUEST = 'INFO_REQUEST',
  PRICE_INQUIRY = 'PRICE_INQUIRY',
  FINANCING_QUESTION = 'FINANCING_QUESTION',
  TRADE_IN_REQUEST = 'TRADE_IN_REQUEST',
  TEST_DRIVE_REQUEST = 'TEST_DRIVE_REQUEST',
  TIMELINE_MENTION = 'TIMELINE_MENTION',
  OBJECTION = 'OBJECTION',
  FRUSTRATION = 'FRUSTRATION',
  LEGAL_MENTION = 'LEGAL_MENTION',
  HUMAN_REQUEST = 'HUMAN_REQUEST',
  NOT_INTERESTED = 'NOT_INTERESTED',
}

export interface IntentResult {
  readonly intent: Intent;
  readonly confidence: number;
  readonly reasoning: string;
  readonly bantScore?: BantScore;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BANT Lead Scoring Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BantScore {
  readonly budget: 1 | 2 | 3;
  readonly authority: 1 | 2 | 3;
  readonly need: 1 | 2 | 3;
  readonly timeline: 1 | 2 | 3;
  readonly total: number;
}

export type BantLabel = 'HOT' | 'WARM' | 'COOL' | 'COLD';

export interface LeadQualification {
  readonly intent: IntentResult;
  readonly bant: BantScore;
  readonly label: BantLabel;
  readonly recommendedAction: string;
}

export type HandoffAction = 'handoff' | 'continue' | 'stop';

export interface HandoffRule {
  readonly intent: Intent;
  readonly action: HandoffAction;
  readonly confidenceThreshold: number;
  readonly template?: string;
}

export interface HandoffEvaluation {
  readonly shouldHandoff: boolean;
  readonly action: HandoffAction;
  readonly template?: string;
}
