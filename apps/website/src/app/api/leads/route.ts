import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim().replace(/\\n$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim().replace(/\\n$/, '');

function supabaseHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenant = request.nextUrl.searchParams.get('tenant') || 'readycar';
  const status = request.nextUrl.searchParams.get('status');
  const search = request.nextUrl.searchParams.get('search');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '100'), 500);
  const activity = request.nextUrl.searchParams.get('activity');
  const phone = request.nextUrl.searchParams.get('phone');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  // Fetch CRM activity for a specific lead
  if (activity === 'true' && phone) {
    try {
      const actRes = await fetch(
        `${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&lead_id=eq.${encodeURIComponent(phone)}&channel=eq.crm&select=id,created_at,role,channel,content&order=created_at.desc&limit=50`,
        { headers: supabaseHeaders(), signal: AbortSignal.timeout(10000) }
      );
      if (actRes.ok) {
        const actData = await actRes.json();
        return NextResponse.json({ activity: actData }, { headers: { 'Cache-Control': 'no-store' } });
      }
      return NextResponse.json({ activity: [] }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return NextResponse.json({ activity: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }
  }

  try {
    let query = `v_funnel_submissions?tenant_id=eq.${tenant}&select=*&order=created_at.desc&limit=${limit}`;
    if (status) query += `&status=eq.${status}`;
    if (search) query += `&or=(first_name.ilike.*${search}*,last_name.ilike.*${search}*,phone.ilike.*${search}*,email.ilike.*${search}*)`;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
      headers: supabaseHeaders(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    const leads = await res.json();
    return NextResponse.json({ leads }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[leads] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { phone, status, tenant } = body as { phone?: string; status?: string; tenant?: string };

    if (!phone || !status) {
      return NextResponse.json({ error: 'phone and status required' }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/funnel_submissions?phone=eq.${encodeURIComponent(phone)}${tenant ? `&tenant_id=eq.${tenant}` : ''}`,
      {
        method: 'PATCH',
        headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
        body: JSON.stringify({ status }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[leads] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { tenant, phone, type, content } = body as { tenant?: string; phone?: string; type?: string; content?: string };

    if (!tenant || !content) {
      return NextResponse.json({ error: 'tenant and content required' }, { status: 400 });
    }

    // Create a new lead in funnel_submissions
    if (type === 'create_lead') {
      try {
        const leadData = JSON.parse(content);
        const normalizedPhone = (leadData.phone || '').replace(/\D/g, '');
        const fullPhone = normalizedPhone.length === 10 ? `+1${normalizedPhone}` : normalizedPhone.length === 11 ? `+${normalizedPhone}` : `+${normalizedPhone}`;

        // Check if lead already exists
        const checkRes = await fetch(
          `${SUPABASE_URL}/rest/v1/v_funnel_submissions?tenant_id=eq.${tenant}&phone=eq.${encodeURIComponent(fullPhone)}&limit=1`,
          { headers: supabaseHeaders(), signal: AbortSignal.timeout(10000) }
        );
        if (checkRes.ok) {
          const existing = await checkRes.json();
          if (existing.length > 0) {
            return NextResponse.json({ success: true, existing: true, lead: existing[0] });
          }
        }

        const createRes = await fetch(`${SUPABASE_URL}/rest/v1/funnel_submissions`, {
          method: 'POST',
          headers: { ...supabaseHeaders(), Prefer: 'return=representation' },
          body: JSON.stringify({
            tenant_id: tenant,
            first_name: leadData.first_name || null,
            last_name: leadData.last_name || null,
            phone: fullPhone,
            email: leadData.email || null,
            vehicle_type: leadData.vehicle_type || null,
            credit_situation: leadData.credit_situation || null,
            status: 'new',
            casl_consent: true,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!createRes.ok) {
          const errText = await createRes.text();
          console.error('[leads] Create error:', errText);
          return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
        }
        const created = await createRes.json();
        return NextResponse.json({ success: true, existing: false, lead: created[0] || created });
      } catch (err) {
        console.error('[leads] Create lead error:', err);
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
      }
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts`, {
      method: 'POST',
      headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({
        tenant_id: tenant,
        lead_id: phone || 'unknown',
        entry_type: type || 'note',
        role: 'system',
        content,
        channel: 'crm',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[leads] POST error:', errText);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[leads] POST error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { tenant, phone } = body as { tenant?: string; phone?: string };

    if (!tenant || !phone) {
      return NextResponse.json({ error: 'tenant and phone required' }, { status: 400 });
    }

    // Delete all activity/transcripts for this lead
    await fetch(
      `${SUPABASE_URL}/rest/v1/lead_transcripts?tenant_id=eq.${tenant}&lead_id=eq.${encodeURIComponent(phone)}`,
      { method: 'DELETE', headers: { ...supabaseHeaders(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(10000) }
    );

    // Delete the lead record
    await fetch(
      `${SUPABASE_URL}/rest/v1/funnel_submissions?tenant_id=eq.${tenant}&phone=eq.${encodeURIComponent(phone)}`,
      { method: 'DELETE', headers: { ...supabaseHeaders(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(10000) }
    );

    // Delete consent records
    await fetch(
      `${SUPABASE_URL}/rest/v1/consent_records?tenant_id=eq.${tenant}&lead_id=eq.${encodeURIComponent(phone)}`,
      { method: 'DELETE', headers: { ...supabaseHeaders(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(10000) }
    );

    return NextResponse.json({ success: true, message: 'All customer data deleted' });
  } catch (error) {
    console.error('[leads] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
