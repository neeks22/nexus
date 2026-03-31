'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './page.module.css';
import CreditRouter from '../../components/CreditRouter';
import CRMLayout from '../../components/crm/CRMLayout';

/* ============================================
   PASSWORD GATE
   ============================================ */

const TENANT = 'readyride';

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, tenant: TENANT }),
      });
      const data = await res.json();
      if (data.authenticated) {
        sessionStorage.setItem('readyride_auth', data.token || 'true');
        onUnlock();
      } else {
        setError(true);
        setPassword('');
      }
    } catch {
      setError(true);
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #0a0a0f)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        backdropFilter: 'blur(20px)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
        <h2 style={{ color: '#f0f0f5', margin: '0 0 8px', fontSize: '20px' }}>ReadyRide Inbox</h2>
        <p style={{ color: '#8888a0', margin: '0 0 24px', fontSize: '14px' }}>Enter password to access conversations</p>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          placeholder="Password"
          autoFocus
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: error ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: '#f0f0f5',
            fontSize: '16px',
            outline: 'none',
            marginBottom: '16px',
            boxSizing: 'border-box'
          }}
        />
        {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: '-8px 0 12px' }}>Incorrect password</p>}
        <button type="submit" style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          Unlock
        </button>
      </form>
    </div>
  );
}

/* ============================================
   TYPES
   ============================================ */

interface Message {
  sid: string;
  body: string;
  from: string;
  to: string;
  dateSent: string;
  status: string;
  direction: 'inbound' | 'outbound';
}

