// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CRMIntegration — HubSpot (full), Salesforce / Pipedrive / generic (stubbed)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { classifyError } from '../healing/error-taxonomy.js';
import type { ErrorClassification } from '../types.js';

// ── Config & Entities ──────────────────────────────

export interface CRMConfig {
  provider: 'hubspot' | 'salesforce' | 'pipedrive' | 'generic';
  apiKey: string;
  baseUrl?: string;
}

export interface CRMContact {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  properties?: Record<string, string>;
}

export interface CRMLead {
  contact: CRMContact;
  score?: number;
  source?: string;
  notes?: string;
  stage?: string;
}

// ── NexusCRMError ──────────────────────────────────

export class NexusCRMError extends Error {
  readonly classification: ErrorClassification;
  readonly originalError: unknown;

  constructor(message: string, classification: ErrorClassification, originalError: unknown) {
    super(message);
    this.name = 'NexusCRMError';
    this.classification = classification;
    this.originalError = originalError;
  }
}

function buildNexusCRMError(raw: unknown, context: string): NexusCRMError {
  const classification = classifyError(raw);
  const message =
    raw instanceof Error
      ? `${context}: ${raw.message}`
      : `${context}: ${String(raw)}`;
  return new NexusCRMError(message, classification, raw);
}

// ── HubSpot implementation ─────────────────────────
// HubSpot API v3 — Contacts and Deals (used as leads).
// Docs: https://developers.hubspot.com/docs/api/crm/contacts

const HUBSPOT_BASE = 'https://api.hubapi.com';

interface HubSpotContactProperties {
  email: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  phone?: string;
  [key: string]: string | undefined;
}

interface HubSpotContactResponse {
  id: string;
  properties: HubSpotContactProperties;
}

interface HubSpotSearchResponse {
  total: number;
  results: HubSpotContactResponse[];
}

interface HubSpotDealResponse {
  id: string;
}

async function hubspotFetch<T>(
  apiKey: string,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const url = `${HUBSPOT_BASE}${path}`;
  const method = options.method ?? 'GET';

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    throw buildNexusCRMError(err, 'HubSpot network error');
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const synthetic = new Error(`HTTP ${response.status}: ${errText}`);
    throw buildNexusCRMError(synthetic, 'HubSpot API error');
  }

  try {
    return (await response.json()) as T;
  } catch (err) {
    throw buildNexusCRMError(err, 'HubSpot malformed response');
  }
}

// ── Maps CRMContact → HubSpot property object ─────

function toHubSpotProps(contact: CRMContact): HubSpotContactProperties {
  return {
    email: contact.email,
    ...(contact.firstName ? { firstname: contact.firstName } : {}),
    ...(contact.lastName ? { lastname: contact.lastName } : {}),
    ...(contact.company ? { company: contact.company } : {}),
    ...(contact.phone ? { phone: contact.phone } : {}),
    ...(contact.properties ?? {}),
  };
}

// ── Maps HubSpot response → CRMContact ───────────

function fromHubSpotContact(raw: HubSpotContactResponse): CRMContact {
  const p = raw.properties;
  return {
    email: p.email,
    ...(p.firstname ? { firstName: p.firstname } : {}),
    ...(p.lastname ? { lastName: p.lastname } : {}),
    ...(p.company ? { company: p.company } : {}),
    ...(p.phone ? { phone: p.phone } : {}),
  };
}

// ── HubSpot provider functions ─────────────────────

async function hubspotCreateContact(
  apiKey: string,
  contact: CRMContact,
): Promise<{ id: string }> {
  const data = await hubspotFetch<HubSpotContactResponse>(
    apiKey,
    '/crm/v3/objects/contacts',
    { method: 'POST', body: { properties: toHubSpotProps(contact) } },
  );
  return { id: data.id };
}

async function hubspotCreateLead(
  apiKey: string,
  lead: CRMLead,
): Promise<{ id: string }> {
  // 1. Upsert contact
  let contactId: string;
  try {
    const existing = await hubspotGetContact(apiKey, lead.contact.email);
    if (existing !== null) {
      // Update and reuse existing contact
      const found = await hubspotFetch<HubSpotSearchResponse>(
        apiKey,
        `/crm/v3/objects/contacts/search`,
        {
          method: 'POST',
          body: {
            filterGroups: [
              { filters: [{ propertyName: 'email', operator: 'EQ', value: lead.contact.email }] },
            ],
          },
        },
      );
      contactId = found.results[0]?.id ?? (await hubspotCreateContact(apiKey, lead.contact)).id;
    } else {
      contactId = (await hubspotCreateContact(apiKey, lead.contact)).id;
    }
  } catch {
    contactId = (await hubspotCreateContact(apiKey, lead.contact)).id;
  }

  // 2. Create a Deal representing the lead
  const dealProps: Record<string, unknown> = {
    dealname: `Lead — ${lead.contact.email}`,
    dealstage: lead.stage ?? 'appointmentscheduled',
    pipeline: 'default',
    ...(lead.score !== undefined ? { hs_priority: String(lead.score) } : {}),
    ...(lead.source ? { hs_analytics_source: lead.source } : {}),
    ...(lead.notes ? { description: lead.notes } : {}),
  };

  const deal = await hubspotFetch<HubSpotDealResponse>(
    apiKey,
    '/crm/v3/objects/deals',
    { method: 'POST', body: { properties: dealProps } },
  );

  // 3. Associate deal with contact
  try {
    await hubspotFetch<unknown>(
      apiKey,
      `/crm/v3/objects/deals/${deal.id}/associations/contacts/${contactId}/deal_to_contact`,
      { method: 'PUT' },
    );
  } catch {
    // Association failure is non-fatal — the deal was still created.
  }

  return { id: deal.id };
}

