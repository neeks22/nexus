import type { Metadata } from 'next';
import Link from 'next/link';
import { CTABanner } from '@/components/CTABanner';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Case Studies',
  description:
    'Real results from Nexus AI agent deployments. 60% faster lead response, 120 hours saved monthly, 89% of support tickets automated.',
};

const caseStudies = [
  {
    id: 'ottawa-real-estate',
    client: 'Ottawa Real Estate Group',
    industry: 'Real Estate',
    headline: '60% reduction in lead response time',
    service: 'Custom Agent Build + Managed Operations',
    investment: '$38,000 build + $9,000/mo managed',
    roi: '311% in year one',
    challenge: `Ottawa Real Estate Group was processing over 400 inbound leads per month across seven agents.
    Response time averaged 4.2 hours — long enough that leads were going cold and choosing competitors.
    Their lead routing system was a patchwork of manual Slack notifications and spreadsheet tracking.
    One agent's vacation could back up leads for days.

    Worse, they'd tried to automate with a simple chatbot the year before. It crashed every few weeks,
    left leads in a dead-end conversation flow, and the team spent more time managing the bot than it saved them.`,
    solution: `We built a three-agent pipeline: a classifier agent that categorized inbound leads by
    property type, price range, and urgency; a routing agent that matched leads to the right sales agent
    based on specialty and current workload; and a follow-up agent that sent personalized initial responses
    within 8 minutes while the human agent was being notified.

    Every agent was built on the Nexus self-healing framework. When the classifier hit a rate limit at 11pm,
    it backed off and retried automatically. When the routing agent received malformed data from their CRM,
    it detected the error, logged it with a full diagnosis, and routed to a fallback handler —
    instead of crashing and blocking 40 leads.`,
    results: [
      { metric: '60%', label: 'Reduction in lead response time (4.2h → 1.7h)' },
      { metric: '18%', label: 'Increase in lead-to-showing conversion rate' },
      { metric: '0', label: 'Agent-caused lead loss in 6 months post-launch' },
      { metric: '$127K', label: 'Additional revenue attributed to faster response' },
    ],
    quote: "Before Nexus, our lead routing agent would crash every few days and nobody would notice for hours. New leads were going cold. Now it just... runs. We've had zero downtime in three months and our conversion rate is up 18%.",
    quoteName: 'Jennifer Malik',
    quoteTitle: 'VP Operations, Ottawa Real Estate Group',
  },
  {
    id: 'smith-associates-law',
    client: 'Smith & Associates Law',
    industry: 'Legal Services',
    headline: 'Automated document processing saves 120 hours per month',
    service: 'AI Agent Audit + Custom Agent Build',
    investment: '$12,000 audit + $44,000 build',
    roi: '420% in year one',
    challenge: `Smith & Associates is a 40-person Ottawa law firm handling primarily real estate,
    corporate, and estate law. Their intake process required paralegals to manually review incoming
    documents, extract key information into their case management system, flag urgent items,
    and route files to the right lawyer.

    This process consumed approximately 120 paralegal hours per month — roughly $9,600 in labor at
    their billing rate. More critically, the manual nature created a backlog: documents received after 4pm
    weren't processed until the next morning, which caused downstream delays and occasionally missed deadlines.`,
    solution: `The audit identified document processing as the highest-ROI opportunity. We built a
    four-agent document processing pipeline: an OCR extraction agent that processed incoming PDFs;
    a classification agent that identified document type (deed, will, corporate filing, etc.) with
    94% accuracy; an extraction agent that pulled structured data into their practice management system;
    and a triage agent that flagged urgent documents and notified the right lawyer via Slack.

    The pipeline runs 24/7. Documents received at 2am are processed and waiting in the lawyer's queue
    when they arrive at 8am. The self-healing framework handled the firm's legacy scanner, which
    produced occasionally malformed PDFs — rather than crashing, the extraction agent would apply
    a fallback OCR strategy and log the anomaly for review.`,
    results: [
      { metric: '120hrs', label: 'Paralegal hours saved per month' },
      { metric: '94%', label: 'Document classification accuracy' },
      { metric: '8min', label: 'Average document processing time (was 2 hours)' },
      { metric: '$115K', label: 'Annual labor cost savings' },
    ],
    quote: "We were skeptical. Law firms don't move fast on new tech. But the ROI projection Nexus gave us was too compelling to ignore. Document intake that used to take a paralegal two hours now takes four minutes. And when the system has an issue, it fixes itself.",
    quoteName: 'Robert Chen',
    quoteTitle: 'Managing Partner, Smith & Associates Law',
  },
  {
    id: 'techstart-saas',
    client: 'TechStart Inc',
    industry: 'SaaS / Technology',
    headline: 'Self-healing support bot handles 89% of tickets automatically',
    service: 'Custom Agent Build + Managed Operations',
    investment: '$29,000 build + $7,500/mo managed',
    roi: '508% in year one',
    challenge: `TechStart is a 60-person SaaS company with a developer productivity tool used by
    8,000 active teams. Their support volume had grown to 1,200 tickets per month, but the support
    team was only 3 people. Average resolution time was 18 hours. Churn analysis showed a direct
    correlation between slow support response and cancellations in the first 90 days.

    They had tried two AI support solutions in the previous year. The first was a static FAQ bot
    that couldn't handle nuanced questions. The second was a more capable AI system that produced
    excellent answers but crashed under load twice in the first month — requiring a full restart
    each time, which left hundreds of tickets unresolved for hours.`,
    solution: `We built a three-tier support agent system: a triage agent that classified incoming
    tickets by category (billing, technical, account, feature request) and urgency; a resolution agent
    with deep knowledge of TechStart's product, documentation, and known issues — capable of handling
    the full lifecycle of a support conversation; and an escalation agent that prepared full context
    summaries for the human support team on tickets that required human judgment.

    The key technical challenge was reliability. We implemented circuit breakers at every external
    API integration point (their ticketing system, their product database, their account management system).
    When any integration failed, the agent degraded gracefully rather than crashing. The self-healing
    framework recovered 97% of infrastructure failures automatically, with only 3% requiring manual review.`,
    results: [
      { metric: '89%', label: 'Tickets handled fully automatically' },
      { metric: '4.8min', label: 'Average first response time (was 18 hours)' },
      { metric: '97%', label: 'Infrastructure failures recovered automatically' },
      { metric: '31%', label: 'Reduction in 90-day churn' },
    ],
    quote: "We tried two other AI support solutions before Nexus. Both fell apart in production. The Nexus team was the first to show us a live demo where they deliberately broke the agent mid-conversation and watched it recover on its own. That's when we knew.",
    quoteName: 'Sarah Thompson',
    quoteTitle: 'CTO, TechStart Inc',
  },
];

