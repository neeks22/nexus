export { Intent } from './types.js';
export type {
  IntentResult,
  HandoffRule,
  HandoffAction,
  HandoffEvaluation,
} from './types.js';

export { IntentClassifier } from './intent-classifier.js';
export { HandoffRuleEngine } from './handoff-rules.js';

export {
  getTemplate,
  renderTemplate,
  getAllTemplateKeys,
  getAllLocales,
} from './objection-templates.js';
export type {
  TemplateVariables,
  TemplateKey,
  Locale,
} from './objection-templates.js';
