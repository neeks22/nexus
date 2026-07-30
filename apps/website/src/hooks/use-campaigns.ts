'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api';

export interface CampaignContact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  zip: string | null;
  lead_source: string | null;
  lead_created_at: string | null;
  consent_basis: 'implied_active' | 'implied_expired' | 'express';
  sequence_step: number;
  status: 'pending' | 'in_sequence' | 'replied' | 'unsubscribed' | 'bounced' | 'closed' | 'sold';
  last_template: string | null;
  last_sent_at: string | null;
  replied_at: string | null;
  notes: string | null;
}

export interface CampaignStats {
  total: number;
  pending: number;
  inSequence: number;
  replied: number;
  unsubscribed: number;
  bounced: number;
  sold: number;
  consentActive: number;
  sentToday: number;
  remainingToday: number;
  dailyCap: number;
  replyRate: number;
}

interface ContactsResponse {
  contacts: CampaignContact[];
}

interface QueueResponse {
  contacts: CampaignContact[];
  totalDue: number;
}

interface StatsResponse {
  stats: CampaignStats;
}

export function useCampaignStats(tenant: string) {
  return useQuery({
    queryKey: ['campaign-stats', tenant],
    queryFn: () => apiGet<StatsResponse>('/api/campaigns', { tenant, view: 'stats' }),
    select: (data) => data.stats,
  });
}

export function useCampaignQueue(tenant: string, params?: { consentActiveOnly?: boolean; limit?: number }) {
  return useQuery({
    queryKey: ['campaign-queue', tenant, params?.consentActiveOnly, params?.limit],
    queryFn: () =>
      apiGet<QueueResponse>('/api/campaigns', {
        tenant,
        view: 'queue',
        consent: params?.consentActiveOnly ? 'active' : undefined,
        limit: params?.limit != null ? String(params.limit) : undefined,
      }),
  });
}

export function useCampaignContacts(tenant: string, params?: { status?: string; search?: string; consent?: string }) {
  return useQuery({
    queryKey: ['campaign-contacts', tenant, params?.status, params?.search, params?.consent],
    queryFn: () =>
      apiGet<ContactsResponse>('/api/campaigns', {
        tenant,
        status: params?.status,
        search: params?.search,
        consent: params?.consent,
      }),
    select: (data) => data.contacts,
  });
}

function invalidateCampaign(qc: ReturnType<typeof useQueryClient>, tenant: string): void {
  qc.invalidateQueries({ queryKey: ['campaign-queue', tenant] });
  qc.invalidateQueries({ queryKey: ['campaign-stats', tenant] });
  qc.invalidateQueries({ queryKey: ['campaign-contacts', tenant] });
}

export function useMarkSent(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; template: string; subject: string }) =>
      apiPatch('/api/campaigns', { tenant, action: 'mark_sent', ...data }),
    onSuccess: () => invalidateCampaign(qc, tenant),
  });
}

export function useUpdateCampaignContact(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; status?: string; notes?: string }) =>
      apiPatch('/api/campaigns', { tenant, ...data }),
    onSuccess: () => invalidateCampaign(qc, tenant),
  });
}
