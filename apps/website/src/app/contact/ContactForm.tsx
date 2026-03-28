'use client';

import styles from './page.module.css';

export function ContactForm() {
  return (
    <div className={styles.formCard}>
      <h2 className={styles.formTitle}>Book your free audit call</h2>
      <p className={styles.formSubtitle}>
        We&rsquo;ll respond within 24 hours to schedule a time that works.
      </p>
      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>Your Name</label>
            <input
              id="name"
              type="text"
              placeholder="Jane Smith"
              className={styles.formInput}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>Work Email</label>
            <input
              id="email"
              type="email"
              placeholder="jane@company.com"
              className={styles.formInput}
              required
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="company" className={styles.formLabel}>Company</label>
          <input
            id="company"
            type="text"
            placeholder="Acme Corp"
            className={styles.formInput}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="role" className={styles.formLabel}>Your Role</label>
          <select id="role" className={styles.formSelect}>
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
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="budget" className={styles.formLabel}>
            Approximate budget (optional)
          </label>
          <select id="budget" className={styles.formSelect}>
            <option value="">Prefer not to say</option>
            <option>Under $10,000</option>
            <option>$10,000 – $25,000</option>
            <option>$25,000 – $50,000</option>
            <option>$50,000 – $100,000</option>
            <option>$100,000+</option>
          </select>
        </div>

        <button type="submit" className={styles.submitBtn}>
          Send My Request →
        </button>

        <p className={styles.formNote}>
          We&rsquo;ll respond within 24 hours with available times.
          No auto-generated responses — a real human will read this.
        </p>
      </form>
    </div>
  );
}
