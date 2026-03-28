// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Code Review Team — Agent Configurations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { AgentConfig } from '../../../packages/nexus-core/src/types.js';

// ── Reviewer agents (run in parallel, Round 1) ───────

export const REVIEWER_AGENTS: AgentConfig[] = [
  {
    id: 'security',
    name: 'Security Auditor',
    icon: '🔒',
    color: 'red',
    systemPrompt:
      'You are a security auditor. Review code for vulnerabilities: injection attacks, XSS, ' +
      'credential exposure, unsafe permissions, insecure dependencies. ' +
      'Be specific about line numbers and severity. Keep to 3-5 sentences.',
  },
  {
    id: 'style',
    name: 'Style Reviewer',
    icon: '🎨',
    color: 'cyan',
    systemPrompt:
      'You are a code style reviewer. Check naming conventions, code organization, readability, ' +
      'DRY violations, and TypeScript best practices. ' +
      'Suggest specific improvements. Keep to 3-5 sentences.',
  },
  {
    id: 'logic',
    name: 'Logic Auditor',
    icon: '🧠',
    color: 'yellow',
    systemPrompt:
      'You are a logic auditor. Review code for correctness: edge cases, race conditions, ' +
      'off-by-one errors, null handling, error propagation. Find bugs. Keep to 3-5 sentences.',
  },
];

// ── Orchestrator agent (runs last, Round 2) ──────────

export const ORCHESTRATOR_AGENT: AgentConfig = {
  id: 'orchestrator',
  name: 'Review Orchestrator',
  icon: '📋',
  color: 'white',
  systemPrompt:
    'You are the review orchestrator. Read all reviewer feedback and produce a unified code review verdict. ' +
    'List: MUST FIX (blockers), SHOULD FIX (improvements), NICE TO HAVE (suggestions). ' +
    'Reference each reviewer by name. Keep to 5-8 sentences.',
};
