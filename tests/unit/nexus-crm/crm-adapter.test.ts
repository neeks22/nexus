import { describe, it, expect, vi } from "vitest";
import { activixLeadToCrmLead } from "../../../packages/nexus-crm/src/adapters/activix-adapter.js";
import { ghlContactToCrmLead } from "../../../packages/nexus-crm/src/adapters/ghl-adapter.js";
import { ActivixCrmAdapter } from "../../../packages/nexus-crm/src/adapters/activix-adapter.js";
import { GoHighLevelCrmAdapter } from "../../../packages/nexus-crm/src/adapters/ghl-adapter.js";
import { TwilioMessagingAdapter } from "../../../packages/nexus-crm/src/adapters/twilio-messaging.js";
import { GhlMessagingAdapter } from "../../../packages/nexus-crm/src/adapters/ghl-messaging.js";
import { createCrmAdapter, createMessagingAdapter } from "../../../packages/nexus-crm/src/crm-factory.js";
import { CrmProvider } from "../../../packages/nexus-crm/src/types.js";
import type { ActivixLead } from "../../../packages/nexus-activix/src/schemas.js";

// --- Fixtures ---

function makeActivixLead(overrides: Partial<ActivixLead> = {}): ActivixLead {
  return {
    id: 12345,
    type: "email",
    first_name: "Jean",
    last_name: "Tremblay",
    locale: "fr",
    source: "website",
    result: "reached",
    rating: 4,
    emails: [{ address: "jean@example.com", type: "home" }],
    phones: [{ number: "+15145551234", type: "cell" }],
    vehicles: [
      { make: "Toyota", model: "Camry", year: 2024, trim: "SE", type: "wanted" },
      { make: "Honda", model: "Civic", year: 2020, type: "exchange" },
    ],
    advisor: { first_name: "Marc", last_name: "Dupont", email: "marc@dealer.com" },
    appointment_date: "2026-04-01T10:00:00Z",
    comment: "Interested in financing",
    unsubscribe_sms_date: null,
    unsubscribe_email_date: null,
    unsubscribe_all_date: null,
    created_at: "2026-03-15T09:00:00Z",
    updated_at: "2026-03-20T14:30:00Z",
    ...overrides,
  };
}

interface GhlContactFixture {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  customField?: Array<{ id: string; value: unknown; key?: string }>;
  notes?: Array<{ id: string; body: string; dateAdded?: string }>;
  dateAdded?: string;
  dateUpdated?: string;
  source?: string;
  assignedTo?: string;
}

function makeGhlContact(overrides: Partial<GhlContactFixture> = {}): GhlContactFixture {
  return {
    id: "ghl-abc-123",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah@example.com",
    phone: "+14165559876",
    tags: ["qualified", "honda-interest"],
    customField: [],
    notes: [{ id: "n1", body: "Called about Accord" }],
    dateAdded: "2026-03-10T08:00:00Z",
    dateUpdated: "2026-03-25T11:00:00Z",
    source: "facebook",
    assignedTo: "Mike Smith",
    ...overrides,
  };
}

// --- Mock ActivixClient ---

function makeMockActivixClient(leadData?: ActivixLead) {
  const lead = leadData ?? makeActivixLead();
  return {
    leads: {
      get: vi.fn().mockResolvedValue(lead),
      list: vi.fn().mockResolvedValue({
        data: [lead],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
      }),
      search: vi.fn().mockResolvedValue([lead]),
      create: vi.fn().mockResolvedValue(lead),
      update: vi.fn().mockResolvedValue(lead),
    },
  };
}

// --- Tests ---

