/**
 * VoiceReceptionistAgent -- AI receptionist for dealership phone calls.
 * Integrates with Retell AI for 24/7 voice-based call handling.
 *
 * Capabilities:
 * - Greeting generation (business hours / after hours)
 * - Inquiry handling with intent classification
 * - Warm transfer briefings for human reps
 * - After-hours response generation
 * - Retell AI voice configuration
 */

import type { DealershipConfig, LeadData } from "./types.js";
import {
  buildVoiceReceptionistPrompt,
  buildContextFromDealershipConfig,
  VOICE_MAX_WORDS,
  type VoiceReceptionistContext,
  type AfterHoursSchedule,
} from "./prompts/voice-receptionist.js";

// --- Dependency interfaces ---

export interface VoiceLanguageDetectorDep {
  detect(input: { text?: string; locale?: string | null }): "en-CA" | "fr-CA";
}

// --- Retell AI configuration types ---

export interface RetellVoiceConfig {
  agent_name: string;
  voice_id: string;
  voice_model: string;
  language: string;
  fallback_language: string;
  response_speed: "slow" | "normal" | "fast";
  max_call_duration_seconds: number;
  silence_timeout_seconds: number;
  end_call_after_silence_seconds: number;
  enable_backchannel: boolean;
  backchannel_frequency: "low" | "medium" | "high";
  ambient_sound: string | null;
  responsiveness: number;
  interruption_sensitivity: number;
  enable_voicemail_detection: boolean;
  voicemail_message: string;
  post_call_analysis: boolean;
  opt_out_sensitive_data_storage: boolean;
  system_prompt: string;
}

// --- Intent types ---

export type CallIntent =
  | "sales_inquiry"
  | "service_inquiry"
  | "parts_inquiry"
  | "test_drive"
  | "hours_location"
  | "speak_to_human"
  | "complaint"
  | "general"
  | "unknown";

// --- Warm transfer types ---

export interface WarmTransferBriefing {
  customerName: string;
  vehicleInterest: string;
  keyQuestions: string[];
  repBriefing: string;
  customerTransitionMessage: string;
  transferNumber: string;
}

// --- VoiceReceptionistAgent ---

export class VoiceReceptionistAgent {
  private readonly dealershipConfig: DealershipConfig;
  private readonly languageDetector: VoiceLanguageDetectorDep;
  private readonly aiName: string;
  private readonly transferNumbers: VoiceReceptionistContext["transferNumbers"];
  private readonly afterHoursSchedule: AfterHoursSchedule;

  constructor(
    dealershipConfig: DealershipConfig,
    languageDetector: VoiceLanguageDetectorDep,
    options: {
      aiName?: string;
      transferNumbers?: VoiceReceptionistContext["transferNumbers"];
      afterHoursSchedule?: AfterHoursSchedule;
    } = {},
  ) {
    this.dealershipConfig = dealershipConfig;
    this.languageDetector = languageDetector;
    this.aiName = options.aiName ?? "Alex";
    this.transferNumbers = options.transferNumbers ?? {
      sales: dealershipConfig.phone,
      service: dealershipConfig.phone,
      parts: dealershipConfig.phone,
      manager: dealershipConfig.escalationNumbers[0] ?? dealershipConfig.phone,
    };
    this.afterHoursSchedule = options.afterHoursSchedule ?? this.buildDefaultSchedule();
  }

  /**
   * Generates the appropriate greeting based on business hours.
   */
  generateGreeting(isAfterHours: boolean): string {
    if (isAfterHours) {
      return `Thank you for calling ${this.dealershipConfig.dealershipName}, this is ${this.aiName}. We're currently closed but I can help you right now. Would you like to book an appointment, or can I have someone call you back first thing in the morning?`;
    }
    return `Thank you for calling ${this.dealershipConfig.dealershipName}, this is ${this.aiName}. How can I help you today?`;
  }

