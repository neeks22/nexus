/**
 * ServiceBdcAgent — handles service department inquiries including
 * appointment booking, status checks, recall lookups, and maintenance FAQs.
 *
 * Follows the same structural pattern as InstantResponseAgent:
 * template-based rendering with compliance checks, bilingual support,
 * and dependency injection for all external services.
 */

import type {
  ComplianceResult,
  DealershipConfig,
  LeadData,
} from "./types.js";

// --- Dependency interfaces (structurally typed) ---

export interface LanguageDetectorDep {
  detect(lead: { locale?: string | null; phones?: ReadonlyArray<{ number: string }>; postal_code?: string | null }): "en-CA" | "fr-CA";
}

export interface CompliancePreFlightDep {
  check(
    lead: { id: number; unsubscribe_all_date?: string | null; unsubscribe_sms_date?: string | null; unsubscribe_email_date?: string | null },
    message: string,
    channel: "sms" | "email",
  ): { pass: boolean; failures: Array<{ checker: string; reason: string }> };
}

export interface TemplateRepositoryDep {
  render(
    templateId: string,
    locale: "en-CA" | "fr-CA",
    channel: "sms" | "email",
    variables: Record<string, string | undefined>,
  ): string | null;
}

// --- Service-specific types ---

export interface ServiceInquiry {
  type: "booking" | "status" | "recall" | "maintenance" | "general";
  description: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleMileage?: number;
}

export interface ServiceAppointmentRequest {
  serviceType: string;
  preferredDate: string;
  preferredTime?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleMileage?: number;
  shuttleRequested?: boolean;
  loanerRequested?: boolean;
}

export interface ServiceStatusResult {
  roNumber: string;
  status: "checked_in" | "in_progress" | "waiting_for_parts" | "ready_for_pickup" | "not_found";
  estimatedCompletion?: string;
  advisorName?: string;
  notes?: string;
}

export interface RecallInfo {
  vin: string;
  recalls: Array<{
    campaignNumber: string;
    component: string;
    summary: string;
    remedy: string;
    isOpen: boolean;
  }>;
}

export interface ServiceResponse {
  message: string;
  channel: "sms" | "email";
  locale: "en-CA" | "fr-CA";
  complianceResult: ComplianceResult;
  serviceType: "booking" | "status" | "recall" | "maintenance" | "general";
  escalationRequired: boolean;
  escalationReason?: string;
}

// --- ServiceBdcAgent ---

export class ServiceBdcAgent {
  private readonly dealershipConfig: DealershipConfig;
  private readonly compliancePreFlight: CompliancePreFlightDep;
  private readonly languageDetector: LanguageDetectorDep;
  private readonly templateRepository: TemplateRepositoryDep;

  constructor(
    dealershipConfig: DealershipConfig,
    compliancePreFlight: CompliancePreFlightDep,
    languageDetector: LanguageDetectorDep,
    templateRepository: TemplateRepositoryDep,
  ) {
    this.dealershipConfig = dealershipConfig;
    this.compliancePreFlight = compliancePreFlight;
    this.languageDetector = languageDetector;
    this.templateRepository = templateRepository;
  }

  /**
   * Main response method — detects language, determines inquiry type,
   * generates a template-based response, and runs compliance checks.
   */
  async respond(lead: LeadData, inquiry: ServiceInquiry, channel: "sms" | "email" = "sms"): Promise<ServiceResponse> {
    const locale = this.languageDetector.detect(lead);

    // Check for escalation triggers
    const escalation = this.checkEscalationTriggers(inquiry);

    const variables = this.buildResponseVariables(lead, inquiry, locale);
    let message = this.templateRepository.render(`service_${inquiry.type}`, locale, channel, variables);

    if (message === null) {
      message = this.buildFallbackMessage(lead, inquiry, locale, channel);
    }

    const complianceCheck = this.compliancePreFlight.check(
      {
        id: lead.id,
        unsubscribe_all_date: lead.unsubscribe_all_date,
        unsubscribe_sms_date: lead.unsubscribe_sms_date,
        unsubscribe_email_date: lead.unsubscribe_email_date,
      },
      message,
      channel,
    );

    return {
      message,
      channel,
      locale,
      complianceResult: {
        pass: complianceCheck.pass,
        failures: complianceCheck.failures,
      },
      serviceType: inquiry.type,
      escalationRequired: escalation.required,
      escalationReason: escalation.reason,
    };
  }

