'use client';

interface Appointment {
  id: string;
  leadPhone: string;
  leadName: string | null;
  type: string;
  scheduledAt: string;
  status: string;
  reminderSent: boolean;
}

interface TodayScheduleProps {
  appointments: Appointment[];
  onSelectLead: (phone: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  test_drive: 'Test Drive',
  financing: 'Financing',
  trade_appraisal: 'Trade Appraisal',
  general: 'General',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatTypeLabel(raw: string): string {
  if (TYPE_LABELS[raw]) return TYPE_LABELS[raw];
  return raw.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function timeUntil(iso: string, now: number): string | null {
  const deltaMin = Math.round((new Date(iso).getTime() - now) / 60000);
  if (deltaMin < -5) return 'past';
  if (deltaMin < 0) return 'now';
  if (deltaMin === 0) return 'now';
  if (deltaMin < 60) return `in ${deltaMin}m`;
  const h = Math.floor(deltaMin / 60);
  const m = deltaMin % 60;
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
}

export default function TodaySchedule({ appointments, onSelectLead }: TodayScheduleProps): React.ReactElement {
  const now = Date.now();
  const upcoming = appointments.filter(a => new Date(a.scheduledAt).getTime() >= now - 5 * 60000);
  const past = appointments.filter(a => new Date(a.scheduledAt).getTime() < now - 5 * 60000);

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
      <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Today&apos;s Schedule</span>
        <span style={{ color: '#8888a0', fontSize: '12px', fontWeight: 500 }}>
          {appointments.length === 0 ? '0' : `${upcoming.length} upcoming · ${past.length} past`}
        </span>
      </h3>
      {appointments.length === 0 ? (
        <div style={{ color: '#666', fontSize: '13px' }}>No appointments scheduled for today</div>
      ) : (
        [...upcoming, ...past].map(a => {
          const isPast = new Date(a.scheduledAt).getTime() < now - 5 * 60000;
          const until = isPast ? null : timeUntil(a.scheduledAt, now);
          return (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                opacity: isPast ? 0.55 : 1,
              }}
            >
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                background: a.status === 'confirmed' ? '#10b981' : '#f59e0b',
              }} title={a.status === 'confirmed' ? 'Confirmed' : 'Pending confirmation'} />
              <span style={{ color: '#8888a0', fontSize: '13px', minWidth: '70px' }}>{formatTime(a.scheduledAt)}</span>
              {until && (
                <span style={{
                  color: until === 'now' ? '#ef4444' : '#06b6d4',
                  fontSize: '11px', fontWeight: 600, minWidth: '60px',
                }}>{until}</span>
              )}
              <span
                onClick={() => onSelectLead(a.leadPhone)}
                style={{ color: '#f0f0f5', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#DC2626')}
                onMouseLeave={e => (e.currentTarget.style.color = '#f0f0f5')}
              >
                {a.leadName || a.leadPhone}
              </span>
              {a.reminderSent && (
                <span
                  title="Reminder sent"
                  aria-label="Reminder sent"
                  style={{ color: '#10b981', fontSize: '12px', marginLeft: '4px' }}
                >
                  ✓ reminded
                </span>
              )}
              <span style={{
                background: 'rgba(255,255,255,0.06)', color: '#8888a0', fontSize: '11px',
                padding: '2px 8px', borderRadius: '10px', marginLeft: 'auto',
              }}>
                {formatTypeLabel(a.type)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
