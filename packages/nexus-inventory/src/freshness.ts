// --- Constants ---

const DEFAULT_MAX_AGE_HOURS = 24;

const INVENTORY_KEYWORDS: readonly string[] = [
  "inventory",
  "stock",
  "available",
  "in stock",
  "on the lot",
  "on our lot",
  "we have",
  "we currently have",
  "listing",
  "listings",
  "vehicle",
  "vehicles",
];

const FRESHNESS_QUALIFIERS: readonly string[] = [
  "based on our current listings",
  "based on current listings",
  "based on our current inventory",
  "based on current inventory",
  "as of today",
  "subject to availability",
  "while supplies last",
  "availability may vary",
];

// --- Freshness qualifier ---

export function addFreshnessQualifier(message: string): string {
  const messageLower = message.toLowerCase();

  // Check if message references inventory
  const referencesInventory = INVENTORY_KEYWORDS.some((kw) =>
    messageLower.includes(kw),
  );

  if (!referencesInventory) {
    return message;
  }

  // Check if qualifier already present
  const alreadyQualified = FRESHNESS_QUALIFIERS.some((q) =>
    messageLower.includes(q.toLowerCase()),
  );

  if (alreadyQualified) {
    return message;
  }

  // Append qualifier to the end of the message
  const trimmed = message.trimEnd();
  const endsWithPunctuation = /[.!?]$/.test(trimmed);

  if (endsWithPunctuation) {
    return `${trimmed} Based on our current listings.`;
  }

  return `${trimmed}. Based on our current listings.`;
}

// --- Staleness check ---

export function isStale(
  lastUpdated: Date,
  maxAgeHours: number = DEFAULT_MAX_AGE_HOURS,
): boolean {
  const now = new Date();
  const ageMs = now.getTime() - lastUpdated.getTime();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  return ageMs > maxAgeMs;
}
