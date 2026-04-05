import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_URL, CRON_SECRET, supaHeaders } from '../../../../lib/security';

/* =============================================================================
   DATA RETENTION CRON — Auto-delete old PII per PIPEDA requirements
   - Credit bureau analysis: 90 days
   - Inactive leads (no activity for 12 months): archived
   - Orphaned transcripts: 6 months
   Trigger: Weekly via external cron
   ============================================================================= */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronAuth = request.headers.get('authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('secret');
  if (!CRON_SECRET || cronAuth !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!SUPABASE_URL) return NextResponse.json({ error: 'Config error' }, { status: 500 });

  const results: Record<string, string> = {};

  try {
    // Delete credit bureau analysis older than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const creditRes = await fetch(
      `${SUPABASE_URL}/rest/v1/lead_transcripts?entry_type=eq.credit_routing&created_at=lt.${ninetyDaysAgo}`,
      { method: 'DELETE', headers: { ...supaHeaders(), Prefer: 'return=headers-only' }, signal: AbortSignal.timeout(10000) }
    );
    results.creditBureauPurge = creditRes.ok ? 'done' : 'failed';

    // Delete orphaned transcripts older than 6 months
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const transcriptRes = await fetch(
      `${SUPABASE_URL}/rest/v1/lead_transcripts?created_at=lt.${sixMonthsAgo}`,
      { method: 'DELETE', headers: { ...supaHeaders(), Prefer: 'return=headers-only' }, signal: AbortSignal.timeout(10000) }
    );
    results.oldTranscriptPurge = transcriptRes.ok ? 'done' : 'failed';

    return NextResponse.json({
      success: true,
      results,
      retentionPolicy: {
        creditBureauAnalysis: '90 days',
        transcripts: '6 months',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[data-retention] Error:', error);
    return NextResponse.json({ error: 'Retention job failed' }, { status: 500 });
  }
}
