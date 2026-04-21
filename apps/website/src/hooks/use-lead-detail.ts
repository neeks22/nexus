'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

export interface LeadData {
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

export interface TimelineEntry {
  id: string;
  time: string;
  rawTime: string;
  role: string;
  channel: string;
  content: string;
}

interface LeadsResponse {
  leads?: LeadData[];
}

interface ConversationResponse {
  conversation?: {
    messages?: Array<{ sid: string; dateSent: string; direction: string; body: string }>;
  };
}

interface ActivityResponse {
  activity?: Array<{ id: string; created_at: string; role: string; channel: string; content: string }>;
}

function buildTimeline(convData: ConversationResponse | undefined, actData: ActivityResponse | undefined): TimelineEntry[] {
  const smsEntries: TimelineEntry[] = [];
  const msgs = convData?.conversation?.messages;
  if (msgs) {
    msgs.forEach((m, i) => {
      smsEntries.push({
        id: m.sid || `sms-${i}`,
        time: new Date(m.dateSent).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
        rawTime: m.dateSent,
        role: m.direction === 'inbound' ? 'customer' : 'ai',
        channel: 'sms',
        content: m.body,
      });
    });
  }

  const crmEntries: TimelineEntry[] = [];
  if (actData?.activity) {
    actData.activity.forEach((a, i) => {
      crmEntries.push({
        id: a.id || `crm-${i}`,
        time: new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
        rawTime: a.created_at,
        role: a.role || 'system',
        channel: a.channel || 'crm',
        content: a.content,
      });
    });
  }

  return [...smsEntries, ...crmEntries].sort((a, b) => {
    const ta = new Date(a.rawTime).getTime() || 0;
    const tb = new Date(b.rawTime).getTime() || 0;
    return ta - tb;
  });
}

export function useLeadDetail(tenant: string, phone: string) {
  const leadQuery = useQuery({
    queryKey: ['lead-detail', tenant, phone],
    queryFn: () => apiGet<LeadsResponse>('/api/leads', { tenant, search: phone, limit: '1' }),
    select: (data) => data.leads?.[0] ?? null,
    enabled: !!phone,
  });

  const convQuery = useQuery({
    queryKey: ['lead-conversation', tenant, phone],
    queryFn: () => apiGet<ConversationResponse>('/api/messages', { tenant, phone }),
    enabled: !!phone,
  });

  const activityQuery = useQuery({
    queryKey: ['lead-activity', tenant, phone],
    queryFn: () => apiGet<ActivityResponse>('/api/leads', { tenant, phone, activity: 'true' }),
    enabled: !!phone,
  });

  const timeline = buildTimeline(convQuery.data, activityQuery.data);
  const isLoading = leadQuery.isLoading || convQuery.isLoading || activityQuery.isLoading;

  return { lead: leadQuery.data ?? null, timeline, isLoading };
}

export function useSendSMS(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { to: string; body: string }) =>
      apiPost('/api/messages', { tenant, ...data }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['lead-conversation', tenant, variables.to] });
      qc.invalidateQueries({ queryKey: ['lead-activity', tenant, variables.to] });
      qc.invalidateQueries({ queryKey: ['conversations', tenant] });
      qc.invalidateQueries({ queryKey: ['dashboard', tenant] });
    },
  });
}

export function useSendEmail(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; subject: string; body: string }) =>
      apiPost('/api/messages', { tenant, channel: 'email', ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-conversation', tenant] });
      qc.invalidateQueries({ queryKey: ['lead-activity', tenant] });
      qc.invalidateQueries({ queryKey: ['conversations', tenant] });
      qc.invalidateQueries({ queryKey: ['dashboard', tenant] });
    },
  });
}

export function useUpdateLeadStatus(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phone, status }: { phone: string; status: string }) =>
      apiPatch('/api/leads', { tenant, phone, status }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['lead-detail', tenant, variables.phone] });
      qc.invalidateQueries({ queryKey: ['leads', tenant] });
      qc.invalidateQueries({ queryKey: ['dashboard', tenant] });
    },
  });
}

export function usePostLeadStatus(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { phone: string; type: string; content: string }) =>
      apiPost('/api/leads', { tenant, ...data }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['lead-detail', tenant, variables.phone] });
      qc.invalidateQueries({ queryKey: ['lead-activity', tenant, variables.phone] });
    },
  });
}

export function useDeleteLeadData(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (phone: string) => apiDelete('/api/leads', { tenant, phone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads', tenant] });
      qc.invalidateQueries({ queryKey: ['dashboard', tenant] });
    },
  });
}