describe("CrmLead normalization from Activix raw data", () => {
  it("maps all core fields correctly", () => {
    const raw = makeActivixLead();
    const lead = activixLeadToCrmLead(raw);

    expect(lead.id).toBe("12345");
    expect(lead.externalId).toBe("12345");
    expect(lead.firstName).toBe("Jean");
    expect(lead.lastName).toBe("Tremblay");
    expect(lead.email).toBe("jean@example.com");
    expect(lead.phone).toBe("+15145551234");
    expect(lead.locale).toBe("fr");
    expect(lead.source).toBe("website");
    expect(lead.status).toBe("contacted");
    expect(lead.rating).toBe(4);
    expect(lead.notes).toBe("Interested in financing");
  });

  it("maps vehicles with correct types", () => {
    const lead = activixLeadToCrmLead(makeActivixLead());
    expect(lead.vehicles).toHaveLength(2);
    expect(lead.vehicles[0]).toEqual({
      make: "Toyota",
      model: "Camry",
      year: 2024,
      trim: "SE",
      type: "interested",
    });
    expect(lead.vehicles[1]).toEqual({
      make: "Honda",
      model: "Civic",
      year: 2020,
      trim: undefined,
      type: "trade_in",
    });
  });

  it("maps advisor name from first + last", () => {
    const lead = activixLeadToCrmLead(makeActivixLead());
    expect(lead.advisor).toEqual({
      name: "Marc Dupont",
      email: "marc@dealer.com",
    });
  });

  it("maps sold status when sale_date is set", () => {
    const lead = activixLeadToCrmLead(makeActivixLead({ sale_date: "2026-03-18" }));
    expect(lead.status).toBe("sold");
  });

  it("maps lost status from Activix status field", () => {
    const lead = activixLeadToCrmLead(makeActivixLead({ status: "lost", result: null }));
    expect(lead.status).toBe("lost");
  });

  it("defaults to new when no result or status", () => {
    const lead = activixLeadToCrmLead(makeActivixLead({ result: null, status: null }));
    expect(lead.status).toBe("new");
  });

  it("preserves rawData", () => {
    const raw = makeActivixLead();
    const lead = activixLeadToCrmLead(raw);
    expect(lead.rawData).toBeDefined();
    expect((lead.rawData as Record<string, unknown>).id).toBe(12345);
  });

  it("maps unsubscribe dates", () => {
    const lead = activixLeadToCrmLead(
      makeActivixLead({ unsubscribe_sms_date: "2026-01-15T00:00:00Z" }),
    );
    expect(lead.unsubscribeSms).toBeInstanceOf(Date);
  });

  it("maps dates correctly", () => {
    const lead = activixLeadToCrmLead(makeActivixLead());
    expect(lead.createdAt).toBeInstanceOf(Date);
    expect(lead.updatedAt).toBeInstanceOf(Date);
    expect(lead.appointmentDate).toBeInstanceOf(Date);
  });
});

describe("CrmLead normalization from GHL raw data", () => {
  it("maps all core fields correctly", () => {
    const contact = makeGhlContact();
    const lead = ghlContactToCrmLead(contact as Parameters<typeof ghlContactToCrmLead>[0]);

    expect(lead.id).toBe("ghl-abc-123");
    expect(lead.externalId).toBe("ghl-abc-123");
    expect(lead.firstName).toBe("Sarah");
    expect(lead.lastName).toBe("Johnson");
    expect(lead.email).toBe("sarah@example.com");
    expect(lead.phone).toBe("+14165559876");
    expect(lead.source).toBe("facebook");
    expect(lead.status).toBe("qualified");
    expect(lead.notes).toBe("Called about Accord");
  });

  it("resolves status from tags", () => {
    const contact = makeGhlContact({ tags: ["lost", "follow-up"] });
    const lead = ghlContactToCrmLead(contact as Parameters<typeof ghlContactToCrmLead>[0]);
    expect(lead.status).toBe("lost");
  });

  it("defaults to new when no matching tag", () => {
    const contact = makeGhlContact({ tags: ["vip", "honda-interest"] });
    const lead = ghlContactToCrmLead(contact as Parameters<typeof ghlContactToCrmLead>[0]);
    expect(lead.status).toBe("new");
  });

  it("maps advisor from assignedTo", () => {
    const contact = makeGhlContact({ assignedTo: "Mike Smith" });
    const lead = ghlContactToCrmLead(contact as Parameters<typeof ghlContactToCrmLead>[0]);
    expect(lead.advisor).toEqual({ name: "Mike Smith" });
  });

  it("preserves tags", () => {
    const contact = makeGhlContact({ tags: ["qualified", "honda-interest"] });
    const lead = ghlContactToCrmLead(contact as Parameters<typeof ghlContactToCrmLead>[0]);
    expect(lead.tags).toEqual(["qualified", "honda-interest"]);
  });

  it("preserves rawData", () => {
    const contact = makeGhlContact();
    const lead = ghlContactToCrmLead(contact as Parameters<typeof ghlContactToCrmLead>[0]);
    expect(lead.rawData).toBeDefined();
    expect((lead.rawData as Record<string, unknown>).id).toBe("ghl-abc-123");
  });
});

