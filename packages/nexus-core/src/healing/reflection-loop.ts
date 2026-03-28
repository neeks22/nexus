// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Reflection Loop — Haiku-powered quality evaluation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { AgentConfig } from '../types.js';
import { REFLECTION_MODEL, REFLECTION_MAX_RETRIES } from '../config/thresholds.js';
import { AnthropicProvider } from '../provider/anthropic.js';

export interface ReflectionResult {
  passed: boolean;
  feedback: string;
}

export interface ReflectionCapBreachError {
  kind: 'reflection_cap_breach';
  reason: string;
  attempts: number;
}

const REFLECTION_SYSTEM_PROMPT = `You are a quality evaluator for an AI agent framework.
Your job is to assess whether an agent's response meets quality standards for the given task.

Evaluate the response on the following criteria:
1. Relevance — does it address the topic and context?
2. Completeness — is it sufficiently detailed?
3. Coherence — is it logically structured and clear?
4. Appropriateness — does it match the agent's role and purpose?

Respond ONLY with a JSON object in this exact format:
{"passed": true, "feedback": "Brief explanation of why the response passes."}
OR
{"passed": false, "feedback": "Brief explanation of what is wrong and how to fix it."}

Do not include any text outside the JSON object.`;

export class ReflectionLoop {
  private readonly provider: AnthropicProvider;
  private readonly maxRetries: number;

  constructor(provider?: AnthropicProvider, maxRetries: number = REFLECTION_MAX_RETRIES) {
    this.provider = provider ?? new AnthropicProvider();
    this.maxRetries = maxRetries;
  }

  /**
   * Evaluate the quality of an agent's response using the Haiku reflection model.
   *
   * @param content     - The agent output to evaluate
   * @param agentConfig - The producing agent's configuration (provides role context)
   * @param context     - The original task/topic context
   * @returns ReflectionResult when evaluation completes within cap
   * @throws ReflectionCapBreachError when maxRetries exceeded
   */
  async reflect(
    content: string,
    agentConfig: AgentConfig,
    context: string,
  ): Promise<ReflectionResult> {
    const userPrompt = this.buildUserPrompt(content, agentConfig, context);

    let lastError: unknown;
    let attempts = 0;

    while (attempts < this.maxRetries + 1) {
      attempts += 1;

      try {
        const response = await this.provider.createMessage({
          model: REFLECTION_MODEL,
          systemPrompt: REFLECTION_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
          maxTokens: 256,
          cacheBreakpoints: false,
        });

        const result = this.parseReflectionResponse(response.content);
        if (result !== null) {
          return result;
        }

        // Unparseable response — try again
        lastError = new Error(`Reflection model returned unparseable response: ${response.content}`);
      } catch (err: unknown) {
        lastError = err;
      }
    }

    // All attempts consumed — emit tombstone signal
    const breachError: ReflectionCapBreachError = {
      kind: 'reflection_cap_breach',
      reason:
        lastError instanceof Error
          ? lastError.message
          : `Reflection failed after ${attempts} attempt(s)`,
      attempts,
    };

    throw breachError;
  }

  // ── Helpers ─────────────────────────────────────

  private buildUserPrompt(
    content: string,
    agentConfig: AgentConfig,
    context: string,
  ): string {
    return [
      `AGENT ROLE: ${agentConfig.name}`,
      `AGENT PURPOSE: ${agentConfig.systemPrompt.slice(0, 300)}${agentConfig.systemPrompt.length > 300 ? '...' : ''}`,
      ``,
      `TASK CONTEXT:`,
      context,
      ``,
      `AGENT RESPONSE TO EVALUATE:`,
      content,
    ].join('\n');
  }

  private parseReflectionResponse(raw: string): ReflectionResult | null {
    try {
      // Strip code fences if the model wrapped its JSON
      const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      const parsed = JSON.parse(cleaned) as unknown;

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'passed' in parsed &&
        'feedback' in parsed &&
        typeof (parsed as Record<string, unknown>)['passed'] === 'boolean' &&
        typeof (parsed as Record<string, unknown>)['feedback'] === 'string'
      ) {
        return {
          passed: (parsed as { passed: boolean; feedback: string }).passed,
          feedback: (parsed as { passed: boolean; feedback: string }).feedback,
        };
      }

      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Type guard to check if an unknown throw is a ReflectionCapBreachError.
 */
export function isReflectionCapBreach(err: unknown): err is ReflectionCapBreachError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'kind' in err &&
    (err as Record<string, unknown>)['kind'] === 'reflection_cap_breach'
  );
}
