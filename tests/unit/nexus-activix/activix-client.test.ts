import { createHmac } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ActivixClient,
  ActivixApiError,
  ActivixRateLimitError,
  ActivixCircuitOpenError,
} from "../../../packages/nexus-activix/src/activix-client.js";
import type { ActivixLead, PaginatedResponse } from "../../../packages/nexus-activix/src/schemas.js";
import { ActivixLeadSchema, ActivixLeadCreateSchema } from "../../../packages/nexus-activix/src/schemas.js";

// --- Test fixtures ---

const TEST_API_KEY = "test-api-key-12345";
const BASE_URL = "https://api.crm.activix.ca/v2";

function makeLead(overrides: Partial<ActivixLead> = {}): ActivixLead {
  return {
    id: 1001,
    first_name: "John",
    last_name: "Doe",
    type: "email",
    division: "new",
    result: "pending",
    rating: 3,
    locale: "en-CA",
    emails: [{ address: "john@example.com", type: "home" }],
    phones: [{ number: "+15141234567", type: "cell" }],
    vehicles: [{ make: "Honda", model: "Civic", year: 2024, type: "wanted" }],
    ...overrides,
  };
}

function mockFetch(
  handler: (url: string, init: RequestInit) => Promise<Response>,
): typeof globalThis.fetch {
  return handler as typeof globalThis.fetch;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeClient(
  fetchFn: typeof globalThis.fetch,
  overrides: { rateLimitPerMinute?: number; rateLimitPerHour?: number } = {},
): ActivixClient {
  return new ActivixClient({
    apiKey: TEST_API_KEY,
    fetch: fetchFn,
    rateLimitPerMinute: overrides.rateLimitPerMinute ?? 200,
    rateLimitPerHour: overrides.rateLimitPerHour ?? 2000,
  });
}

// --- Tests ---

describe("ActivixClient", () => {
  describe("constructor and auth", () => {
    it("sends Bearer token in Authorization header", async () => {
      let capturedHeaders: Record<string, string> = {};
      const fetch = mockFetch(async (url, init) => {
        capturedHeaders = init.headers as Record<string, string>;
        return jsonResponse({ data: makeLead() });
      });

      const client = makeClient(fetch);
      await client.leads.get(1001);

      expect(capturedHeaders["Authorization"]).toBe(`Bearer ${TEST_API_KEY}`);
      expect(capturedHeaders["Accept"]).toBe("application/json");
      expect(capturedHeaders["Content-Type"]).toBe("application/json");
    });

    it("uses default base URL", async () => {
      let capturedUrl = "";
      const fetch = mockFetch(async (url) => {
        capturedUrl = url;
        return jsonResponse({ data: makeLead() });
      });

      const client = makeClient(fetch);
      await client.leads.get(1001);

      expect(capturedUrl).toBe(`${BASE_URL}/leads/1001`);
    });

    it("uses custom base URL", async () => {
      let capturedUrl = "";
      const fetch = mockFetch(async (url) => {
        capturedUrl = url;
        return jsonResponse({ data: makeLead() });
      });

      const client = new ActivixClient({
        apiKey: TEST_API_KEY,
        baseUrl: "https://custom.api.com/v2",
        fetch,
      });
      await client.leads.get(1);

      expect(capturedUrl).toBe("https://custom.api.com/v2/leads/1");
    });
  });

  describe("leads.get", () => {
    it("fetches a lead by ID", async () => {
      const lead = makeLead({ id: 42 });
      const fetch = mockFetch(async () => jsonResponse({ data: lead }));
      const client = makeClient(fetch);

      const result = await client.leads.get(42);
      expect(result.id).toBe(42);
      expect(result.first_name).toBe("John");
    });

    it("passes include parameter", async () => {
      let capturedUrl = "";
      const fetch = mockFetch(async (url) => {
        capturedUrl = url;
        return jsonResponse({ data: makeLead() });
      });

      const client = makeClient(fetch);
      await client.leads.get(1, ["emails", "phones", "vehicles"]);

      expect(capturedUrl).toContain("include=emails%2Cphones%2Cvehicles");
    });

    it("throws ActivixApiError on 404", async () => {
      const fetch = mockFetch(async () =>
        jsonResponse({ error: "Not found" }, 404),
      );
      const client = makeClient(fetch);

      await expect(client.leads.get(9999)).rejects.toThrow(ActivixApiError);
      await expect(client.leads.get(9999)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("leads.list", () => {
    it("lists leads with pagination", async () => {
      const response: PaginatedResponse<ActivixLead> = {
        data: [makeLead({ id: 1 }), makeLead({ id: 2 })],
        meta: { current_page: 1, last_page: 5, per_page: 25, total: 120 },
      };

      const fetch = mockFetch(async () => jsonResponse(response));
      const client = makeClient(fetch);

      const result = await client.leads.list({ page: 1, per_page: 25 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(120);
    });

    it("passes division and date filters", async () => {
      let capturedUrl = "";
      const fetch = mockFetch(async (url) => {
        capturedUrl = url;
        return jsonResponse({
          data: [],
          meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
        });
      });

      const client = makeClient(fetch);
      await client.leads.list({
        division: "new",
        created_at_gte: "2026-01-01",
        result: "pending",
      });

      expect(capturedUrl).toContain("filter%5Bdivision%5D=new");
      expect(capturedUrl).toContain("filter%5Bcreated_at%5D%5Bgte%5D=2026-01-01");
      expect(capturedUrl).toContain("filter%5Bresult%5D=pending");
    });

    it("returns empty list when no leads match", async () => {
      const fetch = mockFetch(async () =>
        jsonResponse({
          data: [],
          meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
        }),
      );
      const client = makeClient(fetch);

      const result = await client.leads.list();
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("leads.search", () => {
    it("searches leads with auto-pagination", async () => {
      let callCount = 0;
      const fetch = mockFetch(async (url) => {
        callCount++;
        const page = callCount;
        return jsonResponse({
          data:
            page <= 2
              ? Array.from({ length: 100 }, (_, i) =>
                  makeLead({ id: (page - 1) * 100 + i }),
                )
              : [],
          meta: {
            current_page: page,
            last_page: 2,
            per_page: 100,
            total: 200,
          },
        });
      });

      const client = makeClient(fetch);
      const results = await client.leads.search("john doe");

      expect(results).toHaveLength(200);
      expect(callCount).toBe(2);
    });

    it("caps results at 1000", async () => {
      let callCount = 0;
      const fetch = mockFetch(async () => {
        callCount++;
        return jsonResponse({
          data: Array.from({ length: 100 }, (_, i) =>
            makeLead({ id: (callCount - 1) * 100 + i }),
          ),
          meta: {
            current_page: callCount,
            last_page: 15,
            per_page: 100,
            total: 1500,
          },
        });
      });

      const client = makeClient(fetch);
      const results = await client.leads.search("smith");

      expect(results).toHaveLength(1000);
      expect(callCount).toBe(10);
    });
  });

  describe("leads.create", () => {
    it("creates a lead with required type field", async () => {
      let capturedBody: unknown;
      const createdLead = makeLead({ id: 999 });

      const fetch = mockFetch(async (url, init) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse({ data: createdLead });
      });

      const client = makeClient(fetch);
      const result = await client.leads.create({
        type: "email",
        first_name: "Jane",
        last_name: "Smith",
        emails: [{ address: "jane@example.com" }],
        phones: [{ number: "+15149876543", type: "cell" }],
        vehicles: [{ make: "Toyota", model: "RAV4", year: 2025, type: "wanted" }],
        advisor: { first_name: "Bob", last_name: "Manager" },
      });

      expect(result.id).toBe(999);
      expect(capturedBody).toMatchObject({ type: "email", first_name: "Jane" });
    });

    it("sends POST to /leads", async () => {
      let capturedMethod = "";
      let capturedUrl = "";

      const fetch = mockFetch(async (url, init) => {
        capturedMethod = init.method ?? "";
        capturedUrl = url;
        return jsonResponse({ data: makeLead() });
      });

      const client = makeClient(fetch);
      await client.leads.create({ type: "phone" });

      expect(capturedMethod).toBe("POST");
      expect(capturedUrl).toBe(`${BASE_URL}/leads`);
    });
  });

  describe("leads.update", () => {
    it("updates a lead by ID", async () => {
      let capturedMethod = "";
      let capturedUrl = "";
      let capturedBody: unknown;

      const fetch = mockFetch(async (url, init) => {
        capturedMethod = init.method ?? "";
        capturedUrl = url;
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse({ data: makeLead({ result: "attempted", rating: 4 }) });
      });

      const client = makeClient(fetch);
      const result = await client.leads.update(1001, {
        result: "attempted",
        rating: 4,
        comment: "AI follow-up sent",
      });

      expect(capturedMethod).toBe("PUT");
      expect(capturedUrl).toBe(`${BASE_URL}/leads/1001`);
      expect(capturedBody).toMatchObject({
        result: "attempted",
        rating: 4,
        comment: "AI follow-up sent",
      });
      expect(result.result).toBe("attempted");
    });
  });

  describe("webhook signature verification", () => {
    it("verifies valid HMAC-SHA256 signature", () => {
      const secret = "webhook-secret-123";
      const body = '{"event":"lead.created","data":{"id":1}}';
      // Pre-computed HMAC
      const expected = createHmac("sha256", secret).update(body).digest("hex");

      expect(ActivixClient.verifyWebhookSignature(body, expected, secret)).toBe(true);
    });

    it("rejects invalid signature", () => {
      const secret = "webhook-secret-123";
      const body = '{"event":"lead.created"}';

      expect(
        ActivixClient.verifyWebhookSignature(body, "invalid-signature", secret),
      ).toBe(false);
    });

    it("rejects signature with different length (timing-safe)", () => {
      const secret = "webhook-secret-123";
      const body = '{"event":"lead.created"}';

      // Short signature — different length from expected HMAC hex
      expect(
        ActivixClient.verifyWebhookSignature(body, "ab", secret),
      ).toBe(false);
    });

    it("works with Buffer body", () => {
      const secret = "my-secret";
      const body = Buffer.from('{"test":true}');
      const expected = createHmac("sha256", secret)
        .update(body.toString("utf-8"))
        .digest("hex");

      expect(ActivixClient.verifyWebhookSignature(body, expected, secret)).toBe(true);
    });
  });

  describe("retry logic", () => {
    it("retries on 500 errors with exponential backoff", async () => {
      let attempt = 0;
      const fetch = mockFetch(async () => {
        attempt++;
        if (attempt <= 2) {
          return jsonResponse({ error: "Server error" }, 500);
        }
        return jsonResponse({ data: makeLead() });
      });

      const client = makeClient(fetch);
      const result = await client.leads.get(1);

      expect(attempt).toBe(3);
      expect(result.id).toBe(1001);
    });

    it("retries on 429 rate limit errors", async () => {
      let attempt = 0;
      const fetch = mockFetch(async () => {
        attempt++;
        if (attempt === 1) {
          return jsonResponse({ error: "Rate limited" }, 429);
        }
        return jsonResponse({ data: makeLead() });
      });

      const client = makeClient(fetch);
      const result = await client.leads.get(1);

      expect(attempt).toBe(2);
      expect(result.id).toBe(1001);
    });

    it("does NOT retry on 4xx errors (non-429)", async () => {
      let attempt = 0;
      const fetch = mockFetch(async () => {
        attempt++;
        return jsonResponse({ error: "Bad request" }, 400);
      });

      const client = makeClient(fetch);
      await expect(client.leads.get(1)).rejects.toThrow(ActivixApiError);
      expect(attempt).toBe(1);
    });

    it("throws after exhausting all retries", async () => {
      const fetch = mockFetch(async () =>
        jsonResponse({ error: "Server error" }, 500),
      );

      const client = makeClient(fetch);
      await expect(client.leads.get(1)).rejects.toThrow(ActivixApiError);
    }, 30000);
  });

  describe("circuit breaker", () => {
    it("opens after 3 consecutive failures", async () => {
      let attempt = 0;
      const fetch = mockFetch(async () => {
        attempt++;
        return jsonResponse({ error: "Bad request" }, 400);
      });

      const client = makeClient(fetch);

      // 3 failures to trip the breaker (400 errors don't retry, each counts as 1 failure)
      await expect(client.leads.get(1)).rejects.toThrow(ActivixApiError);
      await expect(client.leads.get(2)).rejects.toThrow(ActivixApiError);
      await expect(client.leads.get(3)).rejects.toThrow(ActivixApiError);

      // Circuit should now be OPEN
      expect(client.getCircuitState()).toBe("OPEN");
      await expect(client.leads.get(4)).rejects.toThrow(ActivixCircuitOpenError);
    });

    it("resets to CLOSED on success", async () => {
      let callCount = 0;
      const fetch = mockFetch(async () => {
        callCount++;
        if (callCount <= 2) {
          return jsonResponse({ error: "Bad request" }, 400);
        }
        return jsonResponse({ data: makeLead() });
      });

      const client = makeClient(fetch);
      await expect(client.leads.get(1)).rejects.toThrow();
      await expect(client.leads.get(2)).rejects.toThrow();

      // Not yet at threshold (3), should still work
      const result = await client.leads.get(3);
      expect(result.id).toBe(1001);
      expect(client.getCircuitState()).toBe("CLOSED");
    });
  });

  describe("client-side rate limiting", () => {
    it("throws when per-minute limit exceeded", async () => {
      const fetch = mockFetch(async () => jsonResponse({ data: makeLead() }));
      const client = makeClient(fetch, { rateLimitPerMinute: 3, rateLimitPerHour: 100 });

      await client.leads.get(1);
      await client.leads.get(2);
      await client.leads.get(3);

      await expect(client.leads.get(4)).rejects.toThrow(ActivixRateLimitError);
    });
  });
});

describe("Zod schemas", () => {

  it("validates a full lead object", () => {
    const lead = makeLead();
    const result = ActivixLeadSchema.safeParse(lead);
    expect(result.success).toBe(true);
  });

  it("rejects lead without required type", () => {
    const result = ActivixLeadCreateSchema.safeParse({ first_name: "John" });
    expect(result.success).toBe(false);
  });

  it("validates lead create with nested objects", () => {
    const result = ActivixLeadCreateSchema.safeParse({
      type: "email",
      first_name: "Jane",
      advisor: { first_name: "Bob", last_name: "Manager" },
      emails: [{ address: "jane@test.com", type: "home" }],
      phones: [{ number: "+15141111111", type: "cell" }],
      vehicles: [{ make: "Honda", model: "Civic", year: 2024, type: "wanted" }],
    });
    expect(result.success).toBe(true);
  });

  it("validates all lead types", () => {
    const types = [
      "email", "phone", "walk_in", "loyalty", "renewal", "sms", "event", "pre_booking",
    ];
    for (const type of types) {
      const result = ActivixLeadCreateSchema.safeParse({ type });
      expect(result.success).toBe(true);
    }
  });
});
