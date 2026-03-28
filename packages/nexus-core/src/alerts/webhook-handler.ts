// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  WebhookHandler — Ship alerts to Slack / Discord
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Alert } from './alert-manager.js';

// ── Colour map ───────────────────────────────────

const SEVERITY_COLORS = {
  info: {
    slack: '#36a64f',     // green
    discord: 0x57f287,   // green
  },
  warning: {
    slack: '#ffae00',     // amber
    discord: 0xfee75c,   // yellow
  },
  critical: {
    slack: '#d93f3f',     // red
    discord: 0xed4245,   // red
  },
} as const;

const SEVERITY_EMOJI: Record<Alert['severity'], string> = {
  info: ':white_check_mark:',
  warning: ':warning:',
  critical: ':rotating_light:',
};

// ── Slack payload types ──────────────────────────

interface SlackAttachment {
  color: string;
  title: string;
  text: string;
  fields: Array<{ title: string; value: string; short: boolean }>;
  footer: string;
  ts: number;
}

interface SlackPayload {
  text: string;
  attachments: SlackAttachment[];
}

// ── Discord payload types ────────────────────────

interface DiscordEmbedField {
  name: string;
  value: string;
  inline: boolean;
}

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields: DiscordEmbedField[];
  footer: { text: string };
  timestamp: string;
}

interface DiscordPayload {
  content: string;
  embeds: DiscordEmbed[];
}

// ── WebhookHandler ───────────────────────────────

export class WebhookHandler {
  /**
   * POST `alert` as JSON to the given webhook `url`.
   * Uses the native `fetch` available in Node 22+.
   *
   * The payload format is auto-detected from the URL:
   *   - URLs containing "slack"   → Slack Block Kit attachment format
   *   - URLs containing "discord" → Discord embed format
   *   - Everything else           → raw Alert JSON
   */
  async sendToWebhook(alert: Alert, url: string): Promise<void> {
    let body: string;

    if (url.includes('slack')) {
      body = JSON.stringify(this.formatForSlack(alert));
    } else if (url.includes('discord')) {
      body = JSON.stringify(this.formatForDiscord(alert));
    } else {
      body = JSON.stringify(alert);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '(no body)');
      throw new Error(
        `WebhookHandler: POST to ${url} failed with ` +
          `${response.status} ${response.statusText}: ${text}`,
      );
    }
  }

  /** Build a Slack webhook payload with a coloured attachment. */
  formatForSlack(alert: Alert): SlackPayload {
    const color = SEVERITY_COLORS[alert.severity].slack;
    const emoji = SEVERITY_EMOJI[alert.severity];
    const ts = new Date(alert.timestamp).toISOString();

    return {
      text: `${emoji} *Nexus Alert* — ${alert.severity.toUpperCase()}`,
      attachments: [
        {
          color,
          title: alert.message,
          text: `Agent: *${alert.agentName}* (\`${alert.agentId}\`)`,
          fields: [
            {
              title: 'Severity',
              value: alert.severity,
              short: true,
            },
            {
              title: 'Health Score',
              value: `${(alert.healthScore * 100).toFixed(1)}%`,
              short: true,
            },
            {
              title: 'State Transition',
              value: `${alert.previousState} → ${alert.currentState}`,
              short: true,
            },
            {
              title: 'Alert ID',
              value: `\`${alert.id}\``,
              short: true,
            },
          ],
          footer: 'Nexus Self-Healing Framework',
          ts: Math.floor(alert.timestamp / 1000),
        },
      ],
    };
  }

  /** Build a Discord webhook payload with a coloured embed. */
  formatForDiscord(alert: Alert): DiscordPayload {
    const color = SEVERITY_COLORS[alert.severity].discord;
    const emoji = SEVERITY_EMOJI[alert.severity];
    const ts = new Date(alert.timestamp).toISOString();

    const severityLabel =
      alert.severity === 'critical'
        ? '@here Critical Alert'
        : `${emoji} Nexus Alert`;

    return {
      content: severityLabel,
      embeds: [
        {
          title: alert.message,
          description:
            `**Agent:** ${alert.agentName} (\`${alert.agentId}\`)`,
          color,
          fields: [
            {
              name: 'Severity',
              value: alert.severity.toUpperCase(),
              inline: true,
            },
            {
              name: 'Health Score',
              value: `${(alert.healthScore * 100).toFixed(1)}%`,
              inline: true,
            },
            {
              name: 'State Transition',
              value: `\`${alert.previousState}\` → \`${alert.currentState}\``,
              inline: false,
            },
            {
              name: 'Alert ID',
              value: `\`${alert.id}\``,
              inline: false,
            },
          ],
          footer: { text: 'Nexus Self-Healing Framework' },
          timestamp: ts,
        },
      ],
    };
  }
}
