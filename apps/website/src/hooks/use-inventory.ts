'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  color: string | null;
  price: number | null;
  mileage: number | null;
  stock_number: string | null;
  vin: string | null;
  status: 'available' | 'sold' | 'pending';
  notes: string | null;
  created_at: string;
}

interface InventoryResponse {
  vehicles: Vehicle[];
}

export function useInventory(tenant: string, params?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: ['inventory', tenant, params?.search, params?.status],
    queryFn: () => apiGet<InventoryResponse>('/api/inventory', { tenant, search: params?.search, status: params?.status }),
    select: (data) => data.vehicles,
  });
}

export function useCreateVehicle(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vehicle: Record<string, unknown>) => apiPost('/api/inventory', { tenant, ...vehicle }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', tenant] }),
  });
}

export function useUpdateVehicle(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string } & Record<string, unknown>) => apiPatch('/api/inventory', { tenant, ...data }),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ['inventory', tenant] });
      const snapshots = qc.getQueriesData<InventoryResponse>({ queryKey: ['inventory', tenant] });
      for (const [key, prev] of snapshots) {
        if (!prev) continue;
        qc.setQueryData<InventoryResponse>(key, {
          ...prev,
          vehicles: prev.vehicles.map((v) =>
            v.id === data.id ? { ...v, ...(data as Partial<Vehicle>) } : v
          ),
        });
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key, prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['inventory', tenant] }),
  });
}

export function useDeleteVehicle(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete('/api/inventory', { tenant, id }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['inventory', tenant] });
      const snapshots = qc.getQueriesData<InventoryResponse>({ queryKey: ['inventory', tenant] });
      for (const [key, prev] of snapshots) {
        if (!prev) continue;
        qc.setQueryData<InventoryResponse>(key, {
          ...prev,
          vehicles: prev.vehicles.filter((v) => v.id !== id),
        });
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key, prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['inventory', tenant] }),
  });
}
