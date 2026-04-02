import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizePhone } from '../auto-response';

/* =============================================================================
   MOCK SETUP — Must come before importing handleAutoResponse
   ============================================================================= */

// Mock the security module (external dependencies)
const mockSupaGet = vi.fn();
const mockSupaPost = vi.fn();
const mockSendTwilioSMS = vi.fn();
const mockSlackNotify = vi.fn();
const mockCallClaude = vi.fn();

vi.mock('../security', () => ({
  supaGet: (...args: unknown[]) => mockSupaGet(...args),
  supaPost: (...args: unknown[]) => mockSupaPost(...args),
  sendTwilioSMS: (...args: unknown[]) => mockSendTwilioSMS(...args),
  slackNotify: (...args: unknown[]) => mockSlackNotify(...args),
  callClaude: (...args: unknown[]) => mockCallClaude(...args),
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
    mockSupaGet.mockResolvedValue({ data: [], error: false }); // not duplicate
    mockSupaPost.mockResolvedValue(undefined);
    mockCallClaude.mockResolvedValue('Hey John, it is Nico from ReadyCar. What vehicle are you looking for?');
    mockSendTwilioSMS.mockResolvedValue(true);
    mockSlackNotify.mockResolvedValue(undefined);
  });

  it('processes a new lead end-to-end (insert, SMS, email, slack)', async () => {
    const lead = makeLead();
    await handleAutoResponse(lead, 'readycar');

    // Should check for duplicates
    expect(mockSupaGet).toHaveBeenCalledTimes(1);

    // Should insert lead into funnel_submissions
    expect(mockSupaPost).toHaveBeenCalledWith('funnel_submissions', expect.objectContaining({
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
    // supaGet returns existing record = duplicate
    mockSupaGet.mockResolvedValue({ data: [{ id: 'existing-id' }], error: false });

    const lead = makeLead();
    await handleAutoResponse(lead, 'readycar');

    // Should check for duplicates
    expect(mockSupaGet).toHaveBeenCalledTimes(1);

    // Should NOT insert, send SMS, email, or notify
    expect(mockSupaPost).not.toHaveBeenCalled();
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
      expect.stringContaining('Hey John'),
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

  it('still sends SMS + email even when insertLead fails', async () => {
    // First supaPost call (insertLead) throws, subsequent calls succeed
    let callCount = 0;
    mockSupaPost.mockImplementation(async (table: string) => {
      callCount++;
      if (callCount === 1 && table === 'funnel_submissions') {
        throw new Error('Supabase insert failed');
      }
    });

    const lead = makeLead();
    await handleAutoResponse(lead, 'readycar');

    // Should still call Claude for SMS
    expect(mockCallClaude).toHaveBeenCalledTimes(1);

    // Should still send SMS
    expect(mockSendTwilioSMS).toHaveBeenCalledTimes(1);

    // Should still send email
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    // Should notify Slack about the insert failure
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
