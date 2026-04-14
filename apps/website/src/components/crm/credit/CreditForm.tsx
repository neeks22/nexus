'use client';

import { useRef } from 'react';
import type { CustomerProfile } from './types';
import { tierColor, tierLabel } from './scoring-engine';

interface CreditFormProps {
  profile: CustomerProfile;
  setProfile: (p: CustomerProfile | ((prev: CustomerProfile) => CustomerProfile)) => void;
  customerInfo: { first_name: string; last_name: string; phone: string; email: string };
  setCustomerInfo: (c: { first_name: string; last_name: string; phone: string; email: string } | ((prev: { first_name: string; last_name: string; phone: string; email: string }) => { first_name: string; last_name: string; phone: string; email: string })) => void;
  leadMatch: { found: boolean; name?: string; phone?: string } | null;
  searchingLead: boolean;
  notes: string;
  setNotes: (n: string) => void;
  bureauConsent: boolean;
  setBureauConsent: (v: boolean) => void;
  analyzing: boolean;
  aiInsight: string;
  isMobile: boolean;
  onSearchLead: (phone: string) => void;
  onAnalyzeText: (text: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onRunRouting: () => void;
  onReset: () => void;
  styles: {
    page: React.CSSProperties;
    card: React.CSSProperties;
    label: React.CSSProperties;
    input: React.CSSProperties;
    inputSmall: React.CSSProperties;
    select: React.CSSProperties;
    sectionTitle: React.CSSProperties;
    btnPrimary: (enabled: boolean) => React.CSSProperties;
    btnSecondary: React.CSSProperties;
  };
}

export default function CreditForm({
  profile, setProfile, customerInfo, setCustomerInfo,
  leadMatch, searchingLead, notes, setNotes,
  bureauConsent, setBureauConsent, analyzing, aiInsight,
  isMobile, onSearchLead, onAnalyzeText, onFileUpload, onDrop,
  dragOver, setDragOver, onRunRouting, onReset, styles: s,
}: CreditFormProps): React.ReactElement {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div style={s.page}>
      <style>{`
        @keyframes crPulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
        @keyframes crSlide { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        .cr-enter { animation: crSlide .35s ease-out forwards }
        .cr-input:focus { border-color: #DC2626 !important; box-shadow: 0 0 0 3px rgba(220,38,38,.1) !important }
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 16 : 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          <span style={{
            background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
            color: '#fff', width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: isMobile ? 16 : 18,
          }}>C</span>
          <div>
            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#f0f0f5', letterSpacing: '-0.02em' }}>Credit Router</div>
            {!isMobile && <div style={{ fontSize: 12, color: '#55556a' }}>8 lenders &middot; AI bureau analysis &middot; auto-route</div>}
          </div>
        </div>
        <button onClick={onReset} style={s.btnSecondary}>New Application</button>
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 16 : 20 }}>

        {/* LEFT — Bureau Upload + Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* UPLOAD CARD */}
          <div className="cr-enter" style={s.card}>
            <div style={s.sectionTitle}>Credit Bureau Upload</div>

            {/* Consent Notice */}
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 14,
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
            }}>
              <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={bureauConsent}
                  onChange={(e) => setBureauConsent(e.target.checked)}
                  style={{ marginTop: 2, accentColor: '#DC2626', width: 16, height: 16, flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: '#ccc', lineHeight: 1.5 }}>
                  I confirm the client has provided written consent to pull and process their credit information.
                  This data is analyzed by AI, encrypted at rest, and handled in compliance with PIPEDA.
                  No raw bureau files are stored — only the analysis summary is retained.
                </span>
              </label>
            </div>

            <div
              onClick={() => { if (bureauConsent) fileRef.current?.click(); }}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); if (bureauConsent) setDragOver(true); }}
              onDragEnter={(e) => { e.preventDefault(); if (bureauConsent) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{
                border: `2px dashed ${dragOver ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12,
                padding: '36px 24px', textAlign: 'center',
                cursor: bureauConsent ? 'pointer' : 'not-allowed',
                transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
                background: dragOver ? 'rgba(220,38,38,0.06)' : 'rgba(255,255,255,0.02)',
                opacity: bureauConsent ? 1 : 0.4,
              }}
              onMouseEnter={(e) => {
                if (!bureauConsent || dragOver) return;
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                e.currentTarget.style.background = 'rgba(99,102,241,0.04)';
              }}
              onMouseLeave={(e) => {
                if (dragOver) return;
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              </div>
              <div style={{ fontSize: 14, color: '#8888a0', fontWeight: 500 }}>
                {bureauConsent ? 'Drop credit bureau PDF or TXT here' : 'Check consent box above to upload'}
              </div>
              <div style={{ fontSize: 12, color: '#55556a', marginTop: 4 }}>AI will extract score, trades, collections &amp; auto-fill client info</div>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.csv" onChange={onFileUpload} style={{ display: 'none' }} />

            {/* Paste bureau text fallback */}
            {bureauConsent && !analyzing && !aiInsight && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: '#55556a', textAlign: 'center', marginBottom: 6 }}>or paste bureau text below</div>
                <textarea
                  placeholder="Paste raw credit bureau text here..."
                  className="cr-input"
                  style={{ ...s.input, height: 80, resize: 'vertical', fontSize: 12, fontWeight: 400, lineHeight: 1.5 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      const text = (e.target as HTMLTextAreaElement).value.trim();
                      if (text.length > 20) onAnalyzeText(text);
                    }
                  }}
                  onBlur={(e) => {
                    const text = e.target.value.trim();
                    if (text.length > 50) onAnalyzeText(text);
                  }}
                />
                <div style={{ fontSize: 10, color: '#55556a', marginTop: 4 }}>Ctrl+Enter or click away to analyze</div>
              </div>
            )}

            {analyzing && (
              <div style={{ marginTop: 16, padding: 16, background: 'rgba(99,102,241,0.08)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.15)', animation: 'crPulse 1.5s infinite', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid #DC2626', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                <span style={{ fontSize: 13, color: '#8888a0' }}>AI analyzing credit bureau...</span>
              </div>
            )}

            {aiInsight && (
              <div style={{ marginTop: 16, padding: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, maxHeight: 350, overflow: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#DC2626', marginBottom: 8, textTransform: 'uppercase' }}>AI Bureau Analysis</div>
                <pre style={{ fontSize: 13, color: '#8888a0', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>{aiInsight}</pre>
              </div>
            )}
          </div>

          {/* NOTES CARD */}
          <div className="cr-enter" style={{ ...s.card, animationDelay: '0.05s' }}>
            <div style={s.sectionTitle}>Sales Rep Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Customer situation, trade-in details, objections, co-signer info..."
              className="cr-input"
              style={{ ...s.input, height: 140, resize: 'vertical', fontSize: 14, fontWeight: 400, lineHeight: 1.6 }}
            />
          </div>
        </div>

        {/* RIGHT — Customer Info + Profile */}
        <div>
          {/* Customer Info */}
          <div className="cr-enter" style={{ ...s.card, animationDelay: '0.06s', marginBottom: 16 }}>
            <div style={s.sectionTitle}>Customer Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              <div>
                <label style={s.label}>First Name</label>
                <input value={customerInfo.first_name} onChange={(e) => setCustomerInfo({ ...customerInfo, first_name: e.target.value })} placeholder="John" className="cr-input" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Last Name</label>
                <input value={customerInfo.last_name} onChange={(e) => setCustomerInfo({ ...customerInfo, last_name: e.target.value })} placeholder="Smith" className="cr-input" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Phone</label>
                <input value={customerInfo.phone} onChange={(e) => { setCustomerInfo({ ...customerInfo, phone: e.target.value }); onSearchLead(e.target.value); }} placeholder="6131234567" className="cr-input" style={s.input} />
                {searchingLead && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>Searching...</div>}
                {leadMatch && leadMatch.found && <div style={{ fontSize: 11, color: '#10b981', marginTop: 4, fontWeight: 500 }}>Lead found: {leadMatch.name}</div>}
                {leadMatch && !leadMatch.found && customerInfo.phone.replace(/\D/g, '').length >= 10 && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>New lead — will be created automatically</div>}
              </div>
              <div>
                <label style={s.label}>Email</label>
                <input value={customerInfo.email} onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })} placeholder="john@email.com" className="cr-input" style={s.input} />
              </div>
            </div>
          </div>

          {/* Financial Profile */}
          <div className="cr-enter" style={{ ...s.card, animationDelay: '0.08s' }}>
            <div style={s.sectionTitle}>Customer Profile</div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
              <div>
                <label style={s.label}>Beacon / FICO Score</label>
                <input
                  type="number" value={profile.fico}
                  onChange={(e) => setProfile({ ...profile, fico: e.target.value })}
                  placeholder="e.g. 580" className="cr-input" style={s.input}
                />
                {profile.fico && (
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: tierColor(parseInt(profile.fico, 10)), letterSpacing: '0.05em' }}>
                    {tierLabel(parseInt(profile.fico, 10))}
                  </div>
                )}
              </div>
              <div>
                <label style={s.label}>Monthly Income (Gross)</label>
                <input
                  type="number" value={profile.income}
                  onChange={(e) => setProfile({ ...profile, income: e.target.value })}
                  placeholder="e.g. 3500" className="cr-input" style={s.input}
                />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={s.label}>Credit Situation</label>
              <select
                value={profile.situation}
                onChange={(e) => setProfile({ ...profile, situation: e.target.value })}
                className="cr-input" style={s.select}
              >
                <option value="standard">Standard (no BK/Proposal)</option>
                <option value="bankruptcy">Active or Discharged Bankruptcy</option>
                <option value="proposal">Consumer Proposal (Active or Completed)</option>
                <option value="newcomer">Newcomer to Canada / No Credit History</option>
              </select>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  border: profile.selfEmployed ? '1px solid #DC2626' : '1px solid rgba(255,255,255,0.12)',
                  background: profile.selfEmployed ? 'rgba(99,102,241,0.2)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: '200ms',
                }}>
                  {profile.selfEmployed && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
                <input type="checkbox" checked={profile.selfEmployed} onChange={(e) => setProfile({ ...profile, selfEmployed: e.target.checked })} style={{ display: 'none' }} />
                <span style={{ fontSize: 14, color: '#8888a0' }}>Self-Employed</span>
              </label>
            </div>

            {/* Vehicle Details */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 24, paddingTop: 20 }}>
              <div style={{ ...s.label, marginBottom: 14, color: '#55556a' }}>Vehicle Details (optional)</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ ...s.label, fontSize: 10 }}>Year</label>
                  <input type="number" value={profile.vehicleYear} onChange={(e) => setProfile({ ...profile, vehicleYear: e.target.value })} placeholder="2022" className="cr-input" style={s.inputSmall} />
                </div>
                <div>
                  <label style={{ ...s.label, fontSize: 10 }}>Mileage (km)</label>
                  <input type="number" value={profile.vehicleKm} onChange={(e) => setProfile({ ...profile, vehicleKm: e.target.value })} placeholder="85000" className="cr-input" style={s.inputSmall} />
                </div>
                <div>
                  <label style={{ ...s.label, fontSize: 10 }}>Price ($)</label>
                  <input type="number" value={profile.vehiclePrice} onChange={(e) => setProfile({ ...profile, vehiclePrice: e.target.value })} placeholder="22000" className="cr-input" style={s.inputSmall} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div>
                <label style={{ ...s.label, fontSize: 10 }}>Down Payment ($)</label>
                <input type="number" value={profile.downPayment} onChange={(e) => setProfile({ ...profile, downPayment: e.target.value })} placeholder="1000" className="cr-input" style={s.inputSmall} />
              </div>
              <div>
                <label style={{ ...s.label, fontSize: 10 }}>Desired Payment ($/mo)</label>
                <input type="number" value={profile.desiredPayment} onChange={(e) => setProfile({ ...profile, desiredPayment: e.target.value })} placeholder="350" className="cr-input" style={s.inputSmall} />
              </div>
            </div>

            <button
              onClick={onRunRouting}
              disabled={!profile.fico || !profile.income}
              style={{ ...s.btnPrimary(!!(profile.fico && profile.income)), marginTop: 24 }}
            >
              Route to Best Lender
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
