'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface Deal {
  id: string;
  tenant_id: string;
  lead_phone: string;
  lead_name: string | null;
  vehicle_id: string | null;
  vehicle_description: string | null;
  sale_price: number | null;
  trade_in_value: number | null;
  down_payment: number | null;
  monthly_payment: number | null;
  term_months: number | null;
  lender: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface DealsResponse {
  deals: Deal[];
}

export function useDeals(tenant: string, params?: { status?: string; lead_phone?: string }) {
  return useQuery({
    queryKey: ['deals', tenant, params?.status, params?.lead_phone],
    queryFn: () => apiGet<DealsResponse>('/api/deals', { tenant, status: params?.status, lead_phone: params?.lead_phone }),
    select: (data) => data.deals,
  });
}

export function useCreateDeal(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deal: Record<string, unknown>) => apiPost('/api/deals', { tenant, ...deal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals', tenant] });
      qc.invalidateQueries({ queryKey: ['dashboard', tenant] });
    },
  });
}

export function useUpdateDeal(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string } & Record<string, unknown>) => apiPatch('/api/deals', { tenant, ...data }),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ['deals', tenant] });
      const snapshots = qc.getQueriesData<DealsResponse>({ queryKey: ['deals', tenant] });
      for (const [key, prev] of snapshots) {
        if (!prev) continue;
        qc.setQueryData<DealsResponse>(key, {
          ...prev,
          deals: prev.deals.map((d) =>
            d.id === data.id ? { ...d, ...(data as Partial<Deal>) } : d
          ),
        });
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key, prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['deals', tenant] });
      qc.invalidateQueries({ queryKey: ['dashboard', tenant] });
    },
  });
}
