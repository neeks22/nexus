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

export default function TodaySchedule({ appointments, onSelectLead }: TodayScheduleProps): React.ReactElement {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
      <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Today&apos;s Schedule</h3>
      {appointments.length === 0 ? (
        <div style={{ color: '#666', fontSize: '13px' }}>No appointments scheduled for today</div>
      ) : (
        appointments.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
              background: a.status === 'confirmed' ? '#10b981' : '#f59e0b',
            }} />
            <span style={{ color: '#8888a0', fontSize: '13px', minWidth: '70px' }}>{formatTime(a.scheduledAt)}</span>
            <span
              onClick={() => onSelectLead(a.leadPhone)}
              style={{ color: '#f0f0f5', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#DC2626')}
              onMouseLeave={e => (e.currentTarget.style.color = '#f0f0f5')}
            >
              {a.leadName || a.leadPhone}
            </span>
            <span style={{
              background: 'rgba(255,255,255,0.06)', color: '#8888a0', fontSize: '11px',
              padding: '2px 8px', borderRadius: '10px', marginLeft: 'auto',
            }}>
              {TYPE_LABELS[a.type] || a.type}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
