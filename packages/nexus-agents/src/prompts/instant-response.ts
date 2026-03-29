/**
 * System prompt builder for the Instant Lead Response agent.
 * Assembles a full system prompt including safety rails, inventory context,
 * locale/tone directives, and personalization.
 */

import type { AgentContext, VehicleMatchInfo } from "../types.js";

// --- Constants ---

const SMS_MAX_CHARS = 480;
const EMAIL_MAX_WORDS = 200;

// --- Safety rails ---

const FORBIDDEN_TOPICS_EN = [
  "pricing negotiation",
  "monthly payments",
  "financing terms",
  "interest rates",
  "insurance costs or coverage",
  "credit scores or credit checks",
  "specific dollar amounts for payments",
  "lease buyout calculations",
  "trade-in valuations or appraisal numbers",
];

const FORBIDDEN_TOPICS_FR = [
  "negociation de prix",
  "paiements mensuels",
  "termes de financement",
  "taux d'interet",
  "couts ou couverture d'assurance",
  "cotes de credit ou verification de credit",
  "montants en dollars pour les paiements",
  "calculs de rachat de location",
  "evaluations d'echange ou chiffres d'estimation",
];

// --- Prompt Builder ---

/**
 * Builds the complete system prompt for the Instant Lead Response agent.
 * The prompt includes role definition, personalization requirements,
 * safety rails, inventory context, locale/tone directives, and length limits.
 */
export function buildInstantResponsePrompt(context: AgentContext): string {
  const { lead, locale, vehicleMatches, dealershipConfig, touchNumber } = context;

  const isEnglish = locale === "en-CA";
  const forbiddenTopics = isEnglish ? FORBIDDEN_TOPICS_EN : FORBIDDEN_TOPICS_FR;
  const customerFirstName = lead.first_name ?? (isEnglish ? "there" : "vous");
  const assignedRep = getAssignedRep(dealershipConfig);

  const sections: string[] = [];

  // 1. Role definition
  sections.push(buildRoleSection(dealershipConfig, locale));

  // 2. Customer context
  sections.push(buildCustomerSection(customerFirstName, lead, touchNumber, isEnglish));

  // 3. Inventory context
  sections.push(buildInventorySection(vehicleMatches, isEnglish));

  // 4. Response requirements
  sections.push(buildRequirementsSection(customerFirstName, assignedRep, isEnglish));

  // 5. Safety rails
  sections.push(buildSafetyRailsSection(forbiddenTopics, assignedRep, isEnglish));

  // 6. Tone directive
  sections.push(buildToneSection(dealershipConfig.tone, isEnglish));

  // 7. Language directive
  sections.push(buildLanguageSection(locale));

  // 8. Length constraints
  sections.push(buildLengthSection(isEnglish));

  return sections.join("\n\n");
}

function buildRoleSection(config: DealershipConfig, locale: "en-CA" | "fr-CA"): string {
  const isEnglish = locale === "en-CA";
  if (isEnglish) {
    return `## Role
You are a friendly, professional AI assistant for ${config.dealershipName}. You help potential customers learn about available vehicles and schedule visits. You are located at ${config.address}. Our phone number is ${config.phone}. Our hours are ${config.hours}.`;
  }
  return `## Role
Vous etes un assistant IA professionnel et amical pour ${config.dealershipName}. Vous aidez les clients potentiels a decouvrir les vehicules disponibles et a planifier des visites. Nous sommes situes au ${config.address}. Notre numero est ${config.phone}. Nos heures sont ${config.hours}.`;
}

function buildCustomerSection(
  firstName: string,
  lead: { source?: string | null },
  touchNumber: number,
  isEnglish: boolean,
): string {
  const sourceInfo = lead.source ? (isEnglish ? `Lead source: ${lead.source}.` : `Source du lead: ${lead.source}.`) : "";
  if (isEnglish) {
    return `## Customer
Customer first name: ${firstName}
Touch number: ${touchNumber} (this is the first contact)
${sourceInfo}`.trim();
  }
  return `## Client
Prenom du client: ${firstName}
Numero de contact: ${touchNumber} (ceci est le premier contact)
${sourceInfo}`.trim();
}

function buildInventorySection(vehicleMatches: VehicleMatchInfo[], isEnglish: boolean): string {
  if (vehicleMatches.length === 0) {
    if (isEnglish) {
      return `## Inventory
No specific vehicle matches found for this lead's interest. Provide a helpful, generic response inviting them to explore our current selection. Do NOT invent specific vehicles.`;
    }
    return `## Inventaire
Aucun vehicule specifique correspondant a l'interet de ce client n'a ete trouve. Fournissez une reponse utile et generique les invitant a explorer notre selection actuelle. N'inventez PAS de vehicules specifiques.`;
  }

  const header = isEnglish
    ? "## Inventory (based on our current listings)"
    : "## Inventaire (selon nos annonces actuelles)";

  const vehicleLines = vehicleMatches.map((vm, i) => formatVehicleMatch(vm, i + 1, isEnglish));

  return `${header}\n${vehicleLines.join("\n")}`;
}

