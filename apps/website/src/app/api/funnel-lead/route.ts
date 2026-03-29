import { NextResponse } from 'next/server';

/**
 * POST /api/funnel-lead
 *
 * Receives multi-step funnel data from the /apply page (9 steps),
 * forwards it to the n8n webhook for CRM creation and instant response,
 * and returns success/error.
 */

interface FunnelLeadPayload {
  vehicleType: string;
  budget: string;
  monthlyIncome: string;
  jobTitle: string;
  employment: string;
  creditSituation: string;
  tradeIn: string;
  tradeInYear: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  caslConsent: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  completedAt?: string;
}

const N8N_WEBHOOK_URL =
  process.env.N8N_FUNNEL_WEBHOOK_URL ||
  'https://nexusagents.app.n8n.cloud/webhook/ad-lead';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as FunnelLeadPayload;

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.phone || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, phone, email' },
        { status: 400 }
      );
    }

    if (!body.caslConsent) {
      return NextResponse.json(
        { error: 'CASL consent is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Build the lead payload for n8n
    const leadPayload = {
      source: 'funnel',
      funnelData: {
        vehicleType: body.vehicleType,
        budget: body.budget,
        monthlyIncome: body.monthlyIncome,
        jobTitle: body.jobTitle,
        employment: body.employment,
        creditSituation: body.creditSituation,
        tradeIn: body.tradeIn,
        tradeInYear: body.tradeInYear || '',
      },
      contact: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        email: body.email,
      },
      consent: {
        casl: body.caslConsent,
        timestamp: body.completedAt || new Date().toISOString(),
      },
      attribution: {
        utmSource: body.utmSource || '',
        utmMedium: body.utmMedium || '',
        utmCampaign: body.utmCampaign || '',
      },
      metadata: {
        submittedAt: new Date().toISOString(),
        userAgent: request.headers.get('user-agent') || '',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      },
    };

    // Forward to n8n webhook
    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadPayload),
      signal: AbortSignal.timeout(10000),
    });

    if (!webhookResponse.ok) {
      console.error(
        `[funnel-lead] n8n webhook returned ${webhookResponse.status}:`,
        await webhookResponse.text().catch(() => 'no body')
      );
      // Still return success to the user — we do not want to block the UX
      // because the webhook had an issue. The lead data is logged.
    }

    console.log(
      `[funnel-lead] Lead submitted: ${body.firstName} ${body.lastName} | ` +
        `vehicle=${body.vehicleType} budget=${body.budget} ` +
        `income=${body.monthlyIncome} job=${body.jobTitle} ` +
        `credit=${body.creditSituation} employment=${body.employment} ` +
        `tradeIn=${body.tradeIn} tradeInYear=${body.tradeInYear || 'n/a'} ` +
        `utm_source=${body.utmSource || 'direct'}`
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[funnel-lead] Error processing lead:', message);

    return NextResponse.json(
      { error: 'Failed to process application. Please try again.' },
      { status: 500 }
    );
  }
}
