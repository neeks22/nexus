import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { requireApiKey, rateLimit, getClientIp } from '@/lib/security';

export const maxDuration = 60;

const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY ?? '').trim();

const CLIENT_INFO_BLOCK = `
IMPORTANT: At the VERY END of your response, add a JSON block with the client's personal info extracted from the bureau. Format it EXACTLY like this on its own line:
CLIENT_JSON:{"first_name":"John","last_name":"Smith","phone":"6131234567","email":"john@email.com","address":"123 Main St, Ottawa ON","income":"3500","fico":"650"}
If a field is not found in the bureau, use an empty string. Always include the CLIENT_JSON: prefix.`;

const TEXT_PROMPT = `You are a Canadian auto financing specialist with 30 years experience. Analyze this credit bureau text and extract:
1. Beacon/FICO score (or estimate if not visible)
2. Open trades and their status
3. Collections or charge-offs
4. Bankruptcy or consumer proposal history
5. Total monthly debt obligations
6. Key red flags
7. Key strengths
8. Overall assessment (1 sentence)

Format as a clean summary. Be direct and actionable.
${CLIENT_INFO_BLOCK}

Credit Bureau Text:`;

const PDF_PROMPT = `You are a Canadian auto financing specialist with 30 years experience analyzing credit bureaus. Extract from this credit bureau:

1. BEACON/FICO SCORE (exact number)
2. CLIENT NAME, ADDRESS, PHONE, EMAIL (from the bureau header)
3. ALL TRADES: creditor name, balance, monthly payment, status (R1/R2/R9 etc), high credit
4. COLLECTIONS: creditor, amount, date
5. PUBLIC RECORDS: bankruptcies, proposals, judgments with dates
6. TOTAL MONTHLY OBLIGATIONS (sum of all payments)
7. INQUIRIES: count in last 12 months
8. RED FLAGS: anything concerning
9. STRENGTHS: anything positive
10. ESTIMATED TIER: Near-prime / Light subprime / Mid subprime / Deep subprime / BK-Proposal
11. ONE-LINE VERDICT: "This customer is a [tier] with [key factor]. Route to [recommended lender]."

Be extremely specific with numbers. This data routes to lender matching.
${CLIENT_INFO_BLOCK}`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const authError = requireApiKey(request);
  if (authError) return authError;

  // Rate limit: 10 per minute per IP
  const ip = getClientIp(request);
  if (await rateLimit(ip, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Anthropic API key not configured' },
      { status: 500 }
    );
  }

  let analyzeBody;
  try {
    analyzeBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const body = analyzeBody;
    const { type, text, pdfBase64 } = body as {
      type: 'text' | 'pdf';
      text?: string;
      pdfBase64?: string;
    };

    if (type === 'text' && !text) {
      return NextResponse.json({ error: 'Missing text field' }, { status: 400 });
    }
    if (type === 'pdf' && !pdfBase64) {
      return NextResponse.json({ error: 'Missing pdfBase64 field' }, { status: 400 });
    }
    if (type === 'pdf' && pdfBase64) {
      const sizeBytes = Math.ceil(pdfBase64.length * 0.75);
      if (sizeBytes > 32 * 1024 * 1024) {
        return NextResponse.json({ error: 'PDF too large — max 32MB' }, { status: 400 });
      }
    }

    let messages;

    if (type === 'pdf') {
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            { type: 'text', text: PDF_PROMPT },
          ],
        },
      ];
    } else {
      messages = [
        {
          role: 'user',
          content: `${TEXT_PROMPT}\n${text}`,
        },
      ];
    }

    // Build request body — extended thinking for text, standard for PDFs
    // (document content blocks may not support thinking parameter)
    const requestBody: Record<string, unknown> = {
      model: 'claude-opus-4-6',
      max_tokens: type === 'pdf' ? 16000 : 8000,
      messages,
    };
    if (type !== 'pdf') {
      requestBody.thinking = {
        type: 'enabled',
        budget_tokens: 5000,
      };
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(55000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Anthropic API error:', res.status, errText);
      let detail = `API error ${res.status}`;
      try {
        const parsed = JSON.parse(errText);
        detail = parsed?.error?.message || parsed?.message || detail;
      } catch {
        detail = errText.slice(0, 200) || detail;
      }
      return NextResponse.json(
        { error: detail },
        { status: res.status }
      );
    }

    const data = await res.json();
    const rawAnalysis = (data.content || [])
      .filter((item: { type: string }) => item.type === 'text')
      .map((item: { text?: string }) => item.text || '')
      .join('\n');

    // Extract CLIENT_JSON from the analysis
    let clientInfo = null;
    let analysis = rawAnalysis;
    const jsonMatch = rawAnalysis.match(/CLIENT_JSON:\s*(\{[^}]+\})/);
    if (jsonMatch) {
      try {
        clientInfo = JSON.parse(jsonMatch[1]);
      } catch (err) {
        console.error('[credit-analyze] CLIENT_JSON parse error:', err instanceof Error ? err.message : 'unknown');
      }
      analysis = rawAnalysis.replace(/CLIENT_JSON:\s*\{[^}]+\}/, '').trim();
    }

    return NextResponse.json({ analysis, clientInfo });
  } catch (err) {
    console.error('Credit analyze error:', err);
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
