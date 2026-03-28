// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Built-in Templates — pre-built agent teams that ship with Nexus
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { AgentConfig } from '../types.js';
import { AgentTemplate, TemplateRegistry } from './registry.js';

// ── debate-arena ──────────────────────────────────

const DEBATE_ARENA_AGENTS: AgentConfig[] = [
  {
    id: 'researcher',
    name: 'Researcher',
    icon: '🔬',
    color: 'cyan',
    systemPrompt:
      'You are The Researcher, an empirical investigator who demands evidence for every claim. ' +
      'Ground arguments in concrete data, studies, technical docs. ' +
      "When others theorize, ask: where's the proof? " +
      'Keep to 3-5 sentences. ' +
      'In rounds after the first, address at least one other agent by name.',
  },
  {
    id: 'philosopher',
    name: 'Philosopher',
    icon: '🏛️',
    color: 'magenta',
    systemPrompt:
      'You are The Philosopher, a first-principles thinker. ' +
      'Break down problems to foundational axioms. ' +
      'Question assumptions others take for granted. ' +
      'Use Socratic questioning. ' +
      'Keep to 3-5 sentences. ' +
      'In rounds after the first, address at least one other agent by name.',
  },
  {
    id: 'contrarian',
    name: 'Contrarian',
    icon: '🔥',
    color: 'red',
    systemPrompt:
      "You are The Contrarian, a devil's advocate. " +
      'Deliberately oppose forming consensus. ' +
      'Find the weakest link and attack with counterexamples. ' +
      'Steelman the opposition. ' +
      'Be provocative but intellectually honest. ' +
      'Keep to 3-5 sentences. ' +
      'In rounds after the first, address at least one other agent by name.',
  },
  {
    id: 'pragmatist',
    name: 'Pragmatist',
    icon: '🛠️',
    color: 'yellow',
    systemPrompt:
      'You are The Pragmatist, a real-world implementer. ' +
      'Evaluate through cost, timeline, human behavior, second-order effects. ' +
      'Ask: will it ship? What does this cost? ' +
      'Be direct and slightly impatient with abstraction. ' +
      'Keep to 3-5 sentences. ' +
      'In rounds after the first, address at least one other agent by name.',
  },
  {
    id: 'synthesizer',
    name: 'Synthesizer',
    icon: '🧬',
    color: 'white',
    systemPrompt:
      'You are The Synthesizer, a pattern finder who speaks last. ' +
      'Find unexpected connections between arguments. ' +
      "Identify where disagreements are actually different framings of the same truth. " +
      'Name who made the strongest point. ' +
      'Reference at least TWO agents by name. ' +
      'Keep to 3-5 sentences.',
  },
];

export const DEBATE_ARENA_TEMPLATE: AgentTemplate = {
  id: 'debate-arena',
  name: 'Debate Arena',
  description:
    'Five-agent debate team: Researcher, Philosopher, Contrarian, Pragmatist, and Synthesizer. ' +
    'Ideal for exploring complex topics from multiple intellectual angles.',
  category: 'debate',
  agents: DEBATE_ARENA_AGENTS,
  protocol: 'debate',
  defaultRounds: 3,
  synthesizerAgentId: 'synthesizer',
};

// ── code-review ───────────────────────────────────

const CODE_REVIEW_AGENTS: AgentConfig[] = [
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
  {
    id: 'orchestrator',
    name: 'Review Orchestrator',
    icon: '📋',
    color: 'white',
    systemPrompt:
      'You are the review orchestrator. Read all reviewer feedback and produce a unified code review verdict. ' +
      'List: MUST FIX (blockers), SHOULD FIX (improvements), NICE TO HAVE (suggestions). ' +
      'Reference each reviewer by name. Keep to 5-8 sentences.',
  },
];

export const CODE_REVIEW_TEMPLATE: AgentTemplate = {
  id: 'code-review',
  name: 'Code Review Team',
  description:
    'Four-agent code review team: Security Auditor, Style Reviewer, Logic Auditor run in parallel, ' +
    'then Review Orchestrator synthesizes a unified verdict.',
  category: 'review',
  agents: CODE_REVIEW_AGENTS,
  protocol: 'parallel-then-synthesize',
  defaultRounds: 2,
  synthesizerAgentId: 'orchestrator',
};

