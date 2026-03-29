/**
 * nexus-dashboard — Client dashboard data provider for the Nexus dealership platform.
 *
 * Exports all types, interfaces, the InMemoryDashboardProvider, and default views.
 */

export type {
  DashboardView,
  DashboardConfig,
  DashboardAuth,
  DailySummary,
  ConversationMessage,
  ConversationEntry,
  ConversationFilters,
  WeeklyDataPoint,
  PerformanceTrends,
  FaqEntry,
  DashboardSettings,
  DateRange,
} from './types.js';

export type { DashboardDataProvider } from './dashboard-provider.js';

export { InMemoryDashboardProvider, DEFAULT_VIEWS } from './dashboard-provider.js';
