import type { Layer3Config } from '../types.js';
import { Layer3Schema } from '../types.js';

// ─── Client Config Store (Layer 3 — client-editable, database-controlled) ───

export class ClientConfigStore {
  private store: Map<string, Layer3Config> = new Map();

  /**
   * Load Layer 3 config for a tenant.
   * Returns null if no config exists for the given tenantId.
   */
  load(tenantId: string): Layer3Config | null {
    return this.store.get(tenantId) ?? null;
  }

  /**
   * Save Layer 3 config for a tenant.
   * Validates the config before persisting.
   * Throws if validation fails.
   */
  save(tenantId: string, config: Layer3Config): void {
    this.validate(config);
    this.store.set(tenantId, structuredClone(config));
  }

  /**
   * Validate a Layer 3 config against the Zod schema with security constraints.
   * Enforces character limits: promotions 500 chars, FAQ answers 1000 chars, greeting 200 chars.
   * Throws a descriptive error if validation fails.
   */
  validate(config: unknown): Layer3Config {
    const result = Layer3Schema.safeParse(config);
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`Layer 3 config validation failed: ${issues}`);
    }
    return result.data;
  }

  /**
   * Check if a client config exists.
   */
  exists(tenantId: string): boolean {
    return this.store.has(tenantId);
  }

  /**
   * Delete a client config.
   */
  delete(tenantId: string): boolean {
    return this.store.delete(tenantId);
  }
}
