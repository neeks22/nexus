import { describe, it, expect, beforeAll } from 'vitest';

// scripts/ is plain .mjs — load it dynamically so the typecheck does not need
// declarations for it. main() is guarded, so importing runs no I/O.
let classify: (sender: string, text: string) => string;

beforeAll(async () => {
  const mod = await import('../../scripts/sync-replies.mjs');
  classify = mod.classify;
});

/**
 * Every real reply quotes our original email, and our templates sign off with
 * "Just reply STOP". Classifying against the raw body therefore marked every
 * quoting reply as an opt-out — including interested ones. These tests pin the
 * fix: only what the person actually typed can opt them out.
 */
const QUOTED = [
  '',
  'On Thu, Jul 30, 2026, 5:10 p.m. Nicolas Sayah <nicolas@readycar.ca> wrote:',
  '> Are you still looking for a vehicle?',
  '> Nicolas',
  '> ReadyCar',
  "> Don't want these? Just reply STOP.",
].join('\n');

describe('classify', () => {
  it('keeps an interested reply in play despite the quoted STOP line', () => {
    expect(classify('a@gmail.com', `yes! call me tomorrow${QUOTED}`)).toBe('replied');
  });

  it('treats a soft no as a reply, not an opt-out', () => {
    expect(classify('a@gmail.com', `Nope thanks..i found another car${QUOTED}`)).toBe('replied');
  });

  it('still honours a real STOP typed above the quote', () => {
    expect(classify('a@gmail.com', `STOP${QUOTED}`)).toBe('unsubscribed');
  });

  it.each([
    ['please unsubscribe me'],
    ['Remove me from your list.'],
    ['take me off this list'],
    ['do not contact me again'],
  ])('honours opt-out phrasing: %s', (body) => {
    expect(classify('a@gmail.com', `${body}${QUOTED}`)).toBe('unsubscribed');
  });

  it('treats an empty reply as engagement, not an opt-out', () => {
    expect(classify('a@gmail.com', '<div dir="ltr"></div>')).toBe('replied');
  });

  it('classifies mail-system senders as bounces', () => {
    expect(classify('mailer-daemon@googlemail.com', 'Address not found')).toBe('bounced');
    expect(classify('postmaster@example.com', 'delivery failed')).toBe('bounced');
  });
});
