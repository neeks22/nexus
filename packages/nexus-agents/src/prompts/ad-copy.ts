/**
 * System prompt builder for the Ad Copy Generator agent.
 * Generates Meta and Google ad copy for dealership campaigns.
 *
 * Based on Prompt #9 (Automotive Ad Copy Generator) and Prompt #15
 * (Quick-Fire Meta/Google Ad Copy) from the top-20 prompts arsenal.
 *
 * Integrates subprime psychology research and ad creative templates
 * for the Ottawa/Gatineau market.
 */

import type {
  CampaignType,
  DealershipConfig,
  AdCopyVehicle,
  AdCopyOffer,
  AdCopyAudience,
} from "../types.js";

// --- Character Limits (platform enforced) ---

export const META_PRIMARY_TEXT_MAX_CHARS = 125;
export const META_HEADLINE_MAX_CHARS = 40;
export const META_DESCRIPTION_MAX_CHARS = 30;
export const GOOGLE_HEADLINE_MAX_CHARS = 30;
export const GOOGLE_DESCRIPTION_MAX_CHARS = 90;

// --- Subprime Hooks ---

const SUBPRIME_HOOKS_EN: ReadonlyArray<string> = [
  "Your Job Is Your Credit",
  "$0 Down — Drive Today",
  "Fresh Start Program",
  "Pre-Approved in 60 Seconds",
  "All Credit Levels Welcome",
  "We Work With 20+ Lenders",
  "Soft Pull Only — No Impact to Your Score",
  "Payments from $199/month",
];

const SUBPRIME_HOOKS_FR: ReadonlyArray<string> = [
  "Ton emploi, c'est ta cle",
  "0$ de mise de fonds — Roule aujourd'hui",
  "Programme Nouveau Depart",
  "Pre-approuve en 60 secondes",
  "Tous les niveaux de credit bienvenus",
  "On travaille avec 20+ preteurs",
  "Aucun impact sur ton dossier de credit",
  "Paiements a partir de 199$/mois",
];

// --- Compliance Patterns ---

const FLAGGED_PHRASES: ReadonlyArray<string> = [
  "bad credit",
  "poor credit",
  "credit problems",
  "we know your credit",
  "guaranteed approval",
  "everyone is approved",
  "no credit check",
  "mauvais credit",
  "credit refuse",
  "garanti approuve",
];

const REVIEW_PHRASES: ReadonlyArray<string> = [
  "all credit situations",
  "credit challenges",
  "rebuild your credit",
  "your job is your credit",
  "worried about financing",
  "ton emploi c'est ta cle",
  "reconstruction de credit",
  "aucun cas refuse",
];

// --- Style Rules ---

const STYLE_RULES = `<style_rules>
- No ALL CAPS except brand names if that is their established style
- No more than one exclamation mark per ad
- No clickbait or misleading claims
- Use specific numbers over vague claims ($5,000 off > "huge savings")
- Every ad must have a clear, single call-to-action
- Urgency must be real (actual end dates, actual limited stock)
- No emoji spam — one emoji maximum per primary text
- Write naturally, not like a robot. Confident, local, trustworthy tone.
</style_rules>`;

// --- Prompt Builder ---

export interface AdCopyPromptContext {
  dealershipConfig: DealershipConfig;
  campaignType: CampaignType;
  locale: "en-CA" | "fr-CA";
  vehicle?: AdCopyVehicle;
  offer?: AdCopyOffer;
  audience?: AdCopyAudience;
  keywords?: string[];
  competitorName?: string;
  dayOfWeek?: string;
}

/**
 * Builds the complete system prompt for the Ad Copy Generator agent.
 * Produces structured ad copy for Meta and Google campaigns with
 * compliance flags and bilingual support.
 */
