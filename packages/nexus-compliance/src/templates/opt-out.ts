// --- Bilingual opt-out language templates ---

export interface OptOutTemplateParams {
  dealershipName: string;
  phone: string;
}

export interface OptOutTemplates {
  "en-CA": string;
  "fr-CA": string;
}

export function getOptOutText(
  locale: "en-CA" | "fr-CA",
  params: OptOutTemplateParams,
): string {
  const templates: OptOutTemplates = {
    "en-CA": `Reply STOP to unsubscribe. ${params.dealershipName} | ${params.phone}`,
    "fr-CA": `Répondez STOP pour vous désabonner. ${params.dealershipName} | ${params.phone}`,
  };

  return templates[locale];
}

export function appendOptOut(
  message: string,
  locale: "en-CA" | "fr-CA",
  params: OptOutTemplateParams,
): string {
  const optOutText = getOptOutText(locale, params);
  return `${message}\n\n${optOutText}`;
}
