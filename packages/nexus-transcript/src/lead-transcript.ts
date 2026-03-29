// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LeadTranscript — Immutable, append-only conversation log
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { randomUUID } from 'node:crypto';
import type {
  TranscriptEntry,
  TranscriptRole,
  TranscriptChannel,
  HandoffEvent,
  ComplianceCheckResult,
} from './types.js';

function generateId(): string {
  return `entry_${randomUUID()}`;
}

export interface AppendMessageOptions {
  channel?: TranscriptChannel;
  touchNumber?: number;
  metadata?: Record<string, unknown>;
}

export class LeadTranscript {
  readonly leadId: string;
  private readonly entries: readonly TranscriptEntry[];
  private readonly handoffs: readonly HandoffEvent[];
  private readonly complianceChecks: readonly ComplianceCheckResult[];

  constructor(
    leadId: string,
    entries: readonly TranscriptEntry[] = [],
    handoffs: readonly HandoffEvent[] = [],
    complianceChecks: readonly ComplianceCheckResult[] = [],
  ) {
    this.leadId = leadId;
    this.entries = entries;
    this.handoffs = handoffs;
    this.complianceChecks = complianceChecks;
  }

  appendMessage(
    role: TranscriptRole,
    content: string,
    options: AppendMessageOptions = {},
  ): LeadTranscript {
    const currentTouch = this.getLatestTouch();
    const touchNumber = options.touchNumber ?? currentTouch + 1;

    const entry: TranscriptEntry = {
      id: generateId(),
      leadId: this.leadId,
      timestamp: Date.now(),
      role,
      content,
      channel: options.channel ?? 'sms',
      touchNumber,
      metadata: options.metadata,
    };

    return new LeadTranscript(
      this.leadId,
      [...this.entries, entry],
      this.handoffs,
      this.complianceChecks,
    );
  }

  appendHandoff(intent: string, confidence: number, repName: string): LeadTranscript {
    const event: HandoffEvent = {
      timestamp: Date.now(),
      intent,
      confidence,
      repName,
      transcriptSummary: this.getSummary(),
    };

    return new LeadTranscript(
      this.leadId,
      this.entries,
      [...this.handoffs, event],
      this.complianceChecks,
    );
  }

  appendComplianceCheck(result: ComplianceCheckResult): LeadTranscript {
    return new LeadTranscript(
      this.leadId,
      this.entries,
      this.handoffs,
      [...this.complianceChecks, result],
    );
  }

  getMessages(): readonly TranscriptEntry[] {
    return this.entries;
  }

  getHandoffs(): readonly HandoffEvent[] {
    return this.handoffs;
  }

  getComplianceChecks(): readonly ComplianceCheckResult[] {
    return this.complianceChecks;
  }

  getLatestTouch(): number {
    if (this.entries.length === 0) {
      return 0;
    }
    return Math.max(...this.entries.map((e) => e.touchNumber));
  }

  getSummary(): string {
    if (this.entries.length === 0) {
      return `No conversation history for lead ${this.leadId}.`;
    }

    const parts: string[] = [];

    // Find customer name from metadata if available
    const customerEntry = this.entries.find(
      (e) => e.role === 'customer' && e.metadata?.['customerName'],
    );
    const customerName = customerEntry?.metadata?.['customerName'] as string | undefined;

    // Find vehicle interest from metadata
    const vehicleEntry = this.entries.find((e) => e.metadata?.['vehicleInterest']);
    const vehicleInterest = vehicleEntry?.metadata?.['vehicleInterest'] as string | undefined;

    // First message date
    const firstEntry = this.entries[0];
    const firstDate = firstEntry
      ? new Date(firstEntry.timestamp).toLocaleDateString('en-CA', {
          month: 'short',
          day: 'numeric',
        })
      : undefined;

    // Build opening
    if (customerName && vehicleInterest && firstDate) {
      parts.push(`Customer ${customerName} inquired about ${vehicleInterest} on ${firstDate}.`);
    } else if (customerName && firstDate) {
      parts.push(`Customer ${customerName} started conversation on ${firstDate}.`);
    } else if (firstDate) {
      parts.push(`Conversation started on ${firstDate}.`);
    }

    // Touch range and channels
    const minTouch = Math.min(...this.entries.map((e) => e.touchNumber));
    const maxTouch = this.getLatestTouch();
    const channels = [...new Set(this.entries.map((e) => e.channel))];
    const channelStr = channels.join('/').toUpperCase();

    if (minTouch === maxTouch) {
      parts.push(`Responded via ${channelStr} (touch ${minTouch}).`);
    } else {
      parts.push(`Responded via ${channelStr} (touch ${minTouch}-${maxTouch}).`);
    }

    // Check for notable intents in metadata
    const intentEntries = this.entries.filter((e) => e.metadata?.['intent']);
    if (intentEntries.length > 0) {
      const lastIntent = intentEntries[intentEntries.length - 1];
      if (lastIntent) {
        const intentDesc = lastIntent.metadata?.['intentDescription'] as string | undefined;
        if (intentDesc) {
          parts.push(`${intentDesc} on touch ${lastIntent.touchNumber}.`);
        }
      }
    }

    // Handoff info
    if (this.handoffs.length > 0) {
      const lastHandoff = this.handoffs[this.handoffs.length - 1];
      if (lastHandoff) {
        parts.push(`Handed off to ${lastHandoff.repName}.`);
      }
    }

    return parts.join(' ');
  }

  toJSON(): SerializedTranscript {
    return {
      leadId: this.leadId,
      entries: [...this.entries],
      handoffs: [...this.handoffs],
      complianceChecks: [...this.complianceChecks],
    };
  }

  static fromJSON(data: SerializedTranscript): LeadTranscript {
    return new LeadTranscript(
      data.leadId,
      data.entries,
      data.handoffs,
      data.complianceChecks,
    );
  }
}

export interface SerializedTranscript {
  leadId: string;
  entries: TranscriptEntry[];
  handoffs: HandoffEvent[];
  complianceChecks: ComplianceCheckResult[];
}
