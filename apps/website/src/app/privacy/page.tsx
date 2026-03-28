import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy for Nexus AI Agency. Learn how we collect, use, and protect your personal information in compliance with PIPEDA.',
};

export default function PrivacyPage() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.label}>Legal</p>
          <h1 className={styles.headline}>Privacy Policy</h1>
          <p className={styles.meta}>
            Nexus AI Inc. &mdash; Ottawa, ON, Canada
            <br />
            Last updated: March 28, 2026
          </p>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Overview</h2>
            <p className={styles.text}>
              Nexus AI Inc. (&quot;Nexus&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is a Canadian B2B AI agency
              headquartered in Ottawa, Ontario. We are committed to protecting the privacy of
              individuals who interact with our website and services. This Privacy Policy describes
              what personal information we collect, how we use it, and your rights regarding that
              information.
            </p>
            <p className={styles.text}>
              This policy applies to personal information collected through our website at
              nexusagents.com and through any direct business communications with Nexus.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Information We Collect</h2>
            <p className={styles.text}>
              We collect only the information necessary to respond to your inquiries and provide
              our services. This includes:
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Contact information:</strong> Your name, business email address, and company
                name, collected when you submit our contact form or reach out to us directly.
              </li>
              <li className={styles.listItem}>
                <strong>Business context:</strong> Details about your company&apos;s technology stack or
                AI challenges that you voluntarily share when inquiring about our services.
              </li>
              <li className={styles.listItem}>
                <strong>Usage data:</strong> Standard web server logs including IP addresses, browser
                type, and pages visited. This data is used in aggregate for site performance and is
                not linked to individual identities.
              </li>
            </ul>
            <p className={styles.text}>
              We do not collect sensitive personal information such as social insurance numbers,
              financial account details, or health information through this website.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>How We Use Your Information</h2>
            <p className={styles.text}>We use the information you provide to:</p>
            <ul className={styles.list}>
              <li className={styles.listItem}>Respond to your inquiries and contact form submissions</li>
              <li className={styles.listItem}>Assess your needs and provide relevant service recommendations</li>
              <li className={styles.listItem}>Deliver contracted AI agent development and consulting services</li>
              <li className={styles.listItem}>
                Send follow-up communications related to your inquiry, including project proposals
                and status updates
              </li>
              <li className={styles.listItem}>
                Send commercial electronic messages where you have provided consent, with an
                unsubscribe option in every message
              </li>
            </ul>
            <p className={styles.text}>
              We will not use your information for purposes beyond those listed above without
              obtaining your consent.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>We Do Not Sell Your Data</h2>
            <p className={styles.text}>
              Nexus does not sell, rent, trade, or otherwise transfer your personal information to
              third parties for their marketing purposes. Ever.
            </p>
            <p className={styles.text}>
              We may share information with trusted service providers who assist us in operating our
              business (for example, a CRM platform or email service), but only to the extent
              necessary to perform those services, and only under agreements that require them to
              keep your information confidential.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Data Storage and Security</h2>
            <p className={styles.text}>
              We store personal information in Canada where possible. Where third-party services
              are used (such as cloud infrastructure providers), we select providers that offer
              Canadian or equivalent data residency options and maintain appropriate security
              certifications.
            </p>
            <p className={styles.text}>
              We implement reasonable technical and organizational measures to protect your personal
              information from unauthorized access, disclosure, alteration, or destruction. These
              measures include encrypted data transmission (TLS), access controls, and regular
              security reviews.
            </p>
            <p className={styles.text}>
              No method of transmission over the internet is 100% secure. While we take the
              protection of your data seriously, we cannot guarantee absolute security.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Data Retention</h2>
            <p className={styles.text}>
              We retain personal information only for as long as it is necessary to fulfill the
              purposes for which it was collected, or as required by law. Contact form submissions
              and related communications are generally retained for up to 3 years following our last
              substantive interaction, after which they are securely deleted.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>PIPEDA Compliance</h2>
            <p className={styles.text}>
              Nexus AI Inc. complies with Canada&apos;s <em>Personal Information Protection and Electronic
              Documents Act</em> (PIPEDA) and applicable provincial privacy legislation. Under PIPEDA,
              you have the right to:
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                Know what personal information we hold about you
              </li>
              <li className={styles.listItem}>
                Access your personal information and request corrections if it is inaccurate
              </li>
              <li className={styles.listItem}>
                Withdraw consent for the use of your personal information at any time, subject to
                legal or contractual restrictions
              </li>
              <li className={styles.listItem}>
                Request that your personal information be deleted (see below)
              </li>
              <li className={styles.listItem}>
                File a complaint with the Office of the Privacy Commissioner of Canada if you
                believe your privacy rights have been violated
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Your Right to Request Data Deletion</h2>
            <p className={styles.text}>
              You may request the deletion of your personal information at any time by contacting
              us at the address below. We will fulfill deletion requests within 30 days, except
              where retention is required by law or is necessary to complete an existing contractual
              obligation.
            </p>
            <p className={styles.text}>
              To submit a deletion request, please email{' '}
              <a href="mailto:privacy@nexusagents.com" className={styles.link}>
                privacy@nexusagents.com
              </a>{' '}
              with the subject line &quot;Data Deletion Request&quot; and include your name and the email
              address you used to contact us.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Cookies and Tracking</h2>
            <p className={styles.text}>
              Our website may use minimal cookies for essential functionality (such as remembering
              form state). We do not use third-party advertising trackers or behavioral analytics
              platforms that profile individual visitors.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Changes to This Policy</h2>
            <p className={styles.text}>
              We may update this Privacy Policy from time to time. When we do, we will update the
              &quot;Last updated&quot; date at the top of this page. We encourage you to review this policy
              periodically. Continued use of our website after any changes constitutes your
              acceptance of the updated policy.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact for Privacy Questions</h2>
            <p className={styles.text}>
              If you have questions, concerns, or requests related to this Privacy Policy or the
              handling of your personal information, please contact our Privacy Officer:
            </p>
            <div className={styles.contactBlock}>
              <p className={styles.contactLine}>
                <strong>Nexus AI Inc. &mdash; Privacy Officer</strong>
              </p>
              <p className={styles.contactLine}>Ottawa, Ontario, Canada</p>
              <p className={styles.contactLine}>
                <a href="mailto:privacy@nexusagents.com" className={styles.link}>
                  privacy@nexusagents.com
                </a>
              </p>
            </div>
            <p className={styles.text}>
              We will respond to all privacy inquiries within 10 business days.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
