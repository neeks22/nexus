// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  WebhookIntegration — Outgoing payloads + signature verification
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { createHmac, timingSafeEqual } from 'crypto';
import { classifyError } from '../healing/error-taxonomy.js';
import type { ErrorClassification } from '../types.js';

// ── Config ─────────────────────────────────────────

export interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
  retries?: number;
}

// ── NexusWebhookError ──────────────────────────────

export class NexusWebhookError extends Error {
  readonly classification: ErrorClassification;
  readonly originalError: unknown;

  constructor(message: string, classification: ErrorClassification, originalError: unknown) {
    super(message);
    this.name = 'NexusWebhookError';
    this.classification = classification;
    this.originalError = originalError;
  }
}

// ── Send result ────────────────────────────────────

export interface WebhookSendResult {
  status: number;
  body: string;
}

// ── Helpers ────────────────────────────────────────

function buildNexusWebhookError(raw: unknown, context: string): NexusWebhookError {
  const classification = classifyError(raw);
  const message =
    raw instanceof Error
      ? `${context}: ${raw.message}`
      : `${context}: ${String(raw)}`;
  return new NexusWebhookError(message, classification, raw);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Retry loop ─────────────────────────────────────
// Performs up to `maxAttempts` fetch calls with
// exponential back-off (200 ms, 400 ms, 800 ms …).

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts: number,
): Promise<Response> {
  let lastError: unknown = null;
  let delayMs = 200;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(url, init);
      // Treat 5xx as retriable; everything else (including 4xx) is returned as-is
      // so the caller can inspect the status and decide.
      if (response.status >= 500 && attempt < maxAttempts - 1) {
        lastError = new Error(`HTTP ${response.status} — server error`);
        await sleep(delayMs);
        delayMs *= 2;
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        await sleep(delayMs);
        delayMs *= 2;
      }
    }
  }

  throw buildNexusWebhookError(lastError, 'Webhook request failed after retries');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  WebhookIntegration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class WebhookIntegration {
  // ── send ─────────────────────────────────────────
  // Sends a POST request carrying `payload` as JSON.
  // Optional config overrides url/headers/retries/secret.

  async send(
    url: string,
    payload: unknown,
    config?: Partial<WebhookConfig>,
  ): Promise<WebhookSendResult> {
    const targetUrl = config?.url ?? url;
    const maxAttempts = Math.max(1, (config?.retries ?? 1) + 1);

    let body: string;
    try {
      body = JSON.stringify(payload);
    } catch (err) {
      throw buildNexusWebhookError(err, 'Webhook payload serialization error');
    }

    // Build headers — merge defaults, config overrides, then HMAC signature.
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config?.headers ?? {}),
    };

    if (config?.secret) {
      const sig = createHmac('sha256', config.secret).update(body).digest('hex');
      headers['X-Nexus-Signature-256'] = `sha256=${sig}`;
    }

    let response: Response;
    try {
      response = await fetchWithRetry(
        targetUrl,
        { method: 'POST', headers, body },
        maxAttempts,
      );
    } catch (err) {
      if (err instanceof NexusWebhookError) throw err;
      throw buildNexusWebhookError(err, 'Webhook send error');
    }

    const responseBody = await response.text().catch(() => '');
    return { status: response.status, body: responseBody };
  }

  // ── verifySignature ───────────────────────────────
  // Validates an HMAC-SHA-256 signature against a raw payload string.
  // Compatible with GitHub, Stripe, and most common webhook patterns.
  // Uses timing-safe comparison to prevent timing attacks.

  async verifySignature(
    payload: string,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    try {
      // Normalise: accept both "sha256=<hex>" and bare "<hex>" forms.
      const sigHex = signature.startsWith('sha256=')
        ? signature.slice(7)
        : signature;

      const expected = createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      // Compare as Buffer to guarantee constant-time equality check.
      const expectedBuf = Buffer.from(expected, 'hex');
      const receivedBuf = Buffer.from(sigHex, 'hex');

      if (expectedBuf.length !== receivedBuf.length) return false;

      return timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      // Any error during crypto (e.g., invalid hex) means verification failed.
      return false;
    }
  }
}
