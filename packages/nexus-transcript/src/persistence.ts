// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Transcript Persistence — Interface + InMemory impl
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { LeadTranscript } from './lead-transcript.js';
import type { SerializedTranscript } from './lead-transcript.js';

export interface TranscriptStore {
  save(transcript: LeadTranscript): Promise<void>;
  load(leadId: string): Promise<LeadTranscript | undefined>;
  exists(leadId: string): Promise<boolean>;
}

export class InMemoryTranscriptStore implements TranscriptStore {
  private readonly store: Map<string, SerializedTranscript> = new Map();

  async save(transcript: LeadTranscript): Promise<void> {
    this.store.set(transcript.leadId, transcript.toJSON());
  }

  async load(leadId: string): Promise<LeadTranscript | undefined> {
    const data = this.store.get(leadId);
    if (!data) {
      return undefined;
    }
    return LeadTranscript.fromJSON(data);
  }

  async exists(leadId: string): Promise<boolean> {
    return this.store.has(leadId);
  }
}
