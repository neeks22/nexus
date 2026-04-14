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
    },
  });
}

export function useUpdateAppointment(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string } & Record<string, unknown>) => apiPatch('/api/appointments', { tenant, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', tenant] });
      qc.invalidateQueries({ queryKey: ['dashboard', tenant] });
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
