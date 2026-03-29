import type { Layer2Config } from '../types.js';
import { Layer2Schema } from '../types.js';

// ─── Tenant Config Store (Layer 2 — per-dealership, database-controlled) ────

export class TenantConfigStore {
  private store: Map<string, Layer2Config> = new Map();

  /**
   * Load Layer 2 config for a tenant.
   * Returns null if no config exists for the given tenantId.
   */
  load(tenantId: string): Layer2Config | null {
    return this.store.get(tenantId) ?? null;
  }

  /**
   * Save Layer 2 config for a tenant.
   * Validates the config before persisting.
   * Throws if validation fails.
   */
  save(tenantId: string, config: Layer2Config): void {
    this.validate(config);
    this.store.set(tenantId, structuredClone(config));
  }

  /**
   * Validate a Layer 2 config against the Zod schema.
   * Throws a descriptive error if validation fails.
   */
  validate(config: unknown): Layer2Config {
    const result = Layer2Schema.safeParse(config);
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`Layer 2 config validation failed: ${issues}`);
    }
    return result.data;
  }

  /**
   * Check if a tenant config exists.
   */
  exists(tenantId: string): boolean {
    return this.store.has(tenantId);
  }

  /**
   * Delete a tenant config.
   */
  delete(tenantId: string): boolean {
    return this.store.delete(tenantId);
  }
}
