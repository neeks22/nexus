'use client';

import { useState, useRef } from 'react';
import * as Sentry from '@sentry/nextjs';
import useIsMobile from './crm/useIsMobile';
import type { CustomerProfile, ScoredResult, ScoringProfile } from './crm/credit/types';
import { LENDER_DB, scoreLender, computeCreditGrade } from './crm/credit/scoring-engine';
import CreditForm from './crm/credit/CreditForm';
import CreditResults from './crm/credit/CreditResults';

export default function CreditRouter({ tenant, customerPhone }: { tenant?: string; customerPhone?: string } = {}): React.ReactElement {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<'input' | 'results'>('input');
  const [analyzing, setAnalyzing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile>({
    fico: '', income: '', situation: 'standard', selfEmployed: false,
    downPayment: '', desiredPayment: '', vehicleYear: '', vehicleKm: '', vehiclePrice: '',
  });
  const [customerInfo, setCustomerInfo] = useState({ first_name: '', last_name: '', phone: customerPhone || '', email: '' });
  const [leadMatch, setLeadMatch] = useState<{ found: boolean; name?: string; phone?: string } | null>(null);
  const [searchingLead, setSearchingLead] = useState(false);
  const [notes, setNotes] = useState('');
  const [bureauConsent, setBureauConsent] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState<ScoredResult[]>([]);
  const [aiInsight, setAiInsight] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchLead = (phone: string): void => {
    if (!tenant || phone.replace(/\D/g, '').length < 10) {
      setLeadMatch(null);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearchingLead(true);
      try {
        const res = await fetch(`/api/leads?tenant=${tenant}&search=${encodeURIComponent(phone)}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.leads?.length > 0) {
            const l = data.leads[0];
            setLeadMatch({ found: true, name: `${l.first_name || ''} ${l.last_name || ''}`.trim(), phone: l.phone });
            if (l.first_name) setCustomerInfo(prev => ({ ...prev, first_name: prev.first_name || l.first_name, last_name: prev.last_name || l.last_name || '', email: prev.email || l.email || '' }));
          } else {
            setLeadMatch({ found: false });
          }
        }
      } catch (err) {
        console.error('[CreditRouter] Lead search error:', err instanceof Error ? err.message : 'unknown');
        Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      } finally { setSearchingLead(false); }
    }, 500);
  };

  const fillFromClientInfo = (info: Record<string, string>): void => {
    if (!info) return;
    setCustomerInfo(prev => ({
      first_name: prev.first_name || info.first_name || '',
      last_name: prev.last_name || info.last_name || '',
      phone: prev.phone || info.phone || '',
      email: prev.email || info.email || '',
    }));
    if (info.fico) setProfile(p => ({ ...p, fico: p.fico || info.fico }));
    if (info.income) setProfile(p => ({ ...p, income: p.income || info.income }));
    if (info.phone && info.phone.replace(/\D/g, '').length >= 10) {
      searchLead(info.phone);
    }
  };

  const analyzeWithAI = async (text: string): Promise<void> => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/credit-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', text }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
        console.error('[CreditRouter] AI text analysis HTTP error:', res.status, errData);
        setAiInsight(`Analysis failed (${res.status}): ${errData.error || 'Unknown error'}. Enter credit details manually below.`);
        setAnalyzing(false);
        return;
      }
      const data = await res.json();
      setAiInsight(data.analysis || 'AI returned empty analysis. Enter credit details manually below.');
      if (data.clientInfo) fillFromClientInfo(data.clientInfo);
    } catch (err) {
      console.error('[CreditRouter] AI text analysis error:', err instanceof Error ? err.message : 'unknown');
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
      setAiInsight('AI analysis unavailable — network error. Enter credit details manually below.');
    }
    setAnalyzing(false);
  };

  const isPdfFile = (file: File): boolean => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  const processFile = async (file: File): Promise<void> => {
    if (isPdfFile(file)) {
      const reader = new FileReader();
      reader.onerror = () => {
        console.error('[CreditRouter] FileReader error reading PDF');
        setAiInsight('Could not read PDF file. Try a different file or paste bureau text.');
        setAnalyzing(false);
      };
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        if (!base64) { setAiInsight('Could not read PDF file. Try a different file.'); setAnalyzing(false); return; }
        const approxSizeBytes = Math.ceil(base64.length * 0.75);
        if (approxSizeBytes > 30 * 1024 * 1024) { setAiInsight('PDF too large (max 30MB). Try a smaller file or paste the bureau text directly.'); setAnalyzing(false); return; }
        setAnalyzing(true);
        try {
          const res = await fetch('/api/credit-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'pdf', pdfBase64: base64 }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
            console.error('[CreditRouter] PDF analysis HTTP error:', res.status, errData);
            setAiInsight(`PDF analysis failed (${res.status}): ${errData.error || 'Unknown error'}. Try pasting the bureau text instead.`);
            setAnalyzing(false);
            return;
          }
          const data = await res.json();
          const analysis = data.analysis || '';
          setAiInsight(analysis || 'AI returned empty analysis. Enter credit details manually.');
          if (data.clientInfo) { fillFromClientInfo(data.clientInfo); } else {
            const ficoMatch = analysis.match(/(\d{3})/);
            if (ficoMatch) setProfile((p) => ({ ...p, fico: ficoMatch[1] }));
          }
        } catch (err) {
          console.error('[CreditRouter] PDF analysis error:', err instanceof Error ? err.message : 'unknown');
          Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
          setAiInsight('Could not analyze PDF — network error. Try pasting the bureau text instead.');
        }
        setAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onerror = () => { console.error('[CreditRouter] FileReader error reading text file'); setAiInsight('Could not read file. Try a different file or paste bureau text.'); setAnalyzing(false); };
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (!text || text.trim().length === 0) { setAiInsight('File appears empty. Paste bureau text manually.'); return; }
        analyzeWithAI(text);
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (!bureauConsent) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.pdf') && !ext.endsWith('.txt') && !ext.endsWith('.csv')) return;
    await processFile(file);
  };

  const runRouting = (): void => {
    const p: ScoringProfile = {
      fico: parseInt(profile.fico, 10) || 0,
      income: parseInt(profile.income, 10) || 0,
      situation: profile.situation,
      selfEmployed: profile.selfEmployed,
    };
    const scored = LENDER_DB
      .map((l) => scoreLender(l, p))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
    setResults(scored);
    setStep('results');
    setSaved(false);

    if (tenant) {
      const phone = customerInfo.phone.replace(/\D/g, '');
      const fullPhone = phone.length === 10 ? `+1${phone}` : phone.length === 11 ? `+${phone}` : phone ? `+${phone}` : 'unknown';

      const creditGrade = computeCreditGrade(
        parseInt(profile.fico, 10) || 0, profile.situation, profile.selfEmployed, parseInt(profile.income, 10) || 0,
      );
      const creditSituationValue = `${creditGrade.grade} | FICO ${profile.fico || '?'} | ${creditGrade.summary}`;

      const routingData = {
        profile: { ...profile }, customer: { ...customerInfo },
        creditGrade: creditGrade.grade, creditSummary: creditGrade.summary,
        topLenders: scored.slice(0, 5).map((r) => ({
          lender: r.lender, tier: r.tier?.tier || 'N/A', rate: r.tier?.rate || 'N/A',
          score: Math.round(r.score), reasons: r.reasons, warnings: r.warnings,
        })),
        aiInsight: aiInsight || null, routedAt: new Date().toISOString(),
      };

      const saveActivity = async (): Promise<void> => {
        try {
          const res = await fetch('/api/leads', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant, phone: fullPhone, type: 'credit_routing', content: JSON.stringify(routingData) }),
          });
          if (!res.ok) throw new Error(`Save failed: ${res.status}`);
          setSaved(true);
        } catch (err) {
          console.error('[CreditRouter] Activity save error:', err instanceof Error ? err.message : 'unknown');
          Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
        }
      };

      (async () => {
        try {
          if (customerInfo.first_name && customerInfo.phone && (!leadMatch || !leadMatch.found)) {
            const res = await fetch('/api/leads', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tenant, type: 'create_lead', phone: fullPhone,
                content: JSON.stringify({ first_name: customerInfo.first_name, last_name: customerInfo.last_name, phone: customerInfo.phone, email: customerInfo.email, credit_situation: creditSituationValue, vehicle_type: '' }),
              }),
            });
            if (!res.ok) throw new Error(`lead create failed: ${res.status}`);
            const data = await res.json();
            if (data.success) setLeadMatch({ found: true, name: `${customerInfo.first_name} ${customerInfo.last_name}`.trim(), phone: fullPhone });
          } else if (leadMatch?.found && fullPhone !== 'unknown') {
            const res = await fetch('/api/leads/credit', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tenant, phone: fullPhone, credit_situation: creditSituationValue }),
            });
            if (!res.ok) throw new Error(`credit update failed: ${res.status}`);
          }
        } catch (err) {
          console.error('[CreditRouter] Lead create/update error:', err instanceof Error ? err.message : 'unknown');
          Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
        }
        await saveActivity();
      })();
    }
  };

  const resetForm = (): void => {
    setStep('input');
    setResults([]);
    setAiInsight('');
    setProfile({ fico: '', income: '', situation: 'standard', selfEmployed: false, downPayment: '', desiredPayment: '', vehicleYear: '', vehicleKm: '', vehiclePrice: '' });
    setNotes('');
  };

  const s = {
    page: {
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#f0f0f5', padding: isMobile ? '16px' : '24px',
      maxWidth: 1400, margin: '0 auto', overflowY: 'auto' as const,
      height: isMobile ? 'calc(100vh - 116px)' : 'calc(100vh - 52px)', boxSizing: 'border-box' as const,
    } as React.CSSProperties,
    card: { background: '#111119', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, backdropFilter: 'blur(20px)' } as React.CSSProperties,
    label: { display: 'block' as const, fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: '#55556a', marginBottom: 6 } as React.CSSProperties,
    input: { width: '100%', padding: '10px 16px', background: '#1a1a25', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0f0f5', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box' as const, transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)' } as React.CSSProperties,
    inputSmall: { width: '100%', padding: '8px 12px', background: '#1a1a25', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: '#8888a0', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)' } as React.CSSProperties,
    select: { width: '100%', padding: '10px 16px', background: '#1a1a25', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0f0f5', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, outline: 'none' } as React.CSSProperties,
    sectionTitle: { fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', color: '#f0f0f5', marginBottom: 16 } as React.CSSProperties,
    badge: (bg: string, fg: string) => ({ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: bg, color: fg, border: `1px solid ${fg}33` }) as React.CSSProperties,
    btnPrimary: (enabled: boolean) => ({ width: '100%', padding: 14, background: enabled ? 'linear-gradient(135deg, #DC2626, #B91C1C)' : '#1a1a25', border: 'none', borderRadius: 8, color: enabled ? '#fff' : '#55556a', fontSize: 15, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif", cursor: enabled ? 'pointer' : 'not-allowed', transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)', letterSpacing: '-0.01em' }) as React.CSSProperties,
    btnSecondary: { padding: '8px 16px', background: '#1a1a25', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#8888a0', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)' } as React.CSSProperties,
  };

  if (step === 'input') {
    return (
      <CreditForm
        profile={profile} setProfile={setProfile}
        customerInfo={customerInfo} setCustomerInfo={setCustomerInfo}
        leadMatch={leadMatch} searchingLead={searchingLead}
        notes={notes} setNotes={setNotes}
        bureauConsent={bureauConsent} setBureauConsent={setBureauConsent}
        analyzing={analyzing} aiInsight={aiInsight}
        isMobile={isMobile}
        onSearchLead={searchLead} onAnalyzeText={analyzeWithAI}
        onFileUpload={handleFileUpload} onDrop={handleDrop}
        dragOver={dragOver} setDragOver={setDragOver}
        onRunRouting={runRouting} onReset={resetForm}
        styles={s}
      />
    );
  }

  return (
    <CreditResults
      profile={profile} results={results}
      aiInsight={aiInsight} notes={notes} saved={saved}
      isMobile={isMobile} onBack={() => setStep('input')}
      styles={s}
    />
  );
}
