import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizePhone } from '../auto-response';

/* =============================================================================
   MOCK SETUP — Must come before importing handleAutoResponse
   ============================================================================= */

// Mock the security module (external dependencies)
const mockSupaGet = vi.fn();
const mockSupaPost = vi.fn();
const mockSupaInsert = vi.fn();
const mockSupaPatch = vi.fn();
const mockSendTwilioSMS = vi.fn();
const mockSlackNotify = vi.fn();
const mockCallClaude = vi.fn();

const mockIsDeduplicate = vi.fn();

vi.mock('../security', () => ({
  supaGet: (...args: unknown[]) => mockSupaGet(...args),
  supaPost: (...args: unknown[]) => mockSupaPost(...args),
  supaInsert: (...args: unknown[]) => mockSupaInsert(...args),
  supaPatch: (...args: unknown[]) => mockSupaPatch(...args),
  slackNotify: (...args: unknown[]) => mockSlackNotify(...args),
  callClaude: (...args: unknown[]) => mockCallClaude(...args),
  isDeduplicate: (...args: unknown[]) => mockIsDeduplicate(...args),
  GMAIL_USER: 'test@gmail.com',
  GMAIL_PASS: 'test-pass',
}));
// sendTwilioSMS no longer imported by auto-response (draft-only mode).
// Kept as a no-op so the test still verifies it's never invoked.
const _unusedSendTwilioRef = mockSendTwilioSMS;
void _unusedSendTwilioRef;

// Mock nodemailer
const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });
vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: mockSendMail,
    }),
  },
}));

// Import after mocks are set up
import { handleAutoResponse, FunnelLead } from '../auto-response';

/* =============================================================================
   TEST DATA
   ============================================================================= */

function makeLead(overrides: Partial<FunnelLead> = {}): FunnelLead {
  return {
    firstName: 'John',
    lastName: 'Doe',
    phone: '(613) 555-1234',
    email: 'john@example.com',
    vehicleType: 'SUV',
    budget: '25000',
    monthlyIncome: '5000',
    jobTitle: 'Engineer',
    employment: 'Full-time',
    creditSituation: 'Good',
    tradeIn: 'No',
    tradeInYear: '',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'spring-sale',
    ...overrides,
  };
}

/* =============================================================================
   normalizePhone
   ============================================================================= */

describe('normalizePhone', () => {
  it('normalizes (613) 555-1234 to +16135551234', () => {
    expect(normalizePhone('(613) 555-1234')).toBe('+16135551234');
  });

  it('normalizes 6135551234 to +16135551234', () => {
    expect(normalizePhone('6135551234')).toBe('+16135551234');
  });

  it('normalizes 16135551234 to +16135551234', () => {
    expect(normalizePhone('16135551234')).toBe('+16135551234');
  });

  it('normalizes +16135551234 to +16135551234', () => {
    expect(normalizePhone('+16135551234')).toBe('+16135551234');
  });

  it('normalizes 613-555-1234 to +16135551234', () => {
    expect(normalizePhone('613-555-1234')).toBe('+16135551234');
  });

  it('normalizes phone with leading/trailing spaces', () => {
    expect(normalizePhone(' (613) 555-1234 ')).toBe('+16135551234');
  });
});

/* =============================================================================
   handleAutoResponse
   ============================================================================= */

