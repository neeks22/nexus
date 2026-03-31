'use client';

import { useState, useEffect, useRef } from 'react';
import ActivityTimeline from './ActivityTimeline';

interface LeadDetailPanelProps {
  tenant: string;
  phone: string;
  onClose: () => void;
}

interface LeadData {
  phone: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  vehicle_type: string;
  credit_situation: string;
  budget: string;
  created_at: string;
}

interface TimelineEntry {
  id: string;
  time: string;
  role: string;
  channel: string;
  content: string;
}

const STATUSES = ['new', 'contacted', 'appointment', 'showed', 'credit_app', 'approved', 'delivered', 'lost'];

export default function LeadDetailPanel({ tenant, phone, onClose }: LeadDetailPanelProps): React.ReactElement {
  const [lead, setLead] = useState<LeadData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<'none' | 'sms' | 'email'>('none');
  const [messageText, setMessageText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchData();
  }, [tenant, phone]);

  async function fetchData(): Promise<void> {
    try {
      const SUPABASE_URL = '/api/dashboard'; // reuse to get supabase URL indirectly
      const [leadRes, timelineRes] = await Promise.all([
        fetch(`/api/leads?tenant=${tenant}&search=${encodeURIComponent(phone)}&limit=1`),
        fetch(`/api/messages?tenant=${tenant}&phone=${encodeURIComponent(phone)}`),
      ]);

      if (leadRes.ok) {
        const data = await leadRes.json();
        if (data.leads?.length > 0) setLead(data.leads[0]);
      }

      // SMS messages
      const smsEntries: TimelineEntry[] = [];
      if (timelineRes.ok) {
        const data = await timelineRes.json();
        const conv = data.conversation;
        if (conv?.messages) {
          conv.messages.forEach((m: { sid: string; dateSent: string; direction: string; body: string }, i: number) => {
            smsEntries.push({
              id: m.sid || `sms-${i}`,
              time: new Date(m.dateSent).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
              role: m.direction === 'inbound' ? 'customer' : 'ai',
              channel: 'sms',
              content: m.body,
            });
          });
        }
      }

      // CRM activity entries (credit routing, notes, etc.) from Supabase
      const crmEntries: TimelineEntry[] = [];
      try {
        const crmRes = await fetch(`/api/leads?tenant=${tenant}&phone=${encodeURIComponent(phone)}&activity=true`);
        if (crmRes.ok) {
          const crmData = await crmRes.json();
          if (crmData.activity) {
            crmData.activity.forEach((a: { id: string; created_at: string; role: string; channel: string; content: string }, i: number) => {
              crmEntries.push({
                id: a.id || `crm-${i}`,
                time: new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                role: a.role || 'system',
                channel: a.channel || 'crm',
                content: a.content,
              });
            });
          }
        }
      } catch { /* activity fetch is optional */ }

      // Merge and sort by time (newest first for display, but timeline shows oldest first)
      const allEntries = [...smsEntries, ...crmEntries].sort((a, b) => {
        const ta = new Date(a.time).getTime() || 0;
        const tb = new Date(b.time).getTime() || 0;
        return ta - tb;
      });

      setTimeline(allEntries);
    } catch (err) {
      console.error('Lead detail fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function sendSMS(): Promise<void> {
    if (!messageText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, body: messageText.trim(), tenant }),
      });
      if (res.ok) {
        setSendSuccess('SMS sent!');
        setMessageText('');
        setActiveAction('none');
        setTimeout(() => setSendSuccess(''), 3000);
        fetchData();
      } else {
        alert('Failed to send SMS');
      }
    } catch { alert('Failed to send SMS'); }
    finally { setSending(false); }
  }

  async function sendEmail(): Promise<void> {
    if (!emailBody.trim() || !lead?.email || sending) return;
    setSending(true);
    try {
      // Use the existing messages API to send — or open mailto as fallback
      window.open(`mailto:${lead.email}?subject=${encodeURIComponent(emailSubject || 'Following up')}&body=${encodeURIComponent(emailBody)}`, '_blank');
      setSendSuccess('Email client opened!');
      setEmailSubject('');
      setEmailBody('');
      setActiveAction('none');
      setTimeout(() => setSendSuccess(''), 3000);
    } catch { alert('Failed to open email'); }
    finally { setSending(false); }
  }

  async function updateStatus(newStatus: string): Promise<void> {
    setStatusUpdating(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, status: newStatus, tenant }),
      });
      if (res.ok && lead) {
        setLead({ ...lead, status: newStatus });
      }
    } catch { console.error('Failed to update status'); }
    finally { setStatusUpdating(false); }
  }

  const name = lead ? [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown' : phone;

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: '520px',
      maxWidth: '100vw',
      background: '#12121f',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ color: '#f0f0f5', fontSize: '18px', fontWeight: 600 }}>{name}</div>
            <div style={{ color: '#8888a0', fontSize: '13px' }}>{phone}{lead?.email ? ` | ${lead.email}` : ''}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: '#8888a0', padding: '6px 12px', cursor: 'pointer', fontSize: '13px',
          }}>Close</button>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <ActionButton
            label="Send SMS"
            color="#6366f1"
            active={activeAction === 'sms'}
            onClick={() => { setActiveAction(activeAction === 'sms' ? 'none' : 'sms'); setTimeout(() => inputRef.current?.focus(), 100); }}
          />
          <ActionButton
            label="Send Email"
            color="#f59e0b"
            active={activeAction === 'email'}
            disabled={!lead?.email}
            onClick={() => setActiveAction(activeAction === 'email' ? 'none' : 'email')}
          />
          <ActionButton
            label="Call"
            color="#10b981"
            onClick={() => window.open(`tel:${phone}`, '_self')}
          />
        </div>

        {/* Success toast */}
        {sendSuccess && (
          <div style={{
            marginTop: '8px', padding: '8px 12px', borderRadius: '8px',
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
            color: '#10b981', fontSize: '13px', fontWeight: 500,
          }}>{sendSuccess}</div>
        )}
      </div>

      {/* SMS Compose */}
      {activeAction === 'sms' && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(99,102,241,0.05)' }}>
          <textarea
            ref={inputRef}
            placeholder="Type your SMS message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              color: '#f0f0f5', fontSize: '14px', outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '8px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => setActiveAction('none')} style={{
              padding: '8px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#8888a0', fontSize: '13px', cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={sendSMS} disabled={!messageText.trim() || sending} style={{
              padding: '8px 18px', borderRadius: '6px', border: 'none',
              background: messageText.trim() ? '#6366f1' : '#333', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>{sending ? 'Sending...' : 'Send SMS'}</button>
          </div>
        </div>
      )}

      {/* Email Compose */}
      {activeAction === 'email' && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(245,158,11,0.05)' }}>
          <div style={{ color: '#8888a0', fontSize: '12px', marginBottom: '6px' }}>To: {lead?.email}</div>
          <input
            placeholder="Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              color: '#f0f0f5', fontSize: '14px', outline: 'none', marginBottom: '8px',
              boxSizing: 'border-box',
            }}
          />
          <textarea
            placeholder="Email body..."
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            rows={4}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              color: '#f0f0f5', fontSize: '14px', outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '8px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => setActiveAction('none')} style={{
              padding: '8px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#8888a0', fontSize: '13px', cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={sendEmail} disabled={!emailBody.trim() || sending} style={{
              padding: '8px 18px', borderRadius: '6px', border: 'none',
              background: emailBody.trim() ? '#f59e0b' : '#333', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>{sending ? 'Sending...' : 'Send Email'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Lead Info Cards */}
          {lead && (
            <div style={{ marginBottom: '20px' }}>
              {/* Status Selector */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>Status</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      disabled={statusUpdating}
                      style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500,
                        border: lead.status === s ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                        background: lead.status === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                        color: lead.status === s ? '#818cf8' : '#8888a0',
                        cursor: 'pointer', textTransform: 'capitalize',
                      }}
                    >{s.replace('_', ' ')}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <InfoCard label="Vehicle" value={lead.vehicle_type || 'Not specified'} />
                <InfoCard label="Credit" value={lead.credit_situation || 'Unknown'} />
                <InfoCard label="Budget" value={lead.budget || 'Not specified'} />
                <InfoCard label="Since" value={new Date(lead.created_at).toLocaleDateString()} />
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>Activity</h3>
          <ActivityTimeline entries={timeline} />
        </div>
      )}
    </div>
  );
}

function ActionButton({ label, color, active, disabled, onClick }: {
  label: string; color: string; active?: boolean; disabled?: boolean; onClick: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
        border: active ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
        background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
        color: disabled ? '#444' : active ? color : '#ccc',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        opacity: disabled ? 0.4 : 1,
      }}
    >{label}</button>
  );
}

function InfoCard({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '8px',
      padding: '10px 12px',
    }}>
      <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#ccc', fontSize: '13px', textTransform: 'capitalize' }}>{value}</div>
    </div>
  );
}
