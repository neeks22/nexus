import { ConsentTracker } from "./consent-tracker.js";
import { OptOutChecker } from "./opt-out-checker.js";
import type { LeadUnsubscribeFields } from "./opt-out-checker.js";
import { FrequencyCapChecker } from "./frequency-cap.js";
import type { TouchRecord, FrequencyCapConfig } from "./frequency-cap.js";
import { ContentValidator } from "./content-validator.js";
import { FeatureValidator } from "./feature-validator.js";
import type { InventoryRecord } from "./feature-validator.js";

// --- Types ---

export interface ComplianceFailure {
  checker: string;
  reason: string;
}

export interface ComplianceCheckResult {
  pass: boolean;
  failures: ComplianceFailure[];
}

export interface ComplianceLeadData extends LeadUnsubscribeFields {
  id: number;
}

export interface ComplianceLogger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
}

export interface CompliancePreFlightConfig {
  frequencyCap?: FrequencyCapConfig;
  logger?: ComplianceLogger;
}

// --- Default console logger ---

const DEFAULT_LOGGER: ComplianceLogger = {
  info(msg: string, data?: Record<string, unknown>): void {
    if (data) {
      console.log(`[compliance:info] ${msg}`, data);
    } else {
      console.log(`[compliance:info] ${msg}`);
    }
  },
  warn(msg: string, data?: Record<string, unknown>): void {
    if (data) {
      console.warn(`[compliance:warn] ${msg}`, data);
    } else {
      console.warn(`[compliance:warn] ${msg}`);
    }
  },
};

// --- CompliancePreFlight ---

export class CompliancePreFlight {
  private readonly consentTracker: ConsentTracker;
  private readonly optOutChecker: OptOutChecker;
  private readonly frequencyCapChecker: FrequencyCapChecker;
  private readonly contentValidator: ContentValidator;
  private readonly featureValidator: FeatureValidator;
  private readonly logger: ComplianceLogger;

  constructor(config?: CompliancePreFlightConfig) {
    this.consentTracker = new ConsentTracker();
    this.optOutChecker = new OptOutChecker();
    this.frequencyCapChecker = new FrequencyCapChecker(config?.frequencyCap);
    this.contentValidator = new ContentValidator();
    this.featureValidator = new FeatureValidator();
    this.logger = config?.logger ?? DEFAULT_LOGGER;
  }

  /** Expose consent tracker for recording/revoking consent externally */
  get consent(): ConsentTracker {
    return this.consentTracker;
  }

  /**
   * Run ALL compliance checks in sequence.
   * This is NON-BYPASSABLE — every outbound message must pass through here.
   */
  check(
    lead: ComplianceLeadData,
    message: string,
    channel: "sms" | "email",
    inventoryRecord?: InventoryRecord,
    touchHistory?: TouchRecord[],
  ): ComplianceCheckResult {
    const failures: ComplianceFailure[] = [];

    // 1. Consent check
    const consentResult = this.consentTracker.isConsentValid(lead.id);
    this.logger.info("Consent check", {
      leadId: lead.id,
      valid: consentResult.valid,
      reason: consentResult.reason,
    });
    if (!consentResult.valid) {
      failures.push({ checker: "consent", reason: consentResult.reason });
    }

    // 2. Opt-out check
    const optOutResult = this.optOutChecker.canContact(lead, channel);
    this.logger.info("Opt-out check", {
      leadId: lead.id,
      channel,
      allowed: optOutResult.allowed,
      reason: optOutResult.reason,
    });
    if (!optOutResult.allowed) {
      failures.push({ checker: "opt-out", reason: optOutResult.reason });
    }

    // 3. Frequency cap check
    if (touchHistory) {
      const frequencyResult = this.frequencyCapChecker.isWithinCap(
        lead.id,
        touchHistory,
      );
      this.logger.info("Frequency cap check", {
        leadId: lead.id,
        touchesUsed: frequencyResult.touchesUsed,
        limit: frequencyResult.limit,
        allowed: frequencyResult.allowed,
      });
      if (!frequencyResult.allowed) {
        failures.push({
          checker: "frequency-cap",
          reason: `Lead has ${frequencyResult.touchesUsed} touches in window (limit: ${frequencyResult.limit})`,
        });
      }
    }

    // 4. Content validation
    const contentResult = this.contentValidator.validateContent(message);
    this.logger.info("Content validation", {
      leadId: lead.id,
      valid: contentResult.valid,
      violationCount: contentResult.violations.length,
    });
    if (!contentResult.valid) {
      for (const violation of contentResult.violations) {
        failures.push({ checker: "content", reason: violation });
      }
    }

    // 5. Feature validation
    const featureResult = this.featureValidator.validateFeatures(
      message,
      inventoryRecord,
    );
    this.logger.info("Feature validation", {
      leadId: lead.id,
      valid: featureResult.valid,
      unverifiedCount: featureResult.unverifiedFeatures.length,
    });
    if (!featureResult.valid) {
      failures.push({
        checker: "features",
        reason: `Unverified features mentioned: ${featureResult.unverifiedFeatures.join(", ")}`,
      });
    }

    // Log overall result
    if (failures.length > 0) {
      this.logger.warn("Compliance pre-flight FAILED", {
        leadId: lead.id,
        channel,
        failureCount: failures.length,
        failures: failures.map((f) => `${f.checker}: ${f.reason}`),
      });
    } else {
      this.logger.info("Compliance pre-flight PASSED", {
        leadId: lead.id,
        channel,
      });
    }

    return {
      pass: failures.length === 0,
      failures,
    };
  }
}
