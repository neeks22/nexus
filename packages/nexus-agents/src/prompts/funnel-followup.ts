/**
 * Funnel Follow-up Prompt Builder
 *
 * Specialized prompt for following up with leads that came through
 * the multi-step funnel. Has MORE context than a regular lead because
 * we know their budget, employment, credit situation, and vehicle preference.
 *
 * Uses this context for hyper-personalized first messages.
 */

/* ============================================
   TYPES
   ============================================ */

export interface FunnelFollowupContext {
  firstName: string;
  lastName: string;
  vehicleType: string;
  budget: string;
  employment: string;
  creditSituation: string;
  tradeIn: boolean;
  preApprovalScore: number;
  preApprovalCategory: "high" | "medium" | "low";
  vehicleRecommendations: Array<{
    year: number;
    make: string;
    model: string;
    trim?: string;
    color?: string;
    monthlyPayment?: number;
    features?: string[];
  }>;
  dealershipName: string;
  repName: string;
  dealershipPhone: string;
  locale: "en-CA" | "fr-CA";
  channel: "sms" | "email";
}

/* ============================================
   CONSTANTS
   ============================================ */

export const FUNNEL_SMS_MAX_CHARS = 480;
export const FUNNEL_EMAIL_MAX_WORDS = 200;

/* ============================================
   BUDGET / LABEL MAPS
   ============================================ */

const BUDGET_LABELS: Record<string, string> = {
  "under-250": "under $250/month",
  "250-350": "$250-$350/month",
  "350-500": "$350-$500/month",
  "500-plus": "$500+/month",
};

const BUDGET_LABELS_FR: Record<string, string> = {
  "under-250": "moins de 250$/mois",
  "250-350": "250$-350$/mois",
  "350-500": "350$-500$/mois",
  "500-plus": "500$+/mois",
};

const VEHICLE_LABELS: Record<string, string> = {
  suv: "SUV",
  sedan: "sedan",
  truck: "truck",
  van: "van",
  coupe: "coupe",
  "not-sure": "vehicle",
};

const VEHICLE_LABELS_FR: Record<string, string> = {
  suv: "VUS",
  sedan: "berline",
  truck: "camion",
  van: "fourgonnette",
  coupe: "coupe",
  "not-sure": "vehicule",
};

const EMPLOYMENT_CONTEXT: Record<string, string> = {
  "full-time": "You mentioned you work full-time, which puts you in a strong position for financing.",
  "part-time": "Part-time employment works perfectly with our lending partners.",
  "self-employed": "We work with self-employed professionals all the time -- flexible income verification available.",
  "retired": "We have lending partners who specialize in retirement income financing.",
  "other": "We have flexible lending options for every situation.",
};

const EMPLOYMENT_CONTEXT_FR: Record<string, string> = {
  "full-time": "Vous avez mentionne travailler a temps plein, ce qui vous place dans une excellente position pour le financement.",
  "part-time": "L'emploi a temps partiel fonctionne parfaitement avec nos partenaires preteurs.",
  "self-employed": "Nous travaillons regulierement avec des travailleurs autonomes -- verification de revenus flexible disponible.",
  "retired": "Nous avons des partenaires preteurs qui se specialisent dans le financement pour retraites.",
  "other": "Nous avons des options de financement flexibles pour chaque situation.",
};

const CREDIT_REASSURANCE: Record<string, string> = {
  excellent: "With your excellent credit, you'll likely qualify for our best rates.",
  good: "Good credit puts you in great shape -- lots of options available.",
  fair: "Fair credit? No problem. We have lending partners who specialize in exactly your situation.",
  rebuilding: "Rebuilding credit is a journey, and we're here to help. Every on-time payment you make gets reported to the bureaus, actively improving your score.",
  "not-sure": "Not sure about your credit? No worries -- we'll walk you through it with zero judgment.",
};

const CREDIT_REASSURANCE_FR: Record<string, string> = {
  excellent: "Avec votre excellent credit, vous serez probablement admissible a nos meilleurs taux.",
  good: "Un bon credit vous place en excellente position -- plusieurs options disponibles.",
  fair: "Credit passable? Aucun probleme. Nous avons des partenaires preteurs specialises dans votre situation.",
  rebuilding: "Rebatir son credit est un parcours, et nous sommes la pour vous aider. Chaque paiement a temps est signale aux bureaux de credit, ameliorant activement votre pointage.",
  "not-sure": "Pas certain de votre credit? Aucun souci -- on vous guide sans aucun jugement.",
};

/* ============================================
   PROMPT BUILDER
   ============================================ */

