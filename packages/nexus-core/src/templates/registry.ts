// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TemplateRegistry — manages available agent team templates
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { AgentConfig, TeamConfig, TeamProtocol } from '../types.js';

// ── AgentTemplate ─────────────────────────────────

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'debate' | 'review' | 'research' | 'brainstorm' | 'custom';
  agents: AgentConfig[];
  protocol: TeamProtocol;
  defaultRounds: number;
  synthesizerAgentId?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TemplateRegistry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class TemplateRegistry {
  private readonly templates: Map<string, AgentTemplate> = new Map();

  /**
   * Register a template. Overwrites any existing template with the same id.
   */
  register(template: AgentTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Retrieve a template by id. Returns undefined if not found.
   */
  get(id: string): AgentTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Return all registered templates as an array.
   */
  list(): AgentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Return all templates that match the given category.
   */
  listByCategory(category: string): AgentTemplate[] {
    return this.list().filter((t) => t.category === category);
  }

  /**
   * Build a TeamConfig from a registered template, optionally overriding
   * top-level fields. Throws if the template id is not found.
   */
  createTeamFromTemplate(
    templateId: string,
    overrides?: Partial<TeamConfig>,
  ): TeamConfig {
    const template = this.templates.get(templateId);
    if (template === undefined) {
      throw new Error(
        `TemplateRegistry: template "${templateId}" not found. ` +
          `Available: ${Array.from(this.templates.keys()).join(', ') || '(none)'}`,
      );
    }

    const base: TeamConfig = {
      agents: template.agents,
      protocol: template.protocol,
      rounds: template.defaultRounds,
      synthesizerAgentId: template.synthesizerAgentId,
    };

    return { ...base, ...overrides };
  }
}
