import type { Metadata } from 'next';
import Link from 'next/link';
import { PricingCard } from '@/components/PricingCard';
import { CTABanner } from '@/components/CTABanner';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Transparent pricing for Nexus AI agent services. Starter, Professional, and Enterprise tiers. Audit from $5K, builds from $15K, managed operations from $5K/mo.',
};

export default function PricingPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.label}>Transparent Pricing</p>
          <h1 className={styles.headline}>No surprises. No hidden fees.</h1>
          <p className={styles.subline}>
            We price based on scope and complexity, not arbitrary tiers.
            Every engagement starts with a free audit call.
          </p>
        </div>
      </section>

      {/* ── PROJECT PRICING ───────────────────────── */}
      <section className={styles.projectPricing}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.label}>Project Work</p>
            <h2 className={styles.sectionTitle}>One-time engagements</h2>
            <p className={styles.sectionSubtitle}>
              Fixed-scope projects with clear deliverables and defined timelines.
            </p>
          </div>
          <div className={styles.pricingGrid}>
            <PricingCard
              tier="Starter"
              price="$5K–$15K"
              period=""
              description="For companies that need clarity before they commit. A full AI opportunity assessment with ROI projections."
              features={[
                'Full workflow analysis and mapping',
                'AI opportunity identification (5–10 opportunities)',
                'ROI projection for top 3 opportunities',
                '90-day implementation roadmap',
                'Technical feasibility assessment',
                'Executive presentation deck',
                '30-day follow-up support',
              ]}
              notIncluded={[
                'Agent development',
                'Ongoing monitoring',
                'SLA guarantees',
              ]}
              cta="Start with an Audit"
            />
            <PricingCard
              tier="Professional"
              price="$15K–$50K"
              period=""
              description="For companies with a clear use case ready to build. A complete self-healing multi-agent system, designed, built, and deployed."
              features={[
                'Multi-agent architecture design',
                'Custom agents (typically 3–8 agents)',
                'System prompts and tool integrations',
                'Self-healing pipeline (circuit breakers, health monitoring)',
                'API integrations (CRM, Slack, email, databases)',
                'Real-time monitoring dashboard',
                'Engineering team training and handoff',
                '90-day post-launch support',
              ]}
              featured={true}
              cta="Start a Custom Build"
            />
            <PricingCard
              tier="Enterprise"
              price="Custom"
              period=""
              description="For large organizations with complex requirements, compliance needs, or on-premise deployment."
              features={[
                'Everything in Professional',
                'On-premise or private cloud deployment',
                'SOC 2 compliance documentation',
                'Multi-team / multi-department rollout',
                'Custom SLA with financial guarantees',
                'Dedicated engineering team',
                'Executive steering committee support',
                'Training program for engineering staff',
              ]}
              cta="Contact Us"
            />
          </div>
        </div>
      </section>

      {/* ── MANAGED OPERATIONS ────────────────────── */}
      <section className={styles.managedPricing}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.label}>Ongoing Services</p>
            <h2 className={styles.sectionTitle}>Managed Operations</h2>
            <p className={styles.sectionSubtitle}>
              Monthly retainer plans. We run your agents 24/7 so you don&rsquo;t have to.
            </p>
          </div>
          <div className={styles.managedGrid}>
            <div className={styles.managedCard}>
              <div className={styles.managedTier}>Essential</div>
              <div className={styles.managedPrice}>$5,000<span>/mo</span></div>
              <p className={styles.managedDesc}>For a single agent system with straightforward operations.</p>
              <ul className={styles.managedFeatures}>
                {[
                  'Up to 5 agents monitored',
                  '24/7 automated self-healing',
                  'Monthly performance report',
                  'Email support (48hr response)',
                  '99% uptime SLA',
                ].map((f, i) => (
                  <li key={i} className={styles.managedFeature}>
                    <span className={styles.check}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className={styles.managedCta}>Get Started</Link>
            </div>

            <div className={`${styles.managedCard} ${styles.managedFeatured}`}>
              <div className={styles.managedBadge}>Most Popular</div>
              <div className={styles.managedTier}>Professional</div>
              <div className={styles.managedPrice}>$9,000<span>/mo</span></div>
              <p className={styles.managedDesc}>For multi-agent systems running critical business workflows.</p>
              <ul className={styles.managedFeatures}>
                {[
                  'Up to 20 agents monitored',
                  '24/7 automated self-healing + manual escalation',
                  'Weekly performance reports',
                  'Priority Slack support (4hr response)',
                  'Monthly optimization cycle',
                  'Quarterly strategy review',
                  '99.5% uptime SLA',
                ].map((f, i) => (
                  <li key={i} className={styles.managedFeature}>
                    <span className={styles.check}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className={`${styles.managedCta} ${styles.managedCtaFeatured}`}>
                Get Started
              </Link>
            </div>

            <div className={styles.managedCard}>
              <div className={styles.managedTier}>Enterprise</div>
              <div className={styles.managedPrice}>$25,000<span>/mo</span></div>
              <p className={styles.managedDesc}>For mission-critical agent deployments requiring maximum reliability and compliance.</p>
              <ul className={styles.managedFeatures}>
                {[
                  'Unlimited agents',
                  'Dedicated on-call engineer',
                  'Real-time Slack/PagerDuty alerts',
                  'Daily performance dashboards',
                  'Continuous optimization',
                  'Named account manager',
                  '99.9% uptime SLA with financial penalties',
                  'SOC 2 audit support',
                ].map((f, i) => (
                  <li key={i} className={styles.managedFeature}>
                    <span className={styles.check}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className={styles.managedCta}>Contact Us</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────── */}
      <section className={styles.faq}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.label}>Common Questions</p>
            <h2 className={styles.sectionTitle}>Before you reach out</h2>
          </div>
          <div className={styles.faqGrid}>
            {[
              {
                q: 'Do we need to have an AI strategy already?',
                a: "No. Many clients start with the Audit specifically because they don't have one yet. We help you figure out where AI agents can add real value before you spend anything on development.",
              },
              {
                q: 'What if we already have an AI system that keeps breaking?',
                a: "That's actually one of our most common entry points. We can audit your existing system, identify the failure modes, and either fix it or rebuild it with proper self-healing. Start with a free call to describe what you have.",
              },
              {
                q: "Do we own the code after the build?",
                a: "Yes, completely. You get full ownership of all code we write for you. It's built on the open-source Nexus framework (MIT license), so there's no vendor lock-in. Your team can maintain and extend it.",
              },
              {
                q: 'How long does a typical build take?',
                a: "A focused 3-5 agent system typically takes 6-10 weeks from kickoff to production deployment. More complex systems with many integrations can take 12-16 weeks. The audit (if you do that first) adds 2-3 weeks.",
              },
              {
                q: 'What AI models do you use?',
                a: "We primarily build on Anthropic Claude (claude-3-5-sonnet and claude-3-5-haiku). We can also integrate OpenAI models for specific use cases. We recommend Claude for most agent work because of its strong instruction-following and lower hallucination rate.",
              },
              {
                q: "What's the minimum engagement?",
                a: "The AI Agent Audit starts at $5,000. For Managed Operations, we require a 3-month minimum. There's no minimum for the Custom Build (scope determines price), but most projects fall in the $18K-$35K range.",
              },
            ].map((item, i) => (
              <div key={i} className={styles.faqItem}>
                <h3 className={styles.faqQ}>{item.q}</h3>
                <p className={styles.faqA}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        headline="Start with a free 30-minute call."
        subline="Tell us what you're trying to automate. We'll tell you if we can help and what it would cost — no commitment, no pressure."
        ctaText="Book a Free Call"
        ctaHref="/contact"
      />
    </>
  );
}