export default function CaseStudiesPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.label}>Proof We Deliver</p>
          <h1 className={styles.headline}>Results, not promises</h1>
          <p className={styles.subline}>
            Every case study below is a real engagement. Real numbers.
            Real companies that were losing money to broken AI before they called us.
          </p>
          <div className={styles.heroMetrics}>
            <div className={styles.heroMetric}>
              <div className={styles.heroMetricValue}>$47K</div>
              <div className={styles.heroMetricLabel}>avg. annual savings</div>
            </div>
            <div className={styles.heroMetricDivider} />
            <div className={styles.heroMetric}>
              <div className={styles.heroMetricValue}>420%</div>
              <div className={styles.heroMetricLabel}>avg. ROI year one</div>
            </div>
            <div className={styles.heroMetricDivider} />
            <div className={styles.heroMetric}>
              <div className={styles.heroMetricValue}>89%</div>
              <div className={styles.heroMetricLabel}>failures auto-recovered</div>
            </div>
          </div>
        </div>
      </section>

      {caseStudies.map((cs, index) => (
        <article
          key={cs.id}
          id={cs.id}
          className={`${styles.caseStudy} ${index % 2 === 1 ? styles.caseStudyAlt : ''}`}
        >
          <div className={styles.container}>
            <div className={styles.csHeader}>
              <div className={styles.csTag}>
                <span className={styles.csIndustry}>{cs.industry}</span>
              </div>
              <h2 className={styles.csHeadline}>{cs.headline}</h2>
              <p className={styles.csClient}>{cs.client}</p>
            </div>

            <div className={styles.csMeta}>
              <div className={styles.csMetaItem}>
                <span className={styles.csMetaLabel}>Service</span>
                <span className={styles.csMetaValue}>{cs.service}</span>
              </div>
              <div className={styles.csMetaItem}>
                <span className={styles.csMetaLabel}>Investment</span>
                <span className={styles.csMetaValue}>{cs.investment}</span>
              </div>
              <div className={styles.csMetaItem}>
                <span className={styles.csMetaLabel}>ROI</span>
                <span className={`${styles.csMetaValue} ${styles.csMetaRoi}`}>{cs.roi}</span>
              </div>
            </div>

            <div className={styles.csBody}>
              <div className={styles.csNarrative}>
                <div className={styles.csSection}>
                  <h3 className={styles.csSectionTitle}>The Challenge</h3>
                  <p className={styles.csSectionText}>{cs.challenge}</p>
                </div>
                <div className={styles.csSection}>
                  <h3 className={styles.csSectionTitle}>The Solution</h3>
                  <p className={styles.csSectionText}>{cs.solution}</p>
                </div>
              </div>

              <div className={styles.csSidebar}>
                <div className={styles.csResults}>
                  <h3 className={styles.csResultsTitle}>Results</h3>
                  <div className={styles.csResultsGrid}>
                    {cs.results.map((r, i) => (
                      <div key={i} className={styles.csResult}>
                        <div className={styles.csResultMetric}>{r.metric}</div>
                        <div className={styles.csResultLabel}>{r.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <blockquote className={styles.csQuote}>
                  <p className={styles.csQuoteText}>"{cs.quote}"</p>
                  <footer className={styles.csQuoteAuthor}>
                    <div className={styles.csQuoteAvatar}>
                      {cs.quoteName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className={styles.csQuoteName}>{cs.quoteName}</div>
                      <div className={styles.csQuoteTitle}>{cs.quoteTitle}</div>
                    </div>
                  </footer>
                </blockquote>
              </div>
            </div>
          </div>
        </article>
      ))}

      <CTABanner
        headline="Your results could be next."
        subline="Book a free audit call. We'll show you exactly what's possible for your business."
        ctaText="Book a Free Audit"
        ctaHref="/contact"
        secondaryText="View pricing"
        secondaryHref="/pricing"
      />
    </>
  );
}
