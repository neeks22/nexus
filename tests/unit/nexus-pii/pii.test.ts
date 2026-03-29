import { describe, it, expect, beforeEach } from 'vitest';
import {
  PiiRedactor,
  createPiiRedactPaths,
  createPiiSerializer,
} from '../../../packages/nexus-pii/src/index.js';
import type {
  RedactionResult,
  ScanResult,
  PinoRedactConfig,
} from '../../../packages/nexus-pii/src/index.js';

describe('PiiRedactor', () => {
  let redactor: PiiRedactor;

  beforeEach(() => {
    redactor = new PiiRedactor();
  });

  // --- Phone number redaction ---

  describe('phone numbers', () => {
    it('should redact xxx-xxx-xxxx format', () => {
      const result: RedactionResult = redactor.redact('Call me at 416-555-1234 please');
      expect(result.redacted).toBe('Call me at [REDACTED_PHONE] please');
      expect(result.patternsMatched).toContain('PHONE');
    });

    it('should redact (xxx) xxx-xxxx format', () => {
      const result: RedactionResult = redactor.redact('My number is (514) 555-9876');
      expect(result.redacted).toBe('My number is [REDACTED_PHONE]');
      expect(result.patternsMatched).toContain('PHONE');
    });

    it('should redact (xxx) xxx xxxx format with space', () => {
      const result: RedactionResult = redactor.redact('Reach me at (613) 555 4321');
      expect(result.redacted).toBe('Reach me at [REDACTED_PHONE]');
    });

    it('should redact +1xxxxxxxxxx format', () => {
      const result: RedactionResult = redactor.redact('Text +14165551234 anytime');
      expect(result.redacted).toBe('Text [REDACTED_PHONE] anytime');
      expect(result.patternsMatched).toContain('PHONE');
    });

    it('should redact 1xxxxxxxxxx format (no plus)', () => {
      const result: RedactionResult = redactor.redact('Call 14165551234 now');
      expect(result.redacted).toBe('Call [REDACTED_PHONE] now');
    });

    it('should redact xxx.xxx.xxxx format', () => {
      const result: RedactionResult = redactor.redact('Phone: 905.555.7890');
      expect(result.redacted).toBe('Phone: [REDACTED_PHONE]');
    });

    it('should redact multiple phone numbers in one string', () => {
      const result: RedactionResult = redactor.redact(
        'Home: 416-555-1234, Cell: (514) 555-9876'
      );
      expect(result.redacted).not.toContain('416-555-1234');
      expect(result.redacted).not.toContain('(514) 555-9876');
      expect(result.redacted).toContain('[REDACTED_PHONE]');
    });
  });

  // --- Email redaction ---

  describe('emails', () => {
    it('should redact standard email addresses', () => {
      const result: RedactionResult = redactor.redact('Email: john.doe@example.com');
      expect(result.redacted).toBe('Email: [REDACTED_EMAIL]');
      expect(result.patternsMatched).toContain('EMAIL');
    });

    it('should redact email with plus addressing', () => {
      const result: RedactionResult = redactor.redact('Send to user+tag@gmail.com');
      expect(result.redacted).toBe('Send to [REDACTED_EMAIL]');
    });

    it('should redact email with subdomain', () => {
      const result: RedactionResult = redactor.redact('Contact admin@mail.company.co.uk');
      expect(result.redacted).toBe('Contact [REDACTED_EMAIL]');
    });
  });

  // --- Canadian postal codes ---

  describe('Canadian postal codes', () => {
    it('should redact A1A 1A1 format (with space)', () => {
      const result: RedactionResult = redactor.redact('Postal code: H2X 3Y7');
      expect(result.redacted).toBe('Postal code: [REDACTED_POSTAL_CODE]');
      expect(result.patternsMatched).toContain('POSTAL_CODE');
    });

    it('should redact A1A1A1 format (no space)', () => {
      const result: RedactionResult = redactor.redact('Code: K1A0B1');
      expect(result.redacted).toBe('Code: [REDACTED_POSTAL_CODE]');
    });

    it('should redact lowercase postal codes', () => {
      const result: RedactionResult = redactor.redact('Located at m5v 2t6');
      expect(result.redacted).toBe('Located at [REDACTED_POSTAL_CODE]');
    });
  });

  // --- US zip codes ---

  describe('US zip codes', () => {
    it('should redact 5-digit zip code', () => {
      const result: RedactionResult = redactor.redact('Zip: 90210');
      expect(result.redacted).toBe('Zip: [REDACTED_ZIP_CODE]');
      expect(result.patternsMatched).toContain('ZIP_CODE');
    });

    it('should redact 5+4 zip code', () => {
      const result: RedactionResult = redactor.redact('Full zip: 90210-1234');
      expect(result.redacted).toBe('Full zip: [REDACTED_ZIP_CODE]');
    });
  });

  // --- Credit card numbers ---

  describe('credit cards', () => {
    it('should redact 16 consecutive digits', () => {
      const result: RedactionResult = redactor.redact('Card: 4111111111111111');
      expect(result.redacted).toBe('Card: [REDACTED_CREDIT_CARD]');
      expect(result.patternsMatched).toContain('CREDIT_CARD');
    });

    it('should redact card with spaces (groups of 4)', () => {
      const result: RedactionResult = redactor.redact('Card: 4111 1111 1111 1111');
      expect(result.redacted).toBe('Card: [REDACTED_CREDIT_CARD]');
    });

    it('should redact card with dashes (groups of 4)', () => {
      const result: RedactionResult = redactor.redact('Card: 4111-1111-1111-1111');
      expect(result.redacted).toBe('Card: [REDACTED_CREDIT_CARD]');
    });
  });

  // --- SIN/SSN ---

  describe('SIN/SSN', () => {
    it('should redact SSN format xxx-xx-xxxx', () => {
      const result: RedactionResult = redactor.redact('SSN: 123-45-6789');
      expect(result.redacted).toBe('SSN: [REDACTED_SIN_SSN]');
      expect(result.patternsMatched).toContain('SIN_SSN');
    });

    it('should redact SIN format xxx xxx xxx', () => {
      const result: RedactionResult = redactor.redact('SIN: 123 456 789');
      expect(result.redacted).toBe('SIN: [REDACTED_SIN_SSN]');
    });

    it('should redact 9 consecutive digits', () => {
      const result: RedactionResult = redactor.redact('Number: 123456789');
      expect(result.redacted).toBe('Number: [REDACTED_SIN_SSN]');
    });
  });

  // --- Multiple PII types in one string ---

  describe('multiple PII types', () => {
    it('should redact phone, email, and postal code in one string', () => {
      const input = 'Contact John at john@example.com or 416-555-1234, postal H2X 3Y7';
      const result: RedactionResult = redactor.redact(input);
      expect(result.redacted).toContain('[REDACTED_EMAIL]');
      expect(result.redacted).toContain('[REDACTED_PHONE]');
      expect(result.redacted).toContain('[REDACTED_POSTAL_CODE]');
      expect(result.patternsMatched).toContain('EMAIL');
      expect(result.patternsMatched).toContain('PHONE');
      expect(result.patternsMatched).toContain('POSTAL_CODE');
    });

    it('should return original in result', () => {
      const input = 'Call 416-555-1234';
      const result: RedactionResult = redactor.redact(input);
      expect(result.original).toBe(input);
    });
  });

  // --- No PII ---

  describe('no PII', () => {
    it('should return text unchanged when no PII found', () => {
      const input = 'This is a completely normal message about cars.';
      const result: RedactionResult = redactor.redact(input);
      expect(result.redacted).toBe(input);
      expect(result.patternsMatched).toHaveLength(0);
    });

    it('should handle empty string', () => {
      const result: RedactionResult = redactor.redact('');
      expect(result.redacted).toBe('');
      expect(result.patternsMatched).toHaveLength(0);
    });
  });

  // --- redactObject (nested objects) ---

  describe('redactObject', () => {
    it('should redact strings in a flat object', () => {
      const obj = {
        name: 'John',
        phone: '416-555-1234',
        message: 'Hello world',
      };
      const result = redactor.redactObject(obj);
      expect(result.phone).toBe('[REDACTED_PHONE]');
      expect(result.message).toBe('Hello world');
    });

    it('should redact strings in nested objects', () => {
      const obj = {
        lead: {
          contact: {
            email: 'test@example.com',
            phone: '(514) 555-9876',
          },
          notes: 'No PII here',
        },
      };
      const result = redactor.redactObject(obj);
      expect(result.lead.contact.email).toBe('[REDACTED_EMAIL]');
      expect(result.lead.contact.phone).toBe('[REDACTED_PHONE]');
      expect(result.lead.notes).toBe('No PII here');
    });

    it('should redact strings in arrays', () => {
      const obj = {
        phones: ['416-555-1234', '(514) 555-9876'],
      };
      const result = redactor.redactObject(obj);
      expect(result.phones[0]).toBe('[REDACTED_PHONE]');
      expect(result.phones[1]).toBe('[REDACTED_PHONE]');
    });

    it('should handle null and undefined gracefully', () => {
      expect(redactor.redactObject(null)).toBe(null);
      expect(redactor.redactObject(undefined)).toBe(undefined);
    });

    it('should handle numbers and booleans without modification', () => {
      const obj = { count: 42, active: true, phone: '416-555-1234' };
      const result = redactor.redactObject(obj);
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.phone).toBe('[REDACTED_PHONE]');
    });

    it('should handle deeply nested mixed structures', () => {
      const obj = {
        level1: {
          level2: [
            { email: 'a@b.com', value: 10 },
            { email: 'c@d.com', value: 20 },
          ],
        },
      };
      const result = redactor.redactObject(obj);
      expect(result.level1.level2[0].email).toBe('[REDACTED_EMAIL]');
      expect(result.level1.level2[1].email).toBe('[REDACTED_EMAIL]');
      expect(result.level1.level2[0].value).toBe(10);
    });
  });

  // --- containsPii ---

  describe('containsPii', () => {
    it('should return true when phone number present', () => {
      expect(redactor.containsPii('Call 416-555-1234')).toBe(true);
    });

    it('should return true when email present', () => {
      expect(redactor.containsPii('Email me at john@example.com')).toBe(true);
    });

    it('should return true when credit card present', () => {
      expect(redactor.containsPii('Card 4111111111111111')).toBe(true);
    });

    it('should return false when no PII present', () => {
      expect(redactor.containsPii('Just a normal message')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(redactor.containsPii('')).toBe(false);
    });
  });

  // --- scan ---

  describe('scan', () => {
    it('should return all PII types found', () => {
      const result: ScanResult = redactor.scan(
        'Email john@example.com, phone 416-555-1234, postal H2X 3Y7'
      );
      expect(result.containsPii).toBe(true);
      expect(result.typesFound).toContain('EMAIL');
      expect(result.typesFound).toContain('PHONE');
      expect(result.typesFound).toContain('POSTAL_CODE');
    });

    it('should return empty types when no PII found', () => {
      const result: ScanResult = redactor.scan('No personal info here');
      expect(result.containsPii).toBe(false);
      expect(result.typesFound).toHaveLength(0);
    });

    it('should detect credit card', () => {
      const result: ScanResult = redactor.scan('Pay with 4111 1111 1111 1111');
      expect(result.containsPii).toBe(true);
      expect(result.typesFound).toContain('CREDIT_CARD');
    });

    it('should detect SIN/SSN', () => {
      const result: ScanResult = redactor.scan('SSN is 123-45-6789');
      expect(result.containsPii).toBe(true);
      expect(result.typesFound).toContain('SIN_SSN');
    });

    it('should not duplicate type names', () => {
      const result: ScanResult = redactor.scan(
        'Phone 416-555-1234 and also (514) 555-9876'
      );
      const phoneCount = result.typesFound.filter((t) => t === 'PHONE').length;
      expect(phoneCount).toBe(1);
    });
  });

  // --- Known names ---

  describe('known names redaction', () => {
    it('should redact known customer names', () => {
      const namedRedactor = new PiiRedactor({ names: ['John Smith', 'Jane Doe'] });
      const result: RedactionResult = namedRedactor.redact(
        'Customer John Smith called about a CR-V'
      );
      expect(result.redacted).toBe('Customer [REDACTED_NAME] called about a CR-V');
      expect(result.patternsMatched).toContain('NAME');
    });

    it('should be case insensitive for known names', () => {
      const namedRedactor = new PiiRedactor({ names: ['John Smith'] });
      const result: RedactionResult = namedRedactor.redact('JOHN SMITH wants a test drive');
      expect(result.redacted).toBe('[REDACTED_NAME] wants a test drive');
    });

    it('should ignore empty name strings', () => {
      const namedRedactor = new PiiRedactor({ names: ['', '  ', 'Alice'] });
      const result: RedactionResult = namedRedactor.redact('Alice is here');
      expect(result.redacted).toBe('[REDACTED_NAME] is here');
    });
  });
});

