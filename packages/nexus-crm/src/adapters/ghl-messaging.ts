import type { MessagingAdapter, MessageResult, InboundMessage } from "../types.js";

// --- Constants ---

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

// --- Config ---

export interface GhlMessagingConfig {
  apiKey: string;
  locationId: string;
  fetch?: typeof globalThis.fetch;
}

// --- GHL conversation message response ---

interface GhlMessageResponse {
  conversationId: string;
  messageId: string;
  msg?: {
    id?: string;
    status?: string;
  };
}

// --- Adapter ---

export class GhlMessagingAdapter implements MessagingAdapter {
  private readonly apiKey: string;
  private readonly locationId: string;
  private readonly fetchFn: typeof globalThis.fetch;
  private inboundCallback?: (msg: InboundMessage) => void;

  constructor(config: GhlMessagingConfig) {
    this.apiKey = config.apiKey;
    this.locationId = config.locationId;
    this.fetchFn = config.fetch ?? globalThis.fetch;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${GHL_API_BASE}${path}`;
    const options: RequestInit = {
      method,
      headers: this.headers(),
    };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
    const response = await this.fetchFn(url, options);
    if (!response.ok) {
      const text = await response.text().catch((): string => "");
      throw new Error(`GHL Messaging API error ${response.status}: ${text}`);
    }
    return (await response.json()) as T;
  }

  async sendSms(to: string, body: string, _from?: string): Promise<MessageResult> {
    const data = await this.request<GhlMessageResponse>(
      "POST",
      "/conversations/messages",
      {
        type: "SMS",
        contactId: to,
        message: body,
        locationId: this.locationId,
      },
    );
    return {
      messageId: data.messageId ?? data.msg?.id ?? "",
      status: data.msg?.status ?? "sent",
    };
  }

  async sendEmail(to: string, subject: string, body: string, _from?: string): Promise<MessageResult> {
    const data = await this.request<GhlMessageResponse>(
      "POST",
      "/conversations/messages",
      {
        type: "Email",
        contactId: to,
        subject,
        message: body,
        locationId: this.locationId,
      },
    );
    return {
      messageId: data.messageId ?? data.msg?.id ?? "",
      status: data.msg?.status ?? "sent",
    };
  }

  onInboundSms(callback: (msg: InboundMessage) => void): void {
    this.inboundCallback = callback;
  }

  /**
   * Parse an inbound GHL webhook payload and invoke the registered callback.
   * Call this from your HTTP route handler that receives GHL webhooks.
   */
  handleInboundWebhook(payload: Record<string, unknown>): void {
    if (!this.inboundCallback) return;
    const msg: InboundMessage = {
      from: String(payload.contactId ?? ""),
      to: String(payload.locationId ?? this.locationId),
      body: String(payload.body ?? payload.message ?? ""),
      messageId: String(payload.messageId ?? payload.id ?? ""),
      timestamp: payload.dateAdded ? new Date(String(payload.dateAdded)) : new Date(),
    };
    this.inboundCallback(msg);
  }
}
