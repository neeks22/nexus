import type { Metadata } from 'next';
import { ContactForm } from './ContactForm';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Book a Call',
  description:
    "Book a free 30-minute AI audit call with Nexus. Tell us your biggest AI challenge — we'll respond within 24 hours.",
};

export default function ContactPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroInner}>
            <div className={styles.heroLeft}>
              <p className={styles.label}>Free 30-Minute Call</p>
              <h1 className={styles.headline}>
                Let&rsquo;s talk about your AI challenges
              </h1>
              <p className={styles.subline}>
                No sales pitch. No commitment. We&rsquo;ll ask about your current workflows,
                what you&rsquo;ve tried before, and where you&rsquo;re losing time or money.
                You&rsquo;ll leave with at least one concrete idea you can act on — whether you
                work with us or not.
              </p>
              <div className={styles.whatToExpect}>
                <h2 className={styles.expectTitle}>What happens on the call</h2>
                <ul className={styles.expectList}>
                  {[
                    { icon: '🎯', text: 'We map your biggest automation opportunity in real time' },
                    { icon: '💰', text: 'We give you a rough ROI estimate before you hang up' },
                    { icon: '🗺️', text: 'We recommend the right starting point for your situation' },
                    { icon: '🤝', text: "We tell you honestly if we're not the right fit" },
                  ].map((item, i) => (
                    <li key={i} className={styles.expectItem}>
                      <span className={styles.expectIcon}>{item.icon}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.contactDetails}>
                <div className={styles.contactDetail}>
                  <span className={styles.contactDetailLabel}>Response time</span>
                  <span className={styles.contactDetailValue}>Within 24 hours</span>
                </div>
                <div className={styles.contactDetail}>
                  <span className={styles.contactDetailLabel}>Call format</span>
                  <span className={styles.contactDetailValue}>Video (Google Meet or Zoom)</span>
                </div>
                <div className={styles.contactDetail}>
                  <span className={styles.contactDetailLabel}>Location</span>
                  <span className={styles.contactDetailValue}>Ottawa, Canada (remote-friendly)</span>
                </div>
              </div>
            </div>

            <div className={styles.heroRight}>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.trust}>
        <div className={styles.container}>
          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>
              <div className={styles.trustIcon}>🔒</div>
              <div className={styles.trustText}>
                <strong>Your information stays private.</strong> We don&rsquo;t sell leads,
                share data with third parties, or add you to mailing lists without your consent.
              </div>
            </div>
            <div className={styles.trustItem}>
              <div className={styles.trustIcon}>🤝</div>
              <div className={styles.trustText}>
                <strong>No pressure, ever.</strong> If you&rsquo;re not a fit for Nexus,
                we&rsquo;ll tell you — and point you toward someone who might be.
              </div>
            </div>
            <div className={styles.trustItem}>
              <div className={styles.trustIcon}>📍</div>
              <div className={styles.trustText}>
                <strong>Ottawa-based, globally capable.</strong> We work with companies
                across Canada and the US. Government contractors welcome.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
