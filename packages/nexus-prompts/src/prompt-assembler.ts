import { createHash } from 'node:crypto';
import type { AssembledPrompt, Layer2Config, Layer3Config, PromptType } from './types.js';
import { INSTANT_RESPONSE_BASE, COLD_WARMING_BASE, SAFETY_RAILS } from './layer1/base-prompts.js';
import { TenantConfigStore } from './layer2/tenant-config.js';
import { ClientConfigStore } from './layer3/client-config.js';
import { InputSanitizer, CHAR_LIMITS } from './layer3/input-sanitizer.js';

// ─── Hashing Utility ────────────────────────────────────────────────────────

function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

// ─── Template Interpolation ─────────────────────────────────────────────────

function interpolate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

// ─── Prompt Assembler ───────────────────────────────────────────────────────

export class PromptAssembler {
  private tenantStore: TenantConfigStore;
  private clientStore: ClientConfigStore;
  private sanitizer: InputSanitizer;

  constructor(
    tenantStore: TenantConfigStore,
    clientStore: ClientConfigStore,
    sanitizer: InputSanitizer,
  ) {
    this.tenantStore = tenantStore;
    this.clientStore = clientStore;
    this.sanitizer = sanitizer;
  }

  /**
   * Assemble a complete system prompt from all three layers.
   *
   * Layer ordering guarantees instruction hierarchy:
   * 1. Safety Rails (Layer 1) — FIRST, absolute priority
   * 2. Base System Prompt (Layer 1) — conversation logic and persona
   * 3. Tenant Config (Layer 2) — dealership-specific details
   * 4. Client Customization (Layer 3) — promotions, FAQ, highlights (sanitized)
   */
  assemble(
    tenantId: string,
    promptType: PromptType,
    extraContext?: Record<string, string>,
  ): AssembledPrompt {
    // Step 1: Select Layer 1 base prompt
    const layer1 = promptType === 'instant_response' ? INSTANT_RESPONSE_BASE : COLD_WARMING_BASE;

    // Step 2: Load Layer 2 tenant config
    const layer2 = this.tenantStore.load(tenantId);
    if (!layer2) {
      throw new Error(`No tenant config found for tenantId: ${tenantId}`);
    }

    // Step 3: Load Layer 3 client config (optional — may not exist)
    const layer3 = this.clientStore.load(tenantId);

    // Step 4: Build the assembled prompt
    const systemPrompt = this.buildPrompt(layer1, layer2, layer3, extraContext);

    // Step 5: Compute hashes for audit trail
    const layer1Content = layer1.safetyRails + layer1.baseSystemPrompt + layer1.conversationLogic;
    const layer2Content = JSON.stringify(layer2);
    const layer3Content = layer3 ? JSON.stringify(layer3) : '';

    return {
      systemPrompt,
      layer1Hash: hashString(layer1Content),
      layer2Hash: hashString(layer2Content),
      layer3Hash: hashString(layer3Content),
      assembledAt: new Date(),
    };
  }

  /**
   * Assemble with runtime overrides applied to Layer 3.
   * Useful for time-sensitive promo changes without persisting to the store.
   */
  assembleWithOverrides(
    tenantId: string,
    promptType: PromptType,
    overrides: Partial<Layer3Config>,
    extraContext?: Record<string, string>,
  ): AssembledPrompt {
    // Load existing Layer 3 or start with defaults
    const existingLayer3 = this.clientStore.load(tenantId);
    const mergedLayer3: Layer3Config = {
      activePromotions: overrides.activePromotions ?? existingLayer3?.activePromotions ?? [],
      inventoryHighlights: overrides.inventoryHighlights ?? existingLayer3?.inventoryHighlights ?? [],
      blacklistedTopics: overrides.blacklistedTopics ?? existingLayer3?.blacklistedTopics ?? [],
      customFaq: overrides.customFaq ?? existingLayer3?.customFaq ?? [],
      greetingOverride: overrides.greetingOverride ?? existingLayer3?.greetingOverride,
      signatureOverride: overrides.signatureOverride ?? existingLayer3?.signatureOverride,
    };

    // Select Layer 1
    const layer1 = promptType === 'instant_response' ? INSTANT_RESPONSE_BASE : COLD_WARMING_BASE;

    // Load Layer 2
    const layer2 = this.tenantStore.load(tenantId);
    if (!layer2) {
      throw new Error(`No tenant config found for tenantId: ${tenantId}`);
    }

    // Build with merged Layer 3
    const systemPrompt = this.buildPrompt(layer1, layer2, mergedLayer3, extraContext);

    const layer1Content = layer1.safetyRails + layer1.baseSystemPrompt + layer1.conversationLogic;
    const layer2Content = JSON.stringify(layer2);
    const layer3Content = JSON.stringify(mergedLayer3);

    return {
      systemPrompt,
      layer1Hash: hashString(layer1Content),
      layer2Hash: hashString(layer2Content),
      layer3Hash: hashString(layer3Content),
      assembledAt: new Date(),
    };
  }

