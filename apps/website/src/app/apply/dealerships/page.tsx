'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ============================================
   TYPES
   ============================================ */

interface FunnelData {
  vehicleType: string;
  employmentStatus: string;
  monthlyIncome: string;
  jobDuration: string;
  creditSituation: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  preferredContact: string;
  caslConsent: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  completedAt?: string;
}

const INITIAL_DATA: FunnelData = {
  vehicleType: '',
  employmentStatus: '',
  monthlyIncome: '',
  jobDuration: '',
  creditSituation: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  preferredContact: '',
  caslConsent: false,
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
};

const TOTAL_STEPS = 7;

/* ============================================
   HELPERS
   ============================================ */

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, '').length === 10;
}

/* ============================================
   ANIMATED CHECKMARK (green)
   ============================================ */

function AnimatedCheckmark(): React.ReactElement {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle
          cx="60" cy="60" r="54"
          fill="none" stroke="#22C55E" strokeWidth="5"
          strokeDasharray="339.29"
          strokeDashoffset="339.29"
          style={{ animation: 'circleIn 0.6s ease-out 0.2s forwards' }}
        />
        <circle
          cx="60" cy="60" r="54"
          fill="#F0FDF4"
          opacity="0"
          style={{ animation: 'fillIn 0.3s ease-out 0.7s forwards' }}
        />
        <path
          d="M36 62 L52 78 L84 42"
          fill="none" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="72"
          strokeDashoffset="72"
          style={{ animation: 'checkIn 0.4s ease-out 0.9s forwards' }}
        />
      </svg>
      <style>{`
        @keyframes circleIn { to { stroke-dashoffset: 0; } }
        @keyframes checkIn { to { stroke-dashoffset: 0; } }
        @keyframes fillIn { to { opacity: 1; } }
      `}</style>
    </div>
  );
}

/* ============================================
   LENDER LOGOS
   ============================================ */

function LenderLogos(): React.ReactElement {
  const lenders = [
    { name: 'CIBC', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/48/CIBC_logo_2021.svg/500px-CIBC_logo_2021.svg.png' },
    { name: 'TD', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Toronto-Dominion_Bank_logo.svg/500px-Toronto-Dominion_Bank_logo.svg.png' },
    { name: 'iA Financial', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/10/IA_Financial_Group_logo.svg/500px-IA_Financial_Group_logo.svg.png' },
  ];
  return (
    <div style={{ marginTop: 32, textAlign: 'center' as const }}>
      <p style={{
        fontSize: 12,
        fontWeight: 600,
        color: '#9CA3AF',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        marginBottom: 12,
      }}>
        Our Top Lenders
      </p>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        flexWrap: 'wrap' as const,
      }}>
        {lenders.map((l) => (
          <div key={l.name} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            height: 44,
            minWidth: 80,
          }}>
            <img
              src={l.logo}
              alt={l.name}
              style={{ height: 28, maxWidth: 100, objectFit: 'contain' as const }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================
   TRUST BADGES
   ============================================ */

function TrustBadges(): React.ReactElement {
  const badges = [
    { icon: '\u{1F6E1}', label: 'No Credit Impact' },
    { icon: '\u{23F1}', label: 'Takes 2 Minutes' },
    { icon: '\u{1F512}', label: '100% Secure' },
    { icon: '\u2705', label: '94% Approval Rate' },
  ];
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: 16,
      marginTop: 16,
      paddingTop: 16,
      borderTop: '1px solid #F3F4F6',
      flexWrap: 'wrap' as const,
    }}>
      {badges.map((b) => (
        <div key={b.label} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12,
          color: '#6B7280',
          fontWeight: 500,
        }}>
          <span style={{ fontSize: 14 }}>{b.icon}</span>
          {b.label}
        </div>
      ))}
    </div>
  );
}

/* ============================================
   FOOTER (Lenders + Trust — shown on every step)
   ============================================ */

function StepFooter(): React.ReactElement {
  return (
    <div style={{ marginTop: 32 }}>
      <LenderLogos />
      <TrustBadges />
    </div>
  );
}

/* ============================================
   MAIN COMPONENT
   ============================================ */