  /**
   * Books a service appointment — validates inputs, renders confirmation
   * template, and runs compliance pre-flight.
   */
  async bookAppointment(
    lead: LeadData,
    serviceType: string,
    preferredDate: string,
    channel: "sms" | "email" = "sms",
  ): Promise<ServiceResponse> {
    const locale = this.languageDetector.detect(lead);
    const firstName = lead.first_name ?? this.getDefaultName(locale);
    const serviceAdvisor = this.getServiceAdvisorName();

    const variables: Record<string, string | undefined> = {
      firstName,
      serviceType,
      preferredDate,
      serviceAdvisor,
      dealershipName: this.dealershipConfig.dealershipName,
      dealershipPhone: this.dealershipConfig.phone,
      dealershipAddress: this.dealershipConfig.address,
      serviceHours: this.dealershipConfig.hours,
    };

    let message = this.templateRepository.render("service_booking", locale, channel, variables);

    if (message === null) {
      message = this.buildBookingFallback(firstName, serviceType, preferredDate, serviceAdvisor, locale, channel);
    }

    const complianceCheck = this.compliancePreFlight.check(
      {
        id: lead.id,
        unsubscribe_all_date: lead.unsubscribe_all_date,
        unsubscribe_sms_date: lead.unsubscribe_sms_date,
        unsubscribe_email_date: lead.unsubscribe_email_date,
      },
      message,
      channel,
    );

    return {
      message,
      channel,
      locale,
      complianceResult: {
        pass: complianceCheck.pass,
        failures: complianceCheck.failures,
      },
      serviceType: "booking",
      escalationRequired: false,
    };
  }

  /**
   * Checks the status of a service repair order.
   */
  async checkStatus(
    lead: LeadData,
    roNumber: string,
    statusResult?: ServiceStatusResult,
    channel: "sms" | "email" = "sms",
  ): Promise<ServiceResponse> {
    const locale = this.languageDetector.detect(lead);
    const firstName = lead.first_name ?? this.getDefaultName(locale);
    const status = statusResult ?? { roNumber, status: "not_found" as const };

    const statusLabel = this.getStatusLabel(status.status, locale);

    const variables: Record<string, string | undefined> = {
      firstName,
      roNumber,
      status: statusLabel,
      estimatedCompletion: status.estimatedCompletion,
      advisorName: status.advisorName,
      notes: status.notes,
      dealershipName: this.dealershipConfig.dealershipName,
      dealershipPhone: this.dealershipConfig.phone,
      serviceHours: this.dealershipConfig.hours,
    };

    let message = this.templateRepository.render("service_status", locale, channel, variables);

    if (message === null) {
      message = this.buildStatusFallback(firstName, roNumber, statusLabel, status, locale, channel);
    }

    const complianceCheck = this.compliancePreFlight.check(
      {
        id: lead.id,
        unsubscribe_all_date: lead.unsubscribe_all_date,
        unsubscribe_sms_date: lead.unsubscribe_sms_date,
        unsubscribe_email_date: lead.unsubscribe_email_date,
      },
      message,
      channel,
    );

    return {
      message,
      channel,
      locale,
      complianceResult: {
        pass: complianceCheck.pass,
        failures: complianceCheck.failures,
      },
      serviceType: "status",
      escalationRequired: false,
    };
  }

