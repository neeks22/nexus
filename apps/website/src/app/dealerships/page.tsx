import styles from './page.module.css';
import { HideGlobalChrome } from './hide-chrome';

export default function DealershipsPage() {
  return (
    <div className={styles.page}>
      <HideGlobalChrome />
      {/* ── MINIMAL NAV ──────────────────────────── */}
      <nav className={styles.topBar}>
        <div className={styles.topBarInner}>
          <span className={styles.logo}>
            <span className={styles.logoMark}>N</span> Nexus AI
          </span>
          <a href="#start-pilot" className={styles.topBarCta}>
            Start Free Pilot <span>→</span>
          </a>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Built for Canadian Dealerships
          </div>
          <h1 className={styles.heroHeadline}>
            Your Internet Leads Wait 47 Minutes.
            <br />
            <span className={styles.heroAccent}>Ours Get Answered in 60 Seconds.</span>
          </h1>
          <p className={styles.heroSubline}>
            AI-powered lead response that works 24/7, speaks English and French,
            and plugs into your Activix CRM. No new software to learn. No BDC
            agents to hire.
          </p>
          <div className={styles.heroActions}>
            <a href="#start-pilot" className={styles.heroPrimary}>
              Start Your Free 30-Day Pilot <span>→</span>
            </a>
            <a href="#how-it-works" className={styles.heroSecondary}>
              See How It Works
            </a>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>&lt; 60s</div>
              <div className={styles.heroStatLabel}>response time</div>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>24/7</div>
              <div className={styles.heroStatLabel}>coverage</div>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>EN/FR</div>
              <div className={styles.heroStatLabel}>bilingual</div>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>Activix</div>
              <div className={styles.heroStatLabel}>integrated</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ───────────────────────────────── */}
      <section className={styles.problem}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.label}>The Problem</p>
            <h2 className={styles.sectionTitle}>
              Every minute your lead waits, your competitor
              <br />
              gets closer to closing them
            </h2>
          </div>
          <div className={styles.painGrid}>
            <div className={styles.painCard}>
              <div className={styles.painIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div className={styles.painStat}>56%</div>
              <p className={styles.painText}>
                of your leads arrive after hours — and get no response until
                morning
              </p>
            </div>
            <div className={styles.painCard}>
              <div className={styles.painIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className={styles.painStat}>$60K+</div>
              <p className={styles.painText}>
                per year for a BDC team — and they still miss leads at lunch, on
                weekends, on holidays
              </p>
            </div>
            <div className={styles.painCard}>
              <div className={styles.painIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className={styles.painStat}>78%</div>
              <p className={styles.painText}>
                of buyers have already talked to another dealer by the time you
                call back
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────── */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.label}>How It Works</p>
            <h2 className={styles.sectionTitle}>
              From lead to appointment in four steps
            </h2>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>01</div>
              <h3 className={styles.stepTitle}>Lead comes in</h3>
              <p className={styles.stepText}>
                From your website, AutoTrader, Facebook, anywhere. The lead hits
                your CRM and our AI simultaneously.
              </p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>02</div>
              <h3 className={styles.stepTitle}>AI responds instantly</h3>
              <p className={styles.stepText}>
                Personalized SMS + email in under 60 seconds, referencing actual
                vehicles on your lot. EN or FR — detected automatically.
              </p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>03</div>
              <h3 className={styles.stepTitle}>AI qualifies &amp; nurtures</h3>
              <p className={styles.stepText}>
                7-touch follow-up sequence. Detects buying signals, handles
                objections, answers questions about financing and inventory.
              </p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>04</div>
              <h3 className={styles.stepTitle}>Hot lead → your sales team</h3>
              <p className={styles.stepText}>
                When the customer is ready, AI hands off with full context to a
                named sales rep. Slack notification + CRM update.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SUBPRIME SECTION ──────────────────────── */}
      <section className={styles.subprime}>
        <div className={styles.container}>
          <div className={styles.subprimeInner}>
            <div className={styles.subprimeLeft}>
              <p className={styles.label}>For Subprime Dealers</p>
              <h2 className={styles.subprimeTitle}>
                Your leads need MORE touchpoints, not fewer
              </h2>
              <p className={styles.subprimeText}>
                Subprime buyers research longer, ask more questions, and need
                more reassurance. That&rsquo;s exactly what AI is built for —
                infinite patience, instant response, 24/7.
              </p>
              <p className={styles.subprimeText}>
                <strong>&ldquo;Your Job Is Your Credit&rdquo;</strong> messaging
                — we help you reach nurses, trades workers, and union members who
                CAN finance but need the right approach. AI nurtures them through
                every question, every hesitation, every late-night Google search.
              </p>
            </div>
            <div className={styles.subprimeRight}>
              <div className={styles.subprimeCard}>
                <div className={styles.subprimeCardItem}>
                  <div className={styles.subprimeCardIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <span>Handles &ldquo;What do I need to qualify?&rdquo; instantly</span>
                </div>
                <div className={styles.subprimeCardItem}>
                  <div className={styles.subprimeCardIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <span>Follows up 7 times without burning out</span>
                </div>
                <div className={styles.subprimeCardItem}>
                  <div className={styles.subprimeCardIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <span>Responds at 11pm, 3am, Sunday morning</span>
                </div>
                <div className={styles.subprimeCardItem}>
                  <div className={styles.subprimeCardIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <span>Never judges. Never rushes. Never forgets to follow up.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────── */}
      <section className={styles.proof}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.label}>Why Activix Dealers Trust Us</p>
            <h2 className={styles.sectionTitle}>
              Built for Canadian dealerships
            </h2>
          </div>
          <div className={styles.proofStats}>
            <div className={styles.proofStat}>
              <div className={styles.proofStatValue}>840+</div>
              <div className={styles.proofStatLabel}>
                dealerships on Activix
              </div>
            </div>
            <div className={styles.proofStatDivider} />
            <div className={styles.proofStat}>
              <div className={styles.proofStatValue}>97%</div>
              <div className={styles.proofStatLabel}>
                Activix retention rate
              </div>
            </div>
            <div className={styles.proofStatDivider} />
            <div className={styles.proofStat}>
              <div className={styles.proofStatValue}>Native</div>
              <div className={styles.proofStatLabel}>
                CRM integration
              </div>
            </div>
          </div>
          <div className={styles.testimonialPlaceholder}>
            <blockquote className={styles.testimonialQuote}>
              &ldquo;We plugged Nexus into our Activix CRM on a Tuesday. By
              Thursday, leads that used to wait until morning were getting
              answered in under a minute. Our team just closes now — the AI
              handles everything before the handoff.&rdquo;
            </blockquote>
            <div className={styles.testimonialAttrib}>
              — Ottawa-area dealership, pilot client
            </div>
          </div>
        </div>
      </section>

      {/* ── THE OFFER ─────────────────────────────── */}
      <section id="start-pilot" className={styles.offer}>
        <div className={styles.container}>
          <div className={styles.offerCard}>
            <div className={styles.offerHeader}>
              <p className={styles.label}>The Offer</p>
              <h2 className={styles.offerTitle}>Free 30-Day Pilot</h2>
              <p className={styles.offerSubline}>
                We set everything up. You just sell cars.
              </p>
            </div>
            <div className={styles.offerGrid}>
              <div className={styles.offerIncludes}>
                <h3 className={styles.offerIncludesTitle}>
                  What&rsquo;s included
                </h3>
                <ul className={styles.offerList}>
                  <li className={styles.offerListItem}>
                    <span className={styles.offerCheck}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    AI lead response in under 60 seconds
                  </li>
                  <li className={styles.offerListItem}>
                    <span className={styles.offerCheck}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    7-touch nurture sequence
                  </li>
                  <li className={styles.offerListItem}>
                    <span className={styles.offerCheck}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Bilingual EN/FR messaging
                  </li>
                  <li className={styles.offerListItem}>
                    <span className={styles.offerCheck}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Activix CRM integration
                  </li>
                  <li className={styles.offerListItem}>
                    <span className={styles.offerCheck}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Slack notifications for hot leads
                  </li>
                  <li className={styles.offerListItem}>
                    <span className={styles.offerCheck}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    CASL compliance built in
                  </li>
                  <li className={styles.offerListItem}>
                    <span className={styles.offerCheck}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Monthly performance report
                  </li>
                </ul>
              </div>
              <div className={styles.offerCta}>
                <div className={styles.offerPriceBox}>
                  <div className={styles.offerPriceLabel}>Pilot price</div>
                  <div className={styles.offerPrice}>$0</div>
                  <div className={styles.offerPriceSub}>for 30 days</div>
                </div>
                <p className={styles.offerNoRisk}>
                  No contracts. No setup fees. Cancel anytime.
                </p>
                <a href="mailto:hello@nexusai.ca?subject=Free%2030-Day%20Pilot%20%E2%80%94%20Dealership" className={styles.offerButton}>
                  Start Your Free Pilot <span>→</span>
                </a>
                <p className={styles.offerAfter}>
                  After the pilot: $2,500/month if you love it. Walk away if you
                  don&rsquo;t.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────── */}
      <section className={styles.faq}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.label}>FAQ</p>
            <h2 className={styles.sectionTitle}>Common questions</h2>
          </div>
          <div className={styles.faqList}>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                Does this replace my BDC team?
              </summary>
              <p className={styles.faqAnswer}>
                No, it supercharges them. AI handles the first response and
                nurture — the repetitive work that burns out BDC reps. Your team
                gets warm, qualified leads with full context. They focus on what
                they do best: closing.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                Does it work with Activix?
              </summary>
              <p className={styles.faqAnswer}>
                Yes, native integration. Leads, updates, and notes sync
                automatically. Your team never leaves Activix — they just see
                better data, faster.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                What about CASL compliance?
              </summary>
              <p className={styles.faqAnswer}>
                Built in from day one. Consent tracking, opt-out handling, and
                bilingual disclosures in every message. We handle compliance so
                you don&rsquo;t have to think about it.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                How fast can I go live?
              </summary>
              <p className={styles.faqAnswer}>
                48 hours from the moment you give us Activix API access. We
                handle the setup, the integration, the testing. You just confirm
                it looks good and you&rsquo;re live.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                What happens after the pilot?
              </summary>
              <p className={styles.faqAnswer}>
                If you love it, $2,500/month. If not, walk away — no obligation,
                no awkward cancellation calls. We keep it simple because we know
                the results speak for themselves.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <span className={styles.logo}>
                <span className={styles.logoMark}>N</span> Nexus AI Agency
              </span>
              <p className={styles.footerTagline}>
                Built for Canadian dealerships. CASL compliant. Bilingual.
              </p>
            </div>
            <div className={styles.footerContact}>
              <p className={styles.footerLocation}>Ottawa, ON</p>
              <a href="mailto:hello@nexusai.ca" className={styles.footerLink}>
                hello@nexusai.ca
              </a>
              <a href="tel:+16139001234" className={styles.footerLink}>
                (613) 900-1234
              </a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>
              &copy; {new Date().getFullYear()} Nexus AI Agency. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
