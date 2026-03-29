import { z } from "zod";

// --- Core enums ---

export const LeadType = z.enum([
  "email",
  "phone",
  "walk_in",
  "loyalty",
  "renewal",
  "sms",
  "event",
  "pre_booking",
]);

export const LeadStatus = z.enum(["duplicate", "invalid", "lost"]).nullable();

export const LeadResult = z.enum(["pending", "attempted", "reached"]).nullable();

export const LeadDivision = z.enum(["new", "used", "service"]);

export const LeadSegment = z.enum([
  "conquest",
  "promo",
  "notSold",
  "service",
  "loyalty",
  "reminder",
  "endWarranty",
  "endLcap",
  "endLnette",
  "csi",
  "noShow",
  "other",
]);

export const VehicleType = z.enum(["wanted", "exchange"]);

export const EmailType = z.enum(["home", "work", "other"]);

export const PhoneType = z.enum(["home", "work", "cell", "other"]);

// --- Nested objects ---

export const ActivixEmailSchema = z.object({
  id: z.number().optional(),
  address: z.string().email(),
  type: EmailType.optional(),
});

export const ActivixPhoneSchema = z.object({
  id: z.number().optional(),
  number: z.string(),
  extension: z.number().optional(),
  type: PhoneType.optional(),
});

export const ActivixVehicleSchema = z.object({
  id: z.number().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  trim: z.string().optional(),
  color_exterior: z.string().optional(),
  color_interior: z.string().optional(),
  price: z.number().optional(),
  vin: z.string().optional(),
  stock: z.string().optional(),
  type: VehicleType.optional(),
});

export const ActivixAdvisorSchema = z.object({
  id: z.number().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
});

// --- Lead schemas ---

export const ActivixLeadSchema = z.object({
  id: z.number(),
  account_id: z.number().optional(),
  customer_id: z.number().optional(),
  source_id: z.number().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  type: LeadType,
  division: LeadDivision.nullable().optional(),
  status: LeadStatus.optional(),
  result: LeadResult.optional(),
  rating: z.number().nullable().optional(),
  source: z.string().nullable().optional(),
  segment: LeadSegment.nullable().optional(),
  locale: z.string().nullable().optional(),
  // Address
  address_line1: z.string().nullable().optional(),
  address_line2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  // Dates
  appointment_date: z.string().nullable().optional(),
  call_date: z.string().nullable().optional(),
  sale_date: z.string().nullable().optional(),
  delivery_date: z.string().nullable().optional(),
  delivered_date: z.string().nullable().optional(),
  road_test_date: z.string().nullable().optional(),
  be_back_date: z.string().nullable().optional(),
  presented_date: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  // Unsubscribe
  unsubscribe_all_date: z.string().nullable().optional(),
  unsubscribe_call_date: z.string().nullable().optional(),
  unsubscribe_email_date: z.string().nullable().optional(),
  unsubscribe_sms_date: z.string().nullable().optional(),
  // Comment
  comment: z.string().nullable().optional(),
  // Nested
  advisor: ActivixAdvisorSchema.nullable().optional(),
  emails: z.array(ActivixEmailSchema).optional(),
  phones: z.array(ActivixPhoneSchema).optional(),
  vehicles: z.array(ActivixVehicleSchema).optional(),
});

export const ActivixLeadCreateSchema = z.object({
  account_id: z.number().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  type: LeadType,
  division: LeadDivision.optional(),
  source: z.string().optional(),
  segment: LeadSegment.optional(),
  locale: z.string().optional(),
  address_line1: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  advisor: ActivixAdvisorSchema.optional(),
  emails: z.array(ActivixEmailSchema).optional(),
  phones: z.array(ActivixPhoneSchema).optional(),
  vehicles: z.array(ActivixVehicleSchema).optional(),
});

export const ActivixLeadUpdateSchema = z.object({
  result: LeadResult.optional(),
  rating: z.number().optional(),
  appointment_date: z.string().optional(),
  comment: z.string().optional(),
  advisor: ActivixAdvisorSchema.optional(),
  division: LeadDivision.optional(),
  status: LeadStatus.optional(),
});

// --- Pagination ---

export const PaginationMetaSchema = z.object({
  current_page: z.number(),
  last_page: z.number(),
  per_page: z.number(),
  total: z.number(),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
    links: z
      .object({
        first: z.string().nullable().optional(),
        last: z.string().nullable().optional(),
        prev: z.string().nullable().optional(),
        next: z.string().nullable().optional(),
      })
      .optional(),
  });

// --- Type exports ---

export type ActivixLead = z.infer<typeof ActivixLeadSchema>;
export type ActivixLeadCreate = z.infer<typeof ActivixLeadCreateSchema>;
export type ActivixLeadUpdate = z.infer<typeof ActivixLeadUpdateSchema>;
export type ActivixEmail = z.infer<typeof ActivixEmailSchema>;
export type ActivixPhone = z.infer<typeof ActivixPhoneSchema>;
export type ActivixVehicle = z.infer<typeof ActivixVehicleSchema>;
export type ActivixAdvisor = z.infer<typeof ActivixAdvisorSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
}

export interface LeadListFilters {
  page?: number;
  per_page?: number;
  division?: string;
  created_at_gte?: string;
  created_at_lte?: string;
  updated_at_gte?: string;
  updated_at_lte?: string;
  result?: string;
  status?: string;
}
