import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeInput,
  validateTenant,
  getClientIp,
  rateLimit,
  encodeSupabaseParam,
} from '../security';
import { NextRequest } from 'next/server';

/* =============================================================================
   sanitizeInput
   ============================================================================= */

describe('sanitizeInput', () => {
  it('passes through a normal string unchanged', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World');
  });

  it('strips null bytes', () => {
    expect(sanitizeInput('Hello\x00World')).toBe('HelloWorld');
  });

  it('strips control characters', () => {
    // \x01 (SOH), \x07 (BEL), \x0E (SO), \x1F (US), \x7F (DEL)
    const input = 'Hello\x01\x07\x0E\x1F\x7FWorld';
    const result = sanitizeInput(input);
    expect(result).toBe('HelloWorld');
  });

  it('preserves newlines, tabs, and carriage returns', () => {
    // \x09 (tab), \x0A (LF), \x0D (CR) should NOT be stripped
    const input = 'Hello\tWorld\nNew Line\r';
    const result = sanitizeInput(input);
    expect(result).toBe('Hello\tWorld\nNew Line\r');
  });

  it('truncates string at maxLength', () => {
    const longString = 'a'.repeat(1000);
    const result = sanitizeInput(longString, 100);
    expect(result.length).toBe(100);
  });

  it('uses default maxLength of 500', () => {
    const longString = 'a'.repeat(1000);
    const result = sanitizeInput(longString);
    expect(result.length).toBe(500);
  });

  it('handles empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });
});

/* =============================================================================
   validateTenant
   ============================================================================= */

describe('validateTenant', () => {
  it('accepts readycar', () => {
    expect(validateTenant('readycar')).toBe('readycar');
  });

  it('accepts readyride', () => {
    expect(validateTenant('readyride')).toBe('readyride');
  });

  it('defaults to readycar for invalid tenant', () => {
    expect(validateTenant('invalid')).toBe('readycar');
  });

  it('defaults to readycar for null', () => {
    expect(validateTenant(null)).toBe('readycar');
  });

  it('defaults to readycar for empty string', () => {
    expect(validateTenant('')).toBe('readycar');
  });

  it('defaults to readycar for unknown tenant', () => {
    expect(validateTenant('some-other-dealer')).toBe('readycar');
  });
});

/* =============================================================================
   getClientIp
   ============================================================================= */

describe('getClientIp', () => {
  it('returns first IP from x-forwarded-for header', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1' },
    });
    expect(getClientIp(req)).toBe('192.168.1.1');
  });

  it('returns x-real-ip when x-forwarded-for is absent', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-real-ip': '10.0.0.55' },
    });
    expect(getClientIp(req)).toBe('10.0.0.55');
  });

  it('returns 0.0.0.0 when no IP headers present', () => {
    const req = new NextRequest('http://localhost/api/test');
    expect(getClientIp(req)).toBe('0.0.0.0');
  });

  it('trims whitespace from x-forwarded-for', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '  192.168.1.1  , 10.0.0.1' },
    });
    expect(getClientIp(req)).toBe('192.168.1.1');
  });

  it('prefers x-forwarded-for over x-real-ip', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: {
        'x-forwarded-for': '1.2.3.4',
        'x-real-ip': '5.6.7.8',
      },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });
});

/* =============================================================================
   rateLimit (in-memory fallback — no Upstash in test env)
   ============================================================================= */

describe('rateLimit', () => {
  beforeEach(() => {
    // Clear the internal rate limit store between tests
    // Since we can't access the private Map, we use unique IPs per test
  });

  it('first call is not rate limited', async () => {
    const limited = await rateLimit('test-ip-first-call', 30, 60000);
    expect(limited).toBe(false);
  });

  it('calls within limit are not rate limited', async () => {
    const ip = 'test-ip-within-limit';
    for (let i = 0; i < 5; i++) {
      const limited = await rateLimit(ip, 30, 60000);
      expect(limited).toBe(false);
    }
  });

  it('exceeding limit triggers rate limiting', async () => {
    const ip = 'test-ip-exceed-limit';
    const maxRequests = 3;

    // First 3 calls should pass
    for (let i = 0; i < maxRequests; i++) {
      await rateLimit(ip, maxRequests, 60000);
    }

    // 4th call should be rate limited
    const limited = await rateLimit(ip, maxRequests, 60000);
    expect(limited).toBe(true);
  });
});

/* =============================================================================
   encodeSupabaseParam
   ============================================================================= */

describe('encodeSupabaseParam', () => {
  it('encodes a normal string', () => {
    const result = encodeSupabaseParam('hello world');
    expect(result).toBe('hello%20world');
  });

  it('preserves + in phone numbers', () => {
    const result = encodeSupabaseParam('+16135551234');
    expect(result).toBe('+16135551234');
  });

  it('encodes special characters', () => {
    const result = encodeSupabaseParam('test@email.com');
    expect(result).toContain('test');
    expect(result).toContain('%40'); // @ sign
  });

  it('encodes parentheses', () => {
    const result = encodeSupabaseParam('(613)');
    // Parentheses should be encoded
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
  });

  it('encodes commas', () => {
    const result = encodeSupabaseParam('a,b');
    expect(result).not.toContain(',');
  });
});
