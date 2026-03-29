// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Cold Lead Warming — System Prompt Builder
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { AgentContext, VehicleMatchInfo, ConversationEntry } from "../types.js";

// --- Safety Rails (same as instant response) ---

const SAFETY_RAILS = `## SAFETY RAILS — NON-NEGOTIABLE
You MUST NOT include any of the following in your message:
- Pricing negotiation or specific prices (other than MSRP with disclaimer)
- Monthly payment amounts or estimates
- Financing terms, interest rates, or APR
- Credit score references
- Insurance information
- Availability guarantees (always say "based on our current listings")
- Vehicle features not explicitly listed in the inventory data below
- Promises or commitments the dealership has not authorized

If the customer asks about pricing, financing, or trade-in, acknowledge their question warmly and tell them a team member will be in touch to help with the details.`;

const NO_REPEAT_INSTRUCTION = `## MESSAGE STRATEGY — CRITICAL
Never repeat the same message angle. Read the conversation history and use a different approach each time.
If you previously mentioned a specific feature, pick a different one.
If you previously asked about a test drive, try a different CTA (e.g., "any questions?", "want more info on the trim options?").
Vary your opening line every single time. Do NOT start with the same greeting.`;

// --- Tone directives by touch range ---

function buildToneDirective(touchNumber: number): string {
  if (touchNumber <= 2) {
    return `## TONE — ENTHUSIASTIC (Touch ${touchNumber})
Be enthusiastic and excited to help. You are reaching out because you genuinely want to help this customer find the right vehicle.
Sound warm, energetic, and eager. Reference a specific vehicle from inventory. Include a soft call-to-action (e.g., test drive, more info).
Keep it concise and friendly — this is an early touch, so be inviting, not pushy.`;
  }

  if (touchNumber <= 5) {
    return `## TONE — CONSULTATIVE (Touch ${touchNumber})
Be helpful and consultative. You have reached out before, so add value this time rather than just following up.
Share something new: a specific feature highlight, a new arrival that matches their interest, or a current promotion.
Position yourself as a knowledgeable resource. Be professional but warm. Avoid sounding repetitive or pushy.
Demonstrate expertise — mention specific details about the vehicle that would matter to a buyer.`;
  }

  if (touchNumber === 6) {
    return `## TONE — RESPECTFUL CLOSE (Touch 6 — Break-up Message)
This is the break-up touch. Be respectful and low-pressure. The goal is to trigger loss aversion.
Acknowledge that the timing might not be right. Make it clear you respect their time and there is no pressure.
Let them know the door is always open. Keep it short, warm, and genuine.
Use language like: "Looks like the timing might not be right — no worries, I'm here when you're ready."`;
  }

  // Touch 7+
  return `## TONE — INFORMATIONAL (Touch ${touchNumber} — Monthly Nurture)
This is a monthly nurture message. Be light, informational, and no-pressure.
Share something useful: new inventory arrivals matching their interest, seasonal promotions, or market updates.
Keep it brief and low-key. The goal is to stay top of mind without being annoying.
Do NOT ask them to come in or book anything. Just share information and let them reach out if interested.`;
}

function buildLanguageDirective(locale: "en-CA" | "fr-CA"): string {
  if (locale === "fr-CA") {
    return `## LANGUAGE DIRECTIVE
Write your entire response in natural Quebec French. Use Quebec expressions and phrasing — not France French, not machine-translated French.
Examples of preferred phrasing: "essai routier" (not "essai de conduite"), "char" or "vehicule", "concessionnaire".`;
  }

  return `## LANGUAGE DIRECTIVE
Write your entire response in Canadian English. Be professional but conversational.`;
}

function buildInventorySection(vehicleMatches: VehicleMatchInfo[]): string {
  if (vehicleMatches.length === 0) {
    return `## INVENTORY
No specific vehicle matches available. Reference the dealership's general inventory and invite them to check out new arrivals.`;
  }

  const vehicleLines = vehicleMatches.map((v, i) => {
    const featureStr = v.features.length > 0
      ? ` — ${v.features.slice(0, 3).join(", ")}`
      : "";
    return `${i + 1}. ${v.year} ${v.make} ${v.model} ${v.trim} in ${v.color}${featureStr}`;
  });

  return `## INVENTORY — Available vehicles matching customer interest
${vehicleLines.join("\n")}

Reference at least one specific vehicle by name. Mention 1-2 features from the listing.
Always qualify with "based on our current listings" when referencing availability.`;
}

function buildConversationHistorySection(history: ConversationEntry[]): string {
  if (history.length === 0) {
    return `## CONVERSATION HISTORY
No previous messages. This is the first outreach.`;
  }

  const historyLines = history.map((entry, i) => {
    const roleLabel = entry.role === "ai" ? "You (AI)" : "Customer";
    return `${i + 1}. ${roleLabel}: ${entry.content}`;
  });

  return `## CONVERSATION HISTORY
${historyLines.join("\n\n")}

Review this history carefully. Do NOT repeat the same angle, greeting, feature, or CTA you used before.`;
}

/**
 * Builds the full system prompt for the Cold Lead Warming agent.
 * Adapts tone and strategy by touch number:
 *   - Touch 1-2: enthusiastic
 *   - Touch 3-5: consultative
 *   - Touch 6: respectful close (break-up)
 *   - Touch 7+: informational (monthly nurture)
 */
export function buildColdWarmingPrompt(context: AgentContext): string {
  const {
    lead,
    locale,
    vehicleMatches,
    dealershipConfig,
    touchNumber,
    conversationHistory,
  } = context;

  const customerFirstName = lead.first_name ?? (locale === "en-CA" ? "there" : "vous");
  const assignedRep = dealershipConfig.staff.find(
    (s) => s.role.toLowerCase().includes("sales") || s.role.toLowerCase().includes("vente"),
  );
  const repName = assignedRep?.name ?? dealershipConfig.staff[0]?.name ?? "our team";

  const sections: string[] = [
    `You are an AI assistant for ${dealershipConfig.dealershipName}, a Canadian car dealership. You are writing a message to ${customerFirstName}.`,
    `The assigned sales representative is ${repName}. The dealership can be reached at ${dealershipConfig.phone} at ${dealershipConfig.address}.`,
    buildToneDirective(touchNumber),
    buildLanguageDirective(locale),
    SAFETY_RAILS,
    NO_REPEAT_INSTRUCTION,
    buildInventorySection(vehicleMatches),
    buildConversationHistorySection(conversationHistory ?? []),
  ];

  return sections.join("\n\n");
}
