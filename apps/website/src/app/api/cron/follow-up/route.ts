import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { CRON_SECRET, supaGet, slackNotify } from '../../../../lib/security';
import { TENANTS } from '../../../../lib/auto-response';
import { getFollowUpCandidates, processFollowUpBatch } from '../../../../lib/follow-up';

/* =============================================================================
   FOLLOW-UP CRON — Hourly automated SMS follow-up sequences
   Checks each tenant for leads that are due for follow-up, generates
   personalized SMS via Claude, and sends via Twilio.
   Schedule: Every hour (0 * * * *)
   ============================================================================= */

interface TenantResult {
  sent: number;
  failed: number;
  cold: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth: same pattern as data-retention cron
  const cronAuth = request.headers.get('authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('secret');
  if (!CRON_SECRET || cronAuth !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantResults: Record<string, TenantResult> = {};

  try {
    for (const [tenantId, tenant] of Object.entries(TENANTS)) {
      try {
        // Check if follow_up agent is enabled
        const { data: followUpToggle } = await supaGet(
          `agent_toggles?tenant_id=eq.${tenantId}&agent_id=eq.follow_up&select=enabled&limit=1`
        );
        const fuEnabled = (followUpToggle as { enabled: boolean }[])[0]?.enabled;
        if (fuEnabled === false) {
          tenantResults[tenantId] = { sent: 0, failed: 0, cold: 0 };
          continue;
        }

        // Check if instant_response is enabled (spending cap)
        const { data: irToggle } = await supaGet(
          `agent_toggles?tenant_id=eq.${tenantId}&agent_id=eq.instant_response&select=enabled&limit=1`
        );
        const irEnabled = (irToggle as { enabled: boolean }[])[0]?.enabled;
        if (irEnabled === false) {
          tenantResults[tenantId] = { sent: 0, failed: 0, cold: 0 };
          continue;
        }

        // Get candidates and process
        const candidates = await getFollowUpCandidates(tenantId);

        if (candidates.length > 0) {
          tenantResults[tenantId] = await processFollowUpBatch(candidates, tenant);
        } else {
          tenantResults[tenantId] = { sent: 0, failed: 0, cold: 0 };
        }
      } catch (err) {
        console.error(`[follow-up-cron] Error for tenant ${tenantId}:`, err instanceof Error ? err.message : 'unknown');
        Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
        tenantResults[tenantId] = { sent: 0, failed: 0, cold: 0 };
      }
    }

    // Build Slack summary
    const parts = Object.entries(tenantResults).map(
      ([id, r]) => `${TENANTS[id]?.name ?? id} sent ${r.sent}`
    );
    const totalFailed = Object.values(tenantResults).reduce((s, r) => s + r.failed, 0);
    const totalCold = Object.values(tenantResults).reduce((s, r) => s + r.cold, 0);
    const summary = `FOLLOW-UP CRON: ${parts.join(', ')}, ${totalFailed} failed, ${totalCold} marked cold`;

    await slackNotify(summary);

    return NextResponse.json({
      success: true,
      tenants: tenantResults,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[follow-up-cron] Fatal error:', err instanceof Error ? err.message : 'unknown');
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Follow-up cron failed' }, { status: 500 });
  }
}