  /**
   * Handles recall inquiries — looks up recall info by VIN and generates
   * an appropriate response.
   */
  async handleRecall(
    lead: LeadData,
    vin: string,
    recallInfo?: RecallInfo,
    channel: "sms" | "email" = "sms",
  ): Promise<ServiceResponse> {
    const locale = this.languageDetector.detect(lead);
    const firstName = lead.first_name ?? this.getDefaultName(locale);
    const recalls = recallInfo ?? { vin, recalls: [] };
    const openRecalls = recalls.recalls.filter((r) => r.isOpen);

    const variables: Record<string, string | undefined> = {
      firstName,
      vin,
      recallCount: String(openRecalls.length),
      recallSummary: this.buildRecallSummary(openRecalls, locale),
      dealershipName: this.dealershipConfig.dealershipName,
      dealershipPhone: this.dealershipConfig.phone,
      serviceHours: this.dealershipConfig.hours,
    };

    let message = this.templateRepository.render("service_recall", locale, channel, variables);

    if (message === null) {
      message = this.buildRecallFallback(firstName, openRecalls, locale, channel);
    }

    const complianceCheck = this.compliancePreFlight.check(
      {
        id: lead.id,
        unsubscribe_all_date: lead.unsubscribe_all_date,
        unsubscribe_sms_date: lead.unsubscribe_sms_date,
        unsubscribe_email_date: lead.unsubscribe_email_date,
      },
      message,
      channel,
    );

    return {
      message,
      channel,
      locale,
      complianceResult: {
        pass: complianceCheck.pass,
        failures: complianceCheck.failures,
      },
      serviceType: "recall",
      escalationRequired: false,
    };
  }

  // --- Private helpers ---

  private checkEscalationTriggers(inquiry: ServiceInquiry): { required: boolean; reason?: string } {
    const desc = inquiry.description.toLowerCase();

    const angerKeywords = ["angry", "furious", "unacceptable", "terrible", "worst", "sue", "lawyer",
      "fache", "furieux", "inacceptable", "terrible", "pire", "avocat"];
    const safetyKeywords = ["unsafe", "dangerous", "brake failure", "steering", "airbag",
      "dangereux", "securite", "frein", "direction", "coussin gonflable"];
    const managerKeywords = ["manager", "supervisor", "speak to someone", "gestionnaire", "superviseur", "parler a quelqu'un"];
    const warrantyKeywords = ["warranty dispute", "refuse warranty", "won't cover", "garantie refuse", "ne couvre pas"];

    if (angerKeywords.some((k) => desc.includes(k))) {
      return { required: true, reason: "Customer expressing anger or frustration" };
    }
    if (safetyKeywords.some((k) => desc.includes(k))) {
      return { required: true, reason: "Safety concern reported" };
    }
    if (managerKeywords.some((k) => desc.includes(k))) {
      return { required: true, reason: "Customer requested manager" };
    }
    if (warrantyKeywords.some((k) => desc.includes(k))) {
      return { required: true, reason: "Warranty dispute detected" };
    }

    return { required: false };
  }

  private buildResponseVariables(
    lead: LeadData,
    inquiry: ServiceInquiry,
    locale: "en-CA" | "fr-CA",
  ): Record<string, string | undefined> {
    const firstName = lead.first_name ?? this.getDefaultName(locale);
    const serviceAdvisor = this.getServiceAdvisorName();

    return {
      firstName,
      serviceType: inquiry.type,
      description: inquiry.description,
      vehicleYear: inquiry.vehicleYear ? String(inquiry.vehicleYear) : undefined,
      vehicleMake: inquiry.vehicleMake,
      vehicleModel: inquiry.vehicleModel,
      vehicleMileage: inquiry.vehicleMileage ? String(inquiry.vehicleMileage) : undefined,
      serviceAdvisor,
      dealershipName: this.dealershipConfig.dealershipName,
      dealershipPhone: this.dealershipConfig.phone,
      dealershipAddress: this.dealershipConfig.address,
      serviceHours: this.dealershipConfig.hours,
    };
  }

