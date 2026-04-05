import { NextRequest, NextResponse } from 'next/server';
import {
  SUPABASE_URL, requireApiKey, rateLimit, getClientIp,
  validateTenant, sanitizeInput, supaHeaders, encodeSupabaseParam, sendTwilioSMS,
} from '@/lib/security';

const VALID_TYPES = ['test_drive', 'financing', 'trade_appraisal', 'general'];
const VALID_STATUSES = ['scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'];

const TENANT_NUMBERS: Record<string, string> = {
  readycar: '+13433125045',
  readyride: '+13433412797',
};

const TENANT_NAMES: Record<string, string> = {
  readycar: 'ReadyCar',
  readyride: 'ReadyRide',
};

const TYPE_LABELS: Record<string, string> = {
  test_drive: 'test drive',
  financing: 'financing',
  trade_appraisal: 'trade-in appraisal',
  general: '',
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 60)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const tenant = validateTenant(request.nextUrl.searchParams.get('tenant'));
  const view = request.nextUrl.searchParams.get('view') || 'upcoming';
  const leadPhone = request.nextUrl.searchParams.get('lead_phone');

  try {
    let url = `${SUPABASE_URL}/rest/v1/appointments?tenant_id=eq.${tenant}&select=*`;

    if (leadPhone) {
      url += `&lead_phone=eq.${encodeSupabaseParam(leadPhone)}`;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    if (view === 'today') {
      url += `&scheduled_at=gte.${todayStart}&scheduled_at=lt.${todayEnd}&order=scheduled_at.asc`;
    } else if (view === 'upcoming') {
      url += `&scheduled_at=gte.${todayStart}&status=in.(scheduled,confirmed)&order=scheduled_at.asc`;
    } else {
      url += '&order=scheduled_at.desc';
    }

    url += '&limit=200';

    const res = await fetch(url, {
      headers: supaHeaders(tenant),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[appointments] GET failed: HTTP ${res.status}`);
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }

    const appointments = await res.json();
    return NextResponse.json({ appointments });
  } catch (err) {
    console.error('[appointments] GET error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const tenant = validateTenant(body.tenant);

    // SMS Reminder action
    if (body.action === 'send_reminder') {
      if (await rateLimit(ip, 10)) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
      }

      const { appointment_id } = body as { appointment_id?: string };
      if (!appointment_id) {
        return NextResponse.json({ error: 'Missing appointment_id' }, { status: 400 });
      }

      // Fetch appointment
      const apptRes = await fetch(
        `${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointment_id}&tenant_id=eq.${tenant}&select=*`,
        { headers: supaHeaders(tenant), signal: AbortSignal.timeout(10000) }
      );

      if (!apptRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 });
      }

      const appts = await apptRes.json();
      if (!appts.length) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }

      const appt = appts[0];
      const fromNumber = TENANT_NUMBERS[tenant] || TENANT_NUMBERS.readycar;
      const dealerName = TENANT_NAMES[tenant] || 'ReadyCar';
      const apptDate = new Date(appt.scheduled_at);
      const dateStr = apptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const timeStr = apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const typeLabel = TYPE_LABELS[appt.appointment_type] || 'appointment';

      const name = appt.lead_name ? appt.lead_name.split(' ')[0] : '';
      const greeting = name ? `Hi ${name}, this` : 'This';
      const smsBody = `${greeting} is a reminder about your ${typeLabel} appointment at ${dealerName} on ${dateStr} at ${timeStr}. Reply YES to confirm or give us a call!`;

      const sent = await sendTwilioSMS(appt.lead_phone, fromNumber, smsBody);
      if (!sent) {
        return NextResponse.json({ error: 'Failed to send reminder SMS' }, { status: 500 });
      }

      // Mark reminder as sent
      await fetch(
        `${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointment_id}&tenant_id=eq.${tenant}`,
        {
          method: 'PATCH',
          headers: { ...supaHeaders(tenant), Prefer: 'return=minimal' },
          body: JSON.stringify({ reminder_sent: true }),
          signal: AbortSignal.timeout(10000),
        }
      );

      return NextResponse.json({ success: true, message: 'Reminder sent' });
    }

    // Create appointment
    if (await rateLimit(ip, 20)) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const { lead_phone, appointment_type, scheduled_at } = body as {
      lead_phone?: string; appointment_type?: string; scheduled_at?: string;
    };

    if (!lead_phone || !appointment_type || !scheduled_at) {
      return NextResponse.json({ error: 'Missing required fields: lead_phone, appointment_type, scheduled_at' }, { status: 400 });
    }

    if (!VALID_TYPES.includes(appointment_type)) {
      return NextResponse.json({ error: `Invalid appointment_type. Must be: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    const scheduledDate = new Date(scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduled_at datetime' }, { status: 400 });
    }

    const appointment = {
      tenant_id: tenant,
      lead_phone: sanitizeInput(lead_phone, 20),
      lead_name: body.lead_name ? sanitizeInput(body.lead_name, 100) : null,
      appointment_type,
      scheduled_at: scheduledDate.toISOString(),
      assigned_to: body.assigned_to ? sanitizeInput(body.assigned_to, 100) : null,
      notes: body.notes ? sanitizeInput(body.notes, 500) : null,
      vehicle_id: body.vehicle_id || null,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments`, {
      method: 'POST',
      headers: { ...supaHeaders(tenant), Prefer: 'return=representation' },
      body: JSON.stringify(appointment),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[appointments] POST failed: HTTP ${res.status}: ${errText}`);
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
    }

    const created = await res.json();
    return NextResponse.json({ success: true, appointment: created[0] }, { status: 201 });
  } catch (err) {
    console.error('[appointments] POST error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const ip = getClientIp(request);
  if (await rateLimit(ip, 30)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const tenant = validateTenant(body.tenant);
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json({ error: 'Missing appointment id' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.status && VALID_STATUSES.includes(body.status)) updates.status = body.status;
    if (body.scheduled_at) {
      const d = new Date(body.scheduled_at);
      if (!isNaN(d.getTime())) updates.scheduled_at = d.toISOString();
    }
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to ? sanitizeInput(body.assigned_to, 100) : null;
    if (body.notes !== undefined) updates.notes = body.notes ? sanitizeInput(body.notes, 500) : null;
    if (body.appointment_type && VALID_TYPES.includes(body.appointment_type)) updates.appointment_type = body.appointment_type;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?id=eq.${id}&tenant_id=eq.${tenant}`,
      {
        method: 'PATCH',
        headers: { ...supaHeaders(tenant), Prefer: 'return=minimal' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.error(`[appointments] PATCH failed: HTTP ${res.status}`);
      return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[appointments] PATCH error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
