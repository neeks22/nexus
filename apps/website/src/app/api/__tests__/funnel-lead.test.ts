import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/* =============================================================================
   MOCK SETUP
   ============================================================================= */

const mockHandleAutoResponse = vi.fn();
const mockRateLimit = vi.fn();
const mockGetClientIp = vi.fn();

vi.mock('../../../lib/auto-response', () => ({
  handleAutoResponse: (...args: unknown[]) => mockHandleAutoResponse(...args),
}));

vi.mock('../../../lib/security', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}));

// Import route handler after mocks
import { POST } from '../funnel-lead/route';

/* =============================================================================
   HELPERS
   ============================================================================= */

function createMockRequest(body: unknown, headers?: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/funnel-lead', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://nexusagents.ca',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    vehicleType: 'SUV',
    employmentStatus: 'Full-time',
    monthlyIncome: '5000',
    creditSituation: 'Good',
    firstName: 'John',
    lastName: 'Doe',
    phone: '(613) 555-1234',
    email: 'john@example.com',
    caslConsent: true,
    tenant: 'readycar',
    ...overrides,
  };
}

/* =============================================================================
   TESTS
   ============================================================================= */

describe('POST /api/funnel-lead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue(false); // not rate limited
    mockGetClientIp.mockReturnValue('127.0.0.1');
    mockHandleAutoResponse.mockResolvedValue(undefined);
  });

  it('returns 200 with success:true for valid payload', async () => {
    const req = createMockRequest(validPayload());
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('calls handleAutoResponse with parsed lead data', async () => {
    const req = createMockRequest(validPayload());
    await POST(req);

    expect(mockHandleAutoResponse).toHaveBeenCalledTimes(1);
    expect(mockHandleAutoResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
        phone: '(613) 555-1234',
        email: 'john@example.com',
        vehicleType: 'SUV',
      }),
      'readycar',
    );
  });

  it('returns 400 when required field (firstName) is missing', async () => {
    const payload = validPayload();
    delete payload.firstName;

    const req = createMockRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when required field (email) is missing', async () => {
    const payload = validPayload();
    delete payload.email;

    const req = createMockRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const req = createMockRequest(validPayload({ email: 'not-an-email' }));
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('returns 400 for invalid phone format', async () => {
    const req = createMockRequest(validPayload({ phone: 'abc-not-phone' }));
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when caslConsent is false', async () => {
    const req = createMockRequest(validPayload({ caslConsent: false }));
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('CASL consent is required');
  });

  it('returns 400 for SQL injection in firstName', async () => {
    const req = createMockRequest(validPayload({ firstName: "Robert'; DROP TABLE users;--" }));
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid characters detected');
  });

  it('returns 400 for XSS in vehicleType', async () => {
    const req = createMockRequest(validPayload({ vehicleType: '<script>alert("xss")</script>' }));
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid characters detected');
  });

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue(true); // rate limited

    const req = createMockRequest(validPayload());
    const res = await POST(req);

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain('Too many submissions');
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/funnel-lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://nexusagents.ca',
      },
      body: 'not valid json{{{',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid JSON body');
  });

  it('includes security headers in response', async () => {
    const req = createMockRequest(validPayload());
    const res = await POST(req);

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });

  it('sets CORS headers for allowed origin', async () => {
    const req = createMockRequest(validPayload());
    const res = await POST(req);

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://nexusagents.ca');
  });

  it('accepts readyride as valid tenant', async () => {
    const req = createMockRequest(validPayload({ tenant: 'readyride' }));
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockHandleAutoResponse).toHaveBeenCalledWith(
      expect.any(Object),
      'readyride',
    );
  });

  it('returns 200 even when handleAutoResponse throws (fire-and-forget)', async () => {
    mockHandleAutoResponse.mockRejectedValue(new Error('Auto-response crashed'));

    const req = createMockRequest(validPayload());
    const res = await POST(req);

    // Should still return success because Promise.allSettled catches the error
    expect(res.status).toBe(200);
  });
});
