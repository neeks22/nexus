import type { ActivixClient } from "nexus-activix";
import type { ActivixLead, ActivixVehicle, LeadListFilters } from "nexus-activix";
import type {
  CrmAdapter,
  CrmLead,
  CrmVehicle,
  LeadFilters,
  CreateLeadInput,
  UpdateLeadInput,
  CommunicationEntry,
  LeadStatus,
} from "../types.js";
import { CrmProvider } from "../types.js";

// --- Status mapping ---

const ACTIVIX_STATUS_TO_CRM: Record<string, LeadStatus> = {
  duplicate: "lost",
  invalid: "lost",
  lost: "lost",
};

const ACTIVIX_RESULT_TO_STATUS: Record<string, LeadStatus> = {
  pending: "new",
  attempted: "contacted",
  reached: "contacted",
};

const CRM_STATUS_TO_ACTIVIX: Record<LeadStatus, { status?: string; result?: string }> = {
  new: { result: "pending" },
  contacted: { result: "reached" },
  qualified: { result: "reached" },
  lost: { status: "lost" },
  sold: { result: "reached" },
};

// --- Vehicle type mapping ---

function mapActivixVehicleType(type?: string): "interested" | "trade_in" | "purchased" {
  if (type === "exchange") return "trade_in";
  return "interested";
}

function mapCrmVehicleType(type: "interested" | "trade_in" | "purchased"): "wanted" | "exchange" {
  if (type === "trade_in") return "exchange";
  return "wanted";
}

// --- Field mappers ---

export function activixLeadToCrmLead(raw: ActivixLead): CrmLead {
  const primaryEmail = raw.emails?.[0]?.address;
  const primaryPhone = raw.phones?.[0]?.number;

  const vehicles: CrmVehicle[] = (raw.vehicles ?? [])
    .filter((v: ActivixVehicle): boolean => Boolean(v.make || v.model))
    .map((v: ActivixVehicle): CrmVehicle => ({
      make: v.make ?? "",
      model: v.model ?? "",
      year: v.year ?? 0,
      trim: v.trim,
      type: mapActivixVehicleType(v.type),
    }));

  let status: LeadStatus = "new";
  if (raw.status && ACTIVIX_STATUS_TO_CRM[raw.status]) {
    status = ACTIVIX_STATUS_TO_CRM[raw.status]!;
  } else if (raw.result && ACTIVIX_RESULT_TO_STATUS[raw.result]) {
    status = ACTIVIX_RESULT_TO_STATUS[raw.result]!;
  }
  if (raw.sale_date) {
    status = "sold";
  }

  const advisor = raw.advisor
    ? {
        name: [raw.advisor.first_name, raw.advisor.last_name].filter(Boolean).join(" "),
        email: raw.advisor.email ?? undefined,
      }
    : undefined;

  return {
    id: String(raw.id),
    externalId: String(raw.id),
    firstName: raw.first_name ?? "",
    lastName: raw.last_name ?? "",
    email: primaryEmail,
    phone: primaryPhone,
    locale: raw.locale ?? undefined,
    source: raw.source ?? undefined,
    type: raw.type,
    status,
    vehicles,
    advisor,
    unsubscribeSms: raw.unsubscribe_sms_date ? new Date(raw.unsubscribe_sms_date) : false,
    unsubscribeEmail: raw.unsubscribe_email_date ? new Date(raw.unsubscribe_email_date) : false,
    unsubscribeAll: raw.unsubscribe_all_date ? new Date(raw.unsubscribe_all_date) : false,
    appointmentDate: raw.appointment_date ? new Date(raw.appointment_date) : undefined,
    rating: raw.rating ?? undefined,
    notes: raw.comment ?? undefined,
    tags: [],
    createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
    updatedAt: raw.updated_at ? new Date(raw.updated_at) : new Date(),
    rawData: raw as unknown as Record<string, unknown>,
  };
}

