import type { CrmAdapter, MessagingAdapter } from "./types.js";
import { CrmProvider } from "./types.js";
import { ActivixCrmAdapter } from "./adapters/activix-adapter.js";
import { GoHighLevelCrmAdapter } from "./adapters/ghl-adapter.js";
import type { GhlAdapterConfig } from "./adapters/ghl-adapter.js";
import { TwilioMessagingAdapter } from "./adapters/twilio-messaging.js";
import type { TwilioMessagingConfig } from "./adapters/twilio-messaging.js";
import { GhlMessagingAdapter } from "./adapters/ghl-messaging.js";
import type { GhlMessagingConfig } from "./adapters/ghl-messaging.js";

// --- Validation helpers ---

function requireString(config: Record<string, unknown>, key: string, label: string): string {
  const value = config[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} requires "${key}" in config`);
  }
  return value;
}

// --- CRM Factory ---

export function createCrmAdapter(
  provider: CrmProvider,
  config: Record<string, unknown>,
): CrmAdapter {
  switch (provider) {
    case CrmProvider.ACTIVIX: {
      const client = config.client;
      if (!client || typeof client !== "object") {
        throw new Error("Activix adapter requires an ActivixClient instance as config.client");
      }
      // ActivixClient is validated at runtime; the consumer is responsible for passing a real instance
      return new ActivixCrmAdapter(client as ConstructorParameters<typeof ActivixCrmAdapter>[0]);
    }

    case CrmProvider.GHL: {
      const apiKey = requireString(config, "apiKey", "GHL adapter");
      const locationId = requireString(config, "locationId", "GHL adapter");
      const ghlConfig: GhlAdapterConfig = { apiKey, locationId };
      if (typeof config.fetch === "function") {
        ghlConfig.fetch = config.fetch as typeof globalThis.fetch;
      }
      return new GoHighLevelCrmAdapter(ghlConfig);
    }

    case CrmProvider.DEALERSOCKET:
    case CrmProvider.VINSOLUTIONS:
    case CrmProvider.ELEAD:
    case CrmProvider.GENERIC:
      throw new Error(`CRM provider "${provider}" is not yet implemented. Contributions welcome.`);

    default:
      throw new Error(`Unknown CRM provider: "${String(provider)}"`);
  }
}

export type MessagingProviderType = "twilio" | "ghl";

export function createMessagingAdapter(
  provider: MessagingProviderType,
  config: Record<string, unknown>,
): MessagingAdapter {
  switch (provider) {
    case "twilio": {
      const accountSid = requireString(config, "accountSid", "Twilio adapter");
      const authToken = requireString(config, "authToken", "Twilio adapter");
      const defaultFromNumber = requireString(config, "defaultFromNumber", "Twilio adapter");
      const twilioConfig: TwilioMessagingConfig = { accountSid, authToken, defaultFromNumber };
      if (typeof config.fetch === "function") {
        twilioConfig.fetch = config.fetch as typeof globalThis.fetch;
      }
      return new TwilioMessagingAdapter(twilioConfig);
    }

    case "ghl": {
      const apiKey = requireString(config, "apiKey", "GHL messaging adapter");
      const locationId = requireString(config, "locationId", "GHL messaging adapter");
      const ghlConfig: GhlMessagingConfig = { apiKey, locationId };
      if (typeof config.fetch === "function") {
        ghlConfig.fetch = config.fetch as typeof globalThis.fetch;
      }
      return new GhlMessagingAdapter(ghlConfig);
    }

    default:
      throw new Error(`Unknown messaging provider: "${String(provider)}"`);
  }
}
