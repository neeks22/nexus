'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import useIsMobile from './useIsMobile';
import { useAppointments, useCreateAppointment, useUpdateAppointment, useSendReminder, type Appointment } from '@/hooks/use-appointments';
import { APPOINTMENT_STATUS_COLORS as STATUS_COLORS } from './tokens';
import { inputStyle } from './styles';

interface AppointmentsTabProps {
  tenant: string;
  onSelectLead: (phone: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  test_drive: 'Test Drive',
  financing: 'Financing',
  trade_appraisal: 'Trade Appraisal',
  general: 'General',
};

function formatDateTime(iso: string): { date: string; time: string; full: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const full = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + time;
  return { date, time, full };
}

function isOverdue(appt: Appointment): boolean {
  return new Date(appt.scheduled_at) < new Date() && (appt.status === 'scheduled' || appt.status === 'confirmed');
}

export default function AppointmentsTab({ tenant, onSelectLead }: AppointmentsTabProps): React.ReactElement {
  const isMobile = useIsMobile();
  const [view, setView] = useState<'today' | 'upcoming' | 'all'>('upcoming');
  const [showCreate, setShowCreate] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [newAppt, setNewAppt] = useState({ lead_phone: '', lead_name: '', appointment_type: 'general', scheduled_at: '', assigned_to: '', notes: '' });

  const { data: appointments = [], isLoading, isError, refetch } = useAppointments(tenant, { view });
  const createMutation = useCreateAppointment(tenant);
  const updateMutation = useUpdateAppointment(tenant);
  const reminderMutation = useSendReminder(tenant);

  const handleCreate = async (): Promise<void> => {
    if (!newAppt.lead_phone || !newAppt.scheduled_at) return;
    try {
      await createMutation.mutateAsync(newAppt);
      setShowCreate(false);
      setNewAppt({ lead_phone: '', lead_name: '', appointment_type: 'general', scheduled_at: '', assigned_to: '', notes: '' });
    } catch (err) {
      console.error('Failed to create appointment:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      alert('Failed to create appointment');
    }
  };

  const updateStatus = async (id: string, status: string): Promise<void> => {
    try {
      await updateMutation.mutateAsync({ id, status });
    } catch (err) {
      console.error('Failed to update appointment:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const sendReminder = async (id: string): Promise<void> => {
    setSendingReminderId(id);
    try {
      await reminderMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to send reminder:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSendingReminderId(null);
    }
  };

  const creating = createMutation.isPending;

  if (isLoading) {
    return <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading appointments...</div>;
  }

  if (isError) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#ef4444', fontSize: '16px', marginBottom: '8px' }}>Failed to load appointments</div>
        <div style={{ color: '#8888a0', fontSize: '13px', marginBottom: '16px' }}>Check your connection and try again.</div>
        <button
          onClick={() => refetch()}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', cursor: 'pointer' }}
        >Retry</button>
      </div>
    );
  }

  const counts = { scheduled: 0, confirmed: 0, completed: 0, no_show: 0, cancelled: 0 };
  appointments.forEach(a => { if (counts[a.status as keyof typeof counts] !== undefined) counts[a.status as keyof typeof counts]++; });

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', height: isMobile ? 'calc(100vh - 116px)' : 'calc(100vh - 52px)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#f0f0f5', fontSize: isMobile ? '18px' : '20px', fontWeight: 700, margin: 0 }}>Appointments</h1>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '10px 20px', background: '#DC2626', color: '#fff', border: 'none',
          borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>+ New Appointment</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['scheduled', 'confirmed', 'completed', 'no_show'] as const).map(s => (
          <div key={s} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 20px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: STATUS_COLORS[s], fontWeight: 700, fontSize: '20px' }}>{counts[s]}</span>
            <span style={{ color: '#8888a0', fontSize: '13px', marginLeft: '8px' }}>{s.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['today', 'upcoming', 'all'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
            border: view === v ? '1px solid #DC2626' : '1px solid rgba(255,255,255,0.1)',
            background: view === v ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.03)',
            color: view === v ? '#f87171' : '#8888a0',
          }}>{v === 'today' ? 'Today' : v === 'upcoming' ? 'Upcoming' : 'All'}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr 0.8fr 1.2fr', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', color: '#8888a0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Date / Time</span><span>Lead</span><span>Type</span><span>Assigned To</span><span>Status</span><span>Actions</span>
          </div>
        )}
        {appointments.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8888a0' }}>No appointments found.</div>
        ) : appointments.map(a => {
          const { date, time } = formatDateTime(a.scheduled_at);
          const overdue = isOverdue(a);
          return isMobile ? (
            <div key={a.id} style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: overdue ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span onClick={() => onSelectLead(a.lead_phone)} style={{ color: '#f0f0f5', fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}>
                  {a.lead_name || a.lead_phone}
                </span>
                <select value={a.status} onChange={e => updateStatus(a.id, e.target.value)}
                  style={{ background: 'transparent', border: `1px solid ${STATUS_COLORS[a.status] || '#666'}40`, borderRadius: '6px', color: STATUS_COLORS[a.status] || '#666', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="no_show">No Show</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: '#8888a0', fontSize: '12px' }}>
                <span style={{ color: overdue ? '#ef4444' : '#ccc', fontWeight: 500 }}>{date} {time}{overdue ? ' OVERDUE' : ''}</span>
                <span>{TYPE_LABELS[a.appointment_type] || a.appointment_type}</span>
                {!a.reminder_sent && (a.status === 'scheduled' || a.status === 'confirmed') && (
                  <button onClick={() => sendReminder(a.id)} disabled={sendingReminderId === a.id}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#ccc', fontSize: '11px', cursor: 'pointer', marginLeft: 'auto' }}>
                    {sendingReminderId === a.id ? '...' : 'Remind'}
                  </button>
                )}
                {a.reminder_sent && <span style={{ color: '#10b981', fontSize: '11px', marginLeft: 'auto' }}>Reminded</span>}
              </div>
            </div>
          ) : (
            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr 0.8fr 1.2fr', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', background: overdue ? 'rgba(239,68,68,0.05)' : 'transparent', transition: 'background 0.15s' }}
              onMouseEnter={e => { if (!overdue) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { if (!overdue) e.currentTarget.style.background = 'transparent'; }}>
              <div>
                <div style={{ color: overdue ? '#ef4444' : '#f0f0f5', fontWeight: 600, fontSize: '14px' }}>{date}</div>
                <div style={{ color: overdue ? '#ef4444' : '#8888a0', fontSize: '12px' }}>{time}{overdue ? ' — OVERDUE' : ''}</div>
              </div>
              <div>
                <span onClick={() => onSelectLead(a.lead_phone)} style={{ color: '#f0f0f5', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#DC2626')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#f0f0f5')}>
                  {a.lead_name || a.lead_phone}
                </span>
                {a.lead_name && <div style={{ color: '#8888a0', fontSize: '12px' }}>{a.lead_phone}</div>}
              </div>
              <span style={{ color: '#ccc', fontSize: '13px' }}>{TYPE_LABELS[a.appointment_type] || a.appointment_type}</span>
              <span style={{ color: '#ccc', fontSize: '13px' }}>{a.assigned_to || '—'}</span>
              <select value={a.status} onChange={e => updateStatus(a.id, e.target.value)}
                style={{ background: 'transparent', border: `1px solid ${STATUS_COLORS[a.status] || '#666'}40`, borderRadius: '6px', color: STATUS_COLORS[a.status] || '#666', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="no_show">No Show</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <div style={{ display: 'flex', gap: '6px' }}>
                {!a.reminder_sent && (a.status === 'scheduled' || a.status === 'confirmed') && (
                  <button onClick={() => sendReminder(a.id)} disabled={sendingReminderId === a.id}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#ccc', fontSize: '11px', cursor: 'pointer', opacity: sendingReminderId === a.id ? 0.5 : 1 }}>
                    {sendingReminderId === a.id ? 'Sending...' : 'Remind'}
                  </button>
                )}
                {a.reminder_sent && <span style={{ color: '#10b981', fontSize: '11px', padding: '4px 0' }}>Reminded</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0 16px' : 0, backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCreate(false)}>
          <div style={{ background: '#1a1a2e', borderRadius: '16px', padding: isMobile ? '20px' : '32px', width: '100%', maxWidth: '480px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: isMobile ? '90vh' : undefined, overflowY: isMobile ? 'auto' : undefined }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#f0f0f5', fontSize: '18px', fontWeight: 700, margin: '0 0 20px 0' }}>New Appointment</h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Phone *</label><input value={newAppt.lead_phone} onChange={e => setNewAppt({ ...newAppt, lead_phone: e.target.value })} style={inputStyle} placeholder="+16131234567" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Name</label><input value={newAppt.lead_name} onChange={e => setNewAppt({ ...newAppt, lead_name: e.target.value })} style={inputStyle} placeholder="John Smith" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Type *</label>
                <select value={newAppt.appointment_type} onChange={e => setNewAppt({ ...newAppt, appointment_type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="general">General</option>
                  <option value="test_drive">Test Drive</option>
                  <option value="financing">Financing</option>
                  <option value="trade_appraisal">Trade Appraisal</option>
                </select>
              </div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Assigned To</label><input value={newAppt.assigned_to} onChange={e => setNewAppt({ ...newAppt, assigned_to: e.target.value })} style={inputStyle} placeholder="Nico" /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ color: '#8888a0', fontSize: '12px' }}>Date & Time *</label><input type="datetime-local" value={newAppt.scheduled_at} onChange={e => setNewAppt({ ...newAppt, scheduled_at: e.target.value })} style={inputStyle} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ color: '#8888a0', fontSize: '12px' }}>Notes</label><input value={newAppt.notes} onChange={e => setNewAppt({ ...newAppt, notes: e.target.value })} style={inputStyle} placeholder="Optional notes..." /></div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              <button onClick={handleCreate} disabled={!newAppt.lead_phone || !newAppt.scheduled_at || creating}
                style={{ padding: '10px 20px', background: (!newAppt.lead_phone || !newAppt.scheduled_at) ? '#333' : '#DC2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: creating ? 0.6 : 1 }}>
                {creating ? 'Creating...' : 'Create Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
