export type Locale = "en-CA" | "fr-CA";

/**
 * Bilingual opt-out language appended to every outbound message.
 * CASL requires: sender identity, contact info, functional unsubscribe mechanism.
 */
export const OPT_OUT_TEMPLATES: Record<Locale, { sms: string; email: string }> = {
  "en-CA": {
    sms: "\n\nReply STOP to unsubscribe.",
    email:
      "\n\n---\nYou are receiving this message from {dealership_name}. " +
      "If you no longer wish to receive communications from us, " +
      "click here to unsubscribe: {unsubscribe_url}\n" +
      "{dealership_name} | {dealership_address} | {dealership_phone}",
  },
  "fr-CA": {
    sms: "\n\nRépondez STOP pour vous désabonner.",
    email:
      "\n\n---\nVous recevez ce message de {dealership_name}. " +
      "Si vous ne souhaitez plus recevoir nos communications, " +
      "cliquez ici pour vous désabonner : {unsubscribe_url}\n" +
      "{dealership_name} | {dealership_address} | {dealership_phone}",
  },
};

export interface DealershipInfo {
  name: string;
  address: string;
  phone: string;
  unsubscribe_url: string;
}

/**
 * Appends the correct opt-out language to an outbound message.
 */
export function appendOptOutLanguage(
  message: string,
  locale: Locale,
  channel: "sms" | "email",
  dealership: DealershipInfo
): string {
  const template = OPT_OUT_TEMPLATES[locale][channel];

  const rendered = template
    .replace(/\{dealership_name\}/g, dealership.name)
    .replace(/\{dealership_address\}/g, dealership.address)
    .replace(/\{dealership_phone\}/g, dealership.phone)
    .replace(/\{unsubscribe_url\}/g, dealership.unsubscribe_url);

  return message + rendered;
}