export default function DealershipFunnelPage(): React.ReactElement {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FunnelData>(INITIAL_DATA);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // UTM capture
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setData((prev) => ({
      ...prev,
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
    }));
  }, []);

  const update = useCallback((field: keyof FunnelData, value: string | boolean) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const goTo = useCallback((target: number, dir: 'forward' | 'back') => {
    if (isAnimating) return;
    setDirection(dir);
    setIsAnimating(true);
    setTimeout(() => {
      setStep(target);
      setIsAnimating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  }, [isAnimating]);

  const goNext = useCallback(() => {
    goTo(Math.min(step + 1, TOTAL_STEPS), 'forward');
  }, [step, goTo]);

  const goBack = useCallback(() => {
    if (step <= 1) return;
    goTo(step - 1, 'back');
  }, [step, goTo]);

  const selectAndAdvance = useCallback((field: keyof FunnelData, value: string) => {
    update(field, value);
    setTimeout(() => goNext(), 180);
  }, [update, goNext]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload = { ...data, completedAt: new Date().toISOString() };
      const res = await fetch('/api/funnel-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Submission failed');
      setData((prev) => ({ ...prev, completedAt: payload.completedAt }));
      goNext();
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [data, isSubmitting, goNext]);

  /* ---------- shared styles ---------- */

  const cardStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '20px 24px',
    borderRadius: 16,
    border: selected ? '2px solid #FBBF24' : '2px solid #F3F4F6',
    backgroundColor: selected ? '#FFFBEB' : '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
    userSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    boxShadow: selected
      ? '0 0 0 3px rgba(251,191,36,0.15)'
      : '0 1px 3px rgba(0,0,0,0.04)',
  });

  const headingStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 800,
    color: '#111827',
    marginBottom: 8,
    lineHeight: 1.25,
    textAlign: 'center' as const,
    letterSpacing: '-0.02em',
  };

  const subStyle: React.CSSProperties = {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 1.6,
    textAlign: 'center' as const,
  };

  const ctaButtonStyle = (enabled: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '18px 0',
    borderRadius: 14,
    border: 'none',
    backgroundColor: enabled ? '#FBBF24' : '#E5E7EB',
    color: enabled ? '#111827' : '#9CA3AF',
    fontSize: 17,
    fontWeight: 800,
    cursor: enabled ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s ease',
    marginTop: 24,
    letterSpacing: '-0.01em',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px 18px',
    borderRadius: 12,
    border: '2px solid #F3F4F6',
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box' as const,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  };

  /* ---------- step content ---------- */

  function renderStep(): React.ReactElement | null {
    switch (step) {
      /* ===== STEP 1: VEHICLE TYPE ===== */
      case 1: {
        const vehicles = [
          { value: 'car', label: 'Sedan', img: 'https://www.pngall.com/wp-content/uploads/2/Sedan-Car-PNG-Image-HD.png' },
          { value: 'suv', label: 'SUV', img: 'https://www.pngall.com/wp-content/uploads/8/SUV-PNG-Image-File.png' },
          { value: 'truck', label: 'Truck', img: 'https://www.pngall.com/wp-content/uploads/5/Pickup-Truck-PNG-Image-HD.png' },
          { value: 'van', label: 'Van', img: 'https://www.pngall.com/wp-content/uploads/15/Van-No-Background.png' },
        ];
        return (
          <>
            <h1 style={headingStyle}>What type of vehicle are you looking for?</h1>
            <p style={subStyle}>Pick the one that fits your lifestyle.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {vehicles.map((v) => (
                <div
                  key={v.value}
                  onClick={() => selectAndAdvance('vehicleType', v.value)}
                  style={{
                    ...cardStyle(data.vehicleType === v.value),
                    flexDirection: 'column',
                    padding: '20px 12px 16px',
                    fontSize: 16,
                    fontWeight: 600,
                    gap: 0,
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && selectAndAdvance('vehicleType', v.value)}
                >
                  <img
                    src={v.img}
                    alt={v.label}
                    style={{
                      width: '100%',
                      height: 80,
                      objectFit: 'contain',
                      marginBottom: 8,
                      pointerEvents: 'none',
                    }}
                  />
                  <span>{v.label}</span>
                </div>
              ))}
            </div>
          </>
        );
      }

      /* ===== STEP 2: EMPLOYMENT STATUS ===== */
      case 2: {
        const options = [
          { value: 'employed', label: 'Employed' },
          { value: 'self_employed', label: 'Self Employed' },
          { value: 'retired', label: 'Retired / Pension' },
          { value: 'disability', label: 'Disability / Other' },
        ];
        return (
          <>
            <h1 style={headingStyle}>What is your employment status?</h1>
            <p style={subStyle}>This helps us match you with the right lender.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {options.map((o) => (
                <div
                  key={o.value}
                  onClick={() => selectAndAdvance('employmentStatus', o.value)}
                  style={cardStyle(data.employmentStatus === o.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && selectAndAdvance('employmentStatus', o.value)}
                >
                  <span>{o.label}</span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 20,
              padding: '12px 16px',
              borderRadius: 10,
              backgroundColor: '#FEF3C7',
              fontSize: 13,
              color: '#92400E',
              textAlign: 'center' as const,
              fontWeight: 500,
            }}>
              Minimum income of $2,000/month required
            </div>
          </>
        );
      }

      /* ===== STEP 3: MONTHLY INCOME ===== */
      case 3: {
        const options = [
          { value: '2000_2500', label: '$2,000 - $2,500' },
          { value: '2500_3000', label: '$2,500 - $3,000' },
          { value: '3000_3500', label: '$3,000 - $3,500' },
          { value: '3500_4500', label: '$3,500 - $4,500' },
          { value: '4500_plus', label: '$4,500+' },
        ];
        return (
          <>
            <h1 style={headingStyle}>What is your monthly income?</h1>
            <p style={subStyle}>Before taxes. This determines your financing options.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {options.map((o) => (
                <div
                  key={o.value}
                  onClick={() => selectAndAdvance('monthlyIncome', o.value)}
                  style={cardStyle(data.monthlyIncome === o.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && selectAndAdvance('monthlyIncome', o.value)}
                >
                  <span>{o.label}</span>
                </div>
              ))}
            </div>
          </>
        );
      }

      /* ===== STEP 4: EMPLOYMENT DURATION ===== */
      case 4: {
        const options = [
          { value: 'less_3_months', label: 'Less than 3 months' },
          { value: '3_12_months', label: '3 - 12 months' },
          { value: '1_2_years', label: '1 - 2 years' },
          { value: '2_plus_years', label: '2+ years' },
        ];
        return (
          <>
            <h1 style={headingStyle}>How long have you been at your current job?</h1>
            <p style={subStyle}>Lenders look at job stability as part of the approval.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {options.map((o) => (
                <div
                  key={o.value}
                  onClick={() => selectAndAdvance('jobDuration', o.value)}
                  style={cardStyle(data.jobDuration === o.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && selectAndAdvance('jobDuration', o.value)}
                >
                  <span>{o.label}</span>
                </div>
              ))}
            </div>
          </>
        );
      }

      /* ===== STEP 5: CREDIT SITUATION ===== */
      case 5: {
        const options = [
          { value: 'excellent', label: 'Excellent', sub: '750+' },
          { value: 'good', label: 'Good', sub: '650 - 749' },
          { value: 'fair', label: 'Fair', sub: '550 - 649' },
          { value: 'rebuilding', label: 'Rebuilding', sub: 'Under 550' },
          { value: 'bankruptcy', label: 'Bankruptcy / Proposal', sub: '' },
          { value: 'new_to_canada', label: 'New to Canada', sub: '' },
          { value: 'dont_know', label: "I don't know", sub: '' },
        ];
        return (
          <>
            <h1 style={headingStyle}>What best describes your credit?</h1>
            <p style={subStyle}>No judgment. Every situation is different.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {options.map((o) => (
                <div
                  key={o.value}
                  onClick={() => selectAndAdvance('creditSituation', o.value)}
                  style={{
                    ...cardStyle(data.creditSituation === o.value),
                    justifyContent: 'flex-start',
                    padding: '18px 22px',
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && selectAndAdvance('creditSituation', o.value)}
                >
                  <div style={{ textAlign: 'left' as const }}>
                    <div>{o.label}</div>
                    {o.sub && (
                      <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2, fontWeight: 400 }}>
                        {o.sub}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 20,
              padding: '14px 18px',
              borderRadius: 12,
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              fontSize: 14,
              color: '#166534',
              textAlign: 'center' as const,
              fontWeight: 500,
            }}>
              We approve all credit situations. <strong>94% of applicants get approved.</strong>
            </div>
          </>
        );
      }

      /* ===== STEP 6: CONTACT INFO ===== */
      case 6: {
        const contactOptions = [
          { value: 'text', label: 'Text' },
          { value: 'email', label: 'Email' },
          { value: 'call', label: 'Call' },
        ];
        const canSubmit =
          data.firstName.trim() &&
          data.lastName.trim() &&
          isValidPhone(data.phone) &&
          isValidEmail(data.email) &&
          data.preferredContact &&
          data.caslConsent;
        return (
          <>
            <h1 style={headingStyle}>Last step! Where should we send your result?</h1>
            <p style={subStyle}>Your pre-qualification is almost ready.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>First Name</label>
                  <input
                    type="text"
                    placeholder="John"
                    value={data.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    style={inputStyle}
                    autoComplete="given-name"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Last Name</label>
                  <input
                    type="text"
                    placeholder="Smith"
                    value={data.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    style={inputStyle}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  type="tel"
                  placeholder="(613) 555-1234"
                  value={data.phone}
                  onChange={(e) => update('phone', formatPhone(e.target.value))}
                  style={inputStyle}
                  autoComplete="tel"
                />
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={data.email}
                  onChange={(e) => update('email', e.target.value)}
                  style={inputStyle}
                  autoComplete="email"
                />
              </div>
            </div>

            <p style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 12,
              marginTop: 28,
            }}>
              Preferred way to reach you
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {contactOptions.map((o) => (
                <div
                  key={o.value}
                  onClick={() => update('preferredContact', o.value)}
                  style={{
                    ...cardStyle(data.preferredContact === o.value),
                    flex: 1,
                    padding: '16px 8px',
                    fontSize: 15,
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && update('preferredContact', o.value)}
                >
                  {o.label}
                </div>
              ))}
            </div>

            {/* CASL Consent */}
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              marginTop: 28,
              cursor: 'pointer',
              fontSize: 13,
              color: '#6B7280',
              lineHeight: 1.6,
            }}>
              <input
                type="checkbox"
                checked={data.caslConsent}
                onChange={(e) => update('caslConsent', e.target.checked)}
                style={{
                  width: 22,
                  height: 22,
                  marginTop: 2,
                  accentColor: '#FBBF24',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              />
              <span>
                I consent to receive communications about my financing application via text, email, or phone.
                I understand I can unsubscribe at any time. By submitting, I agree to the{' '}
                <a href="/privacy" style={{ color: '#FBBF24', textDecoration: 'underline' }}>Privacy Policy</a> and{' '}
                <a href="/terms" style={{ color: '#FBBF24', textDecoration: 'underline' }}>Terms of Service</a>.
              </span>
            </label>

            {submitError && (
              <div style={{
                marginTop: 14,
                padding: '14px 18px',
                borderRadius: 12,
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: 14,
              }}>
                {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              style={ctaButtonStyle(!!(canSubmit && !isSubmitting))}
            >
              {isSubmitting ? 'Submitting...' : 'Get My Pre-Qualification \u2192'}
            </button>
          </>
        );
      }

      /* ===== STEP 7: SUCCESS ===== */
      case 7: {
        const summaryLabel = (val: string): string =>
          val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        return (
          <div style={{ textAlign: 'center' as const, paddingTop: 8 }}>
            <AnimatedCheckmark />
            <h1 style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#111827',
              marginBottom: 8,
              letterSpacing: '-0.02em',
            }}>
              You're Pre-Qualified!
            </h1>
            <p style={{
              fontSize: 17,
              color: '#6B7280',
              lineHeight: 1.6,
              marginBottom: 32,
              maxWidth: 400,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              Based on your profile, we're confident we can get you approved.
            </p>

            {/* Summary Card */}
            <div style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 16,
              padding: '24px 24px',
              textAlign: 'left' as const,
              marginBottom: 28,
            }}>
              <h3 style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#111827',
                marginBottom: 16,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
              }}>
                Your Summary
              </h3>
              {[
                { label: 'Vehicle', value: summaryLabel(data.vehicleType) },
                { label: 'Employment', value: summaryLabel(data.employmentStatus) },
                { label: 'Income', value: summaryLabel(data.monthlyIncome) },
                { label: 'Job Duration', value: summaryLabel(data.jobDuration) },
                { label: 'Credit', value: summaryLabel(data.creditSituation) },
                { label: 'Contact', value: `${data.firstName} ${data.lastName}` },
              ].map((row) => (
                <div key={row.label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid #E5E7EB',
                  fontSize: 14,
                }}>
                  <span style={{ color: '#6B7280' }}>{row.label}</span>
                  <span style={{
                    color: '#111827',
                    fontWeight: 600,
                    textTransform: 'capitalize' as const,
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Next Steps */}
            <div style={{
              backgroundColor: '#FFFBEB',
              borderRadius: 16,
              padding: '24px',
              textAlign: 'left' as const,
              marginBottom: 28,
            }}>
              <h3 style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#111827',
                marginBottom: 18,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
              }}>
                What Happens Next
              </h3>
              {[
                { num: '1', text: 'A specialist will contact you within 15 minutes' },
                { num: '2', text: "We'll match you with our best lending partner" },
                { num: '3', text: "You'll receive 2-3 vehicle options" },
                { num: '4', text: 'Free delivery anywhere in Ontario & Quebec' },
              ].map((s) => (
                <div key={s.num} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  marginBottom: 14,
                }}>
                  <span style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    backgroundColor: '#FBBF24',
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 14,
                    flexShrink: 0,
                  }}>
                    {s.num}
                  </span>
                  <span style={{
                    fontSize: 15,
                    color: '#374151',
                    lineHeight: 1.5,
                    paddingTop: 5,
                  }}>
                    {s.text}
                  </span>
                </div>
              ))}
            </div>

            <a
              href="https://readycar.ca/inventory/used/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                padding: '18px 0',
                borderRadius: 14,
                border: 'none',
                backgroundColor: '#FBBF24',
                color: '#111827',
                fontSize: 17,
                fontWeight: 800,
                textAlign: 'center' as const,
                textDecoration: 'none',
                letterSpacing: '-0.01em',
                transition: 'all 0.2s ease',
              }}
            >
              Browse Inventory While You Wait {'\u2192'}
            </a>
          </div>
        );
      }

      default:
        return null;
    }
  }

  /* ---------- progress ---------- */

  const progressPercent = step === 7 ? 100 : ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Global animation keyframes */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInForward {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInBack {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        input:focus {
          border-color: #FBBF24 !important;
          box-shadow: 0 0 0 3px rgba(251,191,36,0.15) !important;
        }
        div[role="button"]:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
          transform: translateY(-1px);
        }
        div[role="button"]:active {
          transform: scale(0.98);
        }
        button:hover:not(:disabled) {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }
        a:hover {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }
      `}</style>

      {/* Sticky Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #F3F4F6',
      }}>
        <div style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '14px 24px 14px',
        }}>
          {/* Logo */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 10,
          }}>
            <span style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.03em',
            }}>
              <span style={{ color: '#FBBF24' }}>N</span>exus Auto
            </span>
          </div>

          {step < 7 && (
            <>
              {/* Back + Step Counter */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
                {step > 1 ? (
                  <button
                    onClick={goBack}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: 0,
                      fontWeight: 500,
                    }}
                  >
                    {'\u2190'} Back
                  </button>
                ) : (
                  <span />
                )}
                <span style={{
                  fontSize: 13,
                  color: '#9CA3AF',
                  fontWeight: 600,
                }}>
                  Step {step} / 7
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{
                height: 5,
                backgroundColor: '#F3F4F6',
                borderRadius: 5,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: '#FBBF24',
                  borderRadius: 5,
                  transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              </div>
            </>
          )}

          {step === 7 && (
            <div style={{
              height: 5,
              backgroundColor: '#FBBF24',
              borderRadius: 5,
            }} />
          )}
        </div>
      </div>

      {/* Headline (only on step 1, above the card) */}
      {step === 1 && (
        <div style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '32px 24px 0',
          textAlign: 'center' as const,
        }}>
          <h1 style={{
            fontSize: 36,
            fontWeight: 900,
            color: '#111827',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: 4,
          }}>
            Get a Car Loan Fast
          </h1>
          <p style={{
            fontSize: 16,
            color: '#6B7280',
            marginBottom: 0,
          }}>
            Pre-qualify in 2 minutes. No impact on your credit score.
          </p>
        </div>
      )}

      {/* Form Container */}
      <div
        ref={containerRef}
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: step === 1 ? '24px 24px 40px' : '32px 24px 40px',
        }}
      >
        <div
          key={step}
          style={{
            animation: isAnimating
              ? 'none'
              : direction === 'forward'
                ? 'slideInForward 0.25s ease-out'
                : 'slideInBack 0.25s ease-out',
          }}
        >
          {renderStep()}
        </div>

        {/* Footer: Lenders + Trust Badges on every step */}
        <StepFooter />
      </div>
    </div>
  );
}
