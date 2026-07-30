import { describe, it, expect } from 'vitest';
import {
  TEMPLATES,
  SEQUENCE,
  getTemplate,
  templateForStep,
  daysUntilNextStep,
  renderTemplate,
  APPROVAL_RATE,
  SENDER_PHONE,
} from '../campaign-templates';

describe('campaign templates', () => {
  it('defines the full 5-email sequence in send order', () => {
    expect(SEQUENCE).toEqual(['C', 'A', 'E', 'B', 'D']);
    expect(TEMPLATES.map((t) => t.day)).toEqual([0, 3, 7, 12, 18]);
  });

  it('returns the right template for each step and null past the end', () => {
    expect(templateForStep(0)?.id).toBe('C');
    expect(templateForStep(4)?.id).toBe('D');
    expect(templateForStep(5)).toBeNull();
    expect(templateForStep(99)).toBeNull();
  });

  it('computes the wait between steps from the sequence days', () => {
    expect(daysUntilNextStep(0)).toBe(0);
    expect(daysUntilNextStep(1)).toBe(3);
    expect(daysUntilNextStep(4)).toBe(6);
  });

  it('carries the callback number and approval rate into every template', () => {
    const bodies = TEMPLATES.map((t) => t.body).join('\n');
    expect(bodies).toContain(SENDER_PHONE);
    expect(bodies).toContain(APPROVAL_RATE);
    // The old cell number must never reappear in campaign copy
    expect(bodies).not.toContain('613-890-2113');
  });

  it('gives every template a CASL-required opt-out', () => {
    for (const t of TEMPLATES) {
      expect(t.body.toUpperCase()).toContain('STOP');
    }
  });
});

describe('renderTemplate', () => {
  const template = getTemplate('C')!;

  it('merges the first name in title case', () => {
    const { body } = renderTemplate(template, { first_name: 'sHERRY' });
    expect(body).toContain('Sherry,');
    expect(body).not.toContain('{{first}}');
  });

  it('falls back to "there" rather than leaking a raw placeholder', () => {
    for (const value of [null, undefined, '', '   ']) {
      const { body, subject } = renderTemplate(template, { first_name: value });
      expect(body).toContain('there,');
      expect(body).not.toContain('{{first}}');
      expect(subject).not.toContain('{{first}}');
    }
  });

  it('formats the application date, and degrades gracefully when it is missing or junk', () => {
    expect(renderTemplate(template, { lead_created_at: '2026-05-28T10:26:00Z' }).body).toContain('May 2026');
    expect(renderTemplate(template, { lead_created_at: null }).body).toContain('a while back');
    expect(renderTemplate(template, { lead_created_at: 'not-a-date' }).body).toContain('a while back');
  });

  it('leaves no unmerged placeholders in any template', () => {
    for (const t of TEMPLATES) {
      const { subject, body } = renderTemplate(t, { first_name: 'John', lead_created_at: '2026-01-15T00:00:00Z' });
      expect(subject).not.toMatch(/\{\{\w+\}\}/);
      expect(body).not.toMatch(/\{\{\w+\}\}/);
    }
  });
});