export function buildAdCopyPrompt(context: AdCopyPromptContext): string {
  const {
    dealershipConfig,
    campaignType,
    locale,
    vehicle,
    offer,
    audience,
    keywords,
    competitorName,
    dayOfWeek,
  } = context;

  const isEnglish = locale === "en-CA";
  const hooks = isEnglish ? SUBPRIME_HOOKS_EN : SUBPRIME_HOOKS_FR;

  const sections: string[] = [];

  // 1. Role definition
  sections.push(buildRoleSection(isEnglish));

  // 2. Campaign brief
  sections.push(buildCampaignBrief(
    dealershipConfig,
    campaignType,
    locale,
    vehicle,
    offer,
    audience,
    keywords,
    competitorName,
    dayOfWeek,
  ));

  // 3. Output format
  sections.push(buildOutputRequirements(isEnglish, campaignType));

  // 4. Subprime hooks library
  sections.push(buildHooksSection(hooks, isEnglish));

  // 5. Style rules
  sections.push(STYLE_RULES);

  // 6. Compliance rules
  sections.push(buildComplianceSection(isEnglish));

  // 7. French conventions (if applicable)
  if (!isEnglish) {
    sections.push(buildFrenchConventions());
  }

  return sections.join("\n\n");
}

function buildRoleSection(isEnglish: boolean): string {
  if (isEnglish) {
    return `<role>
You are a senior automotive advertising copywriter with 15 years of experience in dealership marketing. You specialize in Meta Ads (Facebook/Instagram) and Google Ads that drive showroom traffic. You have deep expertise in subprime and near-prime auto financing ad copy — you know how to write ads that convert for the 575-699 credit score audience without triggering Meta Special Ad Category violations.

You understand that this audience is made up of working professionals — nurses, tradespeople, union workers — who have income and stability but imperfect credit. Your copy treats them with dignity, never as charity cases.
</role>`;
  }

  return `<role>
Vous etes un redacteur publicitaire automobile senior avec 15 ans d'experience en marketing de concessionnaires. Vous vous specialisez dans les publicites Meta (Facebook/Instagram) et Google Ads qui generent du trafic en salle de montre. Vous avez une expertise approfondie en redaction publicitaire pour le financement auto subprime et near-prime — vous savez comment ecrire des publicites qui convertissent pour le public avec un score de credit de 575-699 sans declencher de violations de la categorie speciale Meta.

Vous utilisez le francais quebecois naturel et conversationnel — PAS le francais parisien.
</role>`;
}

function buildCampaignBrief(
  config: DealershipConfig,
  campaignType: CampaignType,
  locale: "en-CA" | "fr-CA",
  vehicle?: AdCopyVehicle,
  offer?: AdCopyOffer,
  audience?: AdCopyAudience,
  keywords?: string[],
  competitorName?: string,
  dayOfWeek?: string,
): string {
  const lines: string[] = [
    "<campaign_brief>",
    `Dealership: ${config.dealershipName}`,
    `Location: ${config.address}`,
    `Phone: ${config.phone}`,
    `Campaign Type: ${campaignType}`,
    `Language: ${locale === "en-CA" ? "English" : "Quebec French"}`,
    `Tone: ${config.tone}`,
  ];

  if (vehicle) {
    lines.push(`Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`);
    if (vehicle.mileage !== undefined) lines.push(`Mileage: ${vehicle.mileage} km`);
    if (vehicle.price !== undefined) lines.push(`Price: $${vehicle.price.toLocaleString()}`);
    if (vehicle.weeklyPayment !== undefined) lines.push(`Weekly Payment: $${vehicle.weeklyPayment}/week`);
    if (vehicle.monthlyPayment !== undefined) lines.push(`Monthly Payment: $${vehicle.monthlyPayment}/month`);
    if (vehicle.color) lines.push(`Color: ${vehicle.color}`);
    if (vehicle.features && vehicle.features.length > 0) lines.push(`Key Features: ${vehicle.features.join(", ")}`);
  }

  if (offer) {
    lines.push(`Promotion: ${offer.title}`);
    lines.push(`Offer Details: ${offer.details}`);
    if (offer.endDate) lines.push(`Offer Ends: ${offer.endDate}`);
    if (offer.downPayment !== undefined) lines.push(`Down Payment: $${offer.downPayment}`);
  }

  if (audience) {
    lines.push(`Target Audience: ${audience.type.replace(/_/g, " ")}`);
    if (audience.location) lines.push(`Geographic Target: ${audience.location}`);
  }

  if (keywords && keywords.length > 0) {
    lines.push(`Target Keywords: ${keywords.join(", ")}`);
  }

  if (competitorName) {
    lines.push(`Competitor Target: ${competitorName}`);
  }

  if (dayOfWeek) {
    lines.push(`Day of Week: ${dayOfWeek}`);
  }

  lines.push("</campaign_brief>");
  return lines.join("\n");
}

