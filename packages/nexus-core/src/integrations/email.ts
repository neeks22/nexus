// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EmailIntegration — Send emails via SendGrid, Resend, or SMTP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { classifyError } from '../healing/error-taxonomy.js';
import type { ErrorClassification } from '../types.js';

// ── Config & Message ───────────────────────────────

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'resend';
  apiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: string;
  replyTo?: string;
}

// ── Send result ────────────────────────────────────

export interface EmailSendResult {
  id: string;
  status: string;
}

// ── NexusEmailError ────────────────────────────────
// Carries the Nexus error classification so callers
// can route / retry through the self-healing pipeline.

export class NexusEmailError extends Error {
  readonly classification: ErrorClassification;
  readonly originalError: unknown;

  constructor(message: string, classification: ErrorClassification, originalError: unknown) {
    super(message);
    this.name = 'NexusEmailError';
    this.classification = classification;
    this.originalError = originalError;
  }
}

// ── Helpers ────────────────────────────────────────

function classifyHttpStatus(status: number): string {
  if (status === 401 || status === 403) return 'auth_error';
  if (status === 429) return 'rate_limit';
  if (status === 408 || status === 504) return 'api_timeout';
  if (status >= 500) return 'server_error';
  return 'server_error';
}

function buildNexusError(raw: unknown, context: string): NexusEmailError {
  const classification = classifyError(raw);
  const message =
    raw instanceof Error
      ? `${context}: ${raw.message}`
      : `${context}: ${String(raw)}`;
  return new NexusEmailError(message, classification, raw);
}

// ── SendGrid provider ─────────────────────────────

async function sendViaSendGrid(
  config: EmailConfig,
  message: EmailMessage,
): Promise<EmailSendResult> {
  if (!config.apiKey) {
    throw new NexusEmailError(
      'SendGrid apiKey is required',
      classifyError(new Error('auth_error: missing api key')),
      null,
    );
  }

  const body = {
    personalizations: [{ to: [{ email: message.to }] }],
    from: { email: config.fromEmail, name: config.fromName },
    subject: message.subject,
    content: [
      ...(message.html
        ? [{ type: 'text/html', value: message.html }]
        : []),
      { type: 'text/plain', value: message.body },
    ],
    ...(message.replyTo ? { reply_to: { email: message.replyTo } } : {}),
  };

  let response: Response;
  try {
    response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw buildNexusError(err, 'SendGrid network error');
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const synthetic = new Error(
      `HTTP ${response.status}: ${errText || classifyHttpStatus(response.status)}`,
    );
    throw buildNexusError(synthetic, 'SendGrid API error');
  }

  // SendGrid returns 202 with no body; the message ID is in the X-Message-Id header.
  const id = response.headers.get('X-Message-Id') ?? `sg-${Date.now()}`;
  return { id, status: 'sent' };
}

// ── Resend provider ───────────────────────────────

async function sendViaResend(
  config: EmailConfig,
  message: EmailMessage,
): Promise<EmailSendResult> {
  if (!config.apiKey) {
    throw new NexusEmailError(
      'Resend apiKey is required',
      classifyError(new Error('auth_error: missing api key')),
      null,
    );
  }

  const body: Record<string, unknown> = {
    from: `${config.fromName} <${config.fromEmail}>`,
    to: [message.to],
    subject: message.subject,
    text: message.body,
    ...(message.html ? { html: message.html } : {}),
    ...(message.replyTo ? { reply_to: message.replyTo } : {}),
  };

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw buildNexusError(err, 'Resend network error');
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const synthetic = new Error(`HTTP ${response.status}: ${errText}`);
    throw buildNexusError(synthetic, 'Resend API error');
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch (err) {
    throw buildNexusError(err, 'Resend malformed response');
  }

  const id = typeof data['id'] === 'string' ? data['id'] : `resend-${Date.now()}`;
  return { id, status: 'sent' };
}

// ── SMTP provider (nodemailer-compatible via raw SMTP) ─
// Uses the `nodemailer` package if available at runtime.
// Falls back to a clear error rather than a hidden no-op.

async function sendViaSmtp(
  config: EmailConfig,
  message: EmailMessage,
): Promise<EmailSendResult> {
  // Dynamic import keeps nodemailer as an optional peer dependency.
  // If it is missing the catch produces a classified NexusEmailError.
  let nodemailer: {
    createTransport: (opts: Record<string, unknown>) => {
      sendMail: (opts: Record<string, unknown>) => Promise<{ messageId: string }>;
    };
  };

  try {
    // Dynamic import of optional peer dep — ts-ignore suppresses the missing
    // type declaration warning. The try/catch handles the case where it is
    // not installed at runtime.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    // @ts-ignore: nodemailer is an optional peer dependency
    nodemailer = await import('nodemailer');
  } catch {
    throw new NexusEmailError(
      'SMTP provider requires nodemailer — install it: npm install nodemailer',
      classifyError(new Error('network_error: nodemailer not installed')),
      null,
    );
  }

  if (!config.smtpHost) {
    throw new NexusEmailError(
      'SMTP smtpHost is required',
      classifyError(new Error('server_error: missing smtpHost')),
      null,
    );
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort ?? 587,
    secure: (config.smtpPort ?? 587) === 465,
    auth:
      config.smtpUser && config.smtpPass
        ? { user: config.smtpUser, pass: config.smtpPass }
        : undefined,
  });

  let info: { messageId: string };
  try {
    info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: message.to,
      subject: message.subject,
      text: message.body,
      ...(message.html ? { html: message.html } : {}),
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    });
  } catch (err) {
    throw buildNexusError(err, 'SMTP send error');
  }

  return { id: info.messageId, status: 'sent' };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EmailIntegration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class EmailIntegration {
  private readonly config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  // ── send ─────────────────────────────────────────

  async send(message: EmailMessage): Promise<EmailSendResult> {
    switch (this.config.provider) {
      case 'sendgrid':
        return sendViaSendGrid(this.config, message);
      case 'resend':
        return sendViaResend(this.config, message);
      case 'smtp':
        return sendViaSmtp(this.config, message);
      default: {
        // TypeScript exhaustiveness check — provider is narrowed to never here.
        const _exhaustive: never = this.config.provider;
        throw new NexusEmailError(
          `Unknown email provider: ${String(_exhaustive)}`,
          classifyError(new Error('server_error: unknown provider')),
          null,
        );
      }
    }
  }

  // ── sendBulk ──────────────────────────────────────
  // Sends each message independently. A failure on one
  // message does NOT abort the rest — it is captured as
  // a failed result so the caller can decide how to handle.

  async sendBulk(messages: EmailMessage[]): Promise<Array<EmailSendResult>> {
    const results = await Promise.allSettled(
      messages.map((msg) => this.send(msg)),
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      // Classify the rejection and return a failure sentinel
      const err = result.reason as unknown;
      const classification = classifyError(err);
      return {
        id: `failed-${index}-${Date.now()}`,
        status: `failed:${classification.type}`,
      };
    });
  }
}
