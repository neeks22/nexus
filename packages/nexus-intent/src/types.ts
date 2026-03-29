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
