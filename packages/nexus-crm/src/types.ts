// --- CRM Provider enum ---

export enum CrmProvider {
  ACTIVIX = "activix",
  GHL = "ghl",
  DEALERSOCKET = "dealersocket",
  VINSOLUTIONS = "vinsolutions",
  ELEAD = "elead",
  GENERIC = "generic",
}

// --- Lead status (normalized across all CRMs) ---

export type LeadStatus = "new" | "contacted" | "qualified" | "lost" | "sold";

// --- Vehicle interest entry ---

export interface CrmVehicle {
  make: string;
  model: string;
  year: number;
  trim?: string;
  type: "interested" | "trade_in" | "purchased";
}

// --- Advisor ---

export interface CrmAdvisor {
  name: string;
  email?: string;
  phone?: string;
}

// --- Universal CRM lead ---

export interface CrmLead {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  locale?: string;
  source?: string;
  type?: string;
  status: LeadStatus;
  vehicles: CrmVehicle[];
  advisor?: CrmAdvisor;
  consentType?: "express" | "implied";
  consentDate?: Date;
  consentExpiry?: Date;
  unsubscribeSms?: boolean | Date;
  unsubscribeEmail?: boolean | Date;
  unsubscribeAll?: boolean | Date;
  appointmentDate?: Date;
  rating?: number;
  notes?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  rawData: Record<string, unknown>;
}

// --- Filters ---

export interface LeadFilters {
  status?: LeadStatus;
  source?: string;
  division?: string;
  dateRange?: { from: Date; to: Date };
  updatedSince?: Date;
  excludeStatuses?: LeadStatus[];
  limit?: number;
  offset?: number;
}

// --- Input types ---

export interface CreateLeadInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  locale?: string;
  source?: string;
  type?: string;
  status?: LeadStatus;
  vehicles?: CrmVehicle[];
  advisor?: CrmAdvisor;
  tags?: string[];
  notes?: string;
}

export interface UpdateLeadInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: LeadStatus;
  vehicles?: CrmVehicle[];
  advisor?: CrmAdvisor;
  appointmentDate?: Date;
  rating?: number;
  notes?: string;
  tags?: string[];
}

// --- Communication entry ---

export interface CommunicationEntry {
  type: "sms" | "email" | "phone" | "chat";
  direction: "inbound" | "outbound";
  body: string;
  subject?: string;
  timestamp: Date;
}

// --- Inbound message ---

export interface InboundMessage {
  from: string;
  to: string;
  body: string;
  messageId: string;
  timestamp: Date;
}

// --- Messaging result ---

export interface MessageResult {
  messageId: string;
  status: string;
}

// --- CRM Adapter interface ---

export interface CrmAdapter {
  readonly provider: CrmProvider;
  getLead(id: string): Promise<CrmLead | null>;
  listLeads(filters: LeadFilters): Promise<{ leads: CrmLead[]; total: number; hasMore: boolean }>;
  searchLeads(query: string): Promise<CrmLead[]>;
  createLead(data: CreateLeadInput): Promise<CrmLead>;
  updateLead(id: string, data: UpdateLeadInput): Promise<CrmLead>;
  addNote(leadId: string, note: string): Promise<void>;
  addCommunication(leadId: string, comm: CommunicationEntry): Promise<void>;
}

// --- Messaging Adapter interface ---

export interface MessagingAdapter {
  sendSms(to: string, body: string, from?: string): Promise<MessageResult>;
  sendEmail(to: string, subject: string, body: string, from?: string): Promise<MessageResult>;
  onInboundSms(callback: (msg: InboundMessage) => void): void;
}
