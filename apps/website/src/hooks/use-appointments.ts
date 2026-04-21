'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface Appointment {
  id: string;
  tenant_id: string;
  lead_phone: string;
  lead_name: string | null;
  appointment_type: string;
  scheduled_at: string;
  assigned_to: string | null;
  status: string;
  notes: string | null;
  reminder_sent: boolean;
  vehicle_id: string | null;
  created_at: string;
}

interface AppointmentsResponse {
  appointments: Appointment[];
}

export function useAppointments(tenant: string, params?: { view?: string; lead_phone?: string }) {
  return useQuery({
    queryKey: ['appointments', tenant, params?.view, params?.lead_phone],
    queryFn: () => apiGet<AppointmentsResponse>('/api/appointments', { tenant, view: params?.view, lead_phone: params?.lead_phone }),
    select: (data) => data.appointments,
  });
}

export function useCreateAppointment(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appt: Record<string, unknown>) => apiPost('/api/appointments', { tenant, ...appt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', tenant] });
      qc.invalidateQueries({ queryKey: ['dashboard', tenant] });
      qc.invalidateQueries({ queryKey: ['lead-activity', tenant] });
      qc.invalidateQueries({ queryKey: ['lead-detail', tenant] });
    },
  });
}

export function useUpdateAppointment(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string } & Record<string, unknown>) => apiPatch('/api/appointments', { tenant, ...data }),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ['appointments', tenant] });
      const snapshots = qc.getQueriesData<AppointmentsResponse>({ queryKey: ['appointments', tenant] });
      for (const [key, prev] of snapshots) {
        if (!prev) continue;
        qc.setQueryData<AppointmentsResponse>(key, {
          ...prev,
          appointments: prev.appointments.map((a) =>
            a.id === data.id ? { ...a, ...(data as Partial<Appointment>) } : a
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
      qc.invalidateQueries({ queryKey: ['appointments', tenant] });
      qc.invalidateQueries({ queryKey: ['dashboard', tenant] });
      qc.invalidateQueries({ queryKey: ['lead-activity', tenant] });
      qc.invalidateQueries({ queryKey: ['lead-detail', tenant] });
    },
  });
}

export function useSendReminder(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => apiPost('/api/appointments', { tenant, action: 'send_reminder', appointment_id: appointmentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments', tenant] }),
  });
}
