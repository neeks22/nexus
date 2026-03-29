// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Touch Scheduler — Cadence management for cold lead warming
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type TouchChannel = "sms" | "email";

export type TouchStrategy =
  | "enthusiastic"
  | "consultative"
  | "respectful_close"
  | "informational";

export interface TouchScheduleEntry {
  readonly daysFromStart: number;
  readonly channel: TouchChannel;
  readonly strategy: TouchStrategy;
}

const MS_PER_DAY = 86_400_000;

/**
 * Predefined touch schedule for the 7-touch cold lead warming cadence.
 * Touch 1 is handled by the instant response workflow, so the map starts at touch 2.
 * Touch 7+ follows the monthly nurture pattern.
 */
export const TOUCH_SCHEDULE: ReadonlyMap<number, TouchScheduleEntry> = new Map([
  [1, { daysFromStart: 0, channel: "sms", strategy: "enthusiastic" }],
  [2, { daysFromStart: 2, channel: "sms", strategy: "enthusiastic" }],
  [3, { daysFromStart: 4, channel: "email", strategy: "consultative" }],
  [4, { daysFromStart: 7, channel: "sms", strategy: "consultative" }],
  [5, { daysFromStart: 14, channel: "email", strategy: "consultative" }],
  [6, { daysFromStart: 30, channel: "sms", strategy: "respectful_close" }],
  [7, { daysFromStart: 60, channel: "email", strategy: "informational" }],
]);

/**
 * Returns the schedule entry for a given touch number.
 * For touches 8+, returns a monthly nurture entry (every 30 days after touch 7).
 */
export function getScheduleForTouch(touchNumber: number): TouchScheduleEntry {
  if (touchNumber < 1) {
    return TOUCH_SCHEDULE.get(1) as TouchScheduleEntry;
  }

  const entry = TOUCH_SCHEDULE.get(touchNumber);
  if (entry) {
    return entry;
  }

  // Touch 8+: monthly nurture, alternating email
  const additionalMonths = touchNumber - 7;
  const daysFromStart = 60 + additionalMonths * 30;
  return {
    daysFromStart,
    channel: "email",
    strategy: "informational",
  };
}

/**
 * Calculates when a specific touch is due based on when the lead was created.
 */
export function calculateTouchDueDate(touchNumber: number, leadCreatedDate: Date): Date {
  const schedule = getScheduleForTouch(touchNumber);
  return new Date(leadCreatedDate.getTime() + schedule.daysFromStart * MS_PER_DAY);
}

/**
 * Returns true if the given touch is overdue (i.e., the due date has passed).
 */
export function isOverdue(touchNumber: number, leadCreatedDate: Date, now?: Date): boolean {
  const dueDate = calculateTouchDueDate(touchNumber, leadCreatedDate);
  const currentTime = now ?? new Date();
  return currentTime.getTime() >= dueDate.getTime();
}

/**
 * Recalculates the cadence after a customer reply.
 * When a customer replies, the cadence timer resets — the next touch is scheduled
 * relative to the reply date, not the original lead creation date.
 *
 * Returns a new "effective creation date" that can be used with calculateTouchDueDate
 * for the remaining touches.
 */
export function resetCadence(lastReplyDate: Date, currentTouchNumber: number): Date {
  // The next touch should be calculated as if the lead was created such that
  // the current touch falls on the reply date. This effectively shifts the
  // whole remaining schedule forward.
  const currentSchedule = getScheduleForTouch(currentTouchNumber);
  return new Date(lastReplyDate.getTime() - currentSchedule.daysFromStart * MS_PER_DAY);
}
