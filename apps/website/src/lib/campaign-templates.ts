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

const SIGNATURE = `— ${SENDER_NAME}
${DEALER_NAME} · ${SENDER_EMAIL} · ${SENDER_PHONE}

Reply "STOP" and I'll take you off my list.`;

export const TEMPLATES: CampaignTemplate[] = [
  {
    id: 'C',
    name: 'Personal letter',
    day: 0,
    subject: '{{first}} — did you ever sort out the vehicle?',
    body: `{{first}},

This is Nicolas. I sell cars at ReadyCar and I'm writing you because your file has been sitting on my desk since {{applied}} and it's been bugging me.

Here's the honest version of why.

When you applied, you got put in a queue with a few thousand other people. Somebody was supposed to call you. Judging by the fact that you're still in my "no answer" pile, either nobody did, or they called once at a bad time and gave up. Either way you got the short end of it.

So I'm doing it the old way and writing to you directly.

I'd like 20 minutes on the phone. In that time I can tell you the exact dollar amount a lender will approve you for — without pulling your credit, without your SIN, and without you driving anywhere. I need two numbers from you: your take-home pay, and what you can put down.

For what it's worth: ${APPROVAL_RATE} of the people who apply with me get approved. And we've got over 500 vehicles on the lot, so this isn't a case of taking whatever's left — you pick the one you want and I make the financing work around it. That's the part most people don't expect.

On rate: we write the lowest in the country and I don't expect you to take my word for it. Get a quote from anywhere else in Canada and bring it to me. If theirs is better, I'll tell you to sign it.

That's it. If the number works for you, we go find something. If it doesn't, I'll tell you precisely what to change and roughly how long it takes, and I'll leave you alone until you tell me otherwise.

I'd rather give you a straight answer today than have you wonder about it for another six months.

${SENDER_PHONE}. Or reply to this and tell me when.

${SIGNATURE}

P.S. If you already bought something — tell me and I'll take you off my list personally. I'd rather know than keep bothering you.`,
  },
  {
    id: 'A',
    name: 'Value stack',
    day: 3,
    subject: '500 cars. You pick.',
    body: `{{first}},

Nicolas from ReadyCar. You looked into financing with us a while back and I never got you an answer. That's on me.

Here's what I can do today:

  → Your exact approved amount — in 20 minutes, over the phone
  → Then you pick. ${INVENTORY_COUNT} vehicles on the ground. Not "whatever we can get you into" — the one you actually want.
  → ${APPROVAL_RATE} of people who apply with me get approved
  → No credit check to find out. No SIN. Nothing that touches your score.
  → Two questions: what you take home, and what you can put down
  → Keys in your hand in 48 hours
  → And the rate will be the lowest in the country. Bring me a written quote from anywhere in Canada — if it beats mine, I'll tell you to take it.

Good credit, bruised credit, no credit, consumer proposal, first-time buyer — I've placed all of it. If you've been turned down before, that was them. It isn't a verdict.

You keep the number either way. That's the whole offer.

Reply with a good time, or just call me: ${SENDER_PHONE}

${SIGNATURE}`,
  },
  {
    id: 'E',
    name: 'Two-liner',
    day: 7,
    subject: 'still looking?',
    body: `{{first}} — Nicolas from ReadyCar.

Still looking, or handled?

${SENDER_PHONE}

Reply "STOP" and I'll take you off my list.`,
  },
  {
    id: 'B',
    name: 'Emotional / identity',
    day: 12,
    subject: 'What was the car actually for?',
    body: `{{first}},

Nicolas from ReadyCar. Quick question, and it's not the one you're expecting.

What was the car actually for?

Because in six years of doing this, nobody has ever wanted a car. They wanted the 6:45am shift they can finally take. The kid they can drive to practice instead of explaining why not. The job forty minutes out that pays eleven grand more. The Saturday that doesn't cost three bus transfers.

Whatever yours was — it's probably still sitting there.

Most people in your spot stopped at the same wall: they'd been told no before, so they assumed the answer was no again and never asked. And the assumption cost them a year.

Here's what I'd tell you if you were sitting across from me: ${APPROVAL_RATE} of the people who apply with me get approved. You're probably fine. You've just been carrying somebody else's no.

And when you are approved, you're not getting handed keys to whatever was left in the back row. There are ${INVENTORY_COUNT} vehicles here and you pick the one you actually want. That part matters more than people admit.

I can tell you in 20 minutes whether it's a yes. No credit check to find out. Two questions on the phone.

Picture the version of this where it's handled — you've got keys, you've got a payment you chose, and the thing you've been working around for a year is just... not a problem anymore. That's twenty minutes of phone call away.

What time works?

${SIGNATURE}`,
  },
  {
    id: 'D',
    name: 'Close the file',
    day: 18,
    subject: 'Should I close your file?',
    body: `{{first}},

Have you given up on getting into a vehicle this year?

If so I'll close your file and stop emailing — just say "closed" and it's done.

If not, reply with a time. Twenty minutes, no credit check, and you'll know your number — ${APPROVAL_RATE} of people who apply get approved, and you pick from ${INVENTORY_COUNT} vehicles once you are.

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
