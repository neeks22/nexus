// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Objection & Handoff Response Templates
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TemplateVariables {
  repName: string;
  dealershipName: string;
  [key: string]: string;
}

export type TemplateKey =
  | 'PRICE_INQUIRY'
  | 'OBJECTION'
  | 'TEST_DRIVE'
  | 'FINANCING'
  | 'GENERAL';

export type Locale = 'en-CA' | 'fr-CA';

const TEMPLATES: Record<Locale, Record<TemplateKey, string>> = {
  'en-CA': {
    PRICE_INQUIRY:
      'Great question about pricing! Let me connect you with {{repName}} who can walk you through all the options. - {{dealershipName}}',
    OBJECTION:
      'I hear you — pricing is important. Let me connect you with {{repName}} who can look at all the options including current incentives. - {{dealershipName}}',
    TEST_DRIVE:
      "I'd love to set that up! Let me connect you with {{repName}} to find the perfect time. - {{dealershipName}}",
    FINANCING:
      'Great question! {{repName}} specializes in finding the best financing options. Let me connect you. - {{dealershipName}}',
    GENERAL:
      'Let me connect you with {{repName}} who can help you with that right away. - {{dealershipName}}',
  },
  'fr-CA': {
    PRICE_INQUIRY:
      'Excellente question sur les prix! Permettez-moi de vous mettre en contact avec {{repName}} qui pourra vous présenter toutes les options. - {{dealershipName}}',
    OBJECTION:
      'Je comprends — le prix est important. Permettez-moi de vous mettre en contact avec {{repName}} qui pourra examiner toutes les options, y compris les incitatifs en cours. - {{dealershipName}}',
    TEST_DRIVE:
      "J'adorerais organiser ça! Permettez-moi de vous mettre en contact avec {{repName}} pour trouver le moment idéal. - {{dealershipName}}",
    FINANCING:
      'Excellente question! {{repName}} se spécialise dans la recherche des meilleures options de financement. Permettez-moi de vous mettre en contact. - {{dealershipName}}',
    GENERAL:
      'Permettez-moi de vous mettre en contact avec {{repName}} qui pourra vous aider immédiatement. - {{dealershipName}}',
  },
};

export function getTemplate(key: TemplateKey, locale: Locale = 'en-CA'): string {
  const localeTemplates = TEMPLATES[locale];
  return localeTemplates[key];
}

export function renderTemplate(
  key: TemplateKey,
  variables: TemplateVariables,
  locale: Locale = 'en-CA',
): string {
  let template = getTemplate(key, locale);

  for (const [varName, value] of Object.entries(variables)) {
    template = template.replaceAll(`{{${varName}}}`, value);
  }

  return template;
}

export function getAllTemplateKeys(): readonly TemplateKey[] {
  return ['PRICE_INQUIRY', 'OBJECTION', 'TEST_DRIVE', 'FINANCING', 'GENERAL'] as const;
}

export function getAllLocales(): readonly Locale[] {
  return ['en-CA', 'fr-CA'] as const;
}
