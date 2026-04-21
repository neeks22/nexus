'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';

export interface ConversationMessage {
  sid: string;
  body: string;
  from: string;
  to: string;
  dateSent: string;
  status: string;
  direction: 'inbound' | 'outbound';
}

export interface Conversation {
  phone: string;
  leadName: string;
  status: string;
  vehicleInterest: string;
  budget: string;
  creditSituation: string;
  messages: ConversationMessage[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface ConversationsResponse {
  conversations: Conversation[];
}

interface SingleConversationResponse {
  conversation: Conversation | null;
}

export function useConversations(tenant: string) {
  return useQuery({
    queryKey: ['conversations', tenant],
    queryFn: () => apiGet<ConversationsResponse>('/api/messages', { tenant }),
    select: (data) => data.conversations,
    refetchInterval: 15_000,
  });
}

export function useConversation(tenant: string, phone: string | null) {
  return useQuery({
    queryKey: ['conversation', tenant, phone],
    queryFn: () => apiGet<SingleConversationResponse>('/api/messages', { tenant, phone: phone! }),
    select: (data) => data.conversation,
    enabled: !!phone,
    refetchInterval: 10_000,
  });
}

export function useSendMessage(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { to: string; body: string; channel?: string; email?: string; subject?: string }) =>
      apiPost('/api/messages', { tenant, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations', tenant] });
      qc.invalidateQueries({ queryKey: ['dashboard', tenant] });
      qc.invalidateQueries({ queryKey: ['lead-activity', tenant] });
    },
  });
}