describe("Factory creates correct adapter by provider", () => {
  it("creates ActivixCrmAdapter for ACTIVIX provider", () => {
    const client = makeMockActivixClient();
    const adapter = createCrmAdapter(CrmProvider.ACTIVIX, { client });
    expect(adapter).toBeInstanceOf(ActivixCrmAdapter);
    expect(adapter.provider).toBe(CrmProvider.ACTIVIX);
  });

  it("creates GoHighLevelCrmAdapter for GHL provider", () => {
    const adapter = createCrmAdapter(CrmProvider.GHL, {
      apiKey: "test-key",
      locationId: "loc-123",
    });
    expect(adapter).toBeInstanceOf(GoHighLevelCrmAdapter);
    expect(adapter.provider).toBe(CrmProvider.GHL);
  });

  it("throws for unknown provider", () => {
    expect(() =>
      createCrmAdapter("unknown_provider" as CrmProvider, {}),
    ).toThrow("Unknown CRM provider");
  });

  it("throws for unimplemented providers", () => {
    expect(() => createCrmAdapter(CrmProvider.DEALERSOCKET, {})).toThrow("not yet implemented");
    expect(() => createCrmAdapter(CrmProvider.VINSOLUTIONS, {})).toThrow("not yet implemented");
    expect(() => createCrmAdapter(CrmProvider.ELEAD, {})).toThrow("not yet implemented");
  });

  it("throws when Activix config missing client", () => {
    expect(() => createCrmAdapter(CrmProvider.ACTIVIX, {})).toThrow("ActivixClient instance");
  });

  it("throws when GHL config missing apiKey", () => {
    expect(() =>
      createCrmAdapter(CrmProvider.GHL, { locationId: "loc" }),
    ).toThrow('requires "apiKey"');
  });

  it("throws when GHL config missing locationId", () => {
    expect(() =>
      createCrmAdapter(CrmProvider.GHL, { apiKey: "key" }),
    ).toThrow('requires "locationId"');
  });
});

