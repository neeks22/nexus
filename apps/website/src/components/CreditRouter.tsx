'use client';

import { useState, useRef } from 'react';

/* =============================================================================
   LENDER DATABASE
   ============================================================================= */

interface LenderTier {
  tier: string;
  ficoMin: number;
  ficoMax: number;
  rate: string;
  maxLTV: string;
  maxPayCall: string;
  reserve: string;
  color: string;
}

interface Lender {
  name: string;
  tiers: LenderTier[];
  minIncome: number;
  maxKm: number;
  maxTerm: number;
  special: string[];
  noGo: string[];
  adminFee?: string;
}

interface ScoredResult {
  score: number;
  tier: LenderTier | null;
  reasons: string[];
  warnings: string[];
  lender: string;
}

interface CustomerProfile {
  fico: string;
  income: string;
  situation: string;
  selfEmployed: boolean;
  downPayment: string;
  desiredPayment: string;
  vehicleYear: string;
  vehicleKm: string;
  vehiclePrice: string;
}

interface ScoringProfile {
  fico: number;
  income: number;
  situation: string;
  selfEmployed: boolean;
}

const LENDER_DB: Lender[] = [
  {
    name: 'Northlake Financial',
    tiers: [
      { tier: 'Titanium', ficoMin: 750, ficoMax: 999, rate: '6.99%', maxLTV: '150%+', maxPayCall: '$930+', reserve: '$600', color: '#C0C0C0' },
      { tier: 'Platinum', ficoMin: 700, ficoMax: 749, rate: '8.99%', maxLTV: '140%+', maxPayCall: '$930+', reserve: '$600', color: '#A0A0A0' },
      { tier: 'Gold', ficoMin: 600, ficoMax: 699, rate: '12.99%', maxLTV: '135%+', maxPayCall: '$875+', reserve: '$450', color: '#D4A437' },
      { tier: 'Standard', ficoMin: 0, ficoMax: 599, rate: '17.99%', maxLTV: '125%+', maxPayCall: '$800+', reserve: '$0-300', color: '#666' },
    ],
    minIncome: 1800, maxKm: 300000, maxTerm: 84,
    special: ['7-second approvals', 'No minimum FICO', 'Up to 300K km', 'Child Tax Credit accepted'],
    noGo: ['Repo in last 12 months', "G1/Learner's license", 'Structural/fire/flood damage'],
  },
  {
    name: 'TD Auto Finance',
    tiers: [
      { tier: '6 Key', ficoMin: 680, ficoMax: 999, rate: '11.99%', maxLTV: '140%', maxPayCall: 'varies', reserve: '$200-700', color: '#00A650' },
      { tier: '5 Key', ficoMin: 620, ficoMax: 679, rate: '13%+', maxLTV: '140%', maxPayCall: 'varies', reserve: '$200-700', color: '#00A650' },
      { tier: '4 Key', ficoMin: 560, ficoMax: 619, rate: '15%+', maxLTV: '140%', maxPayCall: 'varies', reserve: '$200-700', color: '#00A650' },
      { tier: '3 Key', ficoMin: 500, ficoMax: 559, rate: '18%+', maxLTV: '140%', maxPayCall: 'varies', reserve: '$200-700', color: '#00A650' },
      { tier: '2 Key', ficoMin: 0, ficoMax: 499, rate: '22%+', maxLTV: '140%', maxPayCall: 'varies', reserve: '$200-700', color: '#00A650' },
    ],
    minIncome: 1800, maxKm: 195000, maxTerm: 84,
    special: ['BK/Proposal specialist', 'Negative equity option', 'Flex rate', '500 Aeroplan points'],
    noGo: ['Child Tax/Social Assistance as income'],
    adminFee: '$799',
  },
  {
    name: 'iA Auto Finance',
    tiers: [
      { tier: '6th Gear', ficoMin: 650, ficoMax: 999, rate: '11.49%', maxLTV: '140%', maxPayCall: '$1000', reserve: '$100-1000', color: '#1E3A5F' },
      { tier: '5th Gear', ficoMin: 580, ficoMax: 649, rate: '15.49%', maxLTV: '140%', maxPayCall: '$1000', reserve: '$100-1000', color: '#1E3A5F' },
      { tier: '4th Gear', ficoMin: 520, ficoMax: 579, rate: '20.49%', maxLTV: '135%', maxPayCall: '$1000', reserve: '$100-1000', color: '#1E3A5F' },
      { tier: '3rd Gear', ficoMin: 450, ficoMax: 519, rate: '25.49%', maxLTV: '125%', maxPayCall: '$1000', reserve: '$100-1000', color: '#1E3A5F' },
      { tier: '2nd Gear', ficoMin: 0, ficoMax: 449, rate: '29.99%', maxLTV: '125%', maxPayCall: '$1000', reserve: '$100-1000', color: '#1E3A5F' },
    ],
    minIncome: 1500, maxKm: 180000, maxTerm: 84,
    special: ['BK approved on submission', 'Rate Reducing Loan (1/10th drop/year)', 'Returning customer program', 'iA Fast Income verification'],
    noGo: ['Max 140K km for 1st/2nd Gear'],
    adminFee: '$699',
  },
  {
    name: 'EdenPark',
    tiers: [
      { tier: 'EP Ride+', ficoMin: 680, ficoMax: 999, rate: '11.99%', maxLTV: '140%', maxPayCall: '$950', reserve: '$250-750', color: '#2D6B4F' },
      { tier: '6 Ride', ficoMin: 620, ficoMax: 679, rate: '13.99%', maxLTV: '140%', maxPayCall: '$950', reserve: '$250-750', color: '#2D6B4F' },
      { tier: '5 Ride', ficoMin: 560, ficoMax: 619, rate: '16.99%', maxLTV: '140%', maxPayCall: '$950', reserve: '$250-750', color: '#2D6B4F' },
      { tier: '4 Ride', ficoMin: 500, ficoMax: 559, rate: '19.99%', maxLTV: '135%', maxPayCall: '$950', reserve: '$250-750', color: '#2D6B4F' },
      { tier: '3 Ride', ficoMin: 400, ficoMax: 499, rate: '23.99%', maxLTV: '130%', maxPayCall: '$950', reserve: '$250-750', color: '#2D6B4F' },
      { tier: 'EP No Hit', ficoMin: 0, ficoMax: 0, rate: '19.99%', maxLTV: '130%', maxPayCall: '$950', reserve: '$250-750', color: '#2D6B4F' },
    ],
    minIncome: 1800, maxKm: 180000, maxTerm: 84,
    special: ['No Hit program for newcomers', 'Reserve paid on every deal', 'Full spectrum'],
    noGo: ['Structural damage', 'Theft recovery', 'Carfax >$7,500/incident'],
  },
  {
    name: 'AutoCapital Canada',
    tiers: [
      { tier: 'Tier 1', ficoMin: 600, ficoMax: 999, rate: '13.49%', maxLTV: '175%', maxPayCall: '55% TDSR', reserve: '$300-500', color: '#8B0000' },
      { tier: 'Tier 2', ficoMin: 550, ficoMax: 599, rate: '14.49%', maxLTV: '175%', maxPayCall: '55% TDSR', reserve: '$300-500', color: '#8B0000' },
      { tier: 'Tier 3', ficoMin: 500, ficoMax: 549, rate: '15.99%', maxLTV: '165%', maxPayCall: '50% TDSR', reserve: '$300-500', color: '#8B0000' },
      { tier: 'Tier 4', ficoMin: 450, ficoMax: 499, rate: '17.99%', maxLTV: '165%', maxPayCall: '47% TDSR', reserve: '$300-500', color: '#8B0000' },
      { tier: 'Tier 5', ficoMin: 400, ficoMax: 449, rate: '21.49%', maxLTV: '150%', maxPayCall: '43% TDSR', reserve: '$300-500', color: '#8B0000' },
      { tier: 'Tier 6', ficoMin: 0, ficoMax: 399, rate: '23.49%', maxLTV: '150%', maxPayCall: '43% TDSR', reserve: '$300-500', color: '#8B0000' },
    ],
    minIncome: 2000, maxKm: 195000, maxTerm: 84,
    special: ['P4E self-employed program', 'Co-signer release after 18 months', 'Highest all-in LTV (175%)'],
    noGo: ['Carfax damage >$7,500', 'Salvage/rebuilt'],
    adminFee: '$799',
  },
  {
    name: 'Rifco',
    tiers: [
      { tier: 'Standard', ficoMin: 0, ficoMax: 599, rate: '29.95%', maxLTV: '125%', maxPayCall: '$950', reserve: '$250', color: '#4A2C2A' },
      { tier: 'Drive Plan', ficoMin: 0, ficoMax: 499, rate: '29.95%', maxLTV: '130%', maxPayCall: '$950', reserve: 'n/a', color: '#4A2C2A' },
    ],
    minIncome: 3000, maxKm: 168000, maxTerm: 84,
    special: ['GPS/Starter interrupter on Drive Plan', 'Banking verification via Flinks', '5-10% discount on Drive Plan'],
    noGo: ['Carfax >$6,000', 'Max $35,000 finance', 'Max 168K km'],
    adminFee: '$395 + $595 device',
  },
  {
    name: 'Iceberg Finance',
    tiers: [
      { tier: 'Gold', ficoMin: 550, ficoMax: 999, rate: '12.99-20.25%', maxLTV: '140%', maxPayCall: '$825', reserve: '$300-500', color: '#0077B6' },
      { tier: 'Silver', ficoMin: 450, ficoMax: 549, rate: '20.99-27.25%', maxLTV: '140%', maxPayCall: '$775', reserve: '$300-500', color: '#0077B6' },
      { tier: 'Bronze', ficoMin: 0, ficoMax: 449, rate: '27.99-31.99%', maxLTV: '140%', maxPayCall: '$625', reserve: '$300-500', color: '#0077B6' },
    ],
    minIncome: 1750, maxKm: 180000, maxTerm: 72,
    special: ['Accepts foreign/international licenses', 'Accepts undischarged BK', 'Accepts SIN-9 (work permit)', 'Max age 74'],
    noGo: ['3+ insolvencies = auto decline', 'Social assistance/EI/Uber income'],
    adminFee: '$999 + $100 PPSA',
  },
  {
    name: 'Santander Consumer',
    tiers: [
      { tier: 'Standard', ficoMin: 0, ficoMax: 999, rate: 'varies', maxLTV: 'varies', maxPayCall: 'varies', reserve: 'varies', color: '#CC0000' },
    ],
    minIncome: 2500, maxKm: 195000, maxTerm: 84,
    special: ['Easy Income instant verification', 'Most generous Carfax (35% of BBV)', 'santanderconsumer.ca/easyincome'],
    noGo: ['Taxi/rideshare/commercial', 'Former police vehicles'],
    adminFee: 'varies',
  },
];

