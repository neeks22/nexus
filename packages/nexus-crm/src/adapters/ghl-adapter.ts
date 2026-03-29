import type {
  CrmAdapter,
  CrmLead,
  CrmVehicle,
  CrmAdvisor,
  LeadFilters,
  CreateLeadInput,
  UpdateLeadInput,
  CommunicationEntry,
  LeadStatus,
} from "../types.js";
import { CrmProvider } from "../types.js";

// --- GHL API types ---

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

interface GhlContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  customField?: GhlCustomField[];
  notes?: GhlNote[];
  dateAdded?: string;
  dateUpdated?: string;
  source?: string;
  assignedTo?: string;
  [key: string]: unknown;
}

interface GhlCustomField {
  id: string;
  value: unknown;
  key?: string;
}

interface GhlNote {
  id: string;
  body: string;
  dateAdded?: string;
}

interface GhlContactsResponse {
  contacts: GhlContact[];
  meta?: {
    total?: number;
    nextPageUrl?: string;
    startAfterId?: string;
    startAfter?: number;
  };
}

// --- Status mapping ---

const GHL_TAG_TO_STATUS: Record<string, LeadStatus> = {
  new: "new",
  contacted: "contacted",
  qualified: "qualified",
  lost: "lost",
  sold: "sold",
};

function resolveStatusFromTags(tags: string[]): LeadStatus {
  const lowerTags = tags.map((t: string): string => t.toLowerCase());
  for (const tag of lowerTags) {
    const mapped = GHL_TAG_TO_STATUS[tag];
    if (mapped) return mapped;
  }
  return "new";
}

// --- Custom field helpers ---

function getCustomFieldValue(fields: GhlCustomField[], key: string): unknown {
  const field = fields.find((f: GhlCustomField): boolean => f.key === key || f.id === key);
  return field?.value;
}

function extractVehicles(fields: GhlCustomField[]): CrmVehicle[] {
  const vehiclesRaw = getCustomFieldValue(fields, "vehicles");
  if (!Array.isArray(vehiclesRaw)) return [];
  return vehiclesRaw
    .filter((v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v: Record<string, unknown>): CrmVehicle => ({
      make: String(v.make ?? ""),
      model: String(v.model ?? ""),
      year: Number(v.year ?? 0),
      trim: v.trim ? String(v.trim) : undefined,
      type: (v.type as CrmVehicle["type"]) ?? "interested",
    }));
}

// --- Field mapper ---

export function ghlContactToCrmLead(contact: GhlContact): CrmLead {
  const tags = contact.tags ?? [];
  const customFields = contact.customField ?? [];

  const advisor: CrmAdvisor | undefined = contact.assignedTo
    ? { name: String(contact.assignedTo) }
    : undefined;

  const ratingRaw = getCustomFieldValue(customFields, "rating");
  const rating = typeof ratingRaw === "number" ? ratingRaw : undefined;

  return {
    id: contact.id,
    externalId: contact.id,
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? "",
    email: contact.email,
    phone: contact.phone,
    locale: undefined,
    source: contact.source,
    type: undefined,
    status: resolveStatusFromTags(tags),
    vehicles: extractVehicles(customFields),
    advisor,
    rating,
    notes: contact.notes?.[0]?.body,
    tags,
    createdAt: contact.dateAdded ? new Date(contact.dateAdded) : new Date(),
    updatedAt: contact.dateUpdated ? new Date(contact.dateUpdated) : new Date(),
    rawData: contact as unknown as Record<string, unknown>,
  };
}

// --- Config ---

export interface GhlAdapterConfig {
  apiKey: string;
  locationId: string;
  fetch?: typeof globalThis.fetch;
}

// --- Adapter ---

export class GoHighLevelCrmAdapter implements CrmAdapter {
  public readonly provider = CrmProvider.GHL;
  private readonly apiKey: string;
  private readonly locationId: string;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(config: GhlAdapterConfig) {
    this.apiKey = config.apiKey;
    this.locationId = config.locationId;
    this.fetchFn = config.fetch ?? globalThis.fetch;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${GHL_API_BASE}${path}`;
    const options: RequestInit = {
      method,
      headers: this.headers(),
    };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
    const response = await this.fetchFn(url, options);
    if (!response.ok) {
      const text = await response.text().catch((): string => "");
      throw new Error(`GHL API error ${response.status}: ${text}`);
    }
    return (await response.json()) as T;
  }

  async getLead(id: string): Promise<CrmLead | null> {
    try {
      const data = await this.request<{ contact: GhlContact }>(
        "GET",
        `/contacts/${id}`,
      );
      return ghlContactToCrmLead(data.contact);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  async listLeads(filters: LeadFilters): Promise<{ leads: CrmLead[]; total: number; hasMore: boolean }> {
    const params = new URLSearchParams();
    params.set("locationId", this.locationId);
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.source) params.set("source", filters.source);

    const data = await this.request<GhlContactsResponse>(
      "GET",
      `/contacts/?${params.toString()}`,
    );
    let leads = data.contacts.map(ghlContactToCrmLead);

    if (filters.status) {
      leads = leads.filter((l: CrmLead): boolean => l.status === filters.status);
    }
    if (filters.excludeStatuses?.length) {
      leads = leads.filter((l: CrmLead): boolean => !filters.excludeStatuses!.includes(l.status));
    }

    const total = data.meta?.total ?? leads.length;
    const hasMore = Boolean(data.meta?.nextPageUrl || data.meta?.startAfterId);

    return { leads, total, hasMore };
  }

  async searchLeads(query: string): Promise<CrmLead[]> {
    const params = new URLSearchParams();
    params.set("locationId", this.locationId);
    params.set("query", query);
    const data = await this.request<GhlContactsResponse>(
      "GET",
      `/contacts/search/duplicate?${params.toString()}`,
    );
    return data.contacts.map(ghlContactToCrmLead);
  }

  async createLead(data: CreateLeadInput): Promise<CrmLead> {
    const ghlBody: Record<string, unknown> = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      source: data.source,
      locationId: this.locationId,
      tags: data.tags ?? [],
    };
    if (data.status) {
      (ghlBody.tags as string[]).push(data.status);
    }
    const response = await this.request<{ contact: GhlContact }>(
      "POST",
      "/contacts/",
      ghlBody,
    );
    return ghlContactToCrmLead(response.contact);
  }

  async updateLead(id: string, data: UpdateLeadInput): Promise<CrmLead> {
    const ghlBody: Record<string, unknown> = {};
    if (data.firstName) ghlBody.firstName = data.firstName;
    if (data.lastName) ghlBody.lastName = data.lastName;
    if (data.email) ghlBody.email = data.email;
    if (data.phone) ghlBody.phone = data.phone;
    if (data.tags) ghlBody.tags = data.tags;
    if (data.status) {
      const existingTags = (ghlBody.tags as string[] | undefined) ?? [];
      existingTags.push(data.status);
      ghlBody.tags = existingTags;
    }
    const response = await this.request<{ contact: GhlContact }>(
      "PUT",
      `/contacts/${id}`,
      ghlBody,
    );
    return ghlContactToCrmLead(response.contact);
  }

  async addNote(leadId: string, note: string): Promise<void> {
    await this.request<unknown>(
      "POST",
      `/contacts/${leadId}/notes`,
      { body: note, userId: this.locationId },
    );
  }

  async addCommunication(leadId: string, comm: CommunicationEntry): Promise<void> {
    const noteText = `[${comm.type.toUpperCase()} ${comm.direction}] ${comm.subject ? comm.subject + ": " : ""}${comm.body}`;
    await this.addNote(leadId, noteText);
  }
}