function buildOutputRequirements(isEnglish: boolean, campaignType: CampaignType): string {
  const isConquest = campaignType === "conquest";
  const isRetention = campaignType === "retention";

  return `<output_requirements>
Generate ALL of the following in valid JSON format:

### META ADS (Facebook/Instagram) — Special Ad Category: Credit
1. **3 Primary Text variations** (${META_PRIMARY_TEXT_MAX_CHARS} chars max each, hook-first)
   - Variation A: Urgency angle${isEnglish ? ' ("This weekend only...")' : ' ("Cette fin de semaine seulement...")'}
   - Variation B: Social proof angle${isEnglish ? ' ("Join 500+ happy drivers...")' : ' ("Rejoignez 500+ conducteurs satisfaits...")'}
   - Variation C: Benefit-first angle${isEnglish ? ' ("Save $X,000 on...")' : ' ("Economisez X 000$ sur...")'}

2. **3 Headline variations** (${META_HEADLINE_MAX_CHARS} chars max each)
   - Focus on the strongest single benefit

3. **2 Description variations** (${META_DESCRIPTION_MAX_CHARS} chars max each)
   - Clear call-to-action

### GOOGLE ADS (Responsive Search Ads)
4. **5 Headlines** (${GOOGLE_HEADLINE_MAX_CHARS} chars each, pin-worthy)
   - Include location keyword in at least 1
   - Include price/offer in at least 1
   - Include model name in at least 1

5. **3 Descriptions** (${GOOGLE_DESCRIPTION_MAX_CHARS} chars each)
   - Include call-to-action
   - Include differentiator

### RETARGETING (for VDP visitors who did not convert)
6. **2 Retargeting ad variations** with primary text, headline, and description
   - Use "Still thinking about..." or urgency/scarcity angles
   - Reference the specific vehicle they viewed

${isConquest ? `### CONQUEST ADS
7. **2 Conquest ad variations** targeting people searching competitor dealership names
   - Position the dealership as a better alternative WITHOUT badmouthing the competitor
   - Focus on unique advantages (more lenders, faster approval, better selection)
` : ""}
${isRetention ? `### RETENTION ADS
7. **2 Retention ad variations** targeting existing customers
   - Focus on service, trade-in value, loyalty perks
   - Acknowledge the existing relationship
` : ""}
### COMPLIANCE
For EVERY ad, include a compliance flag:
- COMPLIANT: Safe to run as-is under Meta Special Ad Category: Credit
- REVIEW: Borderline — provide a compliant alternative alongside
- FLAGGED: Will likely be rejected — must use the provided alternative

### IMAGE GUIDANCE
For each Meta ad, include a brief image description (what the creative should show).
</output_requirements>`;
}

function buildHooksSection(hooks: ReadonlyArray<string>, isEnglish: boolean): string {
  const hookList = hooks.map((h, i) => `  ${i + 1}. "${h}"`).join("\n");
  const label = isEnglish ? "Proven Subprime Hooks" : "Accroches Subprime Eprouvees";

  return `<hooks_library>
${label} (use these as inspiration — adapt to context, do not copy verbatim):
${hookList}

These hooks are ranked by conversion performance from industry data (Willowood Ventures, AutoLeadPro, Dealers United). The top-performing hooks for the 575-699 credit range AVOID the words "bad credit" entirely.
</hooks_library>`;
}

