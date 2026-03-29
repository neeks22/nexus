import styles from './page.module.css';
import { HideGlobalChrome } from './hide-chrome';

export default function DealershipsPage() {
  return (
    <div className={styles.page}>
      <HideGlobalChrome />

      {/* ── NAV BAR ──────────────────────────────── */}
      <nav className={styles.topBar}>
        <div className={styles.topBarInner}>
          <span className={styles.logo}>
            <span className={styles.logoMark}>N</span> Nexus AI
          </span>
          <div className={styles.navLinks}>
            <a href="#products" className={styles.navLink}>Products</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="#results" className={styles.navLink}>Results</a>
            <a href="#pricing" className={styles.navLink}>Pricing</a>
          </div>
          <div className={styles.navRight}>
            <a href="tel:+16139001234" className={styles.navPhone}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              (613) 900-1234
            </a>
            <a href="#pricing" className={styles.topBarCta}>
              Book a Demo
            </a>
          </div>
          {/* Mobile menu button */}
          <a href="tel:+16139001234" className={styles.mobilePhone}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </a>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className={styles.heroOrb} />
        <div className={styles.heroOrbSecondary} />
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              The #1 AI System for Canadian Dealers
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
              <a href="#pricing" className={styles.heroPrimary}>
                Start Free Pilot <span>&#8594;</span>
              </a>
              <a href="#how-it-works" className={styles.heroSecondary}>
                <span className={styles.playIcon}>&#9654;</span>
                Watch Demo
              </a>
            </div>
          </div>

          {/* CSS-only Dashboard Mockup */}
          <div className={styles.heroDashboard}>
            <div className={styles.dashboardCard}>
              <div className={styles.dashboardHeader}>
                <span className={styles.dashboardDot} style={{ background: '#ef4444' }} />
                <span className={styles.dashboardDot} style={{ background: '#f59e0b' }} />
                <span className={styles.dashboardDot} style={{ background: '#10b981' }} />
                <span className={styles.dashboardTitle}>Nexus AI Dashboard</span>
              </div>
              <div className={styles.dashboardBody}>
                {/* Notification */}
                <div className={styles.dashNotification}>
                  <div className={styles.dashNotifIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4l2 2" />
                    </svg>
                  </div>
                  <div className={styles.dashNotifContent}>
                    <span className={styles.dashNotifLabel}>New Lead</span>
                    <span className={styles.dashNotifName}>Sarah M. &mdash; 2024 RAV4</span>
                  </div>
                  <span className={styles.dashNotifBadge}>Just now</span>
                </div>

                {/* Response time */}
                <div className={styles.dashMetric}>
                  <div className={styles.dashMetricLeft}>
                    <span className={styles.dashMetricLabel}>Response Time</span>
                    <span className={styles.dashMetricValue}>&lt; 12 seconds</span>
                  </div>
                  <span className={styles.dashMetricIndicator} />
                </div>

                {/* Conversation bubble */}
                <div className={styles.dashConversation}>
                  <div className={styles.dashBubbleAi}>
                    <span className={styles.dashBubbleTag}>AI</span>
                    <p>Hi Sarah! The 2024 RAV4 XLE is available. Would you like to schedule a test drive this week?</p>
                  </div>
                  <div className={styles.dashBubbleUser}>
                    <p>Yes! How about Thursday at 2pm?</p>
                  </div>
                  <div className={styles.dashBubbleAi}>
                    <span className={styles.dashBubbleTag}>AI</span>
                    <p>Perfect! You&rsquo;re confirmed for Thursday at 2pm. See you then!</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className={styles.dashStats}>
                  <div className={styles.dashStatItem}>
                    <span className={styles.dashStatNum}>47</span>
                    <span className={styles.dashStatLbl}>Leads Today</span>
                  </div>
                  <div className={styles.dashStatItem}>
                    <span className={styles.dashStatNum}>94%</span>
                    <span className={styles.dashStatLbl}>Response Rate</span>
                  </div>
                  <div className={styles.dashStatItem}>
                    <span className={styles.dashStatNum}>12</span>
                    <span className={styles.dashStatLbl}>Appointments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Row */}
        <div className={styles.trustRow}>
          <div className={styles.trustItem}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            CASL Compliant
          </div>
          <div className={styles.trustDivider} />
          <div className={styles.trustItem}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Bilingual EN/FR
          </div>
          <div className={styles.trustDivider} />
          <div className={styles.trustItem}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            CRM Integrated
          </div>
          <div className={styles.trustDivider} />
          <div className={styles.trustItem}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            24/7 Coverage
          </div>
        </div>
      </section>

      {/* ── PRODUCTS GRID ────────────────────────── */}
      <section id="products" className={styles.products}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.labelPill}>
              <span className={styles.labelPillDotGreen} />
              Our Platform
            </div>
            <h2 className={styles.sectionTitle}>Everything Your Dealership Needs</h2>
            <p className={styles.sectionSubtitle}>Six AI-powered products working together to capture, convert, and retain every customer.</p>
          </div>
          <div className={styles.productGrid}>
            <div className={styles.productCard}>
              <div className={styles.productIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className={styles.productCardTitle}>Instant Response AI</h3>
              <p className={styles.productCardDesc}>&lt; 60 second lead response, 24/7. Every lead gets a personalized reply referencing actual vehicles on your lot.</p>
              <a href="#pricing" className={styles.productCardLink}>Learn More &#8594;</a>
            </div>
            <div className={styles.productCard}>
              <div className={styles.productIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3.5-7.5-2 3.5.5 5 2 7 1.5 2 .5 5-2.5 6.5" />
                  <path d="M12 22a7 7 0 0 0 3-13" />
                </svg>
              </div>
              <h3 className={styles.productCardTitle}>Cold Lead Warming</h3>
              <p className={styles.productCardDesc}>Proven 7-touch nurture system that re-engages cold leads with infinite patience. No lead left behind.</p>
              <a href="#pricing" className={styles.productCardLink}>Learn More &#8594;</a>
            </div>
            <div className={styles.productCard}>
              <div className={styles.productIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <h3 className={styles.productCardTitle}>AI Receptionist</h3>
              <p className={styles.productCardDesc}>24/7 phone answering that sounds human. Books appointments, answers questions, never puts anyone on hold.</p>
              <a href="#pricing" className={styles.productCardLink}>Learn More &#8594;</a>
            </div>
            <div className={styles.productCard}>
              <div className={styles.productIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <h3 className={styles.productCardTitle}>Service BDC</h3>
              <p className={styles.productCardDesc}>Automated appointment booking, recall follow-ups, and service reminders. Keep your bays full.</p>
              <a href="#pricing" className={styles.productCardLink}>Learn More &#8594;</a>
            </div>
            <div className={styles.productCard}>
              <div className={styles.productIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3 className={styles.productCardTitle}>Ad Management</h3>
              <p className={styles.productCardDesc}>Meta + Google campaigns managed by AI. Optimized bidding, creative testing, and full-funnel attribution.</p>
              <a href="#pricing" className={styles.productCardLink}>Learn More &#8594;</a>
            </div>
            <div className={styles.productCard}>
              <div className={styles.productIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h3 className={styles.productCardTitle}>Analytics Dashboard</h3>
              <p className={styles.productCardDesc}>ROI reporting and insights. See exactly where every lead comes from and what converts. No guesswork.</p>
              <a href="#pricing" className={styles.productCardLink}>Learn More &#8594;</a>
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
          <div className={styles.stepsWrapper}>
            <div className={styles.stepsLine} />
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>01</div>
                <h3 className={styles.stepTitle}>Lead comes in</h3>
                <p className={styles.stepText}>
                  From your website, AutoTrader, Facebook &mdash; anywhere. Our system
                  captures it instantly. You don&rsquo;t lift a finger.
                </p>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>02</div>
                <h3 className={styles.stepTitle}>AI responds in seconds</h3>
                <p className={styles.stepText}>
                  Personalized SMS + email in under 60 seconds, referencing actual
                  vehicles on your lot. Language detected automatically. No
                  templates. No delays.
                </p>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>03</div>
                <h3 className={styles.stepTitle}>AI qualifies &amp; nurtures</h3>
                <p className={styles.stepText}>
                  A proven 7-touch system that runs itself. Detects buying
                  signals, handles objections, and nurtures every lead &mdash; so
                  nothing falls through the cracks. Ever.
                </p>
              </div>
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
        </div>
      </section>

      {/* ── RESULTS / SOCIAL PROOF ──────────────── */}
      <section id="results" className={styles.proof}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.labelPill}>
              <span className={styles.labelPillDotGreen} />
              Proven. Trusted. Predictable Results.
            </div>
            <h2 className={styles.sectionTitle}>
              Dealers Who Switch Never Go Back
            </h2>
          </div>
          <div className={styles.proofStats}>
            <div className={styles.proofStat}>
              <div className={styles.proofStatValue}>&lt; 60s</div>
              <div className={styles.proofStatLabel}>
                average response time
              </div>
            </div>
            <div className={styles.proofStatDivider} />
            <div className={styles.proofStat}>
              <div className={styles.proofStatValue}>24/7</div>
              <div className={styles.proofStatLabel}>
                coverage, no gaps
              </div>
            </div>
            <div className={styles.proofStatDivider} />
            <div className={styles.proofStat}>
              <div className={styles.proofStatValue}>97%</div>
              <div className={styles.proofStatLabel}>
                client retention rate
              </div>
            </div>
          </div>
          <div className={styles.testimonials}>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialStars}>&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <blockquote className={styles.testimonialQuote}>
                &ldquo;We plugged Nexus into our CRM on a Tuesday. By
                Thursday &mdash; 48 hours later &mdash; leads that used to wait until
                morning were getting answered in under a minute. The results
                were instant. Our team just closes now &mdash; the AI handles
                everything automatically before the handoff. It was the
                simplest change we ever made.&rdquo;
              </blockquote>
              <div className={styles.testimonialAttrib}>
                <strong>General Manager</strong>
                <span>Ottawa-area dealership, pilot client</span>
              </div>
            </div>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialStars}>&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <blockquote className={styles.testimonialQuote}>
                &ldquo;Our BDC was costing us over $200K a year and still missing
                nights and weekends. Nexus covers 100% of leads, 100% of the time.
                We went from 40% response rate to over 95% in the first week.&rdquo;
              </blockquote>
              <div className={styles.testimonialAttrib}>
                <strong>Dealer Principal</strong>
                <span>Multi-rooftop group, Ontario</span>
              </div>
            </div>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialStars}>&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <blockquote className={styles.testimonialQuote}>
                &ldquo;The bilingual capability alone is worth it. Half our leads
                come in French and the AI handles them perfectly. Our customers
                don&rsquo;t even know they&rsquo;re talking to AI.&rdquo;
              </blockquote>
              <div className={styles.testimonialAttrib}>
                <strong>Sales Director</strong>
                <span>Gatineau dealership</span>
              </div>
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
                <strong className={styles.subprimeGradientText}>&ldquo;Your Job Is Your Credit&rdquo;</strong> &mdash; a
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

      {/* ── PRICING ──────────────────────────────── */}
      <section id="pricing" className={styles.pricing}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.labelPill}>
              <span className={styles.labelPillDotGreen} />
              Simple, Transparent Pricing
            </div>
            <h2 className={styles.sectionTitle}>
              Start free. Scale when you&rsquo;re ready.
            </h2>
          </div>
          <div className={styles.pricingGrid}>
            <div className={styles.pricingCard}>
              <div className={styles.pricingCardHeader}>
                <span className={styles.pricingLabel}>Start Here</span>
                <h3 className={styles.pricingPlanName}>Free 30-Day Pilot</h3>
                <div className={styles.pricingPrice}>
                  <span className={styles.pricingAmount}>$0</span>
                  <span className={styles.pricingPeriod}>for 30 days</span>
                </div>
              </div>
              <ul className={styles.pricingFeatures}>
                <li className={styles.pricingFeature}>
                  <span className={styles.pricingCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  AI response in under 60 seconds
                </li>
                <li className={styles.pricingFeature}>
                  <span className={styles.pricingCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  7-touch nurture system
                </li>
                <li className={styles.pricingFeature}>
                  <span className={styles.pricingCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  Bilingual EN/FR messaging
                </li>
                <li className={styles.pricingFeature}>
                  <span className={styles.pricingCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  Native CRM integration
                </li>
                <li className={styles.pricingFeature}>
                  <span className={styles.pricingCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  CASL compliance built in
                </li>
                <li className={styles.pricingFeature}>
                  <span className={styles.pricingCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  48-hour setup
                </li>
              </ul>
              <a href="mailto:hello@nexusai.ca?subject=Free%2030-Day%20Pilot%20%E2%80%94%20Dealership" className={styles.pricingCtaPrimary}>
                Start Your Free Pilot <span>&#8594;</span>
              </a>
            </div>
            <div className={`${styles.pricingCard} ${styles.pricingCardPremium}`}>
              <div className={styles.pricingBadge}>Most Popular</div>
              <div className={styles.pricingCardHeader}>
                <span className={styles.pricingLabel}>Full Platform</span>
                <h3 className={styles.pricingPlanName}>Full Service</h3>
                <div className={styles.pricingPrice}>
                  <span className={styles.pricingAmount}>$2,500</span>
                  <span className={styles.pricingPeriod}>/month</span>
                </div>
              </div>
              <ul className={styles.pricingFeatures}>
                <li className={styles.pricingFeature}>
                  <span className={styles.pricingCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  Everything in Free Pilot
                </li>
                <li className={styles.pricingFeature}>
                  <span className={styles.pricingCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  AI Receptionist (24/7 phone)
                </li>
                <li className={styles.pricingFeature}>
                  <span className={styles.pricingCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  Service BDC automation
                </li>
                <li className={styles.pricingFeature}>
                  <span className={styles.pricingCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  Ad management (Meta + Google)
                </li>
                <li className={styles.pricingFeature}>
                  <span className={styles.pricingCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  Analytics dashboard + ROI reports
                </li>
                <li className={styles.pricingFeature}>
                  <span className={styles.pricingCheck}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  Dedicated account manager
                </li>
              </ul>
              <a href="mailto:hello@nexusai.ca?subject=Full%20Service%20%E2%80%94%20Dealership" className={styles.pricingCtaSecondary}>
                Book a Demo <span>&#8594;</span>
              </a>
            </div>
          </div>
          <p className={styles.pricingDisclaimer}>No contracts. Cancel anytime. If you don&rsquo;t love the results, you owe us nothing.</p>
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
              <div className={styles.faqAnswer}>
                <p>
                  No &mdash; it makes them unstoppable. AI automatically handles the
                  first response and the entire nurture sequence. Your team gets
                  pre-qualified, warm leads with full context. They don&rsquo;t
                  need to chase. They don&rsquo;t need to follow up. They just
                  close.
                </p>
              </div>
            </details>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                Does it work with my CRM?
              </summary>
              <div className={styles.faqAnswer}>
                <p>
                  Yes &mdash; we integrate with Activix, GoHighLevel, DealerSocket,
                  VinSolutions, and more. Plug-and-play. Everything syncs
                  automatically. You don&rsquo;t need to learn new software.
                  You don&rsquo;t need to change your workflow. Your team stays
                  in their CRM and sees better data, faster. It just works.
                </p>
              </div>
            </details>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                What about CASL compliance?
              </summary>
              <div className={styles.faqAnswer}>
                <p>
                  Built in from day one &mdash; proven, documented, predictable.
                  Consent tracking, opt-out handling, and bilingual disclosures
                  in every message. You don&rsquo;t need a compliance team.
                  You don&rsquo;t need to worry about fines. Our system handles
                  it automatically, every single time.
                </p>
              </div>
            </details>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                How fast can I go live?
              </summary>
              <div className={styles.faqAnswer}>
                <p>
                  48 hours. That&rsquo;s it. From the moment you give us CRM
                  access, we handle the entire setup, integration, and
                  testing. You don&rsquo;t need to configure anything. You
                  don&rsquo;t need technical skills. You confirm it looks good
                  and you&rsquo;re live &mdash; overnight.
                </p>
              </div>
            </details>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                What happens after the pilot?
              </summary>
              <div className={styles.faqAnswer}>
                <p>
                  If you love the results, $2,500/month. If not, walk away &mdash; no
                  obligation, no awkward cancellation calls. We keep it simple
                  because our track record proves the results speak for
                  themselves. Most dealers never leave.
                </p>
              </div>
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
            <div className={styles.footerLinks}>
              <h4 className={styles.footerLinksTitle}>Quick Links</h4>
              <a href="#products" className={styles.footerLink}>Products</a>
              <a href="#how-it-works" className={styles.footerLink}>How It Works</a>
              <a href="#results" className={styles.footerLink}>Results</a>
              <a href="#pricing" className={styles.footerLink}>Pricing</a>
            </div>
            <div className={styles.footerContact}>
              <h4 className={styles.footerLinksTitle}>Contact</h4>
              <a href="tel:+16139001234" className={styles.footerLink}>(613) 900-1234</a>
              <a href="mailto:hello@nexusai.ca" className={styles.footerLink}>
                hello@nexusai.ca
              </a>
              <p className={styles.footerLocation}>Built in Ottawa for Canadian Dealers</p>
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