/* =============================================================================
   SCORING ENGINE
   ============================================================================= */

function scoreLender(lender: Lender, profile: ScoringProfile): ScoredResult {
  let score = 0;
  let matchedTier: LenderTier | null = null;
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (profile.income < lender.minIncome) {
    warnings.push(`Min income $${lender.minIncome}/mo \u2014 customer has $${profile.income}`);
    return { score: 0, tier: null, reasons: [], warnings, lender: lender.name };
  }

  for (const tier of lender.tiers) {
    if (profile.fico >= tier.ficoMin && profile.fico <= tier.ficoMax) {
      matchedTier = tier;
      break;
    }
  }
  if (!matchedTier && lender.tiers.length > 0) {
    matchedTier = lender.tiers[lender.tiers.length - 1];
  }

  if (matchedTier) {
    if (profile.fico >= 700) score += 40;
    else if (profile.fico >= 600) score += 30;
    else if (profile.fico >= 500) score += 20;
    else score += 10;

    const rateNum = parseFloat(matchedTier.rate);
    if (!isNaN(rateNum)) {
      score += Math.max(0, 40 - rateNum);
      reasons.push(`Rate from ${matchedTier.rate} (${matchedTier.tier})`);
    }

    if (profile.income >= lender.minIncome * 1.5) {
      score += 10;
      reasons.push('Income well above minimum');
    }
  }

  if (profile.situation === 'bankruptcy') {
    if (lender.name === 'iA Auto Finance') { score += 30; reasons.push('BK SPECIALIST \u2014 approved on submission'); }
    else if (lender.name === 'TD Auto Finance') { score += 20; reasons.push('BK/Proposal programs available'); }
    else if (lender.name === 'Iceberg Finance') { score += 15; reasons.push('Accepts undischarged BK'); }
    else if (lender.name === 'EdenPark') { score += 10; reasons.push('Accepts BK'); }
  }

  if (profile.situation === 'proposal') {
    if (lender.name === 'iA Auto Finance') { score += 30; reasons.push('Proposal approved on submission'); }
    else if (lender.name === 'TD Auto Finance') { score += 20; reasons.push('CP specialist programs'); }
    else if (lender.name === 'Iceberg Finance') { score += 15; reasons.push('Accepts active proposals'); }
  }

  if (profile.situation === 'newcomer') {
    if (lender.name === 'EdenPark') { score += 30; reasons.push('EP No Hit program designed for newcomers'); }
    else if (lender.name === 'Iceberg Finance') { score += 25; reasons.push('Accepts foreign licenses + SIN-9'); }
    else if (lender.name === 'Northlake Financial') { score += 15; reasons.push('No minimum FICO requirement'); }
  }

  if (profile.selfEmployed) {
    if (lender.name === 'AutoCapital Canada') { score += 20; reasons.push('P4E self-employed program (full/alt/lite doc)'); }
    else if (lender.name === 'iA Auto Finance') { score += 15; reasons.push('iA Fast Income verification'); }
    else if (lender.name === 'Rifco') { score += 10; reasons.push('Flinks banking verification'); }
  }

  return { score, tier: matchedTier, reasons, warnings, lender: lender.name };
}