describe("Activix adapter maps fields correctly (both directions)", () => {
  it("getLead returns normalized CrmLead", async () => {
    const client = makeMockActivixClient();
    const adapter = new ActivixCrmAdapter(client as unknown as ConstructorParameters<typeof ActivixCrmAdapter>[0]);
    const lead = await adapter.getLead("12345");

    expect(lead).not.toBeNull();
    expect(lead!.id).toBe("12345");
    expect(lead!.firstName).toBe("Jean");
    expect(client.leads.get).toHaveBeenCalledWith(12345, [
      "emails",
      "phones",
      "vehicles",
      "advisor",
    ]);
  });

  it("listLeads maps filters and returns paginated result", async () => {
    const client = makeMockActivixClient();
    const adapter = new ActivixCrmAdapter(client as unknown as ConstructorParameters<typeof ActivixCrmAdapter>[0]);
    const result = await adapter.listLeads({
      status: "contacted",
      limit: 10,
      offset: 20,
      division: "new",
    });

    expect(result.leads).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);

    const calledFilters = client.leads.list.mock.calls[0]![0] as Record<string, unknown>;
    expect(calledFilters.per_page).toBe(10);
    expect(calledFilters.page).toBe(3);
    expect(calledFilters.division).toBe("new");
    expect(calledFilters.result).toBe("reached");
  });

  it("createLead maps CrmLead input to Activix format", async () => {
    const client = makeMockActivixClient();
    const adapter = new ActivixCrmAdapter(client as unknown as ConstructorParameters<typeof ActivixCrmAdapter>[0]);
    await adapter.createLead({
      firstName: "Alice",
      lastName: "Wonderland",
      email: "alice@example.com",
      phone: "+15145550000",
      source: "web",
      vehicles: [{ make: "BMW", model: "X5", year: 2025, type: "interested" }],
    });

    const calledData = client.leads.create.mock.calls[0]![0] as Record<string, unknown>;
    expect(calledData.first_name).toBe("Alice");
    expect(calledData.last_name).toBe("Wonderland");
    expect((calledData.emails as Array<{ address: string }>)[0]!.address).toBe("alice@example.com");
    expect((calledData.phones as Array<{ number: string }>)[0]!.number).toBe("+15145550000");
  });

  it("updateLead maps status to Activix fields", async () => {
    const client = makeMockActivixClient();
    const adapter = new ActivixCrmAdapter(client as unknown as ConstructorParameters<typeof ActivixCrmAdapter>[0]);
    await adapter.updateLead("12345", { status: "lost", rating: 2 });

    const calledData = client.leads.update.mock.calls[0]![0] as unknown;
    expect(calledData).toBe(12345);
    const body = client.leads.update.mock.calls[0]![1] as Record<string, unknown>;
    expect(body.status).toBe("lost");
    expect(body.rating).toBe(2);
  });

  it("addNote calls update with comment", async () => {
    const client = makeMockActivixClient();
    const adapter = new ActivixCrmAdapter(client as unknown as ConstructorParameters<typeof ActivixCrmAdapter>[0]);
    await adapter.addNote("12345", "Follow up next week");

    expect(client.leads.update).toHaveBeenCalledWith(12345, { comment: "Follow up next week" });
  });

  it("returns null for 404 on getLead", async () => {
    const client = makeMockActivixClient();
    const error = new Error("Not found") as Error & { statusCode: number };
    error.statusCode = 404;
    client.leads.get.mockRejectedValue(error);
    const adapter = new ActivixCrmAdapter(client as unknown as ConstructorParameters<typeof ActivixCrmAdapter>[0]);
    const lead = await adapter.getLead("99999");
    expect(lead).toBeNull();
  });
});

describe("GHL adapter maps fields correctly (both directions)", () => {
  function makeMockFetch(responseData: unknown, status = 200): typeof globalThis.fetch {
    return vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => responseData,
      text: async () => JSON.stringify(responseData),
    }) as unknown as typeof globalThis.fetch;
  }

  it("getLead returns normalized CrmLead", async () => {
    const contact = makeGhlContact();
    const mockFetch = makeMockFetch({ contact });
    const adapter = new GoHighLevelCrmAdapter({
      apiKey: "test-key",
      locationId: "loc-123",
      fetch: mockFetch,
    });
    const lead = await adapter.getLead("ghl-abc-123");

    expect(lead).not.toBeNull();
    expect(lead!.id).toBe("ghl-abc-123");
    expect(lead!.firstName).toBe("Sarah");
    expect(lead!.status).toBe("qualified");
  });

  it("listLeads sends correct params", async () => {
    const contact = makeGhlContact();
    const mockFetch = makeMockFetch({ contacts: [contact], meta: { total: 1 } });
    const adapter = new GoHighLevelCrmAdapter({
      apiKey: "test-key",
      locationId: "loc-123",
      fetch: mockFetch,
    });
    const result = await adapter.listLeads({ limit: 10, source: "facebook" });

    expect(result.leads).toHaveLength(1);
    expect(result.total).toBe(1);
    const calledUrl = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(calledUrl).toContain("locationId=loc-123");
    expect(calledUrl).toContain("limit=10");
    expect(calledUrl).toContain("source=facebook");
  });

  it("createLead sends correct body", async () => {
    const contact = makeGhlContact();
    const mockFetch = makeMockFetch({ contact });
    const adapter = new GoHighLevelCrmAdapter({
      apiKey: "test-key",
      locationId: "loc-123",
      fetch: mockFetch,
    });
    await adapter.createLead({
      firstName: "New",
      lastName: "Lead",
      email: "new@example.com",
      status: "contacted",
    });

    const calledBody = JSON.parse(
      (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string,
    ) as Record<string, unknown>;
    expect(calledBody.firstName).toBe("New");
    expect(calledBody.lastName).toBe("Lead");
    expect(calledBody.email).toBe("new@example.com");
    expect(calledBody.locationId).toBe("loc-123");
    expect((calledBody.tags as string[])).toContain("contacted");
  });

  it("sends correct auth headers", async () => {
    const contact = makeGhlContact();
    const mockFetch = makeMockFetch({ contact });
    const adapter = new GoHighLevelCrmAdapter({
      apiKey: "my-secret-key",
      locationId: "loc-123",
      fetch: mockFetch,
    });
    await adapter.getLead("ghl-abc-123");

    const calledHeaders = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.headers as Record<string, string>;
    expect(calledHeaders.Authorization).toBe("Bearer my-secret-key");
    expect(calledHeaders.Version).toBe("2021-07-28");
  });

  it("returns null for 404 on getLead", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
      text: async () => "Not Found",
    }) as unknown as typeof globalThis.fetch;
    const adapter = new GoHighLevelCrmAdapter({
      apiKey: "test-key",
      locationId: "loc-123",
      fetch: mockFetch,
    });
    const lead = await adapter.getLead("nonexistent");
    expect(lead).toBeNull();
  });
});