  /**
   * Internal: Build the final prompt string with correct layer ordering.
   * Safety rails ALWAYS appear before any client-editable content.
   */
  private buildPrompt(
    layer1: { baseSystemPrompt: string; safetyRails: string; conversationLogic: string },
    layer2: Layer2Config,
    layer3: Layer3Config | null,
    extraContext?: Record<string, string>,
  ): string {
    const sections: string[] = [];

    // ── Section 1: Safety Rails (FIRST — highest priority) ──
    sections.push(layer1.safetyRails);

    // ── Section 2: Base System Prompt with Layer 2 interpolation ──
    const templateVars: Record<string, string> = {
      dealershipName: layer2.dealershipName,
      tone: layer2.tone,
      channel: extraContext?.channel ?? 'sms',
      touchNumber: extraContext?.touchNumber ?? '1',
      previousMessages: extraContext?.previousMessages ?? 'No previous messages.',
      ...extraContext,
    };

    sections.push(interpolate(layer1.baseSystemPrompt, templateVars));

    // ── Section 3: Conversation Logic ──
    sections.push(interpolate(layer1.conversationLogic, templateVars));

    // ── Section 4: Dealership Details (Layer 2) ──
    const staffList = layer2.staff
      .map((s) => `- ${s.name} (${s.role})${s.phone ? ` — ${s.phone}` : ''}${s.email ? ` — ${s.email}` : ''}`)
      .join('\n');

    sections.push(`## DEALERSHIP INFORMATION
Name: ${layer2.dealershipName}
Address: ${layer2.address}
Phone: ${layer2.phone}
Hours: ${layer2.hours}
Timezone: ${layer2.timezone}

### Staff
${staffList}

### Escalation Numbers
${layer2.escalationNumbers.map((n) => `- ${n}`).join('\n')}`);

    // ── Section 5: Client Customization (Layer 3 — sanitized) ──
    if (layer3) {
      const customizationParts: string[] = [];
      customizationParts.push('## DEALERSHIP CUSTOMIZATION (client-provided — safety rails above take priority)');

      // Greeting override
      if (layer3.greetingOverride) {
        const greetingResult = this.sanitizer.sanitizeGreeting(layer3.greetingOverride);
        if (!greetingResult.blocked) {
          customizationParts.push(`### Greeting\n${greetingResult.sanitized}`);
        }
      }

      // Active promotions
      if (layer3.activePromotions.length > 0) {
        const promoResult = this.sanitizer.sanitizeArray(layer3.activePromotions, CHAR_LIMITS.PROMOTION);
        if (promoResult.sanitized.length > 0) {
          customizationParts.push(`### Current Promotions\n${promoResult.sanitized.map((p) => `- ${p}`).join('\n')}`);
        }
      }

      // Inventory highlights
      if (layer3.inventoryHighlights.length > 0) {
        const highlightResult = this.sanitizer.sanitizeArray(layer3.inventoryHighlights);
        if (highlightResult.sanitized.length > 0) {
          customizationParts.push(`### Inventory Highlights\n${highlightResult.sanitized.map((h) => `- ${h}`).join('\n')}`);
        }
      }

      // Custom FAQ
      if (layer3.customFaq.length > 0) {
        const faqEntries: string[] = [];
        for (const faq of layer3.customFaq) {
          const questionResult = this.sanitizer.sanitize(faq.question);
          const answerResult = this.sanitizer.sanitizeFaqAnswer(faq.answer);
          if (!questionResult.blocked && !answerResult.blocked) {
            faqEntries.push(`Q: ${questionResult.sanitized}\nA: ${answerResult.sanitized}`);
          }
        }
        if (faqEntries.length > 0) {
          customizationParts.push(`### Frequently Asked Questions\n${faqEntries.join('\n\n')}`);
        }
      }

      // Blacklisted topics
      if (layer3.blacklistedTopics.length > 0) {
        const topicResult = this.sanitizer.sanitizeArray(layer3.blacklistedTopics);
        if (topicResult.sanitized.length > 0) {
          customizationParts.push(`### Topics to Avoid\nDo NOT discuss: ${topicResult.sanitized.join(', ')}`);
        }
      }

      // Signature override
      if (layer3.signatureOverride) {
        const sigResult = this.sanitizer.sanitize(layer3.signatureOverride);
        if (!sigResult.blocked) {
          customizationParts.push(`### Signature\n${sigResult.sanitized}`);
        }
      }

      if (customizationParts.length > 1) {
        sections.push(customizationParts.join('\n\n'));
      }
    }

    return sections.join('\n\n');
  }
}