  /**
   * Generates the appropriate greeting in French.
   */
  generateGreetingFr(isAfterHours: boolean): string {
    if (isAfterHours) {
      return `Merci d'avoir appele ${this.dealershipConfig.dealershipName}, ici ${this.aiName}. Nous sommes presentement fermes, mais je peux vous aider maintenant. Aimeriez-vous prendre un rendez-vous, ou preferer-vous qu'on vous rappelle demain matin a la premiere heure?`;
    }
    return `Merci d'avoir appele ${this.dealershipConfig.dealershipName}, ici ${this.aiName}. Comment puis-je vous aider aujourd'hui?`;
  }

  /**
   * Generates a voice response based on the transcript and detected intent.
   * Returns a short, spoken-style response suitable for voice output.
   */
  handleInquiry(transcript: string, intent: CallIntent): string {
    const locale = this.languageDetector.detect({ text: transcript });
    const isEnglish = locale === "en-CA";

    switch (intent) {
      case "sales_inquiry":
        return isEnglish
          ? "I'd love to help you find the right vehicle. What are you looking for today?"
          : "J'aimerais vous aider a trouver le bon vehicule. Que cherchez-vous aujourd'hui?";

      case "service_inquiry":
        return isEnglish
          ? "I can help with that. Would you like to book a service appointment?"
          : "Je peux vous aider avec ca. Aimeriez-vous prendre un rendez-vous de service?";

      case "parts_inquiry":
        return isEnglish
          ? "Let me connect you with our parts department. They'll know exactly what you need."
          : "Laissez-moi vous mettre en contact avec notre departement de pieces. Ils sauront exactement ce qu'il vous faut.";

      case "test_drive":
        return isEnglish
          ? "Great choice! Which vehicle are you interested in test driving?"
          : "Excellent choix! Quel vehicule aimeriez-vous essayer?";

      case "hours_location":
        return isEnglish
          ? `We're located at ${this.dealershipConfig.address}. Our hours are ${this.dealershipConfig.hours}. Would you like directions?`
          : `Nous sommes situes au ${this.dealershipConfig.address}. Nos heures sont ${this.dealershipConfig.hours}. Voulez-vous les directions?`;

      case "speak_to_human":
        return isEnglish
          ? "Absolutely, let me connect you with someone right away. One moment please."
          : "Absolument, laissez-moi vous mettre en contact avec quelqu'un immediatement. Un instant s'il vous plait.";

      case "complaint":
        return isEnglish
          ? "I'm sorry to hear that. Let me connect you with a manager who can help resolve this."
          : "Je suis desole d'entendre cela. Laissez-moi vous mettre en contact avec un gestionnaire qui pourra vous aider.";

      case "general":
      case "unknown":
      default:
        return isEnglish
          ? "Sure, I'm happy to help. Could you tell me a bit more about what you're looking for?"
          : "Bien sur, je suis heureux de vous aider. Pourriez-vous m'en dire un peu plus sur ce que vous cherchez?";
    }
  }

  /**
   * Generates a warm transfer briefing for the human rep.
   * Includes a private rep briefing and a customer transition message.
   */
  initiateWarmTransfer(
    lead: { firstName: string; vehicleInterest?: string; questions?: string[] },
    repName: string,
  ): WarmTransferBriefing {
    const vehicleInterest = lead.vehicleInterest ?? "general inquiry";
    const keyQuestions = lead.questions ?? [];

    const questionsStr = keyQuestions.length > 0
      ? ` They asked about: ${keyQuestions.join(", ")}.`
      : "";

    const repBriefing = `I have ${lead.firstName} on the line, they're interested in a ${vehicleInterest}.${questionsStr}`;
    const customerTransitionMessage = `${lead.firstName}, I have ${repName} on the line. They're up to speed on what you're looking for.`;

    const transferNumber = this.getTransferNumberForIntent(vehicleInterest);

    return {
      customerName: lead.firstName,
      vehicleInterest,
      keyQuestions,
      repBriefing,
      customerTransitionMessage,
      transferNumber,
    };
  }

