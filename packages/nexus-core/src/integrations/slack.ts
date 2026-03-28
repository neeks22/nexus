// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SlackIntegration — Incoming webhook messages, alerts, debate updates
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { classifyError } from '../healing/error-taxonomy.js';
import type { ErrorClassification } from '../types.js';

// ── Config ─────────────────────────────────────────

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

// ── NexusSlackError ────────────────────────────────

export class NexusSlackError extends Error {
  readonly classification: ErrorClassification;
  readonly originalError: unknown;

  constructor(message: string, classification: ErrorClassification, originalError: unknown) {
    super(message);
    this.name = 'NexusSlackError';
    this.classification = classification;
    this.originalError = originalError;
  }
}

// ── Severity colour map ────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#FF0000',
  error: '#FF4500',
  warning: '#FFA500',
  info: '#36A64F',
  debug: '#AAAAAA',
};

function severityColor(severity: string): string {
  return SEVERITY_COLORS[severity.toLowerCase()] ?? '#AAAAAA';
}

// ── Helpers ────────────────────────────────────────

function buildNexusSlackError(raw: unknown, context: string): NexusSlackError {
  const classification = classifyError(raw);
  const message =
    raw instanceof Error
      ? `${context}: ${raw.message}`
      : `${context}: ${String(raw)}`;
  return new NexusSlackError(message, classification, raw);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SlackIntegration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class SlackIntegration {
  private readonly config: SlackConfig;

  constructor(config: SlackConfig) {
    this.config = config;
  }

  // ── sendMessage ───────────────────────────────────
  // Posts a plain-text message. Optional `blocks` array
  // enables the full Slack Block Kit layout.

  async sendMessage(text: string, blocks?: unknown[]): Promise<void> {
    const payload: Record<string, unknown> = {
      text,
      ...(this.config.channel ? { channel: this.config.channel } : {}),
      ...(this.config.username ? { username: this.config.username } : {}),
      ...(this.config.iconEmoji ? { icon_emoji: this.config.iconEmoji } : {}),
      ...(blocks && blocks.length > 0 ? { blocks } : {}),
    };

    await this.post(payload);
  }

  // ── sendAlert ─────────────────────────────────────
  // Sends a structured alert attachment using Slack's
  // legacy attachment format for coloured side-bar support.

  async sendAlert(alert: {
    severity: string;
    agent: string;
    message: string;
  }): Promise<void> {
    const color = severityColor(alert.severity);
    const ts = Math.floor(Date.now() / 1000);

    const payload: Record<string, unknown> = {
      text: `*[${alert.severity.toUpperCase()}]* Alert from agent \`${alert.agent}\``,
      ...(this.config.channel ? { channel: this.config.channel } : {}),
      ...(this.config.username ? { username: this.config.username } : {}),
      ...(this.config.iconEmoji ? { icon_emoji: this.config.iconEmoji } : {}),
      attachments: [
        {
          color,
          fields: [
            { title: 'Agent', value: alert.agent, short: true },
            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
            { title: 'Message', value: alert.message, short: false },
          ],
          footer: 'Nexus Self-Healing Framework',
          ts,
        },
      ],
    };

    await this.post(payload);
  }

  // ── sendDebateUpdate ──────────────────────────────
  // Posts a structured Block Kit card showing a single
  // agent contribution from a running debate round.

  async sendDebateUpdate(
    agentName: string,
    content: string,
    round: number,
  ): Promise<void> {
    // Truncate long content for Slack display (max 2900 chars to stay under
    // the 3000-char block text limit).
    const displayContent =
      content.length > 2900
        ? `${content.slice(0, 2900)}…`
        : content;

    const blocks: unknown[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Round ${round} — ${agentName}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: displayContent,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Nexus Debate* | Round ${round} | Agent: \`${agentName}\``,
          },
        ],
      },
      { type: 'divider' },
    ];

    await this.sendMessage(`Round ${round} — ${agentName}: ${displayContent}`, blocks);
  }

  // ── post ──────────────────────────────────────────
  // Internal: POST JSON to the Slack Incoming Webhook URL.

  private async post(payload: Record<string, unknown>): Promise<void> {
    let response: Response;
    try {
      response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw buildNexusSlackError(err, 'Slack network error');
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const synthetic = new Error(`HTTP ${response.status}: ${body}`);
      throw buildNexusSlackError(synthetic, 'Slack API error');
    }

    // Slack Incoming Webhooks return "ok" as plain text on success.
    const body = await response.text().catch(() => '');
    if (body !== 'ok') {
      const synthetic = new Error(`Unexpected Slack response: ${body}`);
      throw buildNexusSlackError(synthetic, 'Slack unexpected response');
    }
  }
}
