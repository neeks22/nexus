import { createHmac, timingSafeEqual } from "node:crypto";
import {
  ActivixLeadSchema,
  PaginatedResponseSchema,
} from "./schemas.js";
import type {
  ActivixLead,
  ActivixLeadCreate,
  ActivixLeadUpdate,
  LeadListFilters,
  PaginatedResponse,
} from "./schemas.js";

// --- Constants ---

const DEFAULT_BASE_URL = "https://api.crm.activix.ca/v2";
const DEFAULT_RATE_LIMIT_PER_MINUTE = 200;
const DEFAULT_RATE_LIMIT_PER_HOUR = 2000;
const MAX_SEARCH_RESULTS = 1000;
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];
const MAX_RETRY_DELAY_MS = 30000;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 60000;

const SingleLeadResponseSchema = ActivixLeadSchema;
const PaginatedLeadResponseSchema = PaginatedResponseSchema(ActivixLeadSchema);

// --- Error classes ---

export class ActivixApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: unknown,
  ) {
    super(message);
    this.name = "ActivixApiError";
  }
}

export class ActivixRateLimitError extends ActivixApiError {
  constructor(responseBody: unknown) {
    super("Activix API rate limit exceeded", 429, responseBody);
    this.name = "ActivixRateLimitError";
  }
}

export class ActivixCircuitOpenError extends Error {
  constructor() {
    super("Activix API circuit breaker is OPEN — requests are blocked");
    this.name = "ActivixCircuitOpenError";
  }
}

export class ActivixValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: unknown[],
  ) {
    super(message);
    this.name = "ActivixValidationError";
  }
}

// --- Circuit breaker ---

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreaker {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
}

// --- Config ---

export interface ActivixClientConfig {
  apiKey: string;
  baseUrl?: string;
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  fetch?: typeof globalThis.fetch;
}

// --- Client ---

