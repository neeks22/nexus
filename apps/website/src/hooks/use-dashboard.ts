'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

interface Appointment {
  id: string;
  leadPhone: string;
  leadName: string | null;
  type: string;
  scheduledAt: string;
  status: string;
  reminderSent: boolean;
}

interface ActiveDeal {
  id: string;
  leadPhone: string;
  leadName: string | null;
  vehicle: string | null;
  salePrice: number | null;
  status: string;
}

export interface DashboardData {
  leadsToday: number;
  pipelineCounts: Record<string, number>;
  hotLeads: { phone: string; name: string; status: string }[];
  recentActivity: { time: string; type: string; content: string; phone: string }[];
  todayAppointments: Appointment[];
  activeDeals: { deals: ActiveDeal[]; totalValue: number; byStatus: Record<string, number> };
  monthlyDeals: { count: number; totalValue: number; funded: number; delivered: number };
  // Median response time in minutes (lead created → first outbound) over last 7 days; null when no data.
  avgResponseTime: number | null;
  pagination?: { page: number; limit: number; total: number; pages: number };
}

export function useDashboard(tenant: string) {
  return useQuery({
    queryKey: ['dashboard', tenant],
    queryFn: () => apiGet<DashboardData>('/api/dashboard', { tenant }),
    refetchInterval: 30_000,
  });
}