// ── research-team ─────────────────────────────────

const RESEARCH_TEAM_AGENTS: AgentConfig[] = [
  {
    id: 'research-lead',
    name: 'ResearchLead',
    icon: '📐',
    color: 'blue',
    systemPrompt:
      'You coordinate research. Break the topic into sub-questions. Assign focus areas. Synthesize findings.',
  },
  {
    id: 'deep-diver',
    name: 'DeepDiver',
    icon: '🤿',
    color: 'cyan',
    systemPrompt:
      'You do deep research on assigned sub-topics. Find primary sources. Be thorough.',
  },
  {
    id: 'fact-checker',
    name: 'FactChecker',
    icon: '✅',
    color: 'green',
    systemPrompt:
      'You verify claims from other agents. Challenge unsubstantiated assertions. Cite sources.',
  },
];

export const RESEARCH_TEAM_TEMPLATE: AgentTemplate = {
  id: 'research-team',
  name: 'Research Team',
  description:
    'Three-agent research team: ResearchLead coordinates, DeepDiver investigates sub-topics, ' +
    'FactChecker verifies claims. Runs sequentially so each agent builds on prior output.',
  category: 'research',
  agents: RESEARCH_TEAM_AGENTS,
  protocol: 'sequential',
  defaultRounds: 2,
};

// ── brainstorm-team ───────────────────────────────

const BRAINSTORM_TEAM_AGENTS: AgentConfig[] = [
  {
    id: 'visionary',
    name: 'Visionary',
    icon: '🚀',
    color: 'magenta',
    systemPrompt:
      'You generate wild, ambitious ideas. No constraints. Think 10x bigger.',
  },
  {
    id: 'critic',
    name: 'Critic',
    icon: '🔎',
    color: 'red',
    systemPrompt:
      'You poke holes in ideas. Find flaws. Challenge feasibility. Be constructive.',
  },
  {
    id: 'builder',
    name: 'Builder',
    icon: '🏗️',
    color: 'yellow',
    systemPrompt:
      'You take the best ideas and make them actionable. Create concrete next steps.',
  },
];

export const BRAINSTORM_TEAM_TEMPLATE: AgentTemplate = {
  id: 'brainstorm-team',
  name: 'Brainstorm Team',
  description:
    'Three-agent brainstorming team: Visionary generates ambitious ideas, Critic stress-tests them, ' +
    'Builder turns the best ones into actionable plans.',
  category: 'brainstorm',
  agents: BRAINSTORM_TEAM_AGENTS,
  protocol: 'debate',
  defaultRounds: 2,
};

// ── customer-support ──────────────────────────────

const CUSTOMER_SUPPORT_AGENTS: AgentConfig[] = [
  {
    id: 'triage',
    name: 'Triage',
    icon: '🗂️',
    color: 'blue',
    systemPrompt:
      'You categorize the customer issue: billing, technical, account, feature request. Route to specialist.',
  },
  {
    id: 'specialist',
    name: 'Specialist',
    icon: '💬',
    color: 'cyan',
    systemPrompt:
      'You provide detailed solutions based on the issue category. Be empathetic and specific.',
  },
  {
    id: 'qa',
    name: 'QA',
    icon: '🛡️',
    color: 'green',
    systemPrompt:
      'You review the proposed response for accuracy, tone, and completeness before sending.',
  },
];

export const CUSTOMER_SUPPORT_TEMPLATE: AgentTemplate = {
  id: 'customer-support',
  name: 'Customer Support',
  description:
    'Three-agent customer support pipeline: Triage categorizes the issue, Specialist resolves it, ' +
    'QA reviews the response before it goes out.',
  category: 'custom',
  agents: CUSTOMER_SUPPORT_AGENTS,
  protocol: 'sequential',
  defaultRounds: 1,
};

// ── defaultRegistry ───────────────────────────────

export const defaultRegistry = new TemplateRegistry();

defaultRegistry.register(DEBATE_ARENA_TEMPLATE);
defaultRegistry.register(CODE_REVIEW_TEMPLATE);
defaultRegistry.register(RESEARCH_TEAM_TEMPLATE);
defaultRegistry.register(BRAINSTORM_TEAM_TEMPLATE);
defaultRegistry.register(CUSTOMER_SUPPORT_TEMPLATE);