/* =============================================================================
   HELPERS
   ============================================================================= */

function tierColor(fico: number): string {
  if (fico >= 750) return '#10b981';
  if (fico >= 700) return '#34d399';
  if (fico >= 600) return '#f59e0b';
  if (fico >= 500) return '#f97316';
  return '#ef4444';
}

function tierLabel(fico: number): string {
  if (fico >= 750) return 'NEAR-PRIME (A)';
  if (fico >= 700) return 'NEAR-PRIME (B)';
  if (fico >= 600) return 'LIGHT SUBPRIME';
  if (fico >= 500) return 'MID SUBPRIME';
  if (fico >= 400) return 'DEEP SUBPRIME';
  return 'VERY DEEP SUBPRIME';
}

/* =============================================================================
   COMPONENT — Styled to match the Nexus Inbox design system
   Uses CSS variables from globals.css: bg-primary, bg-secondary, bg-tertiary,
   border, text-primary, text-secondary, text-muted, accent-primary, etc.
   ============================================================================= */

export default function CreditRouter({ tenant, customerPhone }: { tenant?: string; customerPhone?: string } = {}): React.ReactElement {
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
  const [results, setResults] = useState<ScoredResult[]>([]);
  const [aiInsight, setAiInsight] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-search for existing lead when phone changes
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
      } catch { /* ignore */ }
      finally { setSearchingLead(false); }
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
    // Auto-search lead if phone was extracted
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
      const data = await res.json();
      setAiInsight(data.analysis || 'AI analysis unavailable.');
      if (data.clientInfo) fillFromClientInfo(data.clientInfo);
    } catch {
      setAiInsight('AI analysis unavailable. Enter credit details manually below.');
    }
    setAnalyzing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        setAnalyzing(true);
        try {
          const res = await fetch('/api/credit-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'pdf', pdfBase64: base64 }),
          });
          const data = await res.json();
          const analysis = data.analysis || '';
          setAiInsight(analysis);
          if (data.clientInfo) {
            fillFromClientInfo(data.clientInfo);
          } else {
            const ficoMatch = analysis.match(/(\d{3})/);
            if (ficoMatch) {
              setProfile((p) => ({ ...p, fico: ficoMatch[1] }));
            }
          }
        } catch {
          setAiInsight('Could not analyze PDF. Please enter details manually.');
        }
        setAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        analyzeWithAI(text);
      };
      reader.readAsText(file);
    }
  };

  const runRouting = (): void => {
    const p: ScoringProfile = {
      fico: parseInt(profile.fico) || 0,
      income: parseInt(profile.income) || 0,
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

    // Auto-create lead if not found, then save routing to activity
    if (tenant) {
      const phone = customerInfo.phone.replace(/\D/g, '');
      const fullPhone = phone.length === 10 ? `+1${phone}` : phone.length === 11 ? `+${phone}` : phone ? `+${phone}` : 'unknown';

      // Create lead if we have customer info and no match
      if (customerInfo.first_name && customerInfo.phone && (!leadMatch || !leadMatch.found)) {
        fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant,
            type: 'create_lead',
            phone: fullPhone,
            content: JSON.stringify({
              first_name: customerInfo.first_name,
              last_name: customerInfo.last_name,
              phone: customerInfo.phone,
              email: customerInfo.email,
              credit_situation: profile.fico ? `FICO ${profile.fico}` : '',
              vehicle_type: '',
            }),
          }),
        }).then(r => r.json()).then(data => {
          if (data.success) {
            setLeadMatch({ found: true, name: `${customerInfo.first_name} ${customerInfo.last_name}`.trim(), phone: fullPhone });
          }
        }).catch(() => {});
      }

      // Save credit routing to activity
      const routingData = {
        profile: { ...profile },
        customer: { ...customerInfo },
        topLenders: scored.slice(0, 5).map((r) => ({
          lender: r.lender,
          tier: r.tier?.tier || 'N/A',
          rate: r.tier?.rate || 'N/A',
          score: r.score,
          reasons: r.reasons,
          warnings: r.warnings,
        })),
        aiInsight: aiInsight || null,
        routedAt: new Date().toISOString(),
      };

      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant,
          phone: fullPhone,
          type: 'credit_routing',
          content: JSON.stringify(routingData),
        }),
      }).then(() => setSaved(true)).catch(() => {});
    }
  };

  const resetForm = (): void => {
    setStep('input');
    setResults([]);
    setAiInsight('');
    setProfile({
      fico: '', income: '', situation: 'standard', selfEmployed: false,
      downPayment: '', desiredPayment: '', vehicleYear: '', vehicleKm: '', vehiclePrice: '',
    });
    setNotes('');
  };

  /* ---------------------------------------------------------------------------
     SHARED STYLES — mirrors globals.css tokens inline for self-containment
     --------------------------------------------------------------------------- */

  const s = {
    page: {
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#f0f0f5',
      padding: '24px',
      maxWidth: 1400,
      margin: '0 auto',
    } as React.CSSProperties,

    card: {
      background: '#111119',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 24,
      backdropFilter: 'blur(20px)',
    } as React.CSSProperties,

    label: {
      display: 'block' as const,
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
      color: '#55556a',
      marginBottom: 6,
    } as React.CSSProperties,

    input: {
      width: '100%',
      padding: '10px 16px',
      background: '#1a1a25',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      color: '#f0f0f5',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: 15,
      fontWeight: 600,
      outline: 'none',
      boxSizing: 'border-box' as const,
      transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    } as React.CSSProperties,

    inputSmall: {
      width: '100%',
      padding: '8px 12px',
      background: '#1a1a25',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8,
      color: '#8888a0',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: 13,
      outline: 'none',
      boxSizing: 'border-box' as const,
      transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    } as React.CSSProperties,

    select: {
      width: '100%',
      padding: '10px 16px',
      background: '#1a1a25',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      color: '#f0f0f5',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: 14,
      outline: 'none',
    } as React.CSSProperties,

    sectionTitle: {
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '0.03em',
      color: '#f0f0f5',
      marginBottom: 16,
    } as React.CSSProperties,

    badge: (bg: string, fg: string) => ({
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: bg,
      color: fg,
      border: `1px solid ${fg}33`,
    }) as React.CSSProperties,

    btnPrimary: (enabled: boolean) => ({
      width: '100%',
      padding: 14,
      background: enabled ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#1a1a25',
      border: 'none',
      borderRadius: 8,
      color: enabled ? '#fff' : '#55556a',
      fontSize: 15,
      fontWeight: 600,
      fontFamily: "'Inter', system-ui, sans-serif",
      cursor: enabled ? 'pointer' : 'not-allowed',
      transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
      letterSpacing: '-0.01em',
    }) as React.CSSProperties,

    btnSecondary: {
      padding: '8px 16px',
      background: '#1a1a25',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      color: '#8888a0',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      fontFamily: "'Inter', system-ui, sans-serif",
      transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    } as React.CSSProperties,
  };

  /* ---------------------------------------------------------------------------
     INPUT VIEW
     --------------------------------------------------------------------------- */

  if (step === 'input') {
    return (
      <div style={s.page}>
        <style>{`
          @keyframes crPulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
          @keyframes crSlide { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
          .cr-enter { animation: crSlide .35s ease-out forwards }
          .cr-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.1) !important }
        `}</style>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', width: 36, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 18,
            }}>C</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f5', letterSpacing: '-0.02em' }}>Credit Router</div>
              <div style={{ fontSize: 12, color: '#55556a' }}>8 lenders &middot; AI bureau analysis &middot; auto-route</div>
            </div>
          </div>
          <button onClick={resetForm} style={s.btnSecondary}>New Application</button>
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* LEFT — Bureau Upload + Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* UPLOAD CARD */}
            <div className="cr-enter" style={s.card}>
              <div style={s.sectionTitle}>Credit Bureau Upload</div>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 12,
                  padding: '36px 24px', textAlign: 'center', cursor: 'pointer',
                  transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  background: 'rgba(255,255,255,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                  e.currentTarget.style.background = 'rgba(99,102,241,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                </div>
                <div style={{ fontSize: 14, color: '#8888a0', fontWeight: 500 }}>Drop credit bureau PDF or TXT here</div>
                <div style={{ fontSize: 12, color: '#55556a', marginTop: 4 }}>AI will extract score, trades, collections &amp; route automatically</div>
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.txt,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />

              {analyzing && (
                <div style={{ marginTop: 16, padding: 16, background: 'rgba(99,102,241,0.08)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.15)', animation: 'crPulse 1.5s infinite', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                  <span style={{ fontSize: 13, color: '#8888a0' }}>AI analyzing credit bureau...</span>
                </div>
              )}

              {aiInsight && (
                <div style={{ marginTop: 16, padding: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, maxHeight: 350, overflow: 'auto' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#6366f1', marginBottom: 8, textTransform: 'uppercase' }}>AI Bureau Analysis</div>
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
                style={{
                  ...s.input,
                  height: 140,
                  resize: 'vertical',
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: 1.6,
                }}
              />
            </div>
          </div>

          {/* RIGHT — Customer Info + Profile */}
          <div>
            {/* Customer Info */}
            <div className="cr-enter" style={{ ...s.card, animationDelay: '0.06s', marginBottom: 16 }}>
              <div style={s.sectionTitle}>Customer Info</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                  <input value={customerInfo.phone} onChange={(e) => { setCustomerInfo({ ...customerInfo, phone: e.target.value }); searchLead(e.target.value); }} placeholder="6131234567" className="cr-input" style={s.input} />
                  {searchingLead && <div style={{ fontSize: 11, color: '#6366f1', marginTop: 4 }}>Searching...</div>}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={s.label}>Beacon / FICO Score</label>
                  <input
                    type="number" value={profile.fico}
                    onChange={(e) => setProfile({ ...profile, fico: e.target.value })}
                    placeholder="e.g. 580" className="cr-input" style={s.input}
                  />
                  {profile.fico && (
                    <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: tierColor(parseInt(profile.fico)), letterSpacing: '0.05em' }}>
                      {tierLabel(parseInt(profile.fico))}
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
                    border: profile.selfEmployed ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.12)',
                    background: profile.selfEmployed ? 'rgba(99,102,241,0.2)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: '200ms',
                  }}>
                    {profile.selfEmployed && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                  <input type="checkbox" checked={profile.selfEmployed} onChange={(e) => setProfile({ ...profile, selfEmployed: e.target.checked })} style={{ display: 'none' }} />
                  <span style={{ fontSize: 14, color: '#8888a0' }}>Self-Employed</span>
                </label>
              </div>

              {/* Vehicle Details */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 24, paddingTop: 20 }}>
                <div style={{ ...s.label, marginBottom: 14, color: '#55556a' }}>Vehicle Details (optional)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
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
                onClick={runRouting}
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

  /* ---------------------------------------------------------------------------
     RESULTS VIEW
     --------------------------------------------------------------------------- */

  const ficoNum = parseInt(profile.fico);

  return (
    <div style={s.page}>
      <style>{`
        @keyframes crSlide { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .cr-enter { animation: crSlide .35s ease-out forwards }
      `}</style>

      {/* RESULTS HEADER */}
      <div className="cr-enter" style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Score circle */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: `conic-gradient(${tierColor(ficoNum)} ${(ficoNum / 900) * 100}%, rgba(255,255,255,0.06) 0)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', background: '#111119',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: tierColor(ficoNum), lineHeight: 1 }}>{profile.fico}</div>
              <div style={{ fontSize: 9, color: '#55556a', letterSpacing: '0.05em', marginTop: 2 }}>BEACON</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: tierColor(ficoNum), textTransform: 'uppercase' }}>{tierLabel(ficoNum)}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f5', letterSpacing: '-0.02em', marginTop: 2 }}>${parseInt(profile.income).toLocaleString()}<span style={{ fontSize: 13, color: '#55556a', fontWeight: 400 }}>/mo</span></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {profile.situation !== 'standard' && (
                <span style={s.badge('rgba(245,158,11,0.12)', '#f59e0b')}>{profile.situation.toUpperCase()}</span>
              )}
              {profile.selfEmployed && (
                <span style={s.badge('rgba(99,102,241,0.12)', '#6366f1')}>SELF-EMPLOYED</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && (
            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>Saved to Activity</span>
          )}
          <button onClick={() => setStep('input')} style={s.btnSecondary}>
            <span style={{ marginRight: 6 }}>&larr;</span> Back
          </button>
        </div>
      </div>

      {/* AI INSIGHT */}
      {aiInsight && (
        <div className="cr-enter" style={{ ...s.card, background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.15)', marginBottom: 20, animationDelay: '0.05s' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#6366f1', marginBottom: 8, textTransform: 'uppercase' }}>AI Bureau Analysis</div>
          <pre style={{ fontSize: 13, color: '#8888a0', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>{aiInsight}</pre>
        </div>
      )}

      {/* NOTES */}
      {notes && (
        <div className="cr-enter" style={{ ...s.card, background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.15)', marginBottom: 20, animationDelay: '0.08s' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#f59e0b', marginBottom: 6, textTransform: 'uppercase' }}>Sales Rep Notes</div>
          <div style={{ fontSize: 14, color: '#8888a0', lineHeight: 1.6 }}>{notes}</div>
        </div>
      )}

      {/* LENDER MATCHES HEADING */}
      <div style={{ ...s.label, marginBottom: 14, color: '#55556a' }}>Lender Matches &mdash; ranked by approval probability &amp; rate</div>

      {/* LENDER CARDS */}
      {results.map((r, i) => {
        const lenderData = LENDER_DB.find((l) => l.name === r.lender);
        const isTop = i === 0;
        const rankLabels = ['Best Match', '2nd Option', '3rd Option'];

        return (
          <div
            key={r.lender}
            className="cr-enter"
            style={{
              ...s.card,
              marginBottom: 12,
              animationDelay: `${0.1 + i * 0.06}s`,
              borderColor: isTop ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
              boxShadow: isTop ? '0 0 40px rgba(99,102,241,0.08)' : 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Rank badge */}
            {i < 3 && (
              <div style={{
                position: 'absolute', top: 0, right: 0,
                background: isTop ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#1a1a25',
                color: isTop ? '#fff' : '#55556a',
                fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                padding: '5px 14px', borderBottomLeftRadius: 10,
                textTransform: 'uppercase',
              }}>{rankLabels[i]}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f5', letterSpacing: '-0.02em' }}>{r.lender}</div>
                {r.tier && (
                  <div style={{ fontSize: 13, color: '#55556a', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                    {r.tier.tier} &mdash; {r.tier.rate} &mdash; LTV {r.tier.maxLTV} &mdash; Reserve {r.tier.reserve}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: isTop ? '#6366f1' : '#55556a', lineHeight: 1 }}>{r.score}</div>
                <div style={{ fontSize: 10, color: '#55556a', letterSpacing: '0.05em', marginTop: 2 }}>SCORE</div>
              </div>
            </div>

            {/* Reasons */}
            {r.reasons.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {r.reasons.map((reason, j) => (
                  <span key={j} style={s.badge('rgba(16,185,129,0.1)', '#10b981')}>{reason}</span>
                ))}
              </div>
            )}

            {/* Warnings */}
            {r.warnings.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {r.warnings.map((w, j) => (
                  <span key={j} style={s.badge('rgba(239,68,68,0.1)', '#ef4444')}>{w}</span>
                ))}
              </div>
            )}

            {/* Special features */}
            {lenderData?.special && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {lenderData.special.map((feat, j) => (
                  <span key={j} style={{
                    background: 'rgba(255,255,255,0.03)',
                    color: '#55556a',
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>{feat}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {results.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#55556a' }}>
          <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }}>&#128269;</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>No matching lenders found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Adjust income or credit score and try again.</div>
        </div>
      )}
    </div>
  );
}
