/**
 * Email reactivation templates for the ReadyCar lead campaign.
 *
 * Single source of truth for the copy — the CRM renders these merged with
 * contact data so they can be pasted straight into Gmail.
 *
 * Positioning, in priority order: safety (95% get approved) → dignity
 * (500+ vehicles, you pick) → terms (lowest rates). Flipping that order
 * sounds like every dealer that already turned these people down.
 */

export type TemplateId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface CampaignTemplate {
  id: TemplateId;
  name: string;
  /** Day in the sequence this template is sent on */
  day: number;
  subject: string;
  body: string;
}

export interface TemplateMergeFields {
  first_name?: string | null;
  last_name?: string | null;
  lead_created_at?: string | null;
}

export const SENDER_NAME = 'Nicolas Sayah';
export const SENDER_EMAIL = 'nicolas@readycar.ca';
export const SENDER_PHONE = '613-363-4494';
export const DEALER_NAME = 'ReadyCar';

/** Approval rate quoted in the copy. Update here if the real number moves. */
export const APPROVAL_RATE = '95%';
/** Inventory size quoted in the copy. */
export const INVENTORY_COUNT = '500+';

/**
 * Google Workspace throttles a user mailbox well before its 2,000/day ceiling
 * on cold-ish mail — exceeding it risks suspending nicolas@readycar.ca, the
 * mailbox the dealership runs on. 200/day is the safe working cap.
 */
export const DAILY_SEND_CAP = 200;

/**
 * Deliberately plain. These read like a busy salesperson typed them between
 * calls, because that is who they are supposed to be from — polish reads as
 * marketing, and marketing is what this audience has learned to ignore.
 */
const SIGNATURE = `Nicolas
ReadyCar
${SENDER_PHONE}

Don't want these? Just reply STOP.`;

export const TEMPLATES: CampaignTemplate[] = [
  {
    id: 'C',
    name: 'Personal letter',
    day: 0,
    subject: 'quick question',
    body: `Hi {{first}},

Nicolas here from ReadyCar. You applied with us back in {{applied}} and I don't think anyone ever got back to you. Sorry about that.

Are you still looking for a vehicle?

If you are, I can tell you what you're approved for in about 20 minutes on the phone. No credit check to find out. I just need two things: what you take home, and what you can put down.

About ${APPROVAL_RATE} of people who apply with us get approved. And we've got over 500 vehicles, so you pick what you actually want — it's not a case of taking whatever's left.

If you've already sorted something out, just tell me and I'll leave you alone.

${SIGNATURE}`,
  },
  {
    id: 'A',
    name: 'Value stack',
    day: 3,
    subject: '500 cars, you pick',
    body: `Hi {{first}},

Nicolas from ReadyCar again. Following up on my last email.

Here's the short version of what I can do:

Tell me what you take home and what you can put down, and I'll tell you what you're approved for. Takes about 20 minutes. No credit check to find out.

${APPROVAL_RATE} of people who apply get approved. We've got ${INVENTORY_COUNT} vehicles, so you pick the one you want. And our rates are the lowest you'll find — if you've got a quote from somewhere else, bring it and I'll beat it or tell you to take it.

Good credit, bad credit, no credit, consumer proposal, first car — I've done all of it. If you got turned down somewhere before, that was them, not you.

Give me a call and we'll sort it out.

${SIGNATURE}`,
  },
  {
    id: 'E',
    name: 'Two-liner',
    day: 7,
    subject: 'still looking?',
    body: `{{first}} — Nicolas from ReadyCar.

Still looking for a vehicle, or did you get sorted?

${SENDER_PHONE}

Don't want these? Just reply STOP.`,
  },
  {
    id: 'B',
    name: 'Emotional / identity',
    day: 12,
    subject: 'what did you need the car for?',
    body: `Hi {{first}},

Nicolas from ReadyCar. Different question this time.

What did you need the car for?

I ask because nobody actually wants a car. They want the shift they can finally take. The kid they can drive to practice. The job across town that pays better. Whatever yours was, it's probably still there.

Most people I talk to stopped looking for the same reason — they got told no once and figured the answer would be no again. Usually it isn't. ${APPROVAL_RATE} of people who apply with us get approved.

Twenty minutes on the phone and you'd know for sure. No credit check to find out.

What time works for you?

${SIGNATURE}`,
  },
  {
    id: 'D',
    name: 'Close the file',
    day: 18,
    subject: 'should I close your file?',
    body: `Hi {{first}},

Last one from me.

Have you given up on getting a vehicle this year? If so, say "closed" and I'll stop emailing you.

If not, send me a time and I'll call. Twenty minutes and you'll know what you're approved for.

${SIGNATURE}`,
  },
];

/** Sequence order by step index: step 0 → first email, step 4 → last. */
export const SEQUENCE: TemplateId[] = TEMPLATES.map((t) => t.id);

export function getTemplate(id: TemplateId): CampaignTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** The template a contact receives next, or null once the sequence is exhausted. */
export function templateForStep(step: number): CampaignTemplate | null {
  const id = SEQUENCE[step];
  return id ? getTemplate(id) ?? null : null;
}

/** Days to wait after the previous send before the next step is due. */
export function daysUntilNextStep(step: number): number {
  const current = TEMPLATES[step];
  const previous = TEMPLATES[step - 1];
  if (!current || !previous) return 0;
  return current.day - previous.day;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatApplied(iso: string | null | undefined): string {
  if (!iso) return 'a while back';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'a while back';
  return d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
}

/**
 * Merge a template with contact data.
 * Falls back to "there" for a missing first name — never leaves a raw {{first}}
 * in a sent email, which is the single most trust-destroying typo in cold mail.
 */
export function renderTemplate(
  template: CampaignTemplate,
  contact: TemplateMergeFields
): { subject: string; body: string } {
  const raw = (contact.first_name ?? '').trim();
  const first = raw ? titleCase(raw) : 'there';
  const applied = formatApplied(contact.lead_created_at);

  const merge = (text: string): string =>
    text.replace(/\{\{first\}\}/g, first).replace(/\{\{applied\}\}/g, applied);

  return { subject: merge(template.subject), body: merge(template.body) };
}