describe("Messaging adapter interface works for Twilio and GHL", () => {
  function makeMockFetch(responseData: unknown): typeof globalThis.fetch {
    return vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => responseData,
      text: async () => JSON.stringify(responseData),
    }) as unknown as typeof globalThis.fetch;
  }

  it("Twilio sendSms calls correct endpoint", async () => {
    const mockFetch = makeMockFetch({ sid: "SM123", status: "queued" });
    const adapter = new TwilioMessagingAdapter({
      accountSid: "AC123",
      authToken: "token",
      defaultFromNumber: "+15145550000",
      fetch: mockFetch,
    });
    const result = await adapter.sendSms("+15145551111", "Hello");

    expect(result.messageId).toBe("SM123");
    expect(result.status).toBe("queued");
    const calledUrl = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(calledUrl).toContain("api.twilio.com");
    expect(calledUrl).toContain("AC123");
    expect(calledUrl).toContain("Messages.json");
  });

  it("Twilio sendEmail throws (not implemented)", async () => {
    const adapter = new TwilioMessagingAdapter({
      accountSid: "AC123",
      authToken: "token",
      defaultFromNumber: "+15145550000",
    });
    await expect(adapter.sendEmail("a@b.com", "Hi", "Body")).rejects.toThrow("SendGrid");
  });

  it("Twilio onInboundSms registers callback and handleInboundWebhook invokes it", () => {
    const adapter = new TwilioMessagingAdapter({
      accountSid: "AC123",
      authToken: "token",
      defaultFromNumber: "+15145550000",
    });
    const callback = vi.fn();
    adapter.onInboundSms(callback);
    adapter.handleInboundWebhook({
      From: "+15145551111",
      To: "+15145550000",
      Body: "Hi there",
      MessageSid: "SM456",
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]![0].from).toBe("+15145551111");
    expect(callback.mock.calls[0]![0].body).toBe("Hi there");
  });

  it("GHL sendSms calls conversations/messages endpoint", async () => {
    const mockFetch = makeMockFetch({ messageId: "msg-1", msg: { status: "sent" } });
    const adapter = new GhlMessagingAdapter({
      apiKey: "ghl-key",
      locationId: "loc-123",
      fetch: mockFetch,
    });
    const result = await adapter.sendSms("contact-id", "Hello from GHL");

    expect(result.messageId).toBe("msg-1");
    expect(result.status).toBe("sent");
    const calledUrl = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(calledUrl).toContain("conversations/messages");
    const calledBody = JSON.parse(
      (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string,
    ) as Record<string, unknown>;
    expect(calledBody.type).toBe("SMS");
  });

  it("GHL sendEmail calls conversations/messages with Email type", async () => {
    const mockFetch = makeMockFetch({ messageId: "msg-2", msg: { status: "sent" } });
    const adapter = new GhlMessagingAdapter({
      apiKey: "ghl-key",
      locationId: "loc-123",
      fetch: mockFetch,
    });
    const result = await adapter.sendEmail("contact-id", "Subject", "Body");

    expect(result.messageId).toBe("msg-2");
    const calledBody = JSON.parse(
      (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string,
    ) as Record<string, unknown>;
    expect(calledBody.type).toBe("Email");
    expect(calledBody.subject).toBe("Subject");
  });

  it("Factory creates Twilio messaging adapter", () => {
    const adapter = createMessagingAdapter("twilio", {
      accountSid: "AC123",
      authToken: "token",
      defaultFromNumber: "+15145550000",
    });
    expect(adapter).toBeInstanceOf(TwilioMessagingAdapter);
  });

  it("Factory creates GHL messaging adapter", () => {
    const adapter = createMessagingAdapter("ghl", {
      apiKey: "ghl-key",
      locationId: "loc-123",
    });
    expect(adapter).toBeInstanceOf(GhlMessagingAdapter);
  });

  it("Factory throws for unknown messaging provider", () => {
    expect(() =>
      createMessagingAdapter("unknown" as "twilio" | "ghl", {}),
    ).toThrow("Unknown messaging provider");
  });

  it("Factory validates Twilio config", () => {
    expect(() => createMessagingAdapter("twilio", {})).toThrow('requires "accountSid"');
  });
});

