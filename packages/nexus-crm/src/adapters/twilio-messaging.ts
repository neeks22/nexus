import type { MessagingAdapter, MessageResult, InboundMessage } from "../types.js";

// --- Config ---

export interface TwilioMessagingConfig {
  accountSid: string;
  authToken: string;
  defaultFromNumber: string;
  fetch?: typeof globalThis.fetch;
}

// --- Twilio API response ---

interface TwilioMessageResponse {
  sid: string;
  status: string;
}

// --- Adapter ---

export class TwilioMessagingAdapter implements MessagingAdapter {
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly defaultFromNumber: string;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(config: TwilioMessagingConfig) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.defaultFromNumber = config.defaultFromNumber;
    this.fetchFn = config.fetch ?? globalThis.fetch;
  }

  private get baseUrl(): string {
    return `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  private get authHeader(): string {
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    return `Basic ${credentials}`;
  }

  async sendSms(to: string, body: string, from?: string): Promise<MessageResult> {
    const params = new URLSearchParams();
    params.set("To", to);
    params.set("From", from ?? this.defaultFromNumber);
    params.set("Body", body);

    const response = await this.fetchFn(`${this.baseUrl}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch((): string => "");
      throw new Error(`Twilio API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as TwilioMessageResponse;
    return {
      messageId: data.sid,
      status: data.status,
    };
  }

  async sendEmail(_to: string, _subject: string, _body: string, _from?: string): Promise<MessageResult> {
    throw new Error(
      "Email sending via Twilio requires SendGrid integration. Use a dedicated email adapter or configure SendGrid.",
    );
  }

  onInboundSms(callback: (msg: InboundMessage) => void): void {
    // Store callback for webhook handler usage.
    // In production, wire this to an Express/Fastify route that receives Twilio webhooks.
    this.inboundCallback = callback;
  }

  /**
   * Parse an inbound Twilio webhook request body and invoke the registered callback.
   * Call this from your HTTP route handler that receives Twilio POST webhooks.
   */
  handleInboundWebhook(webhookBody: Record<string, string>): void {
    if (!this.inboundCallback) return;
    const msg: InboundMessage = {
      from: webhookBody.From ?? "",
      to: webhookBody.To ?? "",
      body: webhookBody.Body ?? "",
      messageId: webhookBody.MessageSid ?? "",
      timestamp: new Date(),
    };
    this.inboundCallback(msg);
  }

  private inboundCallback?: (msg: InboundMessage) => void;
}
