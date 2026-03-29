/**
 * Language detection for Canadian dealership leads.
 * Determines locale (en-CA or fr-CA) from Activix lead data.
 */

export type SupportedLocale = "en-CA" | "fr-CA";

/** Quebec area codes — triggers fr-CA locale */
const QUEBEC_AREA_CODES: ReadonlySet<string> = new Set([
  "418",
  "438",
  "450",
  "514",
  "579",
  "581",
  "819",
  "873",
]);

/** Quebec postal code prefixes — G, H, J = Quebec */
const QUEBEC_POSTAL_PREFIXES: ReadonlySet<string> = new Set(["G", "H", "J"]);

const DEFAULT_LOCALE: SupportedLocale = "en-CA";

/**
 * Minimal lead shape needed for language detection.
 * Compatible with ActivixLead from nexus-activix.
 */
export interface LeadForDetection {
  locale?: string | null;
  phones?: ReadonlyArray<{ number: string }>;
  postal_code?: string | null;
}

export class LanguageDetector {
  /**
   * Detects the preferred locale for a lead using a priority cascade:
   *  1. Activix `locale` field (if set and recognized)
   *  2. Area code from phones[] — Quebec codes map to fr-CA
   *  3. Postal code prefix — G, H, J = Quebec
   *  4. Fallback: en-CA
   */
  detect(lead: LeadForDetection): SupportedLocale {
    // 1. Explicit locale field
    const localeResult = this.detectFromLocaleField(lead.locale);
    if (localeResult !== null) {
      return localeResult;
    }

    // 2. Area code from phone numbers
    const areaCodeResult = this.detectFromPhones(lead.phones);
    if (areaCodeResult !== null) {
      return areaCodeResult;
    }

    // 3. Postal code prefix
    const postalResult = this.detectFromPostalCode(lead.postal_code);
    if (postalResult !== null) {
      return postalResult;
    }

    // 4. Fallback
    return DEFAULT_LOCALE;
  }

  private detectFromLocaleField(locale: string | null | undefined): SupportedLocale | null {
    if (!locale) {
      return null;
    }

    const normalized = locale.trim().toLowerCase();

    if (normalized === "fr-ca" || normalized === "fr" || normalized === "fr_ca") {
      return "fr-CA";
    }

    if (normalized === "en-ca" || normalized === "en" || normalized === "en_ca") {
      return "en-CA";
    }

    return null;
  }

  private detectFromPhones(
    phones: ReadonlyArray<{ number: string }> | undefined,
  ): SupportedLocale | null {
    if (!phones || phones.length === 0) {
      return null;
    }

    for (const phone of phones) {
      const areaCode = this.extractAreaCode(phone.number);
      if (areaCode !== null && QUEBEC_AREA_CODES.has(areaCode)) {
        return "fr-CA";
      }
    }

    return null;
  }

  private detectFromPostalCode(postalCode: string | null | undefined): SupportedLocale | null {
    if (!postalCode) {
      return null;
    }

    const trimmed = postalCode.trim().toUpperCase();
    if (trimmed.length === 0) {
      return null;
    }

    const firstChar = trimmed[0];
    if (firstChar && QUEBEC_POSTAL_PREFIXES.has(firstChar)) {
      return "fr-CA";
    }

    return null;
  }

  /**
   * Extracts a 3-digit area code from various phone formats:
   *  - +15141234567
   *  - 15141234567
   *  - 5141234567
   *  - (514) 123-4567
   *  - 514-123-4567
   *  - 514.123.4567
   */
  private extractAreaCode(phoneNumber: string): string | null {
    // Strip everything except digits
    const digits = phoneNumber.replace(/\D/g, "");

    if (digits.length === 11 && digits[0] === "1") {
      // +1 country code prefix — area code is digits 1-3
      return digits.substring(1, 4);
    }

    if (digits.length === 10) {
      // Standard 10-digit North American number
      return digits.substring(0, 3);
    }

    return null;
  }
}
