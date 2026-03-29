// --- Types ---

export interface InventoryRecord {
  vin: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  features: string[];
}

export interface FeatureValidationResult {
  valid: boolean;
  unverifiedFeatures: string[];
}

// --- Constants ---

// Common vehicle features to detect in messages
const FEATURE_PATTERNS: ReadonlyArray<{ keyword: string; pattern: RegExp }> = [
  { keyword: "panoramic roof", pattern: /panoramic\s+(?:sun)?roof/i },
  { keyword: "sunroof", pattern: /\bsunroof\b/i },
  { keyword: "moonroof", pattern: /\bmoonroof\b/i },
  { keyword: "AWD", pattern: /\b(?:AWD|all[\s-]wheel[\s-]drive)\b/i },
  { keyword: "4WD", pattern: /\b(?:4WD|four[\s-]wheel[\s-]drive|4x4)\b/i },
  { keyword: "leather seats", pattern: /\bleather\s+(?:seats?|interior|upholstery)\b/i },
  { keyword: "heated seats", pattern: /\bheated\s+seats?\b/i },
  { keyword: "ventilated seats", pattern: /\b(?:ventilated|cooled)\s+seats?\b/i },
  { keyword: "navigation", pattern: /\b(?:navigation|nav\s+system|GPS)\b/i },
  { keyword: "backup camera", pattern: /\b(?:backup|rear(?:view)?|reverse)\s+camera\b/i },
  { keyword: "blind spot", pattern: /\bblind[\s-]spot\b/i },
  { keyword: "lane assist", pattern: /\blane[\s-](?:assist|departure|keeping)\b/i },
  { keyword: "adaptive cruise", pattern: /\badaptive\s+cruise\b/i },
  { keyword: "Apple CarPlay", pattern: /\b(?:apple\s+)?carplay\b/i },
  { keyword: "Android Auto", pattern: /\bandroid\s+auto\b/i },
  { keyword: "Bluetooth", pattern: /\bbluetooth\b/i },
  { keyword: "remote start", pattern: /\bremote\s+start\b/i },
  { keyword: "towing package", pattern: /\btow(?:ing)?\s+(?:package|hitch|capacity)\b/i },
  { keyword: "roof rack", pattern: /\broof\s+rack\b/i },
  { keyword: "third row", pattern: /\b(?:third|3rd)\s+row\b/i },
  { keyword: "turbo", pattern: /\bturbo(?:charged)?\b/i },
  { keyword: "hybrid", pattern: /\bhybrid\b/i },
  { keyword: "EV", pattern: /\b(?:electric\s+vehicle|EV|fully\s+electric)\b/i },
  { keyword: "heads-up display", pattern: /\bheads?[\s-]up\s+display\b/i },
  { keyword: "wireless charging", pattern: /\bwireless\s+charg(?:ing|er)\b/i },
  { keyword: "premium audio", pattern: /\b(?:Bose|Harman|JBL|Bang|Burmester|premium)\s+(?:audio|sound|speaker)/i },
  { keyword: "heated steering", pattern: /\bheated\s+steering\b/i },
  { keyword: "power liftgate", pattern: /\bpower\s+(?:liftgate|tailgate|trunk)\b/i },
];

// --- FeatureValidator ---

export class FeatureValidator {
  validateFeatures(
    message: string,
    inventoryRecord?: InventoryRecord,
  ): FeatureValidationResult {
    // If no inventory record provided, we cannot verify any features
    if (!inventoryRecord) {
      const mentionedFeatures = this.extractMentionedFeatures(message);
      if (mentionedFeatures.length > 0) {
        return {
          valid: false,
          unverifiedFeatures: mentionedFeatures,
        };
      }
      return { valid: true, unverifiedFeatures: [] };
    }

    const mentionedFeatures = this.extractMentionedFeatures(message);
    const normalizedInventoryFeatures = inventoryRecord.features.map((f) =>
      f.toLowerCase().trim(),
    );

    const unverified: string[] = [];

    for (const mentioned of mentionedFeatures) {
      const isVerified = normalizedInventoryFeatures.some(
        (inventoryFeature) =>
          inventoryFeature.includes(mentioned.toLowerCase()) ||
          mentioned.toLowerCase().includes(inventoryFeature),
      );
      if (!isVerified) {
        unverified.push(mentioned);
      }
    }

    return {
      valid: unverified.length === 0,
      unverifiedFeatures: unverified,
    };
  }

  private extractMentionedFeatures(message: string): string[] {
    const found: string[] = [];

    for (const fp of FEATURE_PATTERNS) {
      if (fp.pattern.test(message)) {
        found.push(fp.keyword);
      }
    }

    return found;
  }
}