export class ActivixClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly rateLimitPerMinute: number;
  private readonly rateLimitPerHour: number;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly circuit: CircuitBreaker;
  private readonly requestTimestamps: number[];

  constructor(config: ActivixClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.rateLimitPerMinute = config.rateLimitPerMinute ?? DEFAULT_RATE_LIMIT_PER_MINUTE;
    this.rateLimitPerHour = config.rateLimitPerHour ?? DEFAULT_RATE_LIMIT_PER_HOUR;
    this.fetchFn = config.fetch ?? globalThis.fetch;
    this.circuit = { state: "CLOSED", failureCount: 0, lastFailureTime: 0 };
    this.requestTimestamps = [];
  }

  // --- Public API: Leads ---

  get leads(): LeadsApi {
    return {
      get: (id: number, include?: string[]): Promise<ActivixLead> =>
        this.getLeadById(id, include),
      list: (filters?: LeadListFilters): Promise<PaginatedResponse<ActivixLead>> =>
        this.listLeads(filters),
      search: (query: string): Promise<ActivixLead[]> => this.searchLeads(query),
      create: (data: ActivixLeadCreate): Promise<ActivixLead> => this.createLead(data),
      update: (id: number, data: ActivixLeadUpdate): Promise<ActivixLead> =>
        this.updateLead(id, data),
    };
  }

  // --- Webhook verification ---

  static verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
    secret: string,
  ): boolean {
    const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    const expectedBuf = Buffer.from(expected, "utf-8");
    const signatureBuf = Buffer.from(signature, "utf-8");
    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, signatureBuf);
  }

  // --- Circuit breaker state (for external checks) ---

  getCircuitState(): CircuitState {
    this.maybeResetCircuit();
    return this.circuit.state;
  }

  // --- Private: Lead operations ---

  private async getLeadById(id: number, include?: string[]): Promise<ActivixLead> {
    const params = new URLSearchParams();
    if (include?.length) {
      params.set("include", include.join(","));
    }
    const qs = params.toString();
    const url = `/leads/${id}${qs ? `?${qs}` : ""}`;
    const response = await this.request<{ data: unknown }>("GET", url);
    return this.validateLead(response.data);
  }

  private async listLeads(
    filters?: LeadListFilters,
  ): Promise<PaginatedResponse<ActivixLead>> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.page !== undefined) params.set("page", String(filters.page));
      if (filters.per_page !== undefined)
        params.set("per_page", String(filters.per_page));
      if (filters.division) params.set("filter[division]", filters.division);
      if (filters.result) params.set("filter[result]", filters.result);
      if (filters.status) params.set("filter[status]", filters.status);
      if (filters.created_at_gte)
        params.set("filter[created_at][gte]", filters.created_at_gte);
      if (filters.created_at_lte)
        params.set("filter[created_at][lte]", filters.created_at_lte);
      if (filters.updated_at_gte)
        params.set("filter[updated_at][gte]", filters.updated_at_gte);
      if (filters.updated_at_lte)
        params.set("filter[updated_at][lte]", filters.updated_at_lte);
    }
    const qs = params.toString();
    const url = `/leads${qs ? `?${qs}` : ""}`;
    const raw = await this.request<unknown>("GET", url);
    return this.validatePaginatedLeads(raw);
  }

  private async searchLeads(query: string): Promise<ActivixLead[]> {
    const allResults: ActivixLead[] = [];
    let page = 1;

    while (allResults.length < MAX_SEARCH_RESULTS) {
      const params = new URLSearchParams({
        q: query,
        page: String(page),
        per_page: "100",
      });
      const raw = await this.request<unknown>(
        "GET",
        `/leads/search?${params}`,
      );
      const response = this.validatePaginatedLeads(raw);
      allResults.push(...response.data);

      if (page >= response.meta.last_page || allResults.length >= MAX_SEARCH_RESULTS) {
        break;
      }
      page++;
    }

    return allResults.slice(0, MAX_SEARCH_RESULTS);
  }

  private async createLead(data: ActivixLeadCreate): Promise<ActivixLead> {
    const response = await this.request<{ data: unknown }>("POST", "/leads", data);
    return this.validateLead(response.data);
  }

  private async updateLead(id: number, data: ActivixLeadUpdate): Promise<ActivixLead> {
    const response = await this.request<{ data: unknown }>(
      "PUT",
      `/leads/${id}`,
      data,
    );
    return this.validateLead(response.data);
  }

  // --- Private: HTTP with retry, rate limiting, circuit breaker ---

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    this.checkCircuit();
    this.enforceRateLimit();

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const url = `${this.baseUrl}${path}`;
        const headers: Record<string, string> = {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        };

        const options: RequestInit = { method, headers };
        if (body !== undefined) {
          options.body = JSON.stringify(body);
        }

        this.recordRequest();
        const response = await this.fetchFn(url, options);

        if (response.ok) {
          this.onSuccess();
          return (await response.json()) as T;
        }

        const responseBody = await response.text().catch(() => "");
        let parsed: unknown;
        try {
          parsed = JSON.parse(responseBody);
        } catch {
          parsed = responseBody;
        }

        if (response.status === 429) {
          const err = new ActivixRateLimitError(parsed);
          lastError = err;
          this.onFailure();
          if (attempt < RETRY_DELAYS_MS.length) {
            await this.sleep(this.getRetryDelay(attempt));
            continue;
          }
          throw err;
        }

        if (response.status >= 500) {
          const err = new ActivixApiError(
            `Activix API error: ${response.status}`,
            response.status,
            parsed,
          );
          lastError = err;
          this.onFailure();
          if (attempt < RETRY_DELAYS_MS.length) {
            await this.sleep(this.getRetryDelay(attempt));
            continue;
          }
          throw err;
        }

        // 4xx (non-429) — don't retry, but record failure for circuit breaker
        this.onFailure();
        throw new ActivixApiError(
          `Activix API error: ${response.status}`,
          response.status,
          parsed,
        );
      } catch (error) {
        if (
          error instanceof ActivixApiError ||
          error instanceof ActivixCircuitOpenError
        ) {
          throw error;
        }
        // Network errors — retry
        lastError = error instanceof Error ? error : new Error(String(error));
        this.onFailure();
        if (attempt < RETRY_DELAYS_MS.length) {
          await this.sleep(this.getRetryDelay(attempt));
          continue;
        }
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  // --- Response validation ---

  private validateLead(data: unknown): ActivixLead {
    const result = SingleLeadResponseSchema.safeParse(data);
    if (!result.success) {
      throw new ActivixValidationError(
        "Activix API response failed schema validation",
        result.error.issues,
      );
    }
    return result.data;
  }

  private validatePaginatedLeads(data: unknown): PaginatedResponse<ActivixLead> {
    const result = PaginatedLeadResponseSchema.safeParse(data);
    if (!result.success) {
      throw new ActivixValidationError(
        "Activix API paginated response failed schema validation",
        result.error.issues,
      );
    }
    return result.data;
  }

  // --- Rate limiter ---

  private enforceRateLimit(): void {
    const now = Date.now();
    // Clean old timestamps
    while (
      this.requestTimestamps.length > 0 &&
      (this.requestTimestamps[0] ?? 0) < now - 3600000
    ) {
      this.requestTimestamps.shift();
    }

    const oneMinuteAgo = now - 60000;
    const recentMinute = this.requestTimestamps.filter((t) => t >= oneMinuteAgo).length;

    if (recentMinute >= this.rateLimitPerMinute) {
      throw new ActivixRateLimitError("Client-side rate limit (per minute) reached");
    }
    if (this.requestTimestamps.length >= this.rateLimitPerHour) {
      throw new ActivixRateLimitError("Client-side rate limit (per hour) reached");
    }
  }

  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  // --- Circuit breaker ---

  private checkCircuit(): void {
    this.maybeResetCircuit();
    if (this.circuit.state === "OPEN") {
      throw new ActivixCircuitOpenError();
    }
  }

  private maybeResetCircuit(): void {
    if (
      this.circuit.state === "OPEN" &&
      Date.now() - this.circuit.lastFailureTime >= CIRCUIT_BREAKER_RESET_MS
    ) {
      this.circuit.state = "HALF_OPEN";
    }
  }

  private onSuccess(): void {
    this.circuit.state = "CLOSED";
    this.circuit.failureCount = 0;
  }

  private onFailure(): void {
    this.circuit.failureCount++;
    this.circuit.lastFailureTime = Date.now();
    if (this.circuit.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuit.state = "OPEN";
    }
  }

  // --- Retry helpers ---

  private getRetryDelay(attempt: number): number {
    const base = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!;
    // Add jitter: +/- 25%
    const jitter = base * 0.25 * (Math.random() * 2 - 1);
    return Math.min(base + jitter, MAX_RETRY_DELAY_MS);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// --- Types ---

export interface LeadsApi {
  get(id: number, include?: string[]): Promise<ActivixLead>;
  list(filters?: LeadListFilters): Promise<PaginatedResponse<ActivixLead>>;
  search(query: string): Promise<ActivixLead[]>;
  create(data: ActivixLeadCreate): Promise<ActivixLead>;
  update(id: number, data: ActivixLeadUpdate): Promise<ActivixLead>;
}
