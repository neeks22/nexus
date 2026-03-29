/**
 * Message template repository — loads and renders templates
 * keyed by (template_id, locale, channel).
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import type { SupportedLocale } from "./language-detector.js";

export type Channel = "sms" | "email";

export interface TemplateVariables {
  [key: string]: string | undefined;
}

/**
 * Loads message templates from the filesystem.
 * Directory structure: <templatesDir>/<locale>/<channel>/<templateId>.txt
 */
export class MessageTemplateRepository {
  private readonly templatesDir: string;
  private readonly cache: Map<string, string> = new Map();

  constructor(templatesDir: string) {
    this.templatesDir = resolve(templatesDir);
  }

  /**
   * Returns the raw template string with {{variable}} placeholders.
   * Returns null if the template does not exist.
   */
  get(templateId: string, locale: SupportedLocale, channel: Channel): string | null {
    const cacheKey = this.buildCacheKey(templateId, locale, channel);

    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const filePath = this.buildFilePath(templateId, locale, channel);

    if (!existsSync(filePath)) {
      return null;
    }

    const content = readFileSync(filePath, "utf-8").trim();
    this.cache.set(cacheKey, content);
    return content;
  }

  /**
   * Renders a template with variable substitution.
   * Missing variables are left as empty strings (graceful degradation).
   * Returns null if the template does not exist.
   */
  render(
    templateId: string,
    locale: SupportedLocale,
    channel: Channel,
    variables: TemplateVariables,
  ): string | null {
    const template = this.get(templateId, locale, channel);

    if (template === null) {
      return null;
    }

    return this.substituteVariables(template, variables);
  }

  /**
   * Lists all available template IDs for a given locale and channel.
   */
  listTemplates(locale: SupportedLocale, channel: Channel): string[] {
    const dirPath = join(this.templatesDir, locale, channel);

    if (!existsSync(dirPath)) {
      return [];
    }

    return readdirSync(dirPath)
      .filter((file) => file.endsWith(".txt"))
      .map((file) => file.replace(/\.txt$/, ""))
      .sort();
  }

  /**
   * Clears the internal cache. Useful for testing or when templates change on disk.
   */
  clearCache(): void {
    this.cache.clear();
  }

  private buildCacheKey(templateId: string, locale: SupportedLocale, channel: Channel): string {
    return `${locale}/${channel}/${templateId}`;
  }

  private buildFilePath(templateId: string, locale: SupportedLocale, channel: Channel): string {
    return join(this.templatesDir, locale, channel, `${templateId}.txt`);
  }

  private substituteVariables(template: string, variables: TemplateVariables): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
      const value = variables[varName];
      return value !== undefined ? value : "";
    });
  }
}
