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
            Start Free Pilot <span>&#8594;</span>
          </a>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className={styles.heroOrb} />
        <div className={styles.heroOrbSecondary} />
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            The First AI System Built Exclusively for Canadian Dealers
          </div>
          <h1 className={styles.heroHeadline}>
            A Breakthrough AI System That Answers Every Lead in 60 Seconds
            <br />
            <span className={styles.heroAccent}>So You Never Lose a Sale to Slow Response Again.</span>
          </h1>
          <p className={styles.heroSubline}>
            The only AI lead response system purpose-built for Canadian dealerships.
            Works 24/7. Speaks English and French. Plugs into your CRM
            automatically. You don&rsquo;t need new software. You don&rsquo;t need
            to hire BDC agents. You don&rsquo;t need to change anything you do today.
          </p>
          <div className={styles.heroActions}>
            <a href="#start-pilot" className={styles.heroPrimary}>
              Start Your Free Pilot &mdash; Live in 48 Hours <span>&#8594;</span>
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
              <div className={styles.heroStatValue}>CRM</div>
              <div className={styles.heroStatLabel}>integrated</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ───────────────────────────────── */}
      <section className={styles.problem}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.labelPill}>
              <span className={styles.labelPillDotAmber} />
              The Massive Cost of Doing Nothing
            </div>
            <h2 className={styles.sectionTitle}>
              Every hour you wait is costing you thousands
              <br />
              in lost sales you will never get back
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
                of your leads arrive after hours &mdash; every single one sits
                unanswered, losing you money overnight
              </p>
            </div>
            <div className={styles.painCard}>
              <div className={styles.painIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className={styles.painStat}>$210K+</div>
              <p className={styles.painText}>
                per year for a full BDC team &mdash; and they still miss leads at
                lunch, on weekends, on holidays. That is a massive expense with
                massive gaps.
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
                of buyers purchase from the first dealer to respond &mdash; once
                they&rsquo;re gone, they&rsquo;re gone forever
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────── */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.labelPill}>
              <span className={styles.labelPillDotGreen} />
              Simple. Automatic. Proven.
            </div>
            <h2 className={styles.sectionTitle}>
              A push-button system that turns leads into
              appointments &mdash; automatically
            </h2>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>01</div>
              <h3 className={styles.stepTitle}>Lead comes in</h3>
              <p className={styles.stepText}>
                From your website, AutoTrader, Facebook &mdash; anywhere. Our system
                captures it instantly. You don&rsquo;t lift a finger.
              </p>
            </div>
            <div className={styles.stepConnector}><span /></div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>02</div>
              <h3 className={styles.stepTitle}>AI responds in seconds</h3>
              <p className={styles.stepText}>
                Personalized SMS + email in under 60 seconds, referencing actual
                vehicles on your lot. Language detected automatically. No
                templates. No delays.
              </p>
            </div>
            <div className={styles.stepConnector}><span /></div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>03</div>
              <h3 className={styles.stepTitle}>AI qualifies &amp; nurtures automatically</h3>
              <p className={styles.stepText}>
                A proven 7-touch system that runs itself. Detects buying
                signals, handles objections, and nurtures every lead &mdash; so
                nothing falls through the cracks. Ever.
              </p>
            </div>
            <div className={styles.stepConnector}><span /></div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>04</div>
              <h3 className={styles.stepTitle}>Hot lead &#8594; your closer</h3>
              <p className={styles.stepText}>
                When the customer is ready to buy, your sales rep gets a Slack
                alert with the full conversation. All you do is close the deal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SUBPRIME SECTION ──────────────────────── */}
      <section className={styles.subprime}>
        <div className={styles.subprimeGlow} />
        <div className={styles.container}>
          <div className={styles.subprimeInner}>
            <div className={styles.subprimeLeft}>
              <div className={styles.labelPill}>
                <span className={styles.labelPillDot} />
                A Breakthrough System for Subprime Dealers
              </div>
              <h2 className={styles.subprimeTitle}>
                The only AI built to convert the leads everyone else gives up on
              </h2>
              <p className={styles.subprimeText}>
                Subprime buyers need 8-12 touches to convert. Most BDC teams
                stop at 2. Our proven system delivers all 12 automatically &mdash;
                with infinite patience, instant response, and zero burnout.
                The results are predictable: 20-40% more appointments.
              </p>
              <p className={styles.subprimeText}>
                <strong>&ldquo;Your Job Is Your Credit&rdquo;</strong> &mdash; a
                revolutionary new program where all your lead needs is a pay
                stub. Nurses, trades workers, union members &mdash; they all qualify.
                You don&rsquo;t need perfect credit. You don&rsquo;t need a huge
                down payment. You don&rsquo;t need to wait. AI handles every
                question, every hesitation, every late-night Google search.
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
                  <span>Answers &ldquo;What do I need to qualify?&rdquo; instantly &mdash; proven scripts</span>
                </div>
                <div className={styles.subprimeCardItem}>
                  <div className={styles.subprimeCardIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <span>Automated 7-touch system &mdash; follows up every time, effortlessly</span>
                </div>
                <div className={styles.subprimeCardItem}>
                  <div className={styles.subprimeCardIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <span>Responds at 11pm, 3am, Sunday morning &mdash; overnight results</span>
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
            <div className={styles.labelPill}>
              <span className={styles.labelPillDotGreen} />
              Proven. Trusted. Predictable Results.
            </div>
            <h2 className={styles.sectionTitle}>
              A track record that speaks for itself
            </h2>
          </div>
          <div className={styles.proofStats}>
            <div className={styles.proofStat}>
              <div className={styles.proofStatValue}>840+</div>
              <div className={styles.proofStatLabel}>
                Canadian dealerships served
              </div>
            </div>
            <div className={styles.proofStatDivider} />
            <div className={styles.proofStat}>
              <div className={styles.proofStatValue}>97%</div>
              <div className={styles.proofStatLabel}>
                client retention rate
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
              &ldquo;We plugged Nexus into our CRM on a Tuesday. By
              Thursday &mdash; 48 hours later &mdash; leads that used to wait until
              morning were getting answered in under a minute. The results
              were instant. Our team just closes now &mdash; the AI handles
              everything automatically before the handoff. It was the
              simplest change we ever made.&rdquo;
            </blockquote>
            <div className={styles.testimonialAttrib}>
              &mdash; Ottawa-area dealership, pilot client
            </div>
          </div>
        </div>
      </section>

      {/* ── THE OFFER ─────────────────────────────── */}
      <section id="start-pilot" className={styles.offer}>
        <div className={styles.container}>
          <div className={styles.offerCard}>
            <div className={styles.offerHeader}>
              <div className={styles.labelPill}>
                <span className={styles.labelPillDotGreen} />
                The Offer &mdash; Zero Risk, Massive Upside
              </div>
              <h2 className={styles.offerTitle}>Free 30-Day Pilot</h2>
              <p className={styles.offerSubline}>
                We set everything up in 48 hours. You just sell cars. If it
                doesn&rsquo;t book more appointments, you owe us nothing.
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
                    Breakthrough AI response in under 60 seconds
                  </li>
                  <li className={styles.offerListItem}>
                    <span className={styles.offerCheck}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Proven 7-touch nurture system
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
                    Native CRM integration
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
                  No contracts. No setup fees. No risk. Cancel anytime. Guaranteed.
                </p>
                <a href="mailto:hello@nexusai.ca?subject=Free%2030-Day%20Pilot%20%E2%80%94%20Dealership" className={styles.offerButton}>
                  Start Your Free Pilot &mdash; Live in 48 Hours <span>&#8594;</span>
                </a>
                <p className={styles.offerAfter}>
                  After the pilot: $2,500/month if you love the results. Walk
                  away if you don&rsquo;t. Simple as that.
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
            <div className={styles.labelPill}>
              <span className={styles.labelPillDot} />
              FAQ
            </div>
            <h2 className={styles.sectionTitle}>Common questions</h2>
          </div>
          <div className={styles.faqList}>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                Does this replace my BDC team?
              </summary>
              <p className={styles.faqAnswer}>
                No &mdash; it makes them unstoppable. AI automatically handles the
                first response and the entire nurture sequence. Your team gets
                pre-qualified, warm leads with full context. They don&rsquo;t
                need to chase. They don&rsquo;t need to follow up. They just
                close.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                Does it work with my CRM?
              </summary>
              <p className={styles.faqAnswer}>
                Yes &mdash; we integrate with Activix, GoHighLevel, DealerSocket,
                VinSolutions, and more. Plug-and-play. Everything syncs
                automatically. You don&rsquo;t need to learn new software.
                You don&rsquo;t need to change your workflow. Your team stays
                in their CRM and sees better data, faster. It just works.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                What about CASL compliance?
              </summary>
              <p className={styles.faqAnswer}>
                Built in from day one &mdash; proven, documented, predictable.
                Consent tracking, opt-out handling, and bilingual disclosures
                in every message. You don&rsquo;t need a compliance team.
                You don&rsquo;t need to worry about fines. Our system handles
                it automatically, every single time.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                How fast can I go live?
              </summary>
              <p className={styles.faqAnswer}>
                48 hours. That&rsquo;s it. From the moment you give us CRM
                access, we handle the entire setup, integration, and
                testing. You don&rsquo;t need to configure anything. You
                don&rsquo;t need technical skills. You confirm it looks good
                and you&rsquo;re live &mdash; overnight.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                What happens after the pilot?
              </summary>
              <p className={styles.faqAnswer}>
                If you love the results, $2,500/month. If not, walk away &mdash; no
                obligation, no awkward cancellation calls. We keep it simple
                because our track record proves the results speak for
                themselves. Most dealers never leave.
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
                The only AI system built exclusively for Canadian dealerships. CASL compliant. Bilingual. Proven.
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
