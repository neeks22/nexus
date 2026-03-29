import { CostStore } from './cost-store.js';
import { CostReport, DateRange, OperationBreakdown, OperationType } from './types.js';

export interface ReportOptions {
  totalLeadsHandled?: number;
  totalConversations?: number;
  totalAppointments?: number;
}

export class CostReporter {
  private store: CostStore;

  constructor(store: CostStore) {
    this.store = store;
  }

  async generateReport(
    tenantId: string,
    dateRange: DateRange,
    options: ReportOptions = {}
  ): Promise<CostReport> {
    const totalLeadsHandled = options.totalLeadsHandled ?? 0;
    const totalConversations = options.totalConversations ?? 0;
    const totalAppointments = options.totalAppointments ?? 0;

    const apiCosts = await this.store.getApiCosts(tenantId, dateRange);
    const twilioCosts = await this.store.getTwilioCosts(tenantId, dateRange);

    const aiCostUsd = apiCosts.reduce((sum, e) => sum + e.costUsd, 0);
    const twilioCostUsd = twilioCosts.reduce((sum, e) => sum + e.costUsd, 0);
    const totalCostUsd = aiCostUsd + twilioCostUsd;

    const breakdownMap = new Map<OperationType, OperationBreakdown>();

    for (const entry of apiCosts) {
      const existing = breakdownMap.get(entry.operationType);
      if (existing) {
        existing.totalCostUsd += entry.costUsd;
        existing.callCount += 1;
        existing.totalInputTokens += entry.inputTokens;
        existing.totalOutputTokens += entry.outputTokens;
      } else {
        breakdownMap.set(entry.operationType, {
          operationType: entry.operationType,
          totalCostUsd: entry.costUsd,
          callCount: 1,
          totalInputTokens: entry.inputTokens,
          totalOutputTokens: entry.outputTokens,
        });
      }
    }

    const breakdown = Array.from(breakdownMap.values());

    const costPerLead = totalLeadsHandled > 0 ? totalCostUsd / totalLeadsHandled : 0;
    const costPerConversation = totalConversations > 0 ? totalCostUsd / totalConversations : 0;
    const costPerAppointment = totalAppointments > 0 ? totalCostUsd / totalAppointments : 0;

    return {
      tenantId,
      dateRange,
      totalCostUsd,
      aiCostUsd,
      twilioCostUsd,
      totalLeadsHandled,
      totalConversations,
      totalAppointments,
      costPerLead,
      costPerConversation,
      costPerAppointment,
      breakdown,
    };
  }

  async generateSummary(
    tenantId: string,
    dateRange: DateRange,
    options: ReportOptions = {}
  ): Promise<string> {
    const report = await this.generateReport(tenantId, dateRange, options);

    const startStr = report.dateRange.start.toISOString().split('T')[0];
    const endStr = report.dateRange.end.toISOString().split('T')[0];

    const lines: string[] = [
      `Cost Report for Tenant: ${report.tenantId}`,
      `Period: ${startStr} to ${endStr}`,
      ``,
      `Total Cost: $${report.totalCostUsd.toFixed(4)}`,
      `  AI API Cost: $${report.aiCostUsd.toFixed(4)}`,
      `  Twilio Cost: $${report.twilioCostUsd.toFixed(4)}`,
      ``,
      `Volume:`,
      `  Leads Handled: ${report.totalLeadsHandled}`,
      `  Conversations: ${report.totalConversations}`,
      `  Appointments: ${report.totalAppointments}`,
      ``,
      `Unit Economics:`,
      `  Cost per Lead: $${report.costPerLead.toFixed(4)}`,
      `  Cost per Conversation: $${report.costPerConversation.toFixed(4)}`,
      `  Cost per Appointment: $${report.costPerAppointment.toFixed(4)}`,
    ];

    if (report.breakdown.length > 0) {
      lines.push(``);
      lines.push(`Breakdown by Operation:`);
      for (const b of report.breakdown) {
        lines.push(
          `  ${b.operationType}: $${b.totalCostUsd.toFixed(4)} (${b.callCount} calls, ${b.totalInputTokens} input tokens, ${b.totalOutputTokens} output tokens)`
        );
      }
    }

    return lines.join('\n');
  }
}
