// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Templates — public API for the agent templates system
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export { TemplateRegistry } from './registry.js';
export type { AgentTemplate } from './registry.js';

export {
  defaultRegistry,
  // Framework templates
  DEBATE_ARENA_TEMPLATE,
  CODE_REVIEW_TEMPLATE,
  RESEARCH_TEAM_TEMPLATE,
  BRAINSTORM_TEAM_TEMPLATE,
  CUSTOMER_SUPPORT_TEMPLATE,
  // Agency client templates
  EMAIL_RESPONDER_TEMPLATE,
  LEAD_QUALIFIER_TEMPLATE,
  SUPPORT_BOT_TEMPLATE,
  DOC_PROCESSOR_TEMPLATE,
} from './built-in.js';
