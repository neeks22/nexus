import { describe, it, expect, beforeEach } from 'vitest';
import { LeadTranscript } from '../../../packages/nexus-transcript/src/lead-transcript.js';
import { InMemoryTranscriptStore } from '../../../packages/nexus-transcript/src/persistence.js';
import type { ComplianceCheckResult } from '../../../packages/nexus-transcript/src/types.js';

describe('LeadTranscript', () => {
  let transcript: LeadTranscript;

  beforeEach(() => {
    transcript = new LeadTranscript('lead_123');
  });

  // ── Immutability ──────────────────────────────────

  describe('immutability', () => {
    it('appendMessage returns a new instance, original unchanged', () => {
      const original = new LeadTranscript('lead_1');
      const updated = original.appendMessage('customer', 'Hello');

      expect(original.getMessages()).toHaveLength(0);
      expect(updated.getMessages()).toHaveLength(1);
      expect(original).not.toBe(updated);
    });

    it('appendHandoff returns a new instance, original unchanged', () => {
      const original = new LeadTranscript('lead_1');
      const updated = original.appendHandoff('PRICE_INQUIRY', 0.9, 'Alex');

      expect(original.getHandoffs()).toHaveLength(0);
      expect(updated.getHandoffs()).toHaveLength(1);
      expect(original).not.toBe(updated);
    });

    it('appendComplianceCheck returns a new instance, original unchanged', () => {
      const original = new LeadTranscript('lead_1');
      const check: ComplianceCheckResult = {
        timestamp: Date.now(),
        pass: true,
        failures: [],
      };
      const updated = original.appendComplianceCheck(check);

      expect(original.getComplianceChecks()).toHaveLength(0);
      expect(updated.getComplianceChecks()).toHaveLength(1);
      expect(original).not.toBe(updated);
    });
  });

  // ── Append Message ─────────────────────────────────

  describe('appendMessage', () => {
    it('appends a message with all fields', () => {
      const updated = transcript.appendMessage('customer', 'I want a CR-V', {
        channel: 'sms',
        touchNumber: 1,
        metadata: { customerName: 'Sarah' },
      });

      const messages = updated.getMessages();
      expect(messages).toHaveLength(1);

      const entry = messages[0]!;
      expect(entry.leadId).toBe('lead_123');
      expect(entry.role).toBe('customer');
      expect(entry.content).toBe('I want a CR-V');
      expect(entry.channel).toBe('sms');
      expect(entry.touchNumber).toBe(1);
      expect(entry.metadata).toEqual({ customerName: 'Sarah' });
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    it('defaults channel to sms when not specified', () => {
      const updated = transcript.appendMessage('ai', 'Hi there!');
      expect(updated.getMessages()[0]!.channel).toBe('sms');
    });

    it('auto-increments touch number when not specified', () => {
      const t1 = transcript.appendMessage('customer', 'Hello', { touchNumber: 1 });
      const t2 = t1.appendMessage('ai', 'Hi!');

      expect(t2.getMessages()[1]!.touchNumber).toBe(2);
    });

    it('chains multiple messages preserving order', () => {
      const t = transcript
        .appendMessage('customer', 'First', { touchNumber: 1 })
        .appendMessage('ai', 'Second', { touchNumber: 1 })
        .appendMessage('customer', 'Third', { touchNumber: 2 });

      const messages = t.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0]!.content).toBe('First');
      expect(messages[1]!.content).toBe('Second');
      expect(messages[2]!.content).toBe('Third');
    });
  });

  // ── Append Handoff ─────────────────────────────────

  describe('appendHandoff', () => {
    it('records a handoff event with full context', () => {
      const updated = transcript
        .appendMessage('customer', 'How much?', { touchNumber: 1 })
        .appendHandoff('PRICE_INQUIRY', 0.9, 'Alex');

      const handoffs = updated.getHandoffs();
      expect(handoffs).toHaveLength(1);

      const event = handoffs[0]!;
      expect(event.intent).toBe('PRICE_INQUIRY');
      expect(event.confidence).toBe(0.9);
      expect(event.repName).toBe('Alex');
      expect(event.transcriptSummary).toBeTruthy();
      expect(event.timestamp).toBeGreaterThan(0);
    });
  });

  // ── Append Compliance Check ────────────────────────

  describe('appendComplianceCheck', () => {
    it('records a passing compliance check', () => {
      const check: ComplianceCheckResult = {
        timestamp: Date.now(),
        pass: true,
        failures: [],
      };
      const updated = transcript.appendComplianceCheck(check);

      const checks = updated.getComplianceChecks();
      expect(checks).toHaveLength(1);
      expect(checks[0]!.pass).toBe(true);
      expect(checks[0]!.failures).toEqual([]);
    });

    it('records a failing compliance check with reasons', () => {
      const check: ComplianceCheckResult = {
        timestamp: Date.now(),
        pass: false,
        failures: ['consent_expired', 'frequency_cap_exceeded'],
      };
      const updated = transcript.appendComplianceCheck(check);

      const checks = updated.getComplianceChecks();
      expect(checks[0]!.pass).toBe(false);
      expect(checks[0]!.failures).toEqual(['consent_expired', 'frequency_cap_exceeded']);
    });
  });

  // ── getLatestTouch ─────────────────────────────────

  describe('getLatestTouch', () => {
    it('returns 0 for empty transcript', () => {
      expect(transcript.getLatestTouch()).toBe(0);
    });

    it('returns the highest touch number', () => {
      const t = transcript
        .appendMessage('customer', 'msg1', { touchNumber: 1 })
        .appendMessage('ai', 'msg2', { touchNumber: 1 })
        .appendMessage('customer', 'msg3', { touchNumber: 3 });

      expect(t.getLatestTouch()).toBe(3);
    });
  });

  // ── getSummary ─────────────────────────────────────

  describe('getSummary', () => {
    it('returns placeholder for empty transcript', () => {
      expect(transcript.getSummary()).toContain('No conversation history');
    });

    it('generates human-readable summary with customer name and vehicle', () => {
      const t = transcript
        .appendMessage('customer', 'I want a 2024 CR-V', {
          touchNumber: 1,
          channel: 'sms',
          metadata: { customerName: 'Sarah', vehicleInterest: '2024 CR-V' },
        })
        .appendMessage('ai', 'Great choice!', { touchNumber: 1, channel: 'sms' })
        .appendMessage('customer', 'Can I test drive it?', {
          touchNumber: 2,
          channel: 'sms',
          metadata: { intent: 'TEST_DRIVE', intentDescription: 'Showed interest in test drive' },
        })
        .appendHandoff('TEST_DRIVE_REQUEST', 0.9, 'Alex');

      const summary = t.getSummary();
      expect(summary).toContain('Sarah');
      expect(summary).toContain('2024 CR-V');
      expect(summary).toContain('SMS');
      expect(summary).toContain('touch');
      expect(summary).toContain('Alex');
    });

    it('generates summary without metadata gracefully', () => {
      const t = transcript
        .appendMessage('customer', 'Hello', { touchNumber: 1 })
        .appendMessage('ai', 'Hi!', { touchNumber: 1 });

      const summary = t.getSummary();
      expect(summary).toContain('Conversation started');
      expect(summary).toContain('SMS');
    });
  });

  // ── Serialization ──────────────────────────────────

  describe('toJSON / fromJSON', () => {
    it('round-trips correctly', () => {
      const t = transcript
        .appendMessage('customer', 'Hello', { touchNumber: 1, channel: 'email' })
        .appendHandoff('INFO_REQUEST', 0.5, 'Bob')
        .appendComplianceCheck({ timestamp: Date.now(), pass: true, failures: [] });

      const json = t.toJSON();
      const restored = LeadTranscript.fromJSON(json);

      expect(restored.leadId).toBe(t.leadId);
      expect(restored.getMessages()).toHaveLength(1);
      expect(restored.getMessages()[0]!.content).toBe('Hello');
      expect(restored.getHandoffs()).toHaveLength(1);
      expect(restored.getComplianceChecks()).toHaveLength(1);
    });
  });
});