  /**
   * Generates an appropriate response for after-hours calls.
   */
  generateAfterHoursResponse(inquiry: string): string {
    const locale = this.languageDetector.detect({ text: inquiry });
    const isEnglish = locale === "en-CA";

    if (isEnglish) {
      return `We're currently closed but I can definitely help. I can book you an appointment for our next business day, or take your information so someone can call you back first thing in the morning. Which would you prefer?`;
    }
    return `Nous sommes presentement fermes mais je peux certainement vous aider. Je peux vous prendre un rendez-vous pour notre prochain jour ouvrable, ou prendre vos informations pour qu'on vous rappelle a la premiere heure demain matin. Que preferez-vous?`;
  }

  /**
   * Returns the Retell AI voice configuration object.
   * This is the configuration that gets sent to Retell's API.
   */
  getVoiceConfig(locale: "en-CA" | "fr-CA" = "en-CA"): RetellVoiceConfig {
    const context = buildContextFromDealershipConfig(this.dealershipConfig, {
      aiName: this.aiName,
      transferNumbers: this.transferNumbers,
      afterHoursSchedule: this.afterHoursSchedule,
      locale,
    });

    const systemPrompt = buildVoiceReceptionistPrompt(context);

    return {
      agent_name: `${this.dealershipConfig.dealershipName} AI Receptionist`,
      voice_id: "eleven_labs_rachel",
      voice_model: "eleven_turbo_v2",
      language: locale === "fr-CA" ? "fr-CA" : "en-CA",
      fallback_language: locale === "fr-CA" ? "en-CA" : "fr-CA",
      response_speed: "normal",
      max_call_duration_seconds: 600,
      silence_timeout_seconds: 10,
      end_call_after_silence_seconds: 30,
      enable_backchannel: true,
      backchannel_frequency: "medium",
      ambient_sound: null,
      responsiveness: 0.8,
      interruption_sensitivity: 0.7,
      enable_voicemail_detection: true,
      voicemail_message: `Hi, you've reached ${this.dealershipConfig.dealershipName}. We're sorry we missed your call. Please leave a message and we'll get back to you as soon as possible.`,
      post_call_analysis: true,
      opt_out_sensitive_data_storage: false,
      system_prompt: systemPrompt,
    };
  }

  /**
   * Returns the full system prompt for the voice agent.
   */
  getSystemPrompt(locale: "en-CA" | "fr-CA" = "en-CA"): string {
    const context = buildContextFromDealershipConfig(this.dealershipConfig, {
      aiName: this.aiName,
      transferNumbers: this.transferNumbers,
      afterHoursSchedule: this.afterHoursSchedule,
      locale,
    });
    return buildVoiceReceptionistPrompt(context);
  }

  /**
   * Returns the VOICE_MAX_WORDS constant for external reference.
   */
  getMaxWordsPerResponse(): number {
    return VOICE_MAX_WORDS;
  }

  // --- Private helpers ---

  private getTransferNumberForIntent(interest: string): string {
    const lower = interest.toLowerCase();
    if (lower.includes("service") || lower.includes("maintenance") || lower.includes("repair")) {
      return this.transferNumbers.service;
    }
    if (lower.includes("part") || lower.includes("piece")) {
      return this.transferNumbers.parts;
    }
    if (lower.includes("complaint") || lower.includes("manager") || lower.includes("plainte")) {
      return this.transferNumbers.manager;
    }
    return this.transferNumbers.sales;
  }

  private buildDefaultSchedule(): AfterHoursSchedule {
    return {
      monday: { open: "09:00", close: "18:00" },
      tuesday: { open: "09:00", close: "18:00" },
      wednesday: { open: "09:00", close: "18:00" },
      thursday: { open: "09:00", close: "18:00" },
      friday: { open: "09:00", close: "18:00" },
      saturday: { open: "09:00", close: "16:00" },
      sunday: null,
    };
  }
}
