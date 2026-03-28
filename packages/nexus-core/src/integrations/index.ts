// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  integrations — Public API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Email ──────────────────────────────────────────
export { EmailIntegration, NexusEmailError } from './email.js';
export type { EmailConfig, EmailMessage, EmailSendResult } from './email.js';

// ── Webhook ────────────────────────────────────────
export { WebhookIntegration, NexusWebhookError } from './webhook.js';
export type { WebhookConfig, WebhookSendResult } from './webhook.js';

// ── Slack ──────────────────────────────────────────
export { SlackIntegration, NexusSlackError } from './slack.js';
export type { SlackConfig } from './slack.js';

// ── CRM ────────────────────────────────────────────
export { CRMIntegration, NexusCRMError } from './crm.js';
export type { CRMConfig, CRMContact, CRMLead } from './crm.js';

// ── Storage ────────────────────────────────────────
export { StorageIntegration, NexusStorageError } from './storage.js';
export type { StorageConfig } from './storage.js';
