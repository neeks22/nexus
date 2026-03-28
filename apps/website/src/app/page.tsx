import Link from 'next/link';
import { ServiceCard } from '@/components/ServiceCard';
import { TestimonialCard } from '@/components/TestimonialCard';
import { CTABanner } from '@/components/CTABanner';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Ottawa&rsquo;s AI Agent Agency
          </div>
          <h1 className={styles.heroHeadline}>
            Your AI Agents Break.<br />
            <span className={styles.heroAccent}>Ours Heal Themselves.</span>
          </h1>
          <p className={styles.heroSubline}>
            We build self-healing AI agent systems that run 24/7 without babysitting.
            While your competitors scramble to fix their AI at 2am, yours is already healing itself.
          </p>
          <div className={styles.heroActions}>
            <Link href="/contact" className={styles.heroPrimary}>
              Book a Free Audit <span>→</span>
            </Link>
            <Link href="/services" className={styles.heroSecondary}>
              See How It Works
            </Link>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>$47K</div>
              <div className={styles.heroStatLabel}>avg. annual savings per client</div>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>89%</div>
              <div className={styles.heroStatLabel}>agent failures recovered automatically</div>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>171%</div>
              <div className={styles.heroStatLabel}>avg. ROI on agent deployments</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ───────────────────── */}
      <section className={styles.problems}>
        <div className={styles.container}>
          <div className={styles.problemsHeader}>
            <p className={styles.label}>The Problem</p>
            <h2 className={styles.sectionTitle}>
              AI agents are powerful.<br />They&rsquo;re also fragile.
            </h2>
          </div>
          <div className={styles.problemsGrid}>
            <div className={styles.problemCard}>
              <div className={styles.problemStat}>88%</div>
              <h3 className={styles.problemTitle}>AI projects fail before production</h3>
              <p className={styles.problemText}>
                Most AI agent projects never make it out of the demo. They hit a rate limit,
                hallucinate once, or crash on a bad API call — and that&rsquo;s the end.
              </p>
            </div>
            <div className={styles.problemCard}>
              <div className={styles.problemStat}>1 crash</div>
              <h3 className={styles.problemTitle}>Kills your whole pipeline</h3>
              <p className={styles.problemText}>
                In a multi-agent system, one failure cascades. One broken agent stalls the
                next. Your entire automation grinds to a halt and nobody notices until it&rsquo;s too late.
              </p>
            </div>
            <div className={styles.problemCard}>
              <div className={styles.problemStat}>$10K/mo</div>
              <h3 className={styles.problemTitle}>Burned on failed API calls</h3>
              <p className={styles.problemText}>
                Every retry loop, every halluci&shy;nation, every timeout — your API bill grows.
                Companies routinely waste thousands monthly on calls that never should have been made.
              </p>
            </div>
          </div>
          <div className={styles.solutionBanner}>
            <div className={styles.solutionLeft}>
              <p className={styles.solutionLabel}>The Nexus Difference</p>
              <p className={styles.solutionText}>
                Nexus agents don&rsquo;t just fail gracefully — they recover automatically.
                Circuit breakers prevent cascade failures. Health scoring catches degraded agents before
                they crash. Self-healing keeps your pipeline running even when individual agents fail.
              </p>
            </div>
            <div className={styles.solutionRight}>
              <code className={styles.solutionCode}>
                <span className={styles.codeComment}>// What happens when an agent fails</span>{'\n'}
                <span className={styles.codeDim}>[self-heal]</span> Agent:ResearcherA timed out{'\n'}
                <span className={styles.codeDim}>         </span> → redistributed to Agent:ResearcherB{'\n'}
                <span className={styles.codeGreen}>[recovered]</span> Pipeline continues ✓
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES PREVIEW ─────────────────────── */}
      <section className={styles.services}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.label}>What We Build</p>
            <h2 className={styles.sectionTitle}>Three ways we work together</h2>
            <p className={styles.sectionSubtitle}>
              From a quick audit that finds your hidden AI opportunities, to a fully managed
              agent system that runs itself. Pick where you want to start.
            </p>
          </div>
          <div className={styles.servicesGrid}>
            <ServiceCard
              icon="🔍"
              title="AI Agent Audit"
              priceRange="$5,000 – $15,000"
              description="We study your business, find automation opportunities, and build an ROI projection. You leave with a clear picture of what AI agents can do for you — and what it will cost."
              deliverables={[
                'Full AI opportunity assessment',
                'Automation ROI projection',
                '90-day implementation roadmap',
                'Executive-ready report',
              ]}
              href="/services#audit"
              cta="Start with an Audit"
            />
            <ServiceCard
              icon="⚡"
              title="Custom Agent Build"
              priceRange="$15,000 – $50,000"
              description="We design, build, and deploy a self-healing multi-agent system custom to your business. Every agent has a circuit breaker, health score, and automatic recovery built in."
              deliverables={[
                'Multi-agent architecture design',
                'Custom prompts & integrations',
                'Self-healing pipeline',
                'Dashboard & training',
              ]}
              featured={true}
              href="/services#build"
              cta="Start a Custom Build"
            />
            <ServiceCard
              icon="🛡️"
              title="Managed Operations"
              priceRange="$5,000 – $25,000/mo"
              description="We run your agents 24/7. Self-healing keeps them alive. Monthly reports prove the value. You focus on your business — we keep your AI running."
              deliverables={[
                '24/7 monitoring & recovery',
                'Monthly performance reports',
                'Continuous optimization',
                'Priority support & SLA',
              ]}
              href="/services#retainer"
              cta="Get Managed Operations"
            />
          </div>
          <div className={styles.servicesFooter}>
            <Link href="/services" className={styles.servicesLink}>
              View full service details →
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────── */}
      <section className={styles.howItWorks}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.label}>Our Process</p>
            <h2 className={styles.sectionTitle}>From audit to autonomous operation</h2>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>01</div>
              <div className={styles.stepIcon}>🔍</div>
              <h3 className={styles.stepTitle}>Audit</h3>
              <p className={styles.stepText}>
                We map your workflows, identify automation opportunities, and produce an ROI projection with specifics — which agents to build, what they&rsquo;ll do, what they&rsquo;ll return.
              </p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>02</div>
              <div className={styles.stepIcon}>📐</div>
              <h3 className={styles.stepTitle}>Design</h3>
              <p className={styles.stepText}>
                We architect the agent team: which agents, which protocols, how they hand off to each other. Circuit breakers and health monitors designed in from day one — not bolted on later.
              </p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>03</div>
              <div className={styles.stepIcon}>⚙️</div>
              <h3 className={styles.stepTitle}>Build</h3>
              <p className={styles.stepText}>
                We build on the Nexus framework — every agent wrapped in a self-healing pipeline. You get a dashboard, an immutable transcript of every agent conversation, and a structured handoff.
              </p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>04</div>
              <div className={styles.stepIcon}>🛡️</div>
              <h3 className={styles.stepTitle}>Operate</h3>
              <p className={styles.stepText}>
                We run it. Agents monitor themselves, recover from failures, and flag anomalies. Monthly reports show exactly what your agents did, what they saved, and what to improve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SELF-HEALING DEMO ────────────────────── */}
      <section className={styles.healingDemo}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.label}>Self-Healing in Action</p>
            <h2 className={styles.sectionTitle}>Watch the recovery happen</h2>
            <p className={styles.sectionSubtitle}>
              When an agent fails, Nexus doesn&rsquo;t panic. It classifies the error,
              selects a recovery strategy, and retries — automatically.
            </p>
          </div>
          <div className={styles.terminalWindow}>
            <div className={styles.terminalBar}>
              <div className={styles.terminalDots}>
                <span className={styles.dotRed} />
                <span className={styles.dotYellow} />
                <span className={styles.dotGreen} />
              </div>
              <span className={styles.terminalTitle}>nexus-agents — production pipeline</span>
            </div>
            <div className={styles.terminalBody}>
              <div className={`${styles.terminalLine} ${styles.lineNormal}`}>
                <span className={styles.lineTime}>09:14:02</span>
                <span className={styles.lineDim}>[team]</span>
                <span> Pipeline started — 4 agents, sequential protocol</span>
              </div>
              <div className={`${styles.terminalLine} ${styles.lineNormal}`}>
                <span className={styles.lineTime}>09:14:03</span>
                <span className={styles.lineGreen}>[healthy]</span>
                <span> Agent:Researcher health=1.00 — executing</span>
              </div>
              <div className={`${styles.terminalLine} ${styles.lineNormal}`}>
                <span className={styles.lineTime}>09:14:05</span>
                <span className={styles.lineGreen}>[healthy]</span>
                <span> Agent:Researcher completed — handoff to Agent:Analyst</span>
              </div>
              <div className={`${styles.terminalLine} ${styles.lineError} ${styles.animateLine}`}>
                <span className={styles.lineTime}>09:14:07</span>
                <span className={styles.lineRed}>[failure]</span>
                <span> Agent:Analyst — rate_limit error (429)</span>
              </div>
              <div className={`${styles.terminalLine} ${styles.lineWarning} ${styles.animateLineDelay1}`}>
                <span className={styles.lineTime}>09:14:07</span>
                <span className={styles.lineYellow}>[diagnose]</span>
                <span> Classifying: infrastructure → rate_limit strategy selected</span>
              </div>
              <div className={`${styles.terminalLine} ${styles.lineWarning} ${styles.animateLineDelay2}`}>
                <span className={styles.lineTime}>09:14:08</span>
                <span className={styles.lineYellow}>[recover]</span>
                <span> Exponential backoff — waiting 2.4s with jitter...</span>
              </div>
              <div className={`${styles.terminalLine} ${styles.lineSuccess} ${styles.animateLineDelay3}`}>
                <span className={styles.lineTime}>09:14:10</span>
                <span className={styles.lineGreen}>[healed]</span>
                <span> Agent:Analyst recovered — attempt 2/3 succeeded</span>
              </div>
              <div className={`${styles.terminalLine} ${styles.lineSuccess} ${styles.animateLineDelay4}`}>
                <span className={styles.lineTime}>09:14:12</span>
                <span className={styles.lineGreen}>[complete]</span>
                <span> Pipeline finished — healingSummary: &#123; successRate: 1.0, tombstones: [] &#125;</span>
              </div>
              <div className={styles.terminalCursor}>
                <span className={styles.cursor}>█</span>
              </div>
            </div>
          </div>
          <div className={styles.healingSteps}>
            <div className={styles.healingStep}>
              <div className={styles.healingStepIcon} data-state="fail">✕</div>
              <div className={styles.healingStepLabel}>Agent Fails</div>
            </div>
            <div className={styles.healingArrow}>→</div>
            <div className={styles.healingStep}>
              <div className={styles.healingStepIcon} data-state="diagnose">⚡</div>
              <div className={styles.healingStepLabel}>Self-Healing Kicks In</div>
            </div>
            <div className={styles.healingArrow}>→</div>
            <div className={styles.healingStep}>
              <div className={styles.healingStepIcon} data-state="recover">↺</div>
              <div className={styles.healingStepLabel}>Agent Recovers</div>
            </div>
            <div className={styles.healingArrow}>→</div>
            <div className={styles.healingStep}>
              <div className={styles.healingStepIcon} data-state="continue">✓</div>
              <div className={styles.healingStepLabel}>Pipeline Continues</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────── */}
      <section className={styles.testimonials}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.label}>Client Results</p>
            <h2 className={styles.sectionTitle}>Companies that stopped losing sleep over AI</h2>
          </div>
          <div className={styles.testimonialsGrid}>
            <TestimonialCard
              metric="60% faster lead response"
              quote="Before Nexus, our lead routing agent would crash every few days and nobody would notice for hours. New leads were going cold. Now it just... runs. We've had zero downtime in three months and our conversion rate is up 18%."
              name="Jennifer Malik"
              title="VP Operations"
              company="Ottawa Real Estate Group"
            />
            <TestimonialCard
              metric="120 hrs/month saved"
              quote="We were skeptical. Law firms don't move fast on new tech. But the ROI projection Nexus gave us was too compelling to ignore. Document intake processing that used to take a paralegal two hours now takes four minutes. And when the system has an issue, it fixes itself."
              name="Robert Chen"
              title="Managing Partner"
              company="Smith & Associates Law"
            />
            <TestimonialCard
              metric="89% tickets automated"
              quote="We tried two other AI support solutions before Nexus. Both fell apart in production. The Nexus team was the first to show us a live demo where they deliberately broke the agent mid-conversation and watched it recover on its own. That's when we knew."
              name="Sarah Thompson"
              title="CTO"
              company="TechStart Inc"
            />
          </div>
        </div>
      </section>

      {/* ── ROI SECTION ──────────────────────────── */}
      <section className={styles.roi}>
        <div className={styles.container}>
          <div className={styles.roiInner}>
            <div className={styles.roiLeft}>
              <p className={styles.label}>The Business Case</p>
              <h2 className={styles.roiTitle}>The math on self-healing AI</h2>
              <p className={styles.roiText}>
                The average company running AI agents wastes $2,000–$10,000/month on failed
                calls, downtime, and manual recovery. Nexus recovers 89% of those failures automatically.
                Our clients average <strong>$47,000 in annual savings</strong> — and that&rsquo;s before
                counting the revenue from faster operations.
              </p>
              <div className={styles.roiMetrics}>
                <div className={styles.roiMetric}>
                  <div className={styles.roiMetricValue}>171%</div>
                  <div className={styles.roiMetricLabel}>Average ROI on Nexus deployments</div>
                </div>
                <div className={styles.roiMetric}>
                  <div className={styles.roiMetricValue}>40%</div>
                  <div className={styles.roiMetricLabel}>Fewer production incidents</div>
                </div>
                <div className={styles.roiMetric}>
                  <div className={styles.roiMetricValue}>60%</div>
                  <div className={styles.roiMetricLabel}>Reduction in API costs via caching</div>
                </div>
              </div>
              <Link href="/contact" className={styles.roiCta}>
                Calculate Your ROI →
              </Link>
            </div>
            <div className={styles.roiRight}>
              <div className={styles.roiCard}>
                <div className={styles.roiCardTitle}>Typical client economics</div>
                <div className={styles.roiRow}>
                  <span className={styles.roiRowLabel}>Monthly API waste before Nexus</span>
                  <span className={styles.roiRowValueNeg}>–$6,200</span>
                </div>
                <div className={styles.roiRow}>
                  <span className={styles.roiRowLabel}>Agent downtime cost (hrs × rate)</span>
                  <span className={styles.roiRowValueNeg}>–$2,800</span>
                </div>
                <div className={styles.roiRow}>
                  <span className={styles.roiRowLabel}>Manual recovery engineering time</span>
                  <span className={styles.roiRowValueNeg}>–$1,400</span>
                </div>
                <div className={styles.roiDivider} />
                <div className={styles.roiRow}>
                  <span className={styles.roiRowLabel}>Monthly waste recovered</span>
                  <span className={styles.roiRowValuePos}>+$10,400</span>
                </div>
                <div className={styles.roiRow}>
                  <span className={styles.roiRowLabel}>Nexus Managed Operations</span>
                  <span className={styles.roiRowValueNeg}>–$8,000</span>
                </div>
                <div className={styles.roiDivider} />
                <div className={`${styles.roiRow} ${styles.roiTotal}`}>
                  <span className={styles.roiRowLabel}>Net monthly gain</span>
                  <span className={styles.roiRowValuePos}>+$2,400</span>
                </div>
                <p className={styles.roiDisclaimer}>
                  Based on median values across 2025 client engagements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────── */}
      <CTABanner
        headline="Stop Losing Money to Broken AI."
        subline="Book a free 30-minute audit call. We'll map your biggest AI opportunities and show you exactly what self-healing would mean for your business — no commitment required."
        ctaText="Book Your Free Audit"
        ctaHref="/contact"
        secondaryText="View pricing"
        secondaryHref="/pricing"
      />
    </>
  );
}