function buildActivixFilters(filters: LeadFilters): LeadListFilters {
  const result: LeadListFilters = {};
  if (filters.limit) result.per_page = filters.limit;
  if (filters.offset && filters.limit) {
    result.page = Math.floor(filters.offset / filters.limit) + 1;
  }
  if (filters.division) result.division = filters.division;
  if (filters.status) {
    const mapped = CRM_STATUS_TO_ACTIVIX[filters.status];
    if (mapped?.status) result.status = mapped.status;
    if (mapped?.result) result.result = mapped.result;
  }
  if (filters.dateRange) {
    result.created_at_gte = filters.dateRange.from.toISOString();
    result.created_at_lte = filters.dateRange.to.toISOString();
  }
  if (filters.updatedSince) {
    result.updated_at_gte = filters.updatedSince.toISOString();
  }
  return result;
}

// --- Adapter ---

export class ActivixCrmAdapter implements CrmAdapter {
  public readonly provider = CrmProvider.ACTIVIX;
  private readonly client: ActivixClient;

  constructor(client: ActivixClient) {
    this.client = client;
  }

  async getLead(id: string): Promise<CrmLead | null> {
    try {
      const lead = await this.client.leads.get(Number(id), [
        "emails",
        "phones",
        "vehicles",
        "advisor",
      ]);
      return activixLeadToCrmLead(lead);
    } catch (error: unknown) {
      if (error instanceof Error && "statusCode" in error && (error as Record<string, unknown>).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async listLeads(filters: LeadFilters): Promise<{ leads: CrmLead[]; total: number; hasMore: boolean }> {
    const activixFilters = buildActivixFilters(filters);
    const response = await this.client.leads.list(activixFilters);
    let leads = response.data.map(activixLeadToCrmLead);

    if (filters.excludeStatuses?.length) {
      leads = leads.filter((l: CrmLead): boolean => !filters.excludeStatuses!.includes(l.status));
    }

    return {
      leads,
      total: response.meta.total,
      hasMore: response.meta.current_page < response.meta.last_page,
    };
  }

  async searchLeads(query: string): Promise<CrmLead[]> {
    const results = await this.client.leads.search(query);
    return results.map(activixLeadToCrmLead);
  }

  async createLead(data: CreateLeadInput): Promise<CrmLead> {
    const activixData = {
      first_name: data.firstName,
      last_name: data.lastName,
      type: (data.type ?? "email") as "email" | "phone" | "walk_in" | "loyalty" | "renewal" | "sms" | "event" | "pre_booking",
      source: data.source,
      locale: data.locale,
      emails: data.email ? [{ address: data.email }] : undefined,
      phones: data.phone ? [{ number: data.phone }] : undefined,
      vehicles: data.vehicles?.map((v: CrmVehicle) => ({
        make: v.make,
        model: v.model,
        year: v.year,
        trim: v.trim,
        type: mapCrmVehicleType(v.type) as "wanted" | "exchange",
      })),
      advisor: data.advisor
        ? {
            first_name: data.advisor.name.split(" ")[0],
            last_name: data.advisor.name.split(" ").slice(1).join(" ") || undefined,
            email: data.advisor.email,
          }
        : undefined,
    };
    const lead = await this.client.leads.create(activixData);
    return activixLeadToCrmLead(lead);
  }

  async updateLead(id: string, data: UpdateLeadInput): Promise<CrmLead> {
    const activixData: Record<string, unknown> = {};
    if (data.status) {
      const mapped = CRM_STATUS_TO_ACTIVIX[data.status];
      if (mapped?.status) activixData.status = mapped.status;
      if (mapped?.result) activixData.result = mapped.result;
    }
    if (data.rating !== undefined) activixData.rating = data.rating;
    if (data.appointmentDate) activixData.appointment_date = data.appointmentDate.toISOString();
    if (data.notes) activixData.comment = data.notes;
    if (data.advisor) {
      activixData.advisor = {
        first_name: data.advisor.name.split(" ")[0],
        last_name: data.advisor.name.split(" ").slice(1).join(" ") || undefined,
        email: data.advisor.email,
      };
    }
    const lead = await this.client.leads.update(
      Number(id),
      activixData as Parameters<typeof this.client.leads.update>[1],
    );
    return activixLeadToCrmLead(lead);
  }

  async addNote(leadId: string, note: string): Promise<void> {
    await this.client.leads.update(Number(leadId), { comment: note });
  }

  async addCommunication(leadId: string, comm: CommunicationEntry): Promise<void> {
    const noteText = `[${comm.type.toUpperCase()} ${comm.direction}] ${comm.subject ? comm.subject + ": " : ""}${comm.body}`;
    await this.addNote(leadId, noteText);
  }
}