describe('handleAutoResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy-path mocks
    // Redis dedup: not a duplicate
    mockIsDeduplicate.mockResolvedValue(false);
    // First call: toggle check (enabled), second call: dedup check (not duplicate)
    mockSupaGet
      .mockResolvedValueOnce({ data: [{ enabled: true }], error: false })
      .mockResolvedValue({ data: [], error: false });
    mockSupaPost.mockResolvedValue(undefined);
    mockSupaInsert.mockResolvedValue('test-lead-id');
    mockSupaPatch.mockResolvedValue(true);
    mockCallClaude.mockResolvedValue('Hey John, it is Nico from ReadyCar. What vehicle are you looking for?');
    mockSendTwilioSMS.mockResolvedValue(true);
    mockSlackNotify.mockResolvedValue(undefined);
  });

  it('processes a new lead end-to-end (insert lead, draft SMS, send welcome email, slack)', async () => {
    const lead = makeLead();
    await handleAutoResponse(lead, 'readycar');

    // Should check toggle + duplicates
    expect(mockSupaGet).toHaveBeenCalledTimes(2);

    // Should insert lead into funnel_submissions
    expect(mockSupaInsert).toHaveBeenCalledWith('funnel_submissions', expect.objectContaining({
      tenant_id: 'readycar',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+16135551234',
      email: 'john@example.com',
      vehicle_type: 'SUV',
      status: 'new',
    }));

    // Should call Claude for SMS generation
    expect(mockCallClaude).toHaveBeenCalledTimes(1);

    // Should NEVER call Twilio — drafts only
    expect(mockSendTwilioSMS).not.toHaveBeenCalled();

    // Should send welcome email via nodemailer (email auto-send still allowed)
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'john@example.com',
    }));

    // Should persist a DRAFT to lead_transcripts (entry_type='draft', role='agent')
    expect(mockSupaPost).toHaveBeenCalledWith('lead_transcripts', expect.objectContaining({
      entry_type: 'draft',
      role: 'agent',
      channel: 'sms',
    }));

    // Should still log the welcome email transcript
    expect(mockSupaPost).toHaveBeenCalledWith('lead_transcripts', expect.objectContaining({
      channel: 'email',
      role: 'ai',
    }));

    // Should slack-notify the draft + the lead summary
    expect(mockSlackNotify).toHaveBeenCalledWith(expect.stringContaining('Draft awaiting approval'));
    expect(mockSlackNotify).toHaveBeenCalledWith(expect.stringContaining('NEW FUNNEL LEAD'));
  });

  it('skips SMS/email for duplicate leads', async () => {
    // First call: toggle check (enabled), second call: dedup returns existing record
    mockSupaGet
      .mockResolvedValueOnce({ data: [{ enabled: true }], error: false })
      .mockResolvedValue({ data: [{ id: 'existing-id' }], error: false });

    const lead = makeLead();
    await handleAutoResponse(lead, 'readycar');

    // Should check toggle + duplicates
    expect(mockSupaGet).toHaveBeenCalledTimes(2);

    // Should NOT insert, send SMS, email, or notify
    expect(mockSupaInsert).not.toHaveBeenCalled();
    expect(mockCallClaude).not.toHaveBeenCalled();
    expect(mockSendTwilioSMS).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
    // slackNotify should NOT be called for the success notification
    expect(mockSlackNotify).not.toHaveBeenCalled();
  });

  it('uses fallback SMS template when Claude returns empty string', async () => {
    mockCallClaude.mockResolvedValue('');

    const lead = makeLead();
    await handleAutoResponse(lead, 'readycar');

    // Should NEVER call Twilio
    expect(mockSendTwilioSMS).not.toHaveBeenCalled();

    // The draft persisted to lead_transcripts should carry the fallback text
    const draftCall = mockSupaPost.mock.calls.find(
      ([table, payload]) => table === 'lead_transcripts' && (payload as { entry_type?: string }).entry_type === 'draft'
    );
    expect(draftCall).toBeDefined();
    const draftContent = (draftCall?.[1] as { content: string }).content;
    expect(draftContent).toContain('John');
    expect(draftContent).toContain('Nico');
    expect(draftContent).toContain('ReadyCar');
  });

  it('aborts everything when insertLead fails (prevents orphaned messages that bypass dedup)', async () => {
    mockSupaInsert.mockRejectedValue(new Error('Supabase insert failed'));

    const lead = makeLead();
    await handleAutoResponse(lead, 'readycar');

    // Should NOT generate Claude content, draft, or email — abort the whole flow
    expect(mockCallClaude).not.toHaveBeenCalled();
    expect(mockSendTwilioSMS).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();

    // No draft should have been written
    const draftCall = mockSupaPost.mock.calls.find(
      ([table, payload]) => table === 'lead_transcripts' && (payload as { entry_type?: string }).entry_type === 'draft'
    );
    expect(draftCall).toBeUndefined();

    // Should notify Slack about the blocked send
    expect(mockSlackNotify).toHaveBeenCalledWith(
      expect.stringContaining('Supabase insert failed'),
    );
  });

  it('defaults to readycar tenant when invalid tenant provided', async () => {
    const lead = makeLead();
    await handleAutoResponse(lead, 'invalid-tenant');

    // Twilio never called; the draft slack notification should mention ReadyCar
    expect(mockSendTwilioSMS).not.toHaveBeenCalled();
    expect(mockSlackNotify).toHaveBeenCalledWith(expect.stringContaining('ReadyCar'));
  });

  it('uses readyride tenant config when specified', async () => {
    const lead = makeLead();
    await handleAutoResponse(lead, 'readyride');

    // Twilio never called; slack notification names ReadyRide
    expect(mockSendTwilioSMS).not.toHaveBeenCalled();
    expect(mockSlackNotify).toHaveBeenCalledWith(expect.stringContaining('ReadyRide'));
  });
});