interface Conversation {
  phone: string;
  leadName: string;
  status: string;
  vehicleInterest: string;
  budget: string;
  creditSituation: string;
  messages: Message[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

/* ============================================
   HELPERS
   ============================================ */

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function getInitials(name: string, phone: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  // Use last 2 digits of phone
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-2);
}

function getStatusClass(status: string): string {
  switch (status?.toLowerCase()) {
    case 'contacted': return styles.statusContacted;
    case 'hot':
    case 'qualified': return styles.statusQualified;
    case 'converted': return styles.statusConverted;
    case 'lost': return styles.statusLost;
    default: return styles.statusNew;
  }
}

function getStatusLabel(status: string): string {
  if (!status) return 'NEW';
  return status.toUpperCase();
}

function shouldShowDateSeparator(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  const current = new Date(messages[index].dateSent).toDateString();
  const previous = new Date(messages[index - 1].dateSent).toDateString();
  return current !== previous;
}

/* ============================================
   SEND ARROW SVG
   ============================================ */

function SendIcon(): React.ReactElement {
  return (
    <svg
      className={styles.sendButtonIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

/* ============================================
   INBOX PAGE COMPONENT
   ============================================ */

export default function InboxPage(): React.ReactElement {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('readyride_auth') === 'true') {
      setAuthed(true);
    }
  }, []);

  if (!authed) {
    return <PasswordGate onUnlock={() => setAuthed(true)} />;
  }

  return (
    <CRMLayout
      tenant="readyride"
      dealerName="ReadyRide"
      inboxContent={<InboxContent />}
      creditRouterContent={<CreditRouter tenant="readyride" />}
    />
  );
}

/* ============================================
   INLINE SVG ICONS
   ============================================ */

function TrashIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function TransferIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function InboxContent(): React.ReactElement {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [archivedPhones, setArchivedPhones] = useState<Set<string>>(new Set());
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [composeText, setComposeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferPhone, setTransferPhone] = useState('6139839834');
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessagePhone, setNewMessagePhone] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingNew, setSendingNew] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLInputElement>(null);

  /* ---- Fetch conversations ---- */
  const fetchConversations = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/messages?tenant=${TENANT}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConversations(data.conversations || []);

      // Update active conversation only if messages changed
      if (activeConversation) {
        const updated = (data.conversations || []).find(
          (c: Conversation) => c.phone === activeConversation.phone
        );
        if (updated && updated.messages.length !== activeConversation.messages.length) {
          setActiveConversation(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.phone]);

  /* ---- Initial load + polling ---- */
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  /* ---- Auto-scroll to bottom ---- */
  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [activeConversation?.phone, activeConversation?.messages?.length]);

  /* ---- Select conversation ---- */
  const selectConversation = (conv: Conversation): void => {
    setActiveConversation(conv);
    setMobileThreadOpen(true);
    setShowTransferForm(false);
    setTransferSuccess(false);
    setTimeout(() => {
      if (threadEndRef.current) {
        threadEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
      composeRef.current?.focus();
    }, 100);
  };

  /* ---- Send message ---- */
  const sendMessage = async (): Promise<void> => {
    if (!composeText.trim() || !activeConversation || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: activeConversation.phone, body: composeText.trim(), tenant: TENANT }),
      });

      if (!res.ok) throw new Error('Failed to send');

      const data = await res.json();
      if (data.success) {
        // Optimistically add message to thread
        const newMsg: Message = {
          sid: data.message.sid,
          body: composeText.trim(),
          from: data.message.from,
          to: activeConversation.phone,
          dateSent: new Date().toISOString(),
          status: data.message.status || 'queued',
          direction: 'outbound',
        };

        setActiveConversation((prev) => {
          if (!prev) return prev;
          return { ...prev, messages: [...prev.messages, newMsg] };
        });

        setConversations((prev) =>
          prev.map((c) =>
            c.phone === activeConversation.phone
              ? {
                  ...c,
                  messages: [...c.messages, newMsg],
                  lastMessage: composeText.trim(),
                  lastMessageTime: new Date().toISOString(),
                }
              : c
          )
        );

        setComposeText('');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ---- Archive (delete from view) ---- */
  const archiveConversation = (phone: string, e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!window.confirm('Remove this conversation?')) return;
    setArchivedPhones((prev) => new Set(prev).add(phone));
    if (activeConversation?.phone === phone) {
      setActiveConversation(null);
      setMobileThreadOpen(false);
    }
  };

  /* ---- Transfer to rep ---- */
  const transferToRep = async (): Promise<void> => {
    if (!activeConversation || transferring) return;

    setTransferring(true);
    try {
      const leadName = activeConversation.leadName || 'Unknown';
      const leadPhone = activeConversation.phone;
      const messagesText = activeConversation.messages
        .map((msg) => {
          const who = msg.direction === 'inbound' ? `${leadName}` : 'Nexus AI';
          return `${who}: ${msg.body}`;
        })
        .join('\n');

      const body = `LEAD TRANSFER from Nexus AI\n\nLead: ${leadName} (${leadPhone})\n\nConversation:\n${messagesText}\n\nPlease follow up with this lead.`;

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: transferPhone, body, tenant: TENANT }),
      });

      if (!res.ok) throw new Error('Failed to transfer');
      const data = await res.json();
      if (data.success) {
        setTransferSuccess(true);
        setTimeout(() => {
          setTransferSuccess(false);
          setShowTransferForm(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to transfer conversation:', err);
      alert('Failed to send transfer. Please try again.');
    } finally {
      setTransferring(false);
    }
  };

  /* ---- Send new message to any number ---- */
  const sendNewMessage = async (): Promise<void> => {
    if (!newMessagePhone.trim() || !newMessageText.trim() || sendingNew) return;
    setSendingNew(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: newMessagePhone.trim(), body: newMessageText.trim(), tenant: TENANT }),
      });
      if (!res.ok) throw new Error('Failed to send');
      const data = await res.json();
      if (data.success) {
        setNewMessagePhone('');
        setNewMessageText('');
        setShowNewMessage(false);
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send new message:', err);
      alert('Failed to send message. Check the phone number and try again.');
    } finally {
      setSendingNew(false);
    }
  };

  /* ---- Filter conversations ---- */
  const filtered = conversations.filter((conv) => {
    if (archivedPhones.has(conv.phone)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.leadName.toLowerCase().includes(q) ||
      conv.phone.includes(q) ||
      conv.lastMessage.toLowerCase().includes(q)
    );
  });

  /* ---- Render ---- */
  return (
    <div className={styles.page}>
      <div className={styles.inboxContainer}>
        {/* Header */}
        <div className={styles.inboxHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '16px'
            }}>R</span>
            <span style={{ color: '#f0f0f5', fontWeight: 600, fontSize: '16px' }}>ReadyRide</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowNewMessage(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              + New Message
            </button>
            <div className={styles.connectionStatus}>
              <span className={styles.statusDot} />
              Live
            </div>
          </div>
        </div>

        {/* New Message Modal */}
        {showNewMessage && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }} onClick={() => setShowNewMessage(false)}>
            <div style={{
              background: '#1a1a2e', borderRadius: '16px', padding: '32px',
              width: '100%', maxWidth: '440px', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ color: '#f0f0f5', margin: '0 0 20px', fontSize: '18px' }}>New Message</h3>
              <input
                type="tel"
                placeholder="Phone number (e.g. 6131234567)"
                value={newMessagePhone}
                onChange={(e) => setNewMessagePhone(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                  color: '#f0f0f5', fontSize: '15px', outline: 'none', marginBottom: '12px',
                  boxSizing: 'border-box'
                }}
              />
              <textarea
                placeholder="Type your message..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                rows={4}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                  color: '#f0f0f5', fontSize: '15px', outline: 'none', marginBottom: '16px',
                  boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit'
                }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowNewMessage(false)}
                  style={{
                    padding: '10px 20px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                    color: '#8888a0', fontSize: '14px', cursor: 'pointer'
                  }}
                >Cancel</button>
                <button
                  onClick={sendNewMessage}
                  disabled={!newMessagePhone.trim() || !newMessageText.trim() || sendingNew}
                  style={{
                    padding: '10px 24px', borderRadius: '8px', border: 'none',
                    background: (!newMessagePhone.trim() || !newMessageText.trim()) ? '#333' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    opacity: (!newMessagePhone.trim() || !newMessageText.trim()) ? 0.5 : 1
                  }}
                >{sendingNew ? 'Sending...' : 'Send'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Split Layout */}
        <div className={styles.splitLayout}>
          {/* LEFT PANEL — Conversation List */}
          <div
            className={`${styles.leftPanel} ${mobileThreadOpen ? styles.leftPanelHidden : ''}`}
          >
            <div className={styles.searchContainer}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.conversationList}>
              {loading ? (
                <div className={styles.loadingState}>
                  <span className={styles.spinner} />
                  Loading conversations...
                </div>
              ) : filtered.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyText}>
                    {searchQuery
                      ? 'No conversations match your search.'
                      : 'No conversations yet. Send your first SMS campaign to get started.'}
                  </div>
                </div>
              ) : (
                filtered.map((conv) => {
                  const allText = conv.messages.map((m: Message) => m.body).join(' ').toLowerCase();
                  const hotKeywords = /\b(yes|yeah|interested|ready|come in|test drive|appointment|schedule|book|buy|approved|check|let.s do it|sign me up|i.m in|deal|trade.?in|license|permis|drivers? licen[cs]e)\b/i;
                  const isHot = conv.messages.some((m: Message) => m.direction === 'inbound' && hotKeywords.test(m.body));
                  const hasID = /\b(driver.?s? licen[cs]e|id|identification|permis de conduire|piece d.identit)\b/i.test(allText);

                  return (
                  <div
                    key={conv.phone}
                    className={`${styles.conversationItem} ${
                      activeConversation?.phone === conv.phone ? styles.conversationItemActive : ''
                    }`}
                    onClick={() => selectConversation(conv)}
                    style={isHot ? { borderLeft: '3px solid #ef4444', background: 'rgba(239,68,68,0.06)' } : undefined}
                  >
                    <div className={styles.avatar} style={isHot ? { background: '#ef4444', color: '#fff' } : undefined}>
                      {hasID ? '✓' : getInitials(conv.leadName, conv.phone)}
                    </div>
                    <div className={styles.conversationInfo}>
                      <div className={styles.conversationName} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={isHot ? { color: '#ef4444', fontWeight: 700 } : undefined}>{conv.leadName || conv.phone}</span>
                        {isHot && <span style={{ background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: 700 }}>HOT</span>}
                        {hasID && <span style={{ background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: 700 }}>ID</span>}
                      </div>
                      {conv.leadName && (
                        <div className={styles.conversationPhone} style={isHot ? { color: '#ef4444' } : undefined}>{conv.phone}</div>
                      )}
                      <div className={styles.conversationPreview}>{conv.lastMessage}</div>
                    </div>
                    <div className={styles.conversationMeta}>
                      <span className={styles.conversationTime}>
                        {formatRelativeTime(conv.lastMessageTime)}
                      </span>
                      {conv.unreadCount > 0 && <span className={styles.unreadBadge} />}
                      <button
                        className={styles.deleteButton}
                        title="Remove conversation"
                        onClick={(e) => archiveConversation(conv.phone, e)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  );
                })

              )}
            </div>
          </div>

          {/* RIGHT PANEL — Thread */}
          <div
            className={`${styles.rightPanel} ${mobileThreadOpen ? styles.rightPanelOpen : ''}`}
          >
            {!activeConversation ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>&#x1F4AC;</div>
                <div className={styles.emptyTitle}>Select a conversation</div>
                <div className={styles.emptyText}>
                  Choose a conversation from the left to view messages and reply.
                </div>
              </div>
            ) : (
              <>
                {/* Thread Header */}
                <div className={styles.threadHeader}>
                  <button
                    className={styles.backButton}
                    onClick={() => setMobileThreadOpen(false)}
                  >
                    &#8592; Back
                  </button>
                  <div className={styles.avatar}>
                    {getInitials(activeConversation.leadName, activeConversation.phone)}
                  </div>
                  <div className={styles.threadHeaderInfo}>
                    <div className={styles.threadName}>
                      {activeConversation.leadName || activeConversation.phone}
                      <span
                        className={`${styles.statusBadge} ${getStatusClass(activeConversation.status)}`}
                      >
                        {getStatusLabel(activeConversation.status)}
                      </span>
                    </div>
                    <div className={styles.threadPhone}>{activeConversation.phone}</div>
                    {(activeConversation.vehicleInterest ||
                      activeConversation.budget ||
                      activeConversation.creditSituation) && (
                      <div className={styles.threadDetails}>
                        {activeConversation.vehicleInterest && (
                          <span className={styles.threadDetailTag}>
                            {activeConversation.vehicleInterest}
                          </span>
                        )}
                        {activeConversation.budget && (
                          <span className={styles.threadDetailTag}>
                            {activeConversation.budget}
                          </span>
                        )}
                        {activeConversation.creditSituation && (
                          <span className={styles.threadDetailTag}>
                            Credit: {activeConversation.creditSituation}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    className={styles.transferButton}
                    onClick={() => { setShowTransferForm((prev) => !prev); setTransferSuccess(false); }}
                    title="Transfer to Rep"
                  >
                    <TransferIcon />
                    <span>Transfer to Rep</span>
                  </button>
                </div>

                {/* Transfer Form */}
                {showTransferForm && (
                  <div className={styles.transferForm}>
                    {transferSuccess ? (
                      <div className={styles.transferSuccess}>Transferred!</div>
                    ) : (
                      <>
                        <label className={styles.transferLabel}>Send conversation to:</label>
                        <div className={styles.transferInputRow}>
                          <input
                            type="tel"
                            className={styles.transferInput}
                            value={transferPhone}
                            onChange={(e) => setTransferPhone(e.target.value)}
                            placeholder="Phone number"
                          />
                          <button
                            className={styles.transferSendButton}
                            onClick={transferToRep}
                            disabled={transferring || !transferPhone.trim()}
                          >
                            {transferring ? 'Sending...' : 'Send Transfer'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className={styles.messageThread}>
                  {activeConversation.messages.map((msg, idx) => (
                    <div key={msg.sid || idx}>
                      {shouldShowDateSeparator(activeConversation.messages, idx) && (
                        <div className={styles.dateSeparator}>
                          <span className={styles.dateSeparatorText}>
                            {formatDateSeparator(msg.dateSent)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`${styles.messageRow} ${
                          msg.direction === 'outbound'
                            ? styles.messageRowOutbound
                            : styles.messageRowInbound
                        }`}
                      >
                        <div>
                          <div
                            className={`${styles.messageBubble} ${
                              msg.direction === 'outbound'
                                ? styles.bubbleOutbound
                                : styles.bubbleInbound
                            }`}
                          >
                            {msg.body}
                          </div>
                          <div
                            className={`${styles.messageInfo} ${
                              msg.direction === 'outbound'
                                ? styles.messageInfoOutbound
                                : styles.messageInfoInbound
                            }`}
                          >
                            <span className={styles.messageTime}>
                              {formatMessageTime(msg.dateSent)}
                            </span>
                            {msg.direction === 'outbound' && (
                              <span className={styles.messageStatus}>
                                {msg.status === 'delivered'
                                  ? 'Delivered'
                                  : msg.status === 'read'
                                    ? 'Read'
                                    : msg.status === 'sent'
                                      ? 'Sent'
                                      : msg.status === 'failed'
                                        ? 'Failed'
                                        : msg.status === 'undelivered'
                                          ? 'Undelivered'
                                          : 'Sending...'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={threadEndRef} />
                </div>

                {/* Compose */}
                <div className={styles.composeBar}>
                  <input
                    ref={composeRef}
                    type="text"
                    className={styles.composeInput}
                    placeholder="Type a message..."
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                  />
                  <button
                    className={styles.sendButton}
                    onClick={sendMessage}
                    disabled={!composeText.trim() || sending}
                    title="Send message"
                  >
                    <SendIcon />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
