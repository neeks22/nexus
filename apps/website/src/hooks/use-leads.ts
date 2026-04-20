'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

export interface Lead {
  phone: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  vehicle_type: string;
  credit_situation: string;
  budget: string;
  created_at: string;
}

interface LeadsResponse {
  leads: Lead[];
}

export function useLeads(tenant: string, params?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: ['leads', tenant, params?.search, params?.status],
    queryFn: () => apiGet<LeadsResponse>('/api/leads', { tenant, search: params?.search, status: params?.status }),
    select: (data) => data.leads,
  });
}

interface CreateLeadResponse {
  success: boolean;
  existing: boolean;
  lead?: Lead;
}

export function useCreateLead(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lead: Record<string, string>) =>
      apiPost<CreateLeadResponse>('/api/leads', { tenant, type: 'create_lead', content: JSON.stringify(lead) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads', tenant] }),
  });
}

export function useUpdateLeadStatus(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phone, status }: { phone: string; status: string }) =>
      apiPatch('/api/leads', { tenant, phone, status }),
    // Optimistic: move card to new column instantly; rollback on error.
    onMutate: async ({ phone, status }) => {
      await qc.cancelQueries({ queryKey: ['leads', tenant] });
      const snapshots = qc.getQueriesData<LeadsResponse>({ queryKey: ['leads', tenant] });
      for (const [key, prev] of snapshots) {
        if (!prev) continue;
        qc.setQueryData<LeadsResponse>(key, {
          ...prev,
          leads: prev.leads.map((l) => (l.phone === phone ? { ...l, status } : l)),
        });
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key, prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['leads', tenant] });
      qc.invalidateQueries({ queryKey: ['dashboard', tenant] });
    },
  });
}

export function useDeleteLead(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (phone: string) => apiDelete('/api/leads', { tenant, phone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads', tenant] });
      qc.invalidateQueries({ queryKey: ['dashboard', tenant] });
    },
  });
}