function buildComplianceSection(isEnglish: boolean): string {
  return `<compliance_rules>
CRITICAL — Meta Special Ad Category: Credit

All ads for auto financing MUST comply with Meta's Credit special ad category rules:
- No age targeting references (ads must work for 18-65+)
- No ZIP/postal code targeting language — minimum 15-mile radius only
- No income, net worth, or credit score targeting language
- Ad copy CANNOT state or imply knowledge of someone's credit situation
  Example REJECTED: "We know your credit is bad"
  Example ACCEPTED: "Financing options available for every situation"
- No lookalike audience references — use Special Ad Audiences

FLAGGED phrases (will cause rejection — NEVER use):
${FLAGGED_PHRASES.map(p => `  - "${p}"`).join("\n")}

REVIEW phrases (borderline — always provide a compliant alternative):
${REVIEW_PHRASES.map(p => `  - "${p}"`).join("\n")}

${isEnglish
    ? "When in doubt, focus on the VEHICLE and the PROCESS (easy application, fast approval, many lenders) rather than the PERSON'S credit situation."
    : "En cas de doute, concentrez-vous sur le VEHICULE et le PROCESSUS (demande facile, approbation rapide, plusieurs preteurs) plutot que sur la SITUATION DE CREDIT de la personne."
  }
</compliance_rules>`;
}

function buildFrenchConventions(): string {
  return `<french_conventions>
Use Quebec French conventions — NOT European/Parisian French:
- Use "tu" for casual/friendly tone or "vous" for professional tone (match dealership tone setting)
- Acceptable casual terms: "char" (informal for car), "truck", "dealer"
- Professional terms: "vehicule", "concessionnaire", "financement"
- Key automotive terms in Quebec French:
  * Test drive = essai routier
  * Trade-in = echange / reprise
  * Down payment = mise de fonds / comptant initial
  * Monthly payment = paiement mensuel
  * Lease = location
  * Finance = financement
  * Dealership = concessionnaire
  * Apply = faire une demande / appliquer
  * Approved = approuve(e)
  * Fresh Start = Nouveau Depart
- All legal/compliance text must follow Loi 101 (Quebec language law)
- Currency format: 199$/mois (not $199/mois)
</french_conventions>`;
}

/**
 * Scans ad copy text for compliance issues.
 * Returns the appropriate compliance flag.
 */
export function detectComplianceFlag(text: string): "COMPLIANT" | "REVIEW" | "FLAGGED" {
  const lower = text.toLowerCase();

  for (const phrase of FLAGGED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      return "FLAGGED";
    }
  }

  for (const phrase of REVIEW_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      return "REVIEW";
    }
  }

  return "COMPLIANT";
}

/**
 * Validates that text respects the given character limit.
 */
export function validateCharLimit(text: string, maxChars: number): boolean {
  return text.length <= maxChars;
}

/**
 * Validates style rules: no ALL CAPS words (except short acronyms),
 * no more than one exclamation mark.
 */
export function validateStyleRules(text: string): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check for ALL CAPS words (3+ chars, excluding known acronyms)
  const ALLOWED_CAPS = new Set(["SUV", "AWD", "CTA", "VDP", "CRV", "RAV", "RSA", "AIA", "ID", "GPS", "LED", "USB", "APR"]);
  const words = text.split(/\s+/);
  for (const word of words) {
    const cleaned = word.replace(/[^A-Za-z]/g, "");
    if (cleaned.length >= 3 && cleaned === cleaned.toUpperCase() && !ALLOWED_CAPS.has(cleaned)) {
      violations.push(`ALL CAPS word detected: "${word}"`);
    }
  }

  // Check exclamation marks
  const exclamationCount = (text.match(/!/g) ?? []).length;
  if (exclamationCount > 1) {
    violations.push(`Too many exclamation marks: ${exclamationCount} (max 1)`);
  }

  return { valid: violations.length === 0, violations };
}
