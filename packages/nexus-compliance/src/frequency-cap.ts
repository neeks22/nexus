// --- Constants ---

const DEFAULT_MAX_TOUCHES = 7;
const DEFAULT_WINDOW_DAYS = 30;

// --- Types ---

export interface TouchRecord {
  leadId: number;
  timestamp: string; // ISO 8601
  channel: "sms" | "email";
}

export interface FrequencyCapConfig {
  maxTouches?: number;
  windowDays?: number;
}

export interface FrequencyCapResult {
  allowed: boolean;
  touchesUsed: number;
  limit: number;
}

// --- FrequencyCapChecker ---

export class FrequencyCapChecker {
  private readonly maxTouches: number;
  private readonly windowDays: number;

  constructor(config?: FrequencyCapConfig) {
    this.maxTouches = config?.maxTouches ?? DEFAULT_MAX_TOUCHES;
    this.windowDays = config?.windowDays ?? DEFAULT_WINDOW_DAYS;
  }

  isWithinCap(
    leadId: number,
    touchHistory: TouchRecord[],
    now?: Date,
  ): FrequencyCapResult {
    if (touchHistory === undefined || touchHistory === null) {
      throw new Error(
        "FrequencyCapChecker.isWithinCap requires an explicit touchHistory array — got " +
          String(touchHistory),
      );
    }
    const currentTime = now ?? new Date();
    const windowStart = new Date(
      currentTime.getTime() - this.windowDays * 24 * 60 * 60 * 1000,
    );

    const touchesInWindow = touchHistory.filter((touch) => {
      if (touch.leadId !== leadId) return false;
      const touchDate = new Date(touch.timestamp);
      return touchDate >= windowStart && touchDate <= currentTime;
    });

    const touchesUsed = touchesInWindow.length;

    return {
      allowed: touchesUsed < this.maxTouches,
      touchesUsed,
      limit: this.maxTouches,
    };
  }
}