  private buildFallbackMessage(
    lead: LeadData,
    inquiry: ServiceInquiry,
    locale: "en-CA" | "fr-CA",
    channel: "sms" | "email",
  ): string {
    const firstName = lead.first_name ?? this.getDefaultName(locale);
    const isEnglish = locale === "en-CA";

    if (isEnglish) {
      if (channel === "sms") {
        return `Hi ${firstName}! Thanks for contacting ${this.dealershipConfig.dealershipName} Service. We'd be happy to help with your ${inquiry.type} inquiry. Call us at ${this.dealershipConfig.phone} or reply here. - ${this.dealershipConfig.dealershipName} Service`;
      }
      return `Hi ${firstName},\n\nThank you for reaching out to ${this.dealershipConfig.dealershipName} Service Department.\n\nWe'd be happy to assist with your inquiry. Our service team is available during ${this.dealershipConfig.hours}.\n\nFeel free to call us at ${this.dealershipConfig.phone} or reply to this message.\n\nBest regards,\n${this.dealershipConfig.dealershipName} Service Team`;
    }

    if (channel === "sms") {
      return `Bonjour ${firstName}! Merci de contacter le service de ${this.dealershipConfig.dealershipName}. Nous serons heureux de vous aider. Appelez-nous au ${this.dealershipConfig.phone} ou repondez ici. - ${this.dealershipConfig.dealershipName} Service`;
    }
    return `Bonjour ${firstName},\n\nMerci d'avoir communique avec le departement de service de ${this.dealershipConfig.dealershipName}.\n\nNous serons heureux de vous aider avec votre demande. Notre equipe de service est disponible durant ${this.dealershipConfig.hours}.\n\nN'hesitez pas a nous appeler au ${this.dealershipConfig.phone} ou a repondre a ce message.\n\nCordialement,\nEquipe de service ${this.dealershipConfig.dealershipName}`;
  }

  private buildBookingFallback(
    firstName: string,
    serviceType: string,
    preferredDate: string,
    serviceAdvisor: string,
    locale: "en-CA" | "fr-CA",
    channel: "sms" | "email",
  ): string {
    const isEnglish = locale === "en-CA";

    if (isEnglish) {
      if (channel === "sms") {
        return `Hi ${firstName}! Your ${serviceType} appointment is booked for ${preferredDate}. ${serviceAdvisor} will be ready for you. Questions? Call ${this.dealershipConfig.phone}. - ${this.dealershipConfig.dealershipName} Service`;
      }
      return `Hi ${firstName},\n\nYour service appointment has been booked:\n\nService: ${serviceType}\nDate: ${preferredDate}\nAdvisor: ${serviceAdvisor}\n\nPlease arrive 5-10 minutes early. If you need to reschedule, call us at ${this.dealershipConfig.phone}.\n\nSee you then!\n${this.dealershipConfig.dealershipName} Service Team`;
    }

    if (channel === "sms") {
      return `Bonjour ${firstName}! Votre rendez-vous pour ${serviceType} est confirme pour le ${preferredDate}. ${serviceAdvisor} vous attendra. Questions? Appelez ${this.dealershipConfig.phone}. - ${this.dealershipConfig.dealershipName} Service`;
    }
    return `Bonjour ${firstName},\n\nVotre rendez-vous de service est confirme:\n\nService: ${serviceType}\nDate: ${preferredDate}\nConseiller: ${serviceAdvisor}\n\nVeuillez arriver 5-10 minutes a l'avance. Pour reporter, appelez-nous au ${this.dealershipConfig.phone}.\n\nA bientot!\nEquipe de service ${this.dealershipConfig.dealershipName}`;
  }

