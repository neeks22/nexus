'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import ActivityTimeline from './ActivityTimeline';
import {
  useLeadDetail, useSendSMS, useSendEmail, useUpdateLeadStatus,
  usePostLeadStatus, useDeleteLeadData,
} from '@/hooks/use-lead-detail';
import { GRADE_COLORS } from './tokens';

interface LeadDetailPanelProps {
  tenant: string;
  phone: string;
  onClose: () => void;
}

const STATUSES = ['new', 'contacted', 'appointment', 'showed', 'credit_app', 'approved', 'delivered', 'lost'];

export default function LeadDetailPanel({ tenant, phone, onClose }: LeadDetailPanelProps): React.ReactElement {
  const { lead, timeline, isLoading: loading } = useLeadDetail(tenant, phone);
  const [activeAction, setActiveAction] = useState<'none' | 'sms' | 'email'>('none');
  const [messageText, setMessageText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const smsMutation = useSendSMS(tenant);
  const emailMutation = useSendEmail(tenant);
  const statusMutation = useUpdateLeadStatus(tenant);
  const postStatusMutation = usePostLeadStatus(tenant);
  const deleteMutation = useDeleteLeadData(tenant);

  const sending = smsMutation.isPending || emailMutation.isPending;
  const statusUpdating = statusMutation.isPending;

  const showSuccess = useCallback((msg: string) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSendSuccess(msg);
    successTimerRef.current = setTimeout(() => setSendSuccess(''), 3000);
  }, []);

  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

  async function sendSMS(): Promise<void> {
    if (!messageText.trim() || sending) return;
    try {
      await smsMutation.mutateAsync({ to: phone, body: messageText.trim() });
      showSuccess('SMS sent!');
      setMessageText('');
      setActiveAction('none');
    } catch (err) {
      console.error('[LeadDetail] SMS send error:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      alert('Failed to send SMS');
    }
  }

  async function sendEmail(): Promise<void> {
    if (!emailBody.trim() || !lead?.email || sending) return;
    try {
      await emailMutation.mutateAsync({ email: lead.email, subject: emailSubject || 'Following up', body: emailBody.trim() });
      showSuccess('Email sent!');
      setEmailSubject('');
      setEmailBody('');
      setActiveAction('none');
    } catch (err) {
      console.error('[LeadDetail] Email send error:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      alert('Failed to send email');
    }
  }

  async function updateStatus(newStatus: string): Promise<void> {
    try {
      await statusMutation.mutateAsync({ phone, status: newStatus });
    } catch (err) {
      console.error('[LeadDetail] Status update error:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      alert('Failed to update status — reverted. Please retry.');
    }
  }

  // Check if agent is paused for this lead (HOT_PAUSED or manually AGENT_PAUSED)
  const isAgentPaused = (() => {
    const statuses = timeline.filter(e => ['HOT_PAUSED', 'AGENT_PAUSED', 'AI_RESUMED'].includes(e.content) && e.role === 'system');
    if (statuses.length === 0) return false;
    const latest = statuses.sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime())[0];
    return latest.content !== 'AI_RESUMED';
  })();
  const pauseReason = timeline.filter(e => ['HOT_PAUSED', 'AGENT_PAUSED'].includes(e.content))
    .sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime())[0]?.content;

  async function pauseAgent(): Promise<void> {
    try {
      await postStatusMutation.mutateAsync({ phone, type: 'status', content: 'AGENT_PAUSED' });
      showSuccess('Agent paused — manual mode');
    } catch (err) {
      console.error('[LeadDetail] Pause Agent error:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      alert('Failed to pause agent');
    }
  }

  async function resumeAgent(): Promise<void> {
    try {
      // Sequence: write status timeline first, then flip the lead status.
      // If the first call fails, the lead status shouldn't flip to 'contacted'.
      await postStatusMutation.mutateAsync({ phone, type: 'status', content: 'AI_RESUMED' });
      await statusMutation.mutateAsync({ phone, status: 'contacted' });
      showSuccess('Agent resumed — auto-replies are back on');
    } catch (err) {
      console.error('[LeadDetail] Resume Agent error:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      alert('Failed to resume agent');
    }
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
            color="#DC2626"
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
          <ActionButton
            label={isAgentPaused ? 'Resume Agent' : 'Pause Agent'}
            color={isAgentPaused ? '#10b981' : '#DC2626'}
            onClick={isAgentPaused ? resumeAgent : pauseAgent}
          />
        </div>

        {/* AGENT PAUSED BANNER */}
        {isAgentPaused && (
          <div style={{
            marginTop: '10px', padding: '12px 16px', borderRadius: '10px',
            background: pauseReason === 'HOT_PAUSED' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
            border: `1px solid ${pauseReason === 'HOT_PAUSED' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ color: pauseReason === 'HOT_PAUSED' ? '#ef4444' : '#f59e0b', fontSize: '14px', fontWeight: 700 }}>
                {pauseReason === 'HOT_PAUSED' ? 'HOT LEAD — Agent Paused' : 'Agent Paused'}
              </div>
              <div style={{ color: pauseReason === 'HOT_PAUSED' ? '#f87171' : '#fbbf24', fontSize: '12px', marginTop: '2px' }}>
                {pauseReason === 'HOT_PAUSED' ? 'Waiting for human transfer.' : 'Manual mode.'} Agent will not auto-reply.
              </div>
            </div>
            <button onClick={resumeAgent} style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: '#10b981', color: '#fff', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>Resume Agent</button>
          </div>
        )}

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
              background: messageText.trim() ? '#DC2626' : '#333', color: '#fff',
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
                        border: lead.status === s ? '2px solid #DC2626' : '1px solid rgba(255,255,255,0.1)',
                        background: lead.status === s ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.03)',
                        color: lead.status === s ? '#f87171' : '#8888a0',
                        cursor: 'pointer', textTransform: 'capitalize',
                      }}
                    >{s.replace('_', ' ')}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <InfoCard label="Vehicle" value={lead.vehicle_type || 'Not specified'} />
                <InfoCard label="Budget" value={lead.budget || 'Not specified'} />
                <InfoCard label="Since" value={new Date(lead.created_at).toLocaleDateString()} />
              </div>

              {/* Credit Grade Card */}
              <CreditGradeCard creditSituation={lead.credit_situation} />
            </div>
          )}

          {/* Activity Timeline */}
          <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>Activity</h3>
          <ActivityTimeline entries={timeline} />

          {/* Delete All Data — PIPEDA Right to Deletion */}
          <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={async () => {
                if (!window.confirm(`Permanently delete ALL data for ${name} (${phone})? This includes all messages, credit routing results, and lead records. This cannot be undone.`)) return;
                try {
                  await deleteMutation.mutateAsync(phone);
                  alert('All customer data has been permanently deleted.');
                  onClose();
                } catch (err) {
                  console.error('[LeadDetail] Delete error:', err instanceof Error ? err.message : 'unknown');
                  Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
                  alert('Failed to delete data.');
                }
              }}
              style={{
                padding: '8px 14px', borderRadius: '6px', fontSize: '12px',
                border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
                color: '#ef4444', cursor: 'pointer', width: '100%',
              }}
            >Delete All Customer Data (PIPEDA)</button>
          </div>
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


function CreditGradeCard({ creditSituation }: { creditSituation: string }): React.ReactElement {
  if (!creditSituation) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '8px',
        padding: '12px',
        marginTop: '4px',
      }}>
        <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Credit</div>
        <div style={{ color: '#8888a0', fontSize: '13px' }}>No credit data — run Credit Router</div>
      </div>
    );
  }

  // Parse "B+ | FICO 680 | Moderate utilization · No missed payments"
  const gradeMatch = creditSituation.match(/^([A-F][+-]?)\s*\|/);
  if (!gradeMatch) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '8px',
        padding: '12px',
        marginTop: '4px',
      }}>
        <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Credit</div>
        <div style={{ color: '#ccc', fontSize: '13px' }}>{creditSituation}</div>
      </div>
    );
  }

  const grade = gradeMatch[1];
  const rest = creditSituation.substring(gradeMatch[0].length).trim();
  const parts = rest.split('|').map(s => s.trim());
  const fico = parts[0] || '';
  const details = parts[1] || '';
  const detailItems = details.split('·').map(s => s.trim()).filter(Boolean);
  const color = GRADE_COLORS[grade] || '#666';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '10px',
      padding: '14px',
      marginTop: '4px',
    }}>
      <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>Credit Score</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{
          background: color,
          color: '#fff',
          padding: '4px 12px',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 800,
          letterSpacing: '0.02em',
        }}>{grade}</span>
        <span style={{ color: '#ccc', fontSize: '14px', fontWeight: 500 }}>{fico}</span>
      </div>
      {detailItems.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {detailItems.map((item, i) => (
            <span key={i} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '11px',
              color: '#aaa',
            }}>{item}</span>
          ))}
        </div>
      )}
    </div>
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