// --- Pino integration ---

describe('Pino Redaction Integration', () => {
  describe('createPiiRedactPaths', () => {
    it('should return default redact paths', () => {
      const config: PinoRedactConfig = createPiiRedactPaths();
      expect(config.paths).toContain('phone');
      expect(config.paths).toContain('email');
      expect(config.paths).toContain('msg');
      expect(config.paths).toContain('lead.phone');
      expect(config.paths).toContain('req.headers.authorization');
      expect(config.censor).toBe('[REDACTED]');
    });

    it('should include additional paths when provided', () => {
      const config: PinoRedactConfig = createPiiRedactPaths(['custom.field', 'another.path']);
      expect(config.paths).toContain('custom.field');
      expect(config.paths).toContain('another.path');
      // Should still include defaults
      expect(config.paths).toContain('phone');
    });
  });

  describe('createPiiSerializer', () => {
    it('should redact PII from string values', () => {
      const serializer = createPiiSerializer();
      const result = serializer('Call me at 416-555-1234');
      expect(result).toBe('Call me at [REDACTED_PHONE]');
    });

    it('should redact PII from objects', () => {
      const serializer = createPiiSerializer();
      const result = serializer({ email: 'test@example.com', safe: 'hello' }) as Record<string, unknown>;
      expect(result.email).toBe('[REDACTED_EMAIL]');
      expect(result.safe).toBe('hello');
    });

    it('should pass through numbers and booleans unchanged', () => {
      const serializer = createPiiSerializer();
      expect(serializer(42)).toBe(42);
      expect(serializer(true)).toBe(true);
    });

    it('should pass through null and undefined', () => {
      const serializer = createPiiSerializer();
      expect(serializer(null)).toBe(null);
      expect(serializer(undefined)).toBe(undefined);
    });

    it('should support known names via config', () => {
      const serializer = createPiiSerializer({ names: ['Alice Jones'] });
      const result = serializer('Lead Alice Jones wants info');
      expect(result).toBe('Lead [REDACTED_NAME] wants info');
    });
  });
});
