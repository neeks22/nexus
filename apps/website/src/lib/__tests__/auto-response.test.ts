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
  sendTwilioSMS: (...args: unknown[]) => mockSendTwilioSMS(...args),
  slackNotify: (...args: unknown[]) => mockSlackNotify(...args),
  callClaude: (...args: unknown[]) => mockCallClaude(...args),
  isDeduplicate: (...args: unknown[]) => mockIsDeduplicate(...args),
  GMAIL_USER: 'test@gmail.com',
  GMAIL_PASS: 'test-pass',
}));

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

  it('processes a new lead end-to-end (insert, SMS, email, slack)', async () => {
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

    // Should send SMS via Twilio
    expect(mockSendTwilioSMS).toHaveBeenCalledWith(
      '+16135551234',
      '+13433125045', // readycar from phone
      expect.any(String),
    );

    // Should send welcome email via nodemailer
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'john@example.com',
    }));

    // Should log SMS transcript to Supabase
    expect(mockSupaPost).toHaveBeenCalledWith('lead_transcripts', expect.objectContaining({
      channel: 'sms',
      role: 'ai',
    }));

    // Should log email transcript to Supabase
    expect(mockSupaPost).toHaveBeenCalledWith('lead_transcripts', expect.objectContaining({
      channel: 'email',
      role: 'ai',
    }));

    // Should send Slack notification
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

    // Should still send SMS with fallback template
    expect(mockSendTwilioSMS).toHaveBeenCalledWith(
      '+16135551234',
      '+13433125045',
      expect.stringContaining('John'),
    );

    // Fallback should mention the tenant GM name
    const smsBody = mockSendTwilioSMS.mock.calls[0][2] as string;
    expect(smsBody).toContain('Nico');
    expect(smsBody).toContain('ReadyCar');
  });

  it('sends Slack failure alert when Twilio SMS fails', async () => {
    mockSendTwilioSMS.mockResolvedValue(false);

    const lead = makeLead();
    await handleAutoResponse(lead, 'readycar');

    // Should notify Slack about SMS failure
    expect(mockSlackNotify).toHaveBeenCalledWith(
      expect.stringContaining('SMS FAILED'),
    );
  });

  it('aborts SMS + email when insertLead fails (prevents orphaned messages that bypass dedup)', async () => {
    mockSupaInsert.mockRejectedValue(new Error('Supabase insert failed'));

    const lead = makeLead();
    await handleAutoResponse(lead, 'readycar');

    // Should NOT send SMS or email — aborting prevents future dedup bypass
    expect(mockCallClaude).not.toHaveBeenCalled();
    expect(mockSendTwilioSMS).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();

    // Should notify Slack about the blocked send
    expect(mockSlackNotify).toHaveBeenCalledWith(
      expect.stringContaining('Supabase insert failed'),
    );
  });

  it('defaults to readycar tenant when invalid tenant provided', async () => {
    const lead = makeLead();
    await handleAutoResponse(lead, 'invalid-tenant');

    // Should use readycar's fromPhone
    expect(mockSendTwilioSMS).toHaveBeenCalledWith(
      expect.any(String),
      '+13433125045', // readycar fromPhone
      expect.any(String),
    );
  });

  it('uses readyride tenant config when specified', async () => {
    const lead = makeLead();
    await handleAutoResponse(lead, 'readyride');

    // Should use readyride's fromPhone
    expect(mockSendTwilioSMS).toHaveBeenCalledWith(
      expect.any(String),
      '+13433412797', // readyride fromPhone
      expect.any(String),
    );
  });
});