  private buildStatusFallback(
    firstName: string,
    roNumber: string,
    statusLabel: string,
    status: ServiceStatusResult,
    locale: "en-CA" | "fr-CA",
    channel: "sms" | "email",
  ): string {
    const isEnglish = locale === "en-CA";

    if (status.status === "not_found") {
      if (isEnglish) {
        return channel === "sms"
          ? `Hi ${firstName}, we couldn't find RO #${roNumber}. Please double-check the number or call us at ${this.dealershipConfig.phone}. - ${this.dealershipConfig.dealershipName} Service`
          : `Hi ${firstName},\n\nWe weren't able to locate repair order #${roNumber} in our system. Could you please double-check the number?\n\nYou can also call us at ${this.dealershipConfig.phone} and we'll look it up for you.\n\nBest regards,\n${this.dealershipConfig.dealershipName} Service Team`;
      }
      return channel === "sms"
        ? `Bonjour ${firstName}, nous n'avons pas trouve le bon de reparation #${roNumber}. Verifiez le numero ou appelez-nous au ${this.dealershipConfig.phone}. - ${this.dealershipConfig.dealershipName} Service`
        : `Bonjour ${firstName},\n\nNous n'avons pas pu localiser le bon de reparation #${roNumber} dans notre systeme. Pourriez-vous verifier le numero?\n\nVous pouvez aussi nous appeler au ${this.dealershipConfig.phone} et nous le chercherons pour vous.\n\nCordialement,\nEquipe de service ${this.dealershipConfig.dealershipName}`;
    }

    if (status.status === "ready_for_pickup") {
      if (isEnglish) {
        return channel === "sms"
          ? `Hi ${firstName}! Great news — your vehicle is ready for pickup (RO #${roNumber}). We're open until ${this.dealershipConfig.hours}. See you soon! - ${this.dealershipConfig.dealershipName} Service`
          : `Hi ${firstName},\n\nGreat news — your vehicle is ready for pickup!\n\nRO #: ${roNumber}\nStatus: ${statusLabel}\n\nWe're open ${this.dealershipConfig.hours}. See you soon!\n\nBest regards,\n${this.dealershipConfig.dealershipName} Service Team`;
      }
      return channel === "sms"
        ? `Bonjour ${firstName}! Bonne nouvelle — votre vehicule est pret pour la cueillette (RO #${roNumber}). Nous sommes ouverts ${this.dealershipConfig.hours}. A bientot! - ${this.dealershipConfig.dealershipName} Service`
        : `Bonjour ${firstName},\n\nBonne nouvelle — votre vehicule est pret pour la cueillette!\n\nRO #: ${roNumber}\nStatut: ${statusLabel}\n\nNous sommes ouverts ${this.dealershipConfig.hours}. A bientot!\n\nCordialement,\nEquipe de service ${this.dealershipConfig.dealershipName}`;
    }

    // Generic status
    if (isEnglish) {
      return channel === "sms"
        ? `Hi ${firstName}! Your vehicle status (RO #${roNumber}): ${statusLabel}. Questions? Call ${this.dealershipConfig.phone}. - ${this.dealershipConfig.dealershipName} Service`
        : `Hi ${firstName},\n\nHere's an update on your vehicle:\n\nRO #: ${roNumber}\nStatus: ${statusLabel}\n\nIf you have questions, call us at ${this.dealershipConfig.phone}.\n\nBest regards,\n${this.dealershipConfig.dealershipName} Service Team`;
    }
    return channel === "sms"
      ? `Bonjour ${firstName}! Statut de votre vehicule (RO #${roNumber}): ${statusLabel}. Questions? Appelez ${this.dealershipConfig.phone}. - ${this.dealershipConfig.dealershipName} Service`
      : `Bonjour ${firstName},\n\nVoici une mise a jour sur votre vehicule:\n\nRO #: ${roNumber}\nStatut: ${statusLabel}\n\nSi vous avez des questions, appelez-nous au ${this.dealershipConfig.phone}.\n\nCordialement,\nEquipe de service ${this.dealershipConfig.dealershipName}`;
  }