export function buildFunnelFollowupPrompt(context: FunnelFollowupContext): string {
  const isEnglish = context.locale === "en-CA";
  const budgetLabels = isEnglish ? BUDGET_LABELS : BUDGET_LABELS_FR;
  const vehicleLabels = isEnglish ? VEHICLE_LABELS : VEHICLE_LABELS_FR;
  const employmentContext = isEnglish ? EMPLOYMENT_CONTEXT : EMPLOYMENT_CONTEXT_FR;
  const creditReassurance = isEnglish ? CREDIT_REASSURANCE : CREDIT_REASSURANCE_FR;

  const budgetLabel = budgetLabels[context.budget] || context.budget;
  const vehicleLabel = vehicleLabels[context.vehicleType] || context.vehicleType;
  const empContext = employmentContext[context.employment] || employmentContext["other"];
  const creditContext = creditReassurance[context.creditSituation] || creditReassurance["not-sure"];

  const maxLength =
    context.channel === "sms"
      ? `Maximum ${FUNNEL_SMS_MAX_CHARS} characters.`
      : `Maximum ${FUNNEL_EMAIL_MAX_WORDS} words.`;

  const vehicleRecSection =
    context.vehicleRecommendations.length > 0
      ? context.vehicleRecommendations
          .map((v) => {
            const parts = [`${v.year} ${v.make} ${v.model}`];
            if (v.trim) parts[0] += ` ${v.trim}`;
            if (v.color) parts.push(`Color: ${v.color}`);
            if (v.monthlyPayment) parts.push(`~$${v.monthlyPayment}/mo`);
            if (v.features && v.features.length > 0) {
              parts.push(`Features: ${v.features.slice(0, 3).join(", ")}`);
            }
            return `  - ${parts.join(" | ")}`;
          })
          .join("\n")
      : "  (No specific inventory matches yet -- use the vehicle type and budget to suggest options)";

  const tradeInNote = context.tradeIn
    ? isEnglish
      ? "The customer has a trade-in vehicle. Mention that you'll include their trade-in value in the offer."
      : "Le client a un vehicule a echanger. Mentionnez que vous inclurez la valeur de son echange dans l'offre."
    : "";

  const prompt = `You are a friendly, knowledgeable financing specialist at ${context.dealershipName}.

ROLE: Send the FIRST follow-up message to a lead who just completed our online financing application (multi-step funnel). You have significantly more context than a typical lead because they answered qualification questions.

LANGUAGE: ${isEnglish ? "English (Canadian)" : "French (Canadian/Quebec conventions)"}
CHANNEL: ${context.channel}
${maxLength}

--- LEAD CONTEXT (from funnel application) ---

Name: ${context.firstName} ${context.lastName}
Vehicle Interest: ${vehicleLabel}
Monthly Budget: ${budgetLabel}
Employment: ${context.employment}
Credit Situation: ${context.creditSituation}
Trade-In: ${context.tradeIn ? "Yes" : "No"}
Pre-Approval Score: ${context.preApprovalScore}/100 (${context.preApprovalCategory})

--- VEHICLE RECOMMENDATIONS ---

${vehicleRecSection}

--- CONTEXT NOTES ---

Employment: ${empContext}
Credit: ${creditContext}
${tradeInNote}

--- INSTRUCTIONS ---

1. Greet them by first name. Be warm, not corporate.
2. Reference their SPECIFIC vehicle preference and budget naturally (don't list them robotically).
3. If vehicle recommendations are available, mention the top match by name (year, make, model) and how it fits their budget.
4. If they said "rebuilding" or "fair" credit, include a brief reassurance. NEVER say "bad credit."
5. Include a clear next step: suggest a call, visit, or reply.
6. Sign off with ${context.repName} from ${context.dealershipName}.
7. Include the dealership phone number: ${context.dealershipPhone}

--- RESTRICTIONS ---

- NEVER quote specific financing terms, interest rates, or APR numbers
- NEVER guarantee approval or use "guaranteed" language
- NEVER mention credit scores or specific score ranges
- NEVER use high-pressure tactics or artificial urgency
- NEVER say "bad credit" -- use "all credit situations" or "rebuilding"
- NEVER make up vehicle details not in the recommendations above
- NEVER share internal scoring or pre-approval scores with the customer
- Keep the tone empathetic, professional, and genuinely helpful

--- EXAMPLES (for tone reference, do NOT copy verbatim) ---

SMS Example:
"Hi Sarah! Based on your application, I've found a 2024 Honda CR-V that fits your $350/month budget perfectly. It's in Platinum White with AWD -- great for Ottawa winters. Want to come see it this Saturday? - Mo, ${context.dealershipName} ${context.dealershipPhone}"

Email Example:
"Hi Sarah, Thank you for completing your application! I've been looking at our inventory and found some great options for you. [vehicle details]. [employment reassurance]. [next step]. Best regards, Mo"

Generate the ${context.channel === "sms" ? "SMS" : "email"} message now.`;

  return prompt;
}
