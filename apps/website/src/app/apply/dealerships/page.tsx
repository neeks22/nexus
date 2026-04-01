'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ============================================
   TYPES
   ============================================ */

interface FunnelData {
  vehicleType: string;
  budget: string;
  downPayment: string;
  creditSituation: string;
  employmentType: string;
  jobDuration: string;
  monthlyIncome: string;
  tradeIn: string;
  tradeInYear: string;
  tradeInMake: string;
  tradeInModel: string;
  tradeInKm: string;
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
  budget: '',
  downPayment: '',
  creditSituation: '',
  employmentType: '',
  jobDuration: '',
  monthlyIncome: '',
  tradeIn: '',
  tradeInYear: '',
  tradeInMake: '',
  tradeInModel: '',
  tradeInKm: '',
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
   ANIMATED CHECKMARK
   ============================================ */

function AnimatedCheckmark() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle
          cx="48" cy="48" r="44"
          fill="none" stroke="#FBBF24" strokeWidth="4"
          strokeDasharray="276.46"
          strokeDashoffset="276.46"
          style={{
            animation: 'circleIn 0.6s ease-out 0.2s forwards',
          }}
        />
        <path
          d="M28 50 L42 64 L68 34"
          fill="none" stroke="#FBBF24" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="60"
          strokeDashoffset="60"
          style={{
            animation: 'checkIn 0.4s ease-out 0.7s forwards',
          }}
        />
      </svg>
      <style>{`
        @keyframes circleIn {
          to { stroke-dashoffset: 0; }
        }
        @keyframes checkIn {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

/* ============================================
   TRUST BADGES
   ============================================ */

function TrustBadges() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: 24,
      marginTop: 32,
      paddingTop: 24,
      borderTop: '1px solid #E5E7EB',
      flexWrap: 'wrap',
    }}>
      {[
        { icon: '🔒', label: 'Bank-Level Encryption' },
        { icon: '✅', label: '94% Approval Rate' },
        { icon: '⚡', label: 'Results in 60 Seconds' },
      ].map((badge) => (
        <div key={badge.label} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: '#6B7280',
        }}>
          <span style={{ fontSize: 16 }}>{badge.icon}</span>
          {badge.label}
        </div>
      ))}
    </div>
  );
}

/* ============================================
   MAIN COMPONENT
   ============================================ */

export default function DealershipFunnelPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FunnelData>(INITIAL_DATA);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
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

  const goNext = useCallback(() => {
    if (isAnimating) return;
    setDirection('left');
    setIsAnimating(true);
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
      setIsAnimating(false);
    }, 250);
  }, [isAnimating]);

  const goBack = useCallback(() => {
    if (isAnimating || step <= 1) return;
    setDirection('right');
    setIsAnimating(true);
    setTimeout(() => {
      setStep((s) => Math.max(s - 1, 1));
      setIsAnimating(false);
    }, 250);
  }, [isAnimating, step]);

  const selectAndAdvance = useCallback((field: keyof FunnelData, value: string) => {
    update(field, value);
    setTimeout(() => goNext(), 200);
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
    gap: 14,
    padding: '18px 22px',
    borderRadius: 14,
    border: selected ? '2px solid #FBBF24' : '2px solid #E5E7EB',
    backgroundColor: selected ? '#FFFBEB' : '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: 17,
    fontWeight: 500,
    color: '#111827',
    userSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
  });

  const headingStyle: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 8,
    lineHeight: 1.3,
  };

  const subStyle: React.CSSProperties = {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 28,
    lineHeight: 1.5,
  };

  const ctaButtonStyle = (enabled: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '16px 0',
    borderRadius: 12,
    border: 'none',
    backgroundColor: enabled ? '#FBBF24' : '#E5E7EB',
    color: enabled ? '#111827' : '#9CA3AF',
    fontSize: 17,
    fontWeight: 700,
    cursor: enabled ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s ease',
    marginTop: 20,
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 10,
    border: '2px solid #E5E7EB',
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 12,
    marginTop: 24,
  };

  /* ---------- step content ---------- */

  function renderStep() {
    switch (step) {
      /* ===== STEP 1: VEHICLE TYPE ===== */
      case 1: {
        const options = [
          { value: 'sedan', icon: '🚗', label: 'Car / Sedan' },
          { value: 'suv', icon: '🚙', label: 'SUV / Crossover' },
          { value: 'truck', icon: '🛻', label: 'Truck' },
          { value: 'van', icon: '🚐', label: 'Van / Minivan' },
          { value: 'not_sure', icon: '🤔', label: "Not sure yet" },
        ];
        return (
          <>
            <h1 style={headingStyle}>What type of vehicle are you looking for?</h1>
            <p style={subStyle}>Pick the one that fits your lifestyle. You can always change your mind later.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {options.map((o) => (
                <div
                  key={o.value}
                  onClick={() => selectAndAdvance('vehicleType', o.value)}
                  style={cardStyle(data.vehicleType === o.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && selectAndAdvance('vehicleType', o.value)}
                >
                  <span style={{ fontSize: 28 }}>{o.icon}</span>
                  <span>{o.label}</span>
                </div>
              ))}
            </div>
          </>
        );
      }

      /* ===== STEP 2: BUDGET ===== */
      case 2: {
        const budgets = [
          { value: 'under_250', label: 'Under $250/mo' },
          { value: '250_350', label: '$250 – $350/mo' },
          { value: '350_450', label: '$350 – $450/mo' },
          { value: '450_550', label: '$450 – $550/mo' },
          { value: '550_plus', label: '$550+/mo' },
          { value: 'flexible', label: "I'm flexible" },
        ];
        const downs = [
          { value: '0', label: '$0' },
          { value: '500_1000', label: '$500 – $1,000' },
          { value: '1000_3000', label: '$1,000 – $3,000' },
          { value: '3000_5000', label: '$3,000 – $5,000' },
          { value: '5000_plus', label: '$5,000+' },
        ];
        const canProceed = data.budget && data.downPayment;
        return (
          <>
            <h1 style={headingStyle}>What monthly payment works for your budget?</h1>
            <p style={subStyle}>No commitment — just helps us find the right match.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {budgets.map((o) => (
                <div
                  key={o.value}
                  onClick={() => update('budget', o.value)}
                  style={cardStyle(data.budget === o.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && update('budget', o.value)}
                >
                  <span>{o.label}</span>
                </div>
              ))}
            </div>
            <p style={sectionLabelStyle}>How much can you put down?</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {downs.map((o) => (
                <div
                  key={o.value}
                  onClick={() => update('downPayment', o.value)}
                  style={{
                    ...cardStyle(data.downPayment === o.value),
                    flex: '1 1 calc(50% - 5px)',
                    justifyContent: 'center',
                    padding: '14px 12px',
                    fontSize: 15,
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && update('downPayment', o.value)}
                >
                  {o.label}
                </div>
              ))}
            </div>
            <button
              onClick={goNext}
              disabled={!canProceed}
              style={ctaButtonStyle(!!canProceed)}
            >
              Continue
            </button>
          </>
        );
      }

      /* ===== STEP 3: CREDIT ===== */
      case 3: {
        const options = [
          { value: 'excellent', icon: '🌟', label: 'Excellent', sub: '750+' },
          { value: 'good', icon: '👍', label: 'Good', sub: '650–749' },
          { value: 'building', icon: '📈', label: 'Building', sub: '550–649' },
          { value: 'rebuilding', icon: '🔧', label: 'Rebuilding', sub: 'Under 550' },
          { value: 'bankruptcy', icon: '📋', label: 'Bankruptcy / Proposal', sub: '' },
          { value: 'new_to_canada', icon: '🇨🇦', label: 'New to Canada', sub: '' },
          { value: 'dont_know', icon: '❓', label: "Don't know", sub: '' },
        ];
        return (
          <>
            <h1 style={headingStyle}>What best describes your credit?</h1>
            <p style={subStyle}>No judgment here — just helps us match you with the right lenders.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {options.map((o) => (
                <div
                  key={o.value}
                  onClick={() => selectAndAdvance('creditSituation', o.value)}
                  style={cardStyle(data.creditSituation === o.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && selectAndAdvance('creditSituation', o.value)}
                >
                  <span style={{ fontSize: 24 }}>{o.icon}</span>
                  <div>
                    <div>{o.label}</div>
                    {o.sub && <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{o.sub}</div>}
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
              textAlign: 'center',
            }}>
              ✅ We approve all credit situations. <strong>94% approval rate.</strong>
            </div>
          </>
        );
      }

      /* ===== STEP 4: EMPLOYMENT ===== */
      case 4: {
        const types = [
          { value: 'full_time', label: 'Full-Time' },
          { value: 'part_time', label: 'Part-Time' },
          { value: 'self_employed', label: 'Self-Employed' },
          { value: 'disability_pension', label: 'Disability / Pension' },
          { value: 'other', label: 'Other' },
        ];
        const durations = [
          { value: 'less_6', label: '< 6 months' },
          { value: '6_12', label: '6–12 months' },
          { value: '1_2_years', label: '1–2 years' },
          { value: '2_plus', label: '2+ years' },
        ];
        const canProceed = data.employmentType && data.jobDuration && data.monthlyIncome;
        return (
          <>
            <h1 style={headingStyle}>Tell us about your income</h1>
            <p style={subStyle}>This helps lenders determine what you qualify for.</p>

            <p style={sectionLabelStyle}>Employment type</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {types.map((o) => (
                <div
                  key={o.value}
                  onClick={() => update('employmentType', o.value)}
                  style={{
                    ...cardStyle(data.employmentType === o.value),
                    flex: '1 1 calc(50% - 5px)',
                    justifyContent: 'center',
                    padding: '14px 12px',
                    fontSize: 15,
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && update('employmentType', o.value)}
                >
                  {o.label}
                </div>
              ))}
            </div>

            <p style={sectionLabelStyle}>How long at current job?</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {durations.map((o) => (
                <div
                  key={o.value}
                  onClick={() => update('jobDuration', o.value)}
                  style={{
                    ...cardStyle(data.jobDuration === o.value),
                    flex: '1 1 calc(50% - 5px)',
                    justifyContent: 'center',
                    padding: '14px 12px',
                    fontSize: 15,
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && update('jobDuration', o.value)}
                >
                  {o.label}
                </div>
              ))}
            </div>

            <p style={sectionLabelStyle}>Monthly income (before taxes)</p>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 18,
                fontWeight: 600,
                color: '#6B7280',
              }}>$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="3,500"
                value={data.monthlyIncome}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const formatted = raw ? Number(raw).toLocaleString() : '';
                  update('monthlyIncome', formatted);
                }}
                style={{
                  ...inputStyle,
                  paddingLeft: 36,
                  fontSize: 22,
                  fontWeight: 600,
                }}
              />
            </div>

            <button
              onClick={goNext}
              disabled={!canProceed}
              style={ctaButtonStyle(!!canProceed)}
            >
              Continue
            </button>
          </>
        );
      }

      /* ===== STEP 5: TRADE-IN ===== */
      case 5: {
        const options = [
          { value: 'yes', icon: '✅', label: 'Yes' },
          { value: 'no', icon: '❌', label: 'No' },
          { value: 'not_sure', icon: '🤷', label: 'Not sure' },
        ];
        const showFields = data.tradeIn === 'yes';
        const canProceed = data.tradeIn === 'no' || data.tradeIn === 'not_sure' ||
          (showFields && data.tradeInYear && data.tradeInMake && data.tradeInModel);
        return (
          <>
            <h1 style={headingStyle}>Do you have a vehicle to trade in?</h1>
            <p style={subStyle}>A trade-in can reduce your payments or eliminate a down payment.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {options.map((o) => (
                <div
                  key={o.value}
                  onClick={() => {
                    update('tradeIn', o.value);
                    if (o.value !== 'yes') setTimeout(() => goNext(), 300);
                  }}
                  style={{
                    ...cardStyle(data.tradeIn === o.value),
                    flex: 1,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '20px 12px',
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      update('tradeIn', o.value);
                      if (o.value !== 'yes') setTimeout(() => goNext(), 300);
                    }
                  }}
                >
                  <span style={{ fontSize: 28, marginBottom: 6, display: 'block' }}>{o.icon}</span>
                  <span>{o.label}</span>
                </div>
              ))}
            </div>

            {showFields && (
              <div style={{
                marginTop: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                animation: 'fadeIn 0.3s ease',
              }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Year</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="2019"
                      value={data.tradeInYear}
                      onChange={(e) => update('tradeInYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Make</label>
                    <input
                      type="text"
                      placeholder="Toyota"
                      value={data.tradeInMake}
                      onChange={(e) => update('tradeInMake', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Model</label>
                    <input
                      type="text"
                      placeholder="Corolla"
                      value={data.tradeInModel}
                      onChange={(e) => update('tradeInModel', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Kilometers</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="85,000"
                      value={data.tradeInKm}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        update('tradeInKm', raw ? Number(raw).toLocaleString() : '');
                      }}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <button
                  onClick={goNext}
                  disabled={!canProceed}
                  style={ctaButtonStyle(!!canProceed)}
                >
                  Continue
                </button>
              </div>
            )}
          </>
        );
      }

      /* ===== STEP 6: CONTACT ===== */
      case 6: {
        const contactOptions = [
          { value: 'text', icon: '💬', label: 'Text' },
          { value: 'email', icon: '📧', label: 'Email' },
          { value: 'phone', icon: '📞', label: 'Phone Call' },
        ];
        const canSubmit = data.firstName && data.lastName && isValidPhone(data.phone) &&
          isValidEmail(data.email) && data.preferredContact && data.caslConsent;
        return (
          <>
            <h1 style={headingStyle}>Where should we send your result?</h1>
            <p style={subStyle}>We'll have your pre-qualification ready in about 60 seconds.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>First name</label>
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
                  <label style={labelStyle}>Last name</label>
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
                <label style={labelStyle}>Phone number</label>
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
                <label style={labelStyle}>Email address</label>
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

            <p style={sectionLabelStyle}>Preferred way to reach you</p>
            <div style={{ display: 'flex', gap: 10 }}>
              {contactOptions.map((o) => (
                <div
                  key={o.value}
                  onClick={() => update('preferredContact', o.value)}
                  style={{
                    ...cardStyle(data.preferredContact === o.value),
                    flex: 1,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '14px 8px',
                    fontSize: 14,
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && update('preferredContact', o.value)}
                >
                  <span style={{ fontSize: 24, marginBottom: 4, display: 'block' }}>{o.icon}</span>
                  {o.label}
                </div>
              ))}
            </div>

            {/* CASL Consent */}
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginTop: 24,
              cursor: 'pointer',
              fontSize: 13,
              color: '#6B7280',
              lineHeight: 1.5,
            }}>
              <input
                type="checkbox"
                checked={data.caslConsent}
                onChange={(e) => update('caslConsent', e.target.checked)}
                style={{
                  width: 20,
                  height: 20,
                  marginTop: 2,
                  accentColor: '#FBBF24',
                  flexShrink: 0,
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
                marginTop: 12,
                padding: '12px 16px',
                borderRadius: 10,
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
              {isSubmitting ? 'Submitting...' : 'Get My Pre-Qualification →'}
            </button>
          </>
        );
      }

      /* ===== STEP 7: SUCCESS ===== */
      case 7:
        return (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <AnimatedCheckmark />
            <h1 style={{ ...headingStyle, fontSize: 30, marginBottom: 12 }}>
              You're Pre-Qualified!
            </h1>
            <p style={{ fontSize: 17, color: '#6B7280', lineHeight: 1.6, marginBottom: 28 }}>
              Great news, {data.firstName}! Based on your information, you qualify for financing options.
            </p>

            {/* Summary */}
            <div style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 16,
              padding: '24px 20px',
              textAlign: 'left',
              marginBottom: 28,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
                Your Application Summary
              </h3>
              {[
                { label: 'Vehicle', value: data.vehicleType.replace(/_/g, ' ') },
                { label: 'Budget', value: data.budget.replace(/_/g, ' ') },
                { label: 'Credit', value: data.creditSituation.replace(/_/g, ' ') },
                { label: 'Employment', value: data.employmentType.replace(/_/g, ' ') },
                { label: 'Trade-in', value: data.tradeIn === 'yes' ? `${data.tradeInYear} ${data.tradeInMake} ${data.tradeInModel}` : 'None' },
              ].map((row) => (
                <div key={row.label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #E5E7EB',
                  fontSize: 14,
                }}>
                  <span style={{ color: '#6B7280' }}>{row.label}</span>
                  <span style={{ color: '#111827', fontWeight: 600, textTransform: 'capitalize' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Next Steps */}
            <div style={{
              backgroundColor: '#FFFBEB',
              borderRadius: 16,
              padding: '20px',
              textAlign: 'left',
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
                What happens next?
              </h3>
              {[
                { num: '1', text: 'A financing specialist will review your application' },
                { num: '2', text: `We'll reach out via ${data.preferredContact || 'your preferred method'} within 1 hour` },
                { num: '3', text: "You'll receive personalized vehicle options that fit your budget" },
              ].map((s) => (
                <div key={s.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: '#FBBF24',
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}>{s.num}</span>
                  <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.5, paddingTop: 4 }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  /* ---------- progress ---------- */

  const progressPercent = step === 7 ? 100 : ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F9FAFB',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "DM Sans", sans-serif',
    }}>
      {/* Global animation keyframes */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        input:focus { border-color: #FBBF24 !important; box-shadow: 0 0 0 3px rgba(251,191,36,0.15) !important; }
        div[role="button"]:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); transform: translateY(-1px); }
        div[role="button"]:active { transform: scale(0.98); }
        button:hover:not(:disabled) { filter: brightness(1.05); transform: translateY(-1px); }
      `}</style>

      {/* Progress Bar */}
      {step < 7 && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #F3F4F6',
          padding: '12px 24px 12px',
        }}>
          <div style={{
            maxWidth: 640,
            margin: '0 auto',
          }}>
            {/* Nexus Auto Branding */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
                <span style={{ color: '#FBBF24' }}>N</span>exus Auto
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
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
                  }}
                >
                  ← Back
                </button>
              ) : (
                <span />
              )}
              <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>
                Step {step} of 6
              </span>
            </div>
            <div style={{
              height: 4,
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                backgroundColor: '#FBBF24',
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Form Container */}
      <div
        ref={containerRef}
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: step === 7 ? '40px 24px 60px' : '32px 24px 60px',
        }}
      >
        <div
          key={step}
          style={{
            backgroundColor: step === 7 ? 'transparent' : '#FFFFFF',
            borderRadius: step === 7 ? 0 : 20,
            padding: step === 7 ? 0 : '32px 28px',
            boxShadow: step === 7 ? 'none' : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
            animation: isAnimating
              ? 'none'
              : direction === 'left'
                ? 'slideInLeft 0.3s ease'
                : 'slideInRight 0.3s ease',
          }}
        >
          {renderStep()}
        </div>

        {/* Trust badges (steps 1–6) */}
        {step < 7 && <TrustBadges />}
      </div>
    </div>
  );
}