  private buildRecallFallback(
    firstName: string,
    openRecalls: Array<{ campaignNumber: string; component: string; summary: string; remedy: string; isOpen: boolean }>,
    locale: "en-CA" | "fr-CA",
    channel: "sms" | "email",
  ): string {
    const isEnglish = locale === "en-CA";

    if (openRecalls.length === 0) {
      if (isEnglish) {
        return channel === "sms"
          ? `Hi ${firstName}! Good news — no open recalls found for your vehicle. For peace of mind, book a multi-point inspection anytime. Call ${this.dealershipConfig.phone}. - ${this.dealershipConfig.dealershipName} Service`
          : `Hi ${firstName},\n\nGood news — we found no open recalls for your vehicle!\n\nFor your peace of mind, you can always book a multi-point inspection with us. Call ${this.dealershipConfig.phone} to schedule.\n\nBest regards,\n${this.dealershipConfig.dealershipName} Service Team`;
      }
      return channel === "sms"
        ? `Bonjour ${firstName}! Bonne nouvelle — aucun rappel ouvert pour votre vehicule. Pour votre tranquillite d'esprit, reservez une inspection multi-points. Appelez ${this.dealershipConfig.phone}. - ${this.dealershipConfig.dealershipName} Service`
        : `Bonjour ${firstName},\n\nBonne nouvelle — aucun rappel ouvert trouve pour votre vehicule!\n\nPour votre tranquillite d'esprit, vous pouvez toujours reserver une inspection multi-points chez nous. Appelez ${this.dealershipConfig.phone} pour planifier.\n\nCordialement,\nEquipe de service ${this.dealershipConfig.dealershipName}`;
    }

    const recallSummary = this.buildRecallSummary(openRecalls, locale);

    if (isEnglish) {
      return channel === "sms"
        ? `Hi ${firstName}! We found ${openRecalls.length} open recall(s) for your vehicle. Recall repairs are always FREE. Call ${this.dealershipConfig.phone} to book. - ${this.dealershipConfig.dealershipName} Service`
        : `Hi ${firstName},\n\nWe found ${openRecalls.length} open recall(s) for your vehicle:\n\n${recallSummary}\n\nIMPORTANT: Recall repairs are always FREE of charge.\n\nCall ${this.dealershipConfig.phone} to book your recall appointment.\n\nBest regards,\n${this.dealershipConfig.dealershipName} Service Team`;
    }
    return channel === "sms"
      ? `Bonjour ${firstName}! Nous avons trouve ${openRecalls.length} rappel(s) ouvert(s) pour votre vehicule. Les reparations de rappel sont toujours GRATUITES. Appelez ${this.dealershipConfig.phone}. - ${this.dealershipConfig.dealershipName} Service`
      : `Bonjour ${firstName},\n\nNous avons trouve ${openRecalls.length} rappel(s) ouvert(s) pour votre vehicule:\n\n${recallSummary}\n\nIMPORTANT: Les reparations de rappel sont toujours GRATUITES.\n\nAppelez ${this.dealershipConfig.phone} pour prendre rendez-vous.\n\nCordialement,\nEquipe de service ${this.dealershipConfig.dealershipName}`;
  }

  private buildRecallSummary(
    recalls: Array<{ campaignNumber: string; component: string; summary: string; remedy: string }>,
    locale: "en-CA" | "fr-CA",
  ): string {
    if (recalls.length === 0) {
      return locale === "en-CA" ? "No open recalls found." : "Aucun rappel ouvert trouve.";
    }
    return recalls.map((r) =>
      locale === "en-CA"
        ? `- ${r.component}: ${r.summary} (Campaign #${r.campaignNumber})`
        : `- ${r.component}: ${r.summary} (Campagne #${r.campaignNumber})`,
    ).join("\n");
  }

  private getStatusLabel(status: ServiceStatusResult["status"], locale: "en-CA" | "fr-CA"): string {
    const labels: Record<ServiceStatusResult["status"], { en: string; fr: string }> = {
      checked_in: { en: "Checked in", fr: "Enregistre" },
      in_progress: { en: "In progress", fr: "En cours" },
      waiting_for_parts: { en: "Waiting for parts", fr: "En attente de pieces" },
      ready_for_pickup: { en: "Ready for pickup", fr: "Pret pour la cueillette" },
      not_found: { en: "Not found", fr: "Non trouve" },
    };
    return locale === "en-CA" ? labels[status].en : labels[status].fr;
  }

  private getDefaultName(locale: "en-CA" | "fr-CA"): string {
    return locale === "en-CA" ? "there" : "Client";
  }

  private getServiceAdvisorName(): string {
    const serviceRep = this.dealershipConfig.staff.find(
      (s) =>
        s.role.toLowerCase().includes("service") ||
        s.role.toLowerCase().includes("technic") ||
        s.role.toLowerCase().includes("conseiller"),
    );
    return serviceRep?.name ?? this.dealershipConfig.staff[0]?.name ?? "our service team";
  }
}
