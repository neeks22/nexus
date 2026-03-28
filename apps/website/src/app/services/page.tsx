import type { Metadata } from 'next';
import Link from 'next/link';
import { CTABanner } from '@/components/CTABanner';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Three ways to work with Nexus: AI Agent Audit ($5-15K), Custom Agent Build ($15-50K), and Managed Operations ($5-25K/mo). Self-healing AI agent systems.',
};

export default function ServicesPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.label}>What We Build</p>
          <h1 className={styles.headline}>Services that turn AI promises into production reality</h1>
          <p className={styles.subline}>
            We don&rsquo;t sell demos. We build AI agent systems that run in production,
            recover from failures, and prove their value every month.
          </p>
        </div>
      </section>

      {/* ── SERVICE 1: AUDIT ──────────────────────── */}
      <section id="audit" className={styles.service}>
        <div className={styles.container}>
          <div className={styles.serviceInner}>
            <div className={styles.serviceLeft}>
              <div className={styles.serviceTag}>
                <span className={styles.serviceIcon}>🔍</span>
                Service 01
              </div>
              <h2 className={styles.serviceTitle}>AI Agent Audit</h2>
              <div className={styles.servicePrice}>$5,000 – $15,000</div>
              <p className={styles.serviceDesc}>
                Before you build anything, you need to know where the value actually is.
                Most companies have 5-10 automation opportunities hiding in plain sight.
                We find them, quantify them, and hand you a roadmap to capture them.
              </p>
              <p className={styles.serviceDesc}>
                This isn&rsquo;t a generic consulting report. It&rsquo;s a specific, prioritized
                list of AI agents your business should build — with ROI projections tied to your
                actual numbers, a technical feasibility assessment, and a 90-day roadmap.
              </p>
              <div className={styles.serviceProcess}>
                <h3 className={styles.processTitle}>How it works</h3>
                <div className={styles.processSteps}>
                  <div className={styles.processStep}>
                    <span className={styles.processNum}>1</span>
                    <div>
                      <strong>Discovery call</strong> — We interview your team and map your current workflows
                    </div>
                  </div>
                  <div className={styles.processStep}>
                    <span className={styles.processNum}>2</span>
                    <div>
                      <strong>Opportunity mapping</strong> — We identify every automation candidate and rank by ROI
                    </div>
                  </div>
                  <div className={styles.processStep}>
                    <span className={styles.processNum}>3</span>
                    <div>
                      <strong>ROI modeling</strong> — We build detailed projections for your top 3 opportunities
                    </div>
                  </div>
                  <div className={styles.processStep}>
                    <span className={styles.processNum}>4</span>
                    <div>
                      <strong>Roadmap delivery</strong> — You get a complete package ready to act on
                    </div>
                  </div>
                </div>
              </div>
              <Link href="/contact" className={styles.serviceCta}>
                Start with an Audit →
              </Link>
            </div>
            <div className={styles.serviceRight}>
              <div className={styles.deliverablesCard}>
                <h3 className={styles.deliverablesTitle}>What you get</h3>
                <ul className={styles.deliverablesList}>
                  {[
                    'Full AI opportunity assessment (written report)',
                    'Prioritized automation opportunity map',
                    'ROI projection for top 3 opportunities',
                    '90-day implementation roadmap',
                    'Technical feasibility assessment',
                    'Executive presentation deck',
                    '30-day follow-up Q&A support',
                  ].map((item, i) => (
                    <li key={i} className={styles.deliverableItem}>
                      <span className={styles.check}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className={styles.deliverablesFooter}>
                  <div className={styles.deliverablesMeta}>
                    <div className={styles.deliverablesMeta__item}>
                      <span className={styles.metaLabel}>Timeline</span>
                      <span className={styles.metaValue}>2–3 weeks</span>
                    </div>
                    <div className={styles.deliverablesMeta__item}>
                      <span className={styles.metaLabel}>Format</span>
                      <span className={styles.metaValue}>Remote or onsite</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICE 2: CUSTOM BUILD ───────────────── */}
      <section id="build" className={`${styles.service} ${styles.serviceFeatured}`}>
        <div className={styles.container}>
          <div className={styles.featuredBadge}>Most Requested</div>
          <div className={styles.serviceInner}>
            <div className={styles.serviceLeft}>
              <div className={styles.serviceTag}>
                <span className={styles.serviceIcon}>⚡</span>
                Service 02
              </div>
              <h2 className={styles.serviceTitle}>Custom Agent Build</h2>
              <div className={styles.servicePrice}>$15,000 – $50,000</div>
              <p className={styles.serviceDesc}>
                You know what you want to automate. We build the agent team that does it —
                with self-healing built in from the start. Not bolted on. Not an afterthought.
                Every agent in every Nexus build has a circuit breaker, a health score, and
                automatic recovery. That&rsquo;s the baseline.
              </p>
              <p className={styles.serviceDesc}>
                We use the open-source Nexus framework as the foundation — so you&rsquo;re
                not locked into a black box. You own the code. You can see exactly how it works.
                And because it&rsquo;s TypeScript-native, your engineering team can maintain it.
              </p>
              <div className={styles.techStack}>
                <h3 className={styles.techTitle}>Built on</h3>
                <div className={styles.techTags}>
                  {['nexus-core', 'TypeScript', 'Anthropic Claude', 'Multi-agent protocols', 'Circuit breakers', 'Health monitoring'].map(t => (
                    <span key={t} className={styles.techTag}>{t}</span>
                  ))}
                </div>
              </div>
              <Link href="/contact" className={styles.serviceCta}>
                Start a Custom Build →
              </Link>
            </div>
            <div className={styles.serviceRight}>
              <div className={styles.deliverablesCard}>
                <h3 className={styles.deliverablesTitle}>What you get</h3>
                <ul className={styles.deliverablesList}>
                  {[
                    'Multi-agent architecture design document',
                    'Custom system prompts for each agent',
                    'API & tool integrations (Slack, CRM, email, etc.)',
                    'Self-healing pipeline with circuit breakers',
                    'Real-time health monitoring dashboard',
                    'Immutable conversation transcript system',
                    'Deployment to your cloud or ours',
                    'Engineering team training & handoff',
                    '90-day post-launch support',
                  ].map((item, i) => (
                    <li key={i} className={styles.deliverableItem}>
                      <span className={styles.check}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className={styles.deliverablesFooter}>
                  <div className={styles.deliverablesMeta}>
                    <div className={styles.deliverablesMeta__item}>
                      <span className={styles.metaLabel}>Timeline</span>
                      <span className={styles.metaValue}>6–12 weeks</span>
                    </div>
                    <div className={styles.deliverablesMeta__item}>
                      <span className={styles.metaLabel}>Team size</span>
                      <span className={styles.metaValue}>2–3 engineers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICE 3: RETAINER ──────────────────── */}
      <section id="retainer" className={styles.service}>
        <div className={styles.container}>
          <div className={styles.serviceInner}>
            <div className={styles.serviceLeft}>
              <div className={styles.serviceTag}>
                <span className={styles.serviceIcon}>🛡️</span>
                Service 03
              </div>
              <h2 className={styles.serviceTitle}>Managed Operations</h2>
              <div className={styles.servicePrice}>$5,000 – $25,000 / month</div>
              <p className={styles.serviceDesc}>
                You built it. Now someone has to run it. Most companies underestimate how much
                work it is to keep an AI agent system healthy in production — prompt drift,
                API deprecations, model updates, edge cases that surface at 3am.
              </p>
              <p className={styles.serviceDesc}>
                We run your agents so you don&rsquo;t have to. Self-healing catches most issues
                automatically. Our team handles the rest. Monthly reports show exactly what
                your agents did, what they recovered from, and where we optimized.
              </p>
              <div className={styles.slaBox}>
                <h3 className={styles.slaTitle}>Our commitments</h3>
                <div className={styles.slaGrid}>
                  <div className={styles.slaStat}>
                    <div className={styles.slaValue}>99.5%</div>
                    <div className={styles.slaLabel}>uptime SLA</div>
                  </div>
                  <div className={styles.slaStat}>
                    <div className={styles.slaValue}>&lt;2hr</div>
                    <div className={styles.slaLabel}>incident response</div>
                  </div>
                  <div className={styles.slaStat}>
                    <div className={styles.slaValue}>24/7</div>
                    <div className={styles.slaLabel}>monitoring</div>
                  </div>
                </div>
              </div>
              <Link href="/contact" className={styles.serviceCta}>
                Get Managed Operations →
              </Link>
            </div>
            <div className={styles.serviceRight}>
              <div className={styles.deliverablesCard}>
                <h3 className={styles.deliverablesTitle}>What you get</h3>
                <ul className={styles.deliverablesList}>
                  {[
                    '24/7 agent monitoring and alerting',
                    'Automatic recovery from common failures',
                    'Monthly performance & ROI reports',
                    'Prompt optimization (quarterly)',
                    'API cost optimization',
                    'Model update management',
                    'Priority Slack support channel',
                    'Dedicated account manager',
                    'Quarterly strategy review call',
                  ].map((item, i) => (
                    <li key={i} className={styles.deliverableItem}>
                      <span className={styles.check}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className={styles.deliverablesFooter}>
                  <div className={styles.deliverablesMeta}>
                    <div className={styles.deliverablesMeta__item}>
                      <span className={styles.metaLabel}>Commitment</span>
                      <span className={styles.metaValue}>3-month minimum</span>
                    </div>
                    <div className={styles.deliverablesMeta__item}>
                      <span className={styles.metaLabel}>Onboarding</span>
                      <span className={styles.metaValue}>1 week</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ─────────────────────── */}
      <section className={styles.comparison}>
        <div className={styles.container}>
          <div className={styles.comparisonHeader}>
            <p className={styles.label}>Compare Services</p>
            <h2 className={styles.comparisonTitle}>Which service is right for you?</h2>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thLeft}>What you need</th>
                  <th>Audit</th>
                  <th>Build</th>
                  <th>Managed Ops</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["You're not sure where to start with AI", '✓', '—', '—'],
                  ['You need an ROI projection to get budget approved', '✓', '—', '—'],
                  ["You know what to build and need someone to build it", '—', '✓', '—'],
                  ['You want to own the code and run it yourself', '—', '✓', '—'],
                  ["You want someone else to operate the system", '—', '—', '✓'],
                  ['You need 24/7 monitoring and SLA guarantees', '—', '—', '✓'],
                  ["Best when you're just starting AI adoption", '✓', '—', '—'],
                  ['Best when you have a clear use case ready', '—', '✓', '—'],
                  ['Best when you already have agents in production', '—', '—', '✓'],
                ].map(([feature, audit, build, ops], i) => (
                  <tr key={i}>
                    <td className={styles.tdFeature}>{feature}</td>
                    <td className={styles.tdCell}>
                      <span className={audit === '✓' ? styles.cellYes : styles.cellNo}>{audit}</span>
                    </td>
                    <td className={styles.tdCell}>
                      <span className={build === '✓' ? styles.cellYes : styles.cellNo}>{build}</span>
                    </td>
                    <td className={styles.tdCell}>
                      <span className={ops === '✓' ? styles.cellYes : styles.cellNo}>{ops}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CTABanner
        headline="Not sure which service fits? Let's figure it out together."
        subline="Book a free 30-minute call. Tell us where you are, we'll tell you where to start."
        ctaText="Book a Free Call"
        ctaHref="/contact"
      />
    </>
  );
}
