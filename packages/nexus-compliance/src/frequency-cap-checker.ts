/** A record of a message sent to a lead */
export interface TouchRecord {
  lead_id: number;
  sent_at: string; // ISO 8601
  channel: "sms" | "email";
}

export interface FrequencyCapCheckResult {
  allowed: boolean;
  reason: string;
  touches_in_window: number;
  max_touches: number;
  window_days: number;
}

export interface FrequencyCapConfig {
  max_touches: number;
  window_days: number;
}

const DEFAULT_CONFIG: FrequencyCapConfig = {
  max_touches: 7,
  window_days: 30,
};

/**
 * FrequencyCapChecker — limits total outbound touches per lead per time window.
 *
 * Default: max 7 touches in 30 days. Configurable per-tenant.
 */
export class FrequencyCapChecker {
  private touches: Map<number, TouchRecord[]> = new Map();
  private config: FrequencyCapConfig;

  constructor(config: Partial<FrequencyCapConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Record a touch (message sent) for a lead */
  recordTouch(record: TouchRecord): void {
    const existing = this.touches.get(record.lead_id) ?? [];
    existing.push(record);
    this.touches.set(record.lead_id, existing);
  }

  /** Load historical touches for a lead (e.g., from database) */
  loadTouches(leadId: number, records: TouchRecord[]): void {
    this.touches.set(leadId, [...records]);
  }

  /** Check if a lead can receive another touch */
  check(leadId: number, now: Date = new Date()): FrequencyCapCheckResult {
    const records = this.touches.get(leadId) ?? [];
    const windowStart = new Date(
      now.getTime() - this.config.window_days * 24 * 60 * 60 * 1000
    );

    const touchesInWindow = records.filter(
      (r) => new Date(r.sent_at) >= windowStart
    ).length;

    if (touchesInWindow >= this.config.max_touches) {
      return {
        allowed: false,
        reason: `Frequency cap reached: ${touchesInWindow}/${this.config.max_touches} touches in ${this.config.window_days} days`,
        touches_in_window: touchesInWindow,
        max_touches: this.config.max_touches,
        window_days: this.config.window_days,
      };
    }

    return {
      allowed: true,
      reason: `Within frequency cap: ${touchesInWindow}/${this.config.max_touches} touches in ${this.config.window_days} days`,
      touches_in_window: touchesInWindow,
      max_touches: this.config.max_touches,
      window_days: this.config.window_days,
    };
  }

  /** Get the current config */
  getConfig(): FrequencyCapConfig {
    return { ...this.config };
  }
}
