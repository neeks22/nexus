'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';

/* ============================================
   FUNNEL DATA TYPES
   ============================================ */

interface FunnelData {
  vehicleType: string;
  budget: string;
  employment: string;
  creditSituation: string;
  tradeIn: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  caslConsent: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  completedAt?: string;
}

const STORAGE_KEY = 'nexus_funnel_progress';
const TOTAL_STEPS = 7;

/* ============================================
   VEHICLE RECOMMENDATIONS (based on type + budget)
   ============================================ */

interface VehicleRec {
  year: number;
  make: string;
  model: string;
  payment: string;
  image: string;
}

function getVehicleRecommendations(vehicleType: string, budget: string): VehicleRec[] {
  const recs: Record<string, Record<string, VehicleRec[]>> = {
    suv: {
      'under-250': [
        { year: 2021, make: 'Hyundai', model: 'Tucson', payment: '$229/mo', image: 'SUV' },
        { year: 2020, make: 'Kia', model: 'Sportage', payment: '$219/mo', image: 'SUV' },
        { year: 2020, make: 'Chevrolet', model: 'Equinox', payment: '$239/mo', image: 'SUV' },
      ],
      '250-350': [
        { year: 2023, make: 'Honda', model: 'CR-V', payment: '$299/mo', image: 'SUV' },
        { year: 2022, make: 'Toyota', model: 'RAV4', payment: '$319/mo', image: 'SUV' },
        { year: 2023, make: 'Hyundai', model: 'Tucson', payment: '$289/mo', image: 'SUV' },
      ],
      '350-500': [
        { year: 2024, make: 'Honda', model: 'CR-V', payment: '$379/mo', image: 'SUV' },
        { year: 2024, make: 'Toyota', model: 'RAV4', payment: '$399/mo', image: 'SUV' },
        { year: 2023, make: 'Ford', model: 'Escape', payment: '$359/mo', image: 'SUV' },
      ],
      '500-plus': [
        { year: 2025, make: 'Toyota', model: 'Highlander', payment: '$529/mo', image: 'SUV' },
        { year: 2024, make: 'Honda', model: 'Pilot', payment: '$549/mo', image: 'SUV' },
        { year: 2024, make: 'Hyundai', model: 'Palisade', payment: '$519/mo', image: 'SUV' },
      ],
    },
    sedan: {
      'under-250': [
        { year: 2021, make: 'Honda', model: 'Civic', payment: '$199/mo', image: 'Sedan' },
        { year: 2020, make: 'Toyota', model: 'Corolla', payment: '$189/mo', image: 'Sedan' },
        { year: 2021, make: 'Hyundai', model: 'Elantra', payment: '$209/mo', image: 'Sedan' },
      ],
      '250-350': [
        { year: 2023, make: 'Honda', model: 'Civic', payment: '$279/mo', image: 'Sedan' },
        { year: 2023, make: 'Toyota', model: 'Camry', payment: '$299/mo', image: 'Sedan' },
        { year: 2022, make: 'Mazda', model: 'Mazda3', payment: '$269/mo', image: 'Sedan' },
      ],
      '350-500': [
        { year: 2024, make: 'Honda', model: 'Accord', payment: '$369/mo', image: 'Sedan' },
        { year: 2024, make: 'Toyota', model: 'Camry', payment: '$389/mo', image: 'Sedan' },
        { year: 2024, make: 'Mazda', model: 'Mazda3', payment: '$349/mo', image: 'Sedan' },
      ],
      '500-plus': [
        { year: 2025, make: 'Honda', model: 'Accord', payment: '$519/mo', image: 'Sedan' },
        { year: 2025, make: 'Toyota', model: 'Camry XSE', payment: '$539/mo', image: 'Sedan' },
        { year: 2024, make: 'Mazda', model: 'Mazda6', payment: '$499/mo', image: 'Sedan' },
      ],
    },
    truck: {
      'under-250': [
        { year: 2019, make: 'Ford', model: 'Ranger', payment: '$239/mo', image: 'Truck' },
        { year: 2019, make: 'Chevrolet', model: 'Colorado', payment: '$229/mo', image: 'Truck' },
        { year: 2018, make: 'Toyota', model: 'Tacoma', payment: '$249/mo', image: 'Truck' },
      ],
      '250-350': [
        { year: 2022, make: 'Ford', model: 'Ranger', payment: '$319/mo', image: 'Truck' },
        { year: 2021, make: 'Toyota', model: 'Tacoma', payment: '$339/mo', image: 'Truck' },
        { year: 2022, make: 'Chevrolet', model: 'Colorado', payment: '$299/mo', image: 'Truck' },
      ],
      '350-500': [
        { year: 2023, make: 'Ford', model: 'F-150', payment: '$429/mo', image: 'Truck' },
        { year: 2023, make: 'RAM', model: '1500', payment: '$449/mo', image: 'Truck' },
        { year: 2023, make: 'Chevrolet', model: 'Silverado', payment: '$419/mo', image: 'Truck' },
      ],
      '500-plus': [
        { year: 2025, make: 'Ford', model: 'F-150', payment: '$549/mo', image: 'Truck' },
        { year: 2024, make: 'RAM', model: '1500', payment: '$569/mo', image: 'Truck' },
        { year: 2024, make: 'Toyota', model: 'Tundra', payment: '$559/mo', image: 'Truck' },
      ],
    },
  };

  const type = vehicleType.toLowerCase();
  const budgetKey = budget || '250-350';
  const fallbackType = recs[type] ? type : 'suv';
  const fallbackBudget = recs[fallbackType][budgetKey] ? budgetKey : '250-350';

  return recs[fallbackType][fallbackBudget];
}