describe("Filter mapping per CRM", () => {
  it("Activix adapter maps date range to created_at filters", async () => {
    const client = makeMockActivixClient();
    const adapter = new ActivixCrmAdapter(client as unknown as ConstructorParameters<typeof ActivixCrmAdapter>[0]);
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-03-01T00:00:00Z");
    await adapter.listLeads({ dateRange: { from, to } });

    const calledFilters = client.leads.list.mock.calls[0]![0] as Record<string, unknown>;
    expect(calledFilters.created_at_gte).toBe(from.toISOString());
    expect(calledFilters.created_at_lte).toBe(to.toISOString());
  });

  it("Activix adapter maps updatedSince filter", async () => {
    const client = makeMockActivixClient();
    const adapter = new ActivixCrmAdapter(client as unknown as ConstructorParameters<typeof ActivixCrmAdapter>[0]);
    const since = new Date("2026-03-20T00:00:00Z");
    await adapter.listLeads({ updatedSince: since });

    const calledFilters = client.leads.list.mock.calls[0]![0] as Record<string, unknown>;
    expect(calledFilters.updated_at_gte).toBe(since.toISOString());
  });

  it("Activix adapter excludes statuses client-side", async () => {
    const client = makeMockActivixClient();
    const adapter = new ActivixCrmAdapter(client as unknown as ConstructorParameters<typeof ActivixCrmAdapter>[0]);
    const result = await adapter.listLeads({ excludeStatuses: ["contacted"] });

    // The lead fixture has status "contacted", so it should be filtered out
    expect(result.leads).toHaveLength(0);
  });

  it("GHL adapter filters by status client-side", async () => {
    const contact = makeGhlContact({ tags: ["qualified"] });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ contacts: [contact], meta: { total: 1 } }),
      text: async () => "",
    }) as unknown as typeof globalThis.fetch;
    const adapter = new GoHighLevelCrmAdapter({
      apiKey: "test-key",
      locationId: "loc-123",
      fetch: mockFetch,
    });

    const result = await adapter.listLeads({ status: "lost" });
    expect(result.leads).toHaveLength(0);

    const result2 = await adapter.listLeads({ status: "qualified" });
    expect(result2.leads).toHaveLength(1);
  });
});
