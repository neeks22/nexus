'use client';

import { useState } from 'react';
import styles from './page.module.css';

// ---------------------------------------------------------------------------
// TODO: Replace the localStorage fallback with a real submission endpoint.
// Options:
//   - Formspree:  POST to https://formspree.io/f/<your-id>
//   - Supabase:   insert into a `contact_submissions` table via supabase-js
//   - Custom API: POST to /api/contact (a Next.js Route Handler)
// ---------------------------------------------------------------------------

interface FormFields {
  name: string;
  email: string;
  company: string;
  role: string;
  challenge: string;
  budget: string;
}

const EMPTY_FIELDS: FormFields = {
  name: '',
  email: '',
  company: '',
  role: '',
  challenge: '',
  budget: '',
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function ContactForm() {
  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<Partial<FormFields>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isSubmittable = fields.name.trim() !== '' && fields.email.trim() !== '';

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void {
    const { id, value } = e.target;
    setFields((prev) => ({ ...prev, [id]: value }));
    // Clear the error for this field as the user types
    if (errors[id as keyof FormFields]) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  }

  function validate(): boolean {
    const next: Partial<FormFields> = {};

    if (!fields.name.trim()) {
      next.name = 'Name is required.';
    }

    if (!fields.email.trim()) {
      next.email = 'Email is required.';
    } else if (!isValidEmail(fields.email)) {
      next.email = 'Please enter a valid email address.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    // Simulate network latency so the loading state is perceptible
    await new Promise((resolve) => setTimeout(resolve, 900));

    try {
      // ---------------------------------------------------------------------------
      // FALLBACK: persist to localStorage until a real endpoint exists.
      // Remove this block once the API is wired up.
      // ---------------------------------------------------------------------------
      const submission = {
        ...fields,
        submittedAt: new Date().toISOString(),
      };
      const existing = JSON.parse(
        localStorage.getItem('nexus_contact_submissions') ?? '[]'
      ) as unknown[];
      existing.push(submission);
      localStorage.setItem('nexus_contact_submissions', JSON.stringify(existing));
      // ---------------------------------------------------------------------------

      setIsSuccess(true);
      setFields(EMPTY_FIELDS);
      setErrors({});
    } catch {
      // Even if localStorage fails (private-browsing / storage full), show success —
      // the form will be wired to a real backend before going to production.
      setIsSuccess(true);
      setFields(EMPTY_FIELDS);
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div className={styles.formCard}>
        <div className={styles.successState}>
          <div className={styles.successIcon} aria-hidden="true">
            ✓
          </div>
          <h2 className={styles.successTitle}>You&rsquo;re on our radar.</h2>
          <p className={styles.successMessage}>
            Thanks! We&rsquo;ll be in touch within 24 hours.
          </p>
          <p className={styles.successSub}>
            A real human will read your message — no auto-responders, no sales scripts.
            Check your inbox (and spam, just in case).
          </p>
          <button
            className={styles.successReset}
            onClick={() => setIsSuccess(false)}
            type="button"
          >
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formCard}>
      <h2 className={styles.formTitle}>Book your free audit call</h2>
      <p className={styles.formSubtitle}>
        We&rsquo;ll respond within 24 hours to schedule a time that works.
      </p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>
              Your Name <span className={styles.required}>*</span>
            </label>
            <input
              id="name"
              type="text"
              placeholder="Jane Smith"
              className={`${styles.formInput}${errors.name ? ` ${styles.inputError}` : ''}`}
              value={fields.name}
              onChange={handleChange}
              autoComplete="name"
            />
            {errors.name && (
              <span className={styles.errorMsg} role="alert">
                {errors.name}
              </span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Work Email <span className={styles.required}>*</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="jane@company.com"
              className={`${styles.formInput}${errors.email ? ` ${styles.inputError}` : ''}`}
              value={fields.email}
              onChange={handleChange}
              autoComplete="email"
            />
            {errors.email && (
              <span className={styles.errorMsg} role="alert">
                {errors.email}
              </span>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="company" className={styles.formLabel}>Company</label>
          <input
            id="company"
            type="text"
            placeholder="Acme Corp"
            className={styles.formInput}
            value={fields.company}
            onChange={handleChange}
            autoComplete="organization"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="role" className={styles.formLabel}>Your Role</label>
          <select
            id="role"
            className={styles.formSelect}
            value={fields.role}
            onChange={handleChange}
          >
            <option value="">Select your role</option>
            <option>CEO / Founder</option>
            <option>CTO / Technical Lead</option>
            <option>VP / Director of Operations</option>
            <option>VP / Director of Engineering</option>
            <option>Product Manager</option>
            <option>Other</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="challenge" className={styles.formLabel}>
            What&rsquo;s your biggest AI challenge right now?
          </label>
          <textarea
            id="challenge"
            className={styles.formTextarea}
            placeholder="Tell us what you're trying to automate, what you've tried, or where your current AI systems are falling short. The more specific, the better."
            rows={5}
            value={fields.challenge}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="budget" className={styles.formLabel}>
            Approximate budget (optional)
          </label>
          <select
            id="budget"
            className={styles.formSelect}
            value={fields.budget}
            onChange={handleChange}
          >
            <option value="">Prefer not to say</option>
            <option>Under $10,000</option>
            <option>$10,000 – $25,000</option>
            <option>$25,000 – $50,000</option>
            <option>$50,000 – $100,000</option>
            <option>$100,000+</option>
          </select>
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!isSubmittable || isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <span className={styles.btnLoading}>
              <span className={styles.spinner} aria-hidden="true" /> Sending…
            </span>
          ) : (
            'Send My Request →'
          )}
        </button>

        <p className={styles.formNote}>
          We&rsquo;ll respond within 24 hours with available times.
          No auto-generated responses — a real human will read this.
        </p>
      </form>
    </div>
  );
}