/* ============================================
   STEP ICONS (inline SVG for zero deps)
   ============================================ */

function CarIcon(): JSX.Element {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-3-5H9L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function DollarIcon(): JSX.Element {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function BriefcaseIcon(): JSX.Element {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function ShieldIcon(): JSX.Element {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function RepeatIcon(): JSX.Element {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function UserIcon(): JSX.Element {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CheckCircleIcon(): JSX.Element {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ArrowLeftIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

/* ============================================
   GTM DATA LAYER PUSH
   ============================================ */

function pushDataLayer(event: string, data?: Record<string, unknown>): void {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...data });
  }
}

/* ============================================
   MAIN FUNNEL COMPONENT
   ============================================ */

export default function ApplyPage(): JSX.Element {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');

  const [formData, setFormData] = useState<FunnelData>({
    vehicleType: '',
    budget: '',
    employment: '',
    creditSituation: '',
    tradeIn: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    caslConsent: false,
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
  });

  // Load saved progress from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { step: number; data: FunnelData };
        if (parsed.data && parsed.step && parsed.step < TOTAL_STEPS) {
          setFormData(parsed.data);
          setCurrentStep(parsed.step);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Capture UTM parameters from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const utmSource = params.get('utm_source') || '';
      const utmMedium = params.get('utm_medium') || '';
      const utmCampaign = params.get('utm_campaign') || '';
      if (utmSource || utmMedium || utmCampaign) {
        setFormData((prev) => ({ ...prev, utmSource, utmMedium, utmCampaign }));
      }
    }
  }, []);

  // Auto-save progress
  useEffect(() => {
    if (currentStep < TOTAL_STEPS) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ step: currentStep, data: formData })
        );
      } catch {
        // Ignore storage errors
      }
    }
  }, [currentStep, formData]);

  // Track step changes in GTM
  useEffect(() => {
    pushDataLayer(`funnel_step_${currentStep}`, {
      funnel_step: currentStep,
      vehicle_type: formData.vehicleType,
      budget: formData.budget,
    });
  }, [currentStep, formData.vehicleType, formData.budget]);

  const goNext = useCallback(() => {
    setSlideDirection('forward');
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const goBack = useCallback(() => {
    setSlideDirection('backward');
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const selectOption = useCallback(
    (field: keyof FunnelData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Small delay for visual feedback
      setTimeout(() => goNext(), 200);
    },
    [goNext]
  );

  const handleInputChange = useCallback(
    (field: keyof FunnelData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
      setSubmitError('Please fill in all fields.');
      return;
    }
    if (!formData.caslConsent) {
      setSubmitError('Please agree to receive communications to continue.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload = { ...formData, completedAt: new Date().toISOString() };
      const res = await fetch('/api/funnel-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Submission failed');
      }

      // Clear saved progress
      localStorage.removeItem(STORAGE_KEY);

      pushDataLayer('funnel_complete', {
        vehicle_type: formData.vehicleType,
        budget: formData.budget,
        utm_source: formData.utmSource,
        utm_medium: formData.utmMedium,
        utm_campaign: formData.utmCampaign,
      });

      goNext();
    } catch {
      setSubmitError('Something went wrong. Please try again or call us directly.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, goNext]);

  const progressPercent = Math.round(((currentStep - 1) / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className={styles.page}>
      {/* ── TOP BAR ─────────────────────────────── */}
      <nav className={styles.topBar}>
        <div className={styles.topBarInner}>
          <span className={styles.logo}>
            <span className={styles.logoMark}>N</span> Nexus Auto
          </span>
          <div className={styles.trustBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            No credit check to apply
          </div>
        </div>
      </nav>

      {/* ── PROGRESS BAR ───────────────────────── */}
      {currentStep < TOTAL_STEPS && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className={styles.progressLabel}>
            Step {currentStep} of {TOTAL_STEPS - 1}
          </div>
        </div>
      )}

      {/* ── STEP CONTENT ──────────────────────── */}
      <main
        className={`${styles.stepContainer} ${
          slideDirection === 'forward' ? styles.slideForward : styles.slideBackward
        }`}
        key={currentStep}
      >
        {/* STEP 1 — Vehicle Interest */}
        {currentStep === 1 && (
          <div className={styles.step}>
            <div className={styles.stepIcon}><CarIcon /></div>
            <h1 className={styles.stepTitle}>What type of vehicle are you looking for?</h1>
            <p className={styles.stepSubtext}>
              No commitment -- just tell us what you like.
            </p>
            <div className={styles.optionGrid}>
              {[
                { value: 'suv', label: 'SUV', icon: 'SUV' },
                { value: 'sedan', label: 'Sedan', icon: 'Sedan' },
                { value: 'truck', label: 'Truck', icon: 'Truck' },
                { value: 'van', label: 'Van', icon: 'Van' },
                { value: 'coupe', label: 'Coupe', icon: 'Coupe' },
                { value: 'not-sure', label: 'Not Sure', icon: '?' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.optionButton} ${
                    formData.vehicleType === opt.value ? styles.optionSelected : ''
                  }`}
                  onClick={() => selectOption('vehicleType', opt.value)}
                  type="button"
                >
                  <span className={styles.optionIcon}>{opt.icon}</span>
                  <span className={styles.optionLabel}>{opt.label}</span>
                </button>
              ))}
            </div>
            <div className={styles.trustIndicators}>
              <span className={styles.trustItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                98% approval rate
              </span>
              <span className={styles.trustItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                Free, no obligation
              </span>
              <span className={styles.trustItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                2-minute application
              </span>
            </div>
          </div>
        )}

        {/* STEP 2 — Budget Range */}
        {currentStep === 2 && (
          <div className={styles.step}>
            <div className={styles.stepIcon}><DollarIcon /></div>
            <h1 className={styles.stepTitle}>What&rsquo;s your ideal monthly budget?</h1>
            <p className={styles.stepSubtext}>
              No judgment -- we work with all budgets.
            </p>
            <div className={styles.optionGrid}>
              {[
                { value: 'under-250', label: 'Under $250/mo' },
                { value: '250-350', label: '$250 - $350/mo' },
                { value: '350-500', label: '$350 - $500/mo' },
                { value: '500-plus', label: '$500+/mo' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.optionButton} ${styles.optionWide} ${
                    formData.budget === opt.value ? styles.optionSelected : ''
                  }`}
                  onClick={() => selectOption('budget', opt.value)}
                  type="button"
                >
                  <span className={styles.optionLabel}>{opt.label}</span>
                </button>
              ))}
            </div>
            <button className={styles.backButton} onClick={goBack} type="button">
              <ArrowLeftIcon /> Back
            </button>
          </div>
        )}

        {/* STEP 3 — Employment */}
        {currentStep === 3 && (
          <div className={styles.step}>
            <div className={styles.stepIcon}><BriefcaseIcon /></div>
            <h1 className={styles.stepTitle}>What best describes your employment?</h1>
            <p className={styles.stepSubtext}>
              Your job is your credit -- employed? You&rsquo;re halfway there.
            </p>
            <div className={styles.optionGrid}>
              {[
                { value: 'full-time', label: 'Full-time' },
                { value: 'part-time', label: 'Part-time' },
                { value: 'self-employed', label: 'Self-employed' },
                { value: 'retired', label: 'Retired' },
                { value: 'other', label: 'Other' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.optionButton} ${styles.optionWide} ${
                    formData.employment === opt.value ? styles.optionSelected : ''
                  }`}
                  onClick={() => selectOption('employment', opt.value)}
                  type="button"
                >
                  <span className={styles.optionLabel}>{opt.label}</span>
                </button>
              ))}
            </div>
            <button className={styles.backButton} onClick={goBack} type="button">
              <ArrowLeftIcon /> Back
            </button>
          </div>
        )}

        {/* STEP 4 — Credit Situation */}
        {currentStep === 4 && (
          <div className={styles.step}>
            <div className={styles.stepIcon}><ShieldIcon /></div>
            <h1 className={styles.stepTitle}>How would you describe your credit situation?</h1>
            <p className={styles.stepSubtext}>
              We work with all credit situations. 98% approval rate.
            </p>
            <div className={styles.optionGrid}>
              {[
                { value: 'excellent', label: 'Excellent' },
                { value: 'good', label: 'Good' },
                { value: 'fair', label: 'Fair' },
                { value: 'rebuilding', label: 'Rebuilding' },
                { value: 'not-sure', label: 'Not Sure' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.optionButton} ${styles.optionWide} ${
                    formData.creditSituation === opt.value ? styles.optionSelected : ''
                  }`}
                  onClick={() => selectOption('creditSituation', opt.value)}
                  type="button"
                >
                  <span className={styles.optionLabel}>{opt.label}</span>
                </button>
              ))}
            </div>
            <div className={styles.creditDisclaimer}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              This does NOT affect your credit score
            </div>
            <button className={styles.backButton} onClick={goBack} type="button">
              <ArrowLeftIcon /> Back
            </button>
          </div>
        )}

        {/* STEP 5 — Trade-In */}
        {currentStep === 5 && (
          <div className={styles.step}>
            <div className={styles.stepIcon}><RepeatIcon /></div>
            <h1 className={styles.stepTitle}>Do you have a vehicle to trade in?</h1>
            <p className={styles.stepSubtext}>
              A trade-in can lower your monthly payment significantly.
            </p>
            <div className={styles.optionGrid}>
              <button
                className={`${styles.optionButton} ${styles.optionWide} ${
                  formData.tradeIn === 'yes' ? styles.optionSelected : ''
                }`}
                onClick={() => selectOption('tradeIn', 'yes')}
                type="button"
              >
                <span className={styles.optionLabel}>Yes -- I want a trade-in value</span>
              </button>
              <button
                className={`${styles.optionButton} ${styles.optionWide} ${
                  formData.tradeIn === 'no' ? styles.optionSelected : ''
                }`}
                onClick={() => selectOption('tradeIn', 'no')}
                type="button"
              >
                <span className={styles.optionLabel}>No -- buying outright</span>
              </button>
            </div>
            {formData.tradeIn === 'yes' && (
              <p className={styles.tradeInNote}>
                We&rsquo;ll include your trade-in value in your offer.
              </p>
            )}
            <button className={styles.backButton} onClick={goBack} type="button">
              <ArrowLeftIcon /> Back
            </button>
          </div>
        )}

        {/* STEP 6 — Contact Info */}
        {currentStep === 6 && (
          <div className={styles.step}>
            <div className={styles.stepIcon}><UserIcon /></div>
            <h1 className={styles.stepTitle}>Almost done! How can we reach you?</h1>
            <p className={styles.stepSubtext}>
              We&rsquo;ll have your pre-approval ready in minutes.
            </p>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  className={styles.formInput}
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Sarah"
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  className={styles.formInput}
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Johnson"
                  autoComplete="family-name"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  className={styles.formInput}
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(613) 555-0123"
                  autoComplete="tel"
                  required
                />
                <span className={styles.formHint}>
                  We&rsquo;ll text you your approval -- no spam, ever.
                </span>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  className={styles.formInput}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="sarah@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <label className={styles.consentLabel}>
              <input
                type="checkbox"
                checked={formData.caslConsent}
                onChange={(e) => handleInputChange('caslConsent', e.target.checked)}
                className={styles.consentCheckbox}
              />
              <span className={styles.consentText}>
                I agree to receive communications about my vehicle application.
                You can unsubscribe at any time. We respect your privacy and comply with CASL.
              </span>
            </label>

            {submitError && (
              <p className={styles.errorMessage}>{submitError}</p>
            )}

            <button
              className={styles.submitButton}
              onClick={handleSubmit}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? 'Submitting...' : 'Get My Pre-Approval'}
              {!isSubmitting && <span>&#8594;</span>}
            </button>

            <button className={styles.backButton} onClick={goBack} type="button">
              <ArrowLeftIcon /> Back
            </button>
          </div>
        )}

        {/* STEP 7 — Confirmation */}
        {currentStep === 7 && (
          <div className={styles.step}>
            <div className={styles.confirmIcon}><CheckCircleIcon /></div>
            <h1 className={styles.confirmTitle}>
              You&rsquo;re Pre-Approved!
            </h1>
            <p className={styles.confirmSubtext}>
              {formData.firstName}, your application is being reviewed by our financing team.
              A specialist will reach out within 5 minutes.
            </p>

            <div className={styles.nextSteps}>
              <h2 className={styles.nextStepsTitle}>What happens next</h2>
              <div className={styles.nextStepsList}>
                <div className={styles.nextStepItem}>
                  <span className={styles.nextStepNumber}>1</span>
                  <span>Our financing team reviews your application</span>
                </div>
                <div className={styles.nextStepItem}>
                  <span className={styles.nextStepNumber}>2</span>
                  <span>A specialist calls or texts you within 5 minutes</span>
                </div>
                <div className={styles.nextStepItem}>
                  <span className={styles.nextStepNumber}>3</span>
                  <span>We match you with the perfect vehicle and payment</span>
                </div>
              </div>
            </div>

            {/* Vehicle Recommendations */}
            <div className={styles.vehicleRecs}>
              <h2 className={styles.vehicleRecsTitle}>
                Based on your preferences, we recommend:
              </h2>
              <div className={styles.vehicleRecGrid}>
                {getVehicleRecommendations(formData.vehicleType, formData.budget).map(
                  (rec, i) => (
                    <div key={i} className={styles.vehicleRecCard}>
                      <div className={styles.vehicleRecBadge}>{rec.image}</div>
                      <div className={styles.vehicleRecInfo}>
                        <span className={styles.vehicleRecName}>
                          {rec.year} {rec.make} {rec.model}
                        </span>
                        <span className={styles.vehicleRecPayment}>
                          From {rec.payment}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className={styles.confirmActions}>
              <a href="tel:+16139001234" className={styles.callButton}>
                Call Us Now: (613) 900-1234
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