function formatVehicleMatch(vm: VehicleMatchInfo, index: number, isEnglish: boolean): string {
  const featureList = vm.features.length > 0
    ? vm.features.slice(0, 3).join(", ")
    : (isEnglish ? "standard features" : "equipement standard");

  return `${index}. ${vm.year} ${vm.make} ${vm.model} ${vm.trim} in ${vm.color} — ${featureList} (Match score: ${Math.round(vm.matchScore * 100)}%)`;
}

function buildRequirementsSection(firstName: string, repName: string, isEnglish: boolean): string {
  if (isEnglish) {
    return `## Response Requirements
Your response MUST include:
- Address the customer by their first name: "${firstName}"
- Reference a specific vehicle from the inventory section above (if available)
- Mention one concrete detail about the vehicle (color, a specific feature)
- Include a soft call-to-action: suggest a test drive, visit, or conversation with ${repName}
- Always qualify inventory references with "based on our current listings"`;
  }
  return `## Exigences de reponse
Votre reponse DOIT inclure:
- S'adresser au client par son prenom: "${firstName}"
- Faire reference a un vehicule specifique de la section inventaire ci-dessus (si disponible)
- Mentionner un detail concret du vehicule (couleur, une caracteristique specifique)
- Inclure un appel a l'action doux: suggerer un essai routier, une visite ou une conversation avec ${repName}
- Toujours qualifier les references d'inventaire avec "selon nos annonces actuelles"`;
}

function buildSafetyRailsSection(forbiddenTopics: string[], repName: string, isEnglish: boolean): string {
  const topicList = forbiddenTopics.map((t) => `- ${t}`).join("\n");

  if (isEnglish) {
    return `## Safety Rails — STRICTLY FORBIDDEN
You MUST NOT discuss, mention, or provide information about:
${topicList}

If the customer asks about any of these topics, respond with:
"Great question! ${repName} on our team specializes in that — let me connect you so they can give you the most accurate information."

NEVER invent or guess vehicle features that are not listed in the inventory section above.`;
  }
  return `## Regles de securite — STRICTEMENT INTERDIT
Vous NE DEVEZ PAS discuter, mentionner ou fournir des informations sur:
${topicList}

Si le client pose des questions sur l'un de ces sujets, repondez avec:
"Excellente question! ${repName} de notre equipe se specialise dans ce domaine — laissez-moi vous mettre en contact pour qu'il puisse vous donner les informations les plus precises."

N'inventez JAMAIS et ne devinez PAS les caracteristiques du vehicule qui ne sont pas listees dans la section inventaire ci-dessus.`;
}

function buildToneSection(tone: "professional" | "friendly" | "casual", isEnglish: boolean): string {
  const toneDescriptions = {
    professional: isEnglish
      ? "Maintain a polished, respectful tone. Use complete sentences and proper grammar. Avoid slang or overly casual language."
      : "Maintenez un ton poli et respectueux. Utilisez des phrases completes et une grammaire correcte. Evitez l'argot ou un langage trop decontracte.",
    friendly: isEnglish
      ? "Be warm and approachable. Use a conversational tone while remaining professional. Light enthusiasm is welcome."
      : "Soyez chaleureux et accessible. Utilisez un ton conversationnel tout en restant professionnel. Un leger enthousiasme est bienvenu.",
    casual: isEnglish
      ? "Be relaxed and personable. Use a casual, conversational style like texting a friend. Keep it genuine and approachable."
      : "Soyez decontracte et sympathique. Utilisez un style decontracte et conversationnel comme si vous envoyiez un message a un ami. Restez authentique et accessible.",
  };

  const header = isEnglish ? "## Tone" : "## Ton";
  return `${header}\n${toneDescriptions[tone]}`;
}

function buildLanguageSection(locale: "en-CA" | "fr-CA"): string {
  if (locale === "en-CA") {
    return `## Language
Generate your response entirely in Canadian English (en-CA). Use Canadian spelling conventions where applicable (e.g., "colour" is acceptable).`;
  }
  return `## Langue
Generez votre reponse entierement en francais canadien (fr-CA). Utilisez le francais quebecois naturel, pas du francais de France traduit. Tutoyez si le ton est casual, vouvoyez sinon.`;
}

function buildLengthSection(isEnglish: boolean): string {
  if (isEnglish) {
    return `## Length Constraints
- For SMS: Keep your response under ${SMS_MAX_CHARS} characters total (fits in 3 SMS segments of 160 chars each). Be concise.
- For email: Keep your response under ${EMAIL_MAX_WORDS} words. Be thorough but not verbose.`;
  }
  return `## Contraintes de longueur
- Pour SMS: Gardez votre reponse sous ${SMS_MAX_CHARS} caracteres au total (tient dans 3 segments SMS de 160 caracteres). Soyez concis.
- Pour courriel: Gardez votre reponse sous ${EMAIL_MAX_WORDS} mots. Soyez complet mais pas verbeux.`;
}

function getAssignedRep(config: DealershipConfig): string {
  const salesRep = config.staff.find(
    (s) => s.role.toLowerCase().includes("sales") || s.role.toLowerCase().includes("vente"),
  );
  return salesRep?.name ?? config.staff[0]?.name ?? "our team";
}

export { SMS_MAX_CHARS, EMAIL_MAX_WORDS };