// ── Persistence ────────────────────────────────────

describe('InMemoryTranscriptStore', () => {
  let store: InMemoryTranscriptStore;

  beforeEach(() => {
    store = new InMemoryTranscriptStore();
  });

  it('save and load round-trip', async () => {
    const transcript = new LeadTranscript('lead_500')
      .appendMessage('customer', 'Hello!', { touchNumber: 1 })
      .appendMessage('ai', 'Welcome!', { touchNumber: 1 });

    await store.save(transcript);
    const loaded = await store.load('lead_500');

    expect(loaded).toBeDefined();
    expect(loaded!.leadId).toBe('lead_500');
    expect(loaded!.getMessages()).toHaveLength(2);
    expect(loaded!.getMessages()[0]!.content).toBe('Hello!');
    expect(loaded!.getMessages()[1]!.content).toBe('Welcome!');
  });

  it('exists returns false for unknown lead', async () => {
    expect(await store.exists('unknown')).toBe(false);
  });

  it('exists returns true after save', async () => {
    await store.save(new LeadTranscript('lead_600'));
    expect(await store.exists('lead_600')).toBe(true);
  });

  it('load returns undefined for unknown lead', async () => {
    expect(await store.load('unknown')).toBeUndefined();
  });

  it('overwriting save replaces previous data', async () => {
    const t1 = new LeadTranscript('lead_700').appendMessage('customer', 'V1');
    const t2 = new LeadTranscript('lead_700')
      .appendMessage('customer', 'V2A')
      .appendMessage('ai', 'V2B');

    await store.save(t1);
    await store.save(t2);

    const loaded = await store.load('lead_700');
    expect(loaded!.getMessages()).toHaveLength(2);
    expect(loaded!.getMessages()[0]!.content).toBe('V2A');
  });
});