async function hubspotUpdateLead(
  apiKey: string,
  id: string,
  updates: Partial<CRMLead>,
): Promise<void> {
  const dealProps: Record<string, unknown> = {};

  if (updates.stage) dealProps['dealstage'] = updates.stage;
  if (updates.score !== undefined) dealProps['hs_priority'] = String(updates.score);
  if (updates.notes) dealProps['description'] = updates.notes;
  if (updates.source) dealProps['hs_analytics_source'] = updates.source;

  if (Object.keys(dealProps).length > 0) {
    await hubspotFetch<unknown>(
      apiKey,
      `/crm/v3/objects/deals/${id}`,
      { method: 'PATCH', body: { properties: dealProps } },
    );
  }

  if (updates.contact) {
    // Find the contact by email and update their properties
    const searchData = await hubspotFetch<HubSpotSearchResponse>(
      apiKey,
      '/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        body: {
          filterGroups: [
            {
              filters: [
                { propertyName: 'email', operator: 'EQ', value: updates.contact.email },
              ],
            },
          ],
        },
      },
    );
    const contactId = searchData.results[0]?.id;
    if (contactId) {
      await hubspotFetch<unknown>(
        apiKey,
        `/crm/v3/objects/contacts/${contactId}`,
        { method: 'PATCH', body: { properties: toHubSpotProps(updates.contact) } },
      );
    }
  }
}

async function hubspotGetContact(
  apiKey: string,
  email: string,
): Promise<CRMContact | null> {
  const data = await hubspotFetch<HubSpotSearchResponse>(
    apiKey,
    '/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      body: {
        filterGroups: [
          { filters: [{ propertyName: 'email', operator: 'EQ', value: email }] },
        ],
        properties: ['email', 'firstname', 'lastname', 'company', 'phone'],
      },
    },
  );

  if (data.total === 0 || data.results.length === 0) return null;

  const first = data.results[0];
  if (!first) return null;

  return fromHubSpotContact(first);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CRMIntegration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class CRMIntegration {
  private readonly config: CRMConfig;

  constructor(config: CRMConfig) {
    this.config = config;
  }

  // ── createContact ─────────────────────────────────

  async createContact(contact: CRMContact): Promise<{ id: string }> {
    switch (this.config.provider) {
      case 'hubspot':
        return hubspotCreateContact(this.config.apiKey, contact);

      case 'salesforce':
      case 'pipedrive':
      case 'generic':
        // Stub: log intent and return a synthetic ID so the integration
        // contract is honoured. Replace with real API calls per provider.
        return { id: `stub-contact-${Date.now()}` };

      default: {
        const _exhaustive: never = this.config.provider;
        throw new NexusCRMError(
          `Unknown CRM provider: ${String(_exhaustive)}`,
          classifyError(new Error('server_error: unknown provider')),
          null,
        );
      }
    }
  }

  // ── createLead ────────────────────────────────────

  async createLead(lead: CRMLead): Promise<{ id: string }> {
    switch (this.config.provider) {
      case 'hubspot':
        return hubspotCreateLead(this.config.apiKey, lead);

      case 'salesforce':
      case 'pipedrive':
      case 'generic':
        return { id: `stub-lead-${Date.now()}` };

      default: {
        const _exhaustive: never = this.config.provider;
        throw new NexusCRMError(
          `Unknown CRM provider: ${String(_exhaustive)}`,
          classifyError(new Error('server_error: unknown provider')),
          null,
        );
      }
    }
  }

  // ── updateLead ────────────────────────────────────

  async updateLead(id: string, updates: Partial<CRMLead>): Promise<void> {
    switch (this.config.provider) {
      case 'hubspot':
        return hubspotUpdateLead(this.config.apiKey, id, updates);

      case 'salesforce':
      case 'pipedrive':
      case 'generic':
        // Stub — no-op
        return;

      default: {
        const _exhaustive: never = this.config.provider;
        throw new NexusCRMError(
          `Unknown CRM provider: ${String(_exhaustive)}`,
          classifyError(new Error('server_error: unknown provider')),
          null,
        );
      }
    }
  }

  // ── getContact ────────────────────────────────────

  async getContact(email: string): Promise<CRMContact | null> {
    switch (this.config.provider) {
      case 'hubspot':
        return hubspotGetContact(this.config.apiKey, email);

      case 'salesforce':
      case 'pipedrive':
      case 'generic':
        return null;

      default: {
        const _exhaustive: never = this.config.provider;
        throw new NexusCRMError(
          `Unknown CRM provider: ${String(_exhaustive)}`,
          classifyError(new Error('server_error: unknown provider')),
          null,
        );
      }
    }
  }
}
