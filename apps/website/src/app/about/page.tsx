import type { Metadata } from 'next';
import Link from 'next/link';
import { CTABanner } from '@/components/CTABanner';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Nexus is an Ottawa-based AI agency that builds self-healing multi-agent systems. We built the technology because we saw companies waste millions on fragile AI.',
};

export default function AboutPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.label}>Our Story</p>
          <h1 className={styles.headline}>
            We built Nexus because we were tired of watching AI fail in production.
          </h1>
        </div>
      </section>

      <section className={styles.story}>
        <div className={styles.container}>
          <div className={styles.storyInner}>
            <div className={styles.storyContent}>
              <p className={styles.storyLead}>
                We&rsquo;ve spent years building AI systems for companies across Canada.
                Financial services, government, real estate, law, SaaS. And we kept seeing
                the same pattern: brilliant technology in the demo, disaster in production.
              </p>
              <p className={styles.storyText}>
                The company would spend three months building an agent system. It would work
                perfectly in staging. They&rsquo;d launch. Two weeks later, at 2am on a Friday,
                the agent would hit a rate limit. Or a third-party API would return malformed data.
                Or the model would hallucinate badly enough that the validation logic couldn&rsquo;t
                catch it. The agent would crash. The whole pipeline would die. And nobody would notice
                until Monday morning.
              </p>
              <p className={styles.storyText}>
                By the time we arrived, they&rsquo;d lost hundreds of thousands in revenue and
                whatever confidence their leadership had in AI. The technology wasn&rsquo;t the problem.
                The fragility was. There was no mechanism for agents to detect their own failures,
                no automatic recovery, no graceful degradation. When something went wrong,
                everything stopped.
              </p>
              <p className={styles.storyText}>
                So we built Nexus. We took everything we knew from a decade of production software
                engineering — circuit breakers, health monitoring, exponential backoff, graceful degradation —
                and built it into an AI agent framework from the ground up. Not bolted on. Not an optional
                feature. Fundamental to how every agent works.
              </p>
              <p className={styles.storyText}>
                The difference between AI that works in a demo and AI that works in production is not
                the model. It&rsquo;s the infrastructure around it.
              </p>
              <p className={styles.storyText}>
                That&rsquo;s what we sell.
              </p>
            </div>

            <aside className={styles.storyAside}>
              <div className={styles.asideCard}>
                <div className={styles.asideTitle}>The numbers</div>
                <div className={styles.asideStat}>
                  <div className={styles.asideStatValue}>88%</div>
                  <div className={styles.asideStatLabel}>of AI agent projects fail before production</div>
                </div>
                <div className={styles.asideStat}>
                  <div className={styles.asideStatValue}>$10K</div>
                  <div className={styles.asideStatLabel}>average monthly waste on failed agent calls</div>
                </div>
                <div className={styles.asideStat}>
                  <div className={styles.asideStatValue}>89%</div>
                  <div className={styles.asideStatLabel}>of failures recovered automatically with Nexus</div>
                </div>
              </div>

              <div className={styles.asideCard}>
                <div className={styles.asideTitle}>Built in public</div>
                <p className={styles.asideText}>
                  The Nexus framework is open-source (MIT). Any developer can inspect
                  exactly how our self-healing works — the circuit breakers, the error taxonomy,
                  the recovery strategies. We believe transparency builds trust.
                </p>
                <a
                  href="https://github.com/nexus-agents/nexus-core"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.asideLink}
                >
                  View on GitHub →
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── VALUES ───────────────────────────────── */}
      <section className={styles.values}>
        <div className={styles.container}>
          <div className={styles.valuesHeader}>
            <p className={styles.label}>How We Work</p>
            <h2 className={styles.valuesTitle}>What you can expect from us</h2>
          </div>
          <div className={styles.valuesGrid}>
            {[
              {
                icon: '🔍',
                title: 'We tell you when we\'re not the right fit',
                text: 'If your use case doesn\'t need self-healing agents, we\'ll tell you. If a simpler solution would serve you better, we\'ll say so. We don\'t take engagements we can\'t deliver on.',
              },
              {
                icon: '📐',
                title: 'We show our work',
                text: 'Every engagement produces artifacts you can understand: architecture diagrams, detailed prompts, documented integrations. You\'re not buying a black box. You\'re buying a system you can reason about.',
              },
              {
                icon: '💰',
                title: 'ROI is not optional',
                text: 'We price every engagement against the value it will create. If we can\'t build a credible ROI case before you sign, we won\'t take your money. The AI Agent Audit exists specifically to prevent expensive mistakes.',
              },
              {
                icon: '⚡',
                title: 'Production is the only thing that matters',
                text: 'We don\'t celebrate demos. We celebrate 6-month uptime reports. Every design decision we make is filtered through one question: will this survive contact with production?',
              },
              {
                icon: '🇨🇦',
                title: 'Ottawa-first, globally capable',
                text: 'We\'re based in Ottawa. We understand the Canadian government contractor market, bilingual requirements, and data residency concerns. We also work with companies across North America.',
              },
              {
                icon: '🔓',
                title: 'No lock-in',
                text: 'Every system we build runs on open-source foundations. You own the code. You can hire any TypeScript developer to maintain it. Our goal is to make you so successful you want to keep working with us — not to make leaving painful.',
              },
            ].map((v, i) => (
              <div key={i} className={styles.valueCard}>
                <div className={styles.valueIcon}>{v.icon}</div>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valueText}>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECHNOLOGY ───────────────────────────── */}
      <section className={styles.tech}>
        <div className={styles.container}>
          <div className={styles.techInner}>
            <div className={styles.techLeft}>
              <p className={styles.label}>Our Technology</p>
              <h2 className={styles.techTitle}>The Nexus Framework</h2>
              <p className={styles.techText}>
                Every client system we build is powered by <code>nexus-core</code> —
                our open-source TypeScript framework for multi-agent AI orchestration.
                It&rsquo;s the same tool available free on npm, used by developers worldwide.
              </p>
              <p className={styles.techText}>
                The framework wraps every agent API call in a self-healing pipeline:
                pre-flight token counting, output validation, error classification,
                recovery strategy selection, and retry — automatically, on every call.
                Agents monitor their own health. Circuit breakers prevent cascade failures.
                An immutable transcript records exactly what happened.
              </p>
              <p className={styles.techText}>
                When we build for clients, we&rsquo;re not building on top of a framework.
                We&rsquo;re the people who built the framework. That matters when something
                goes wrong at 2am.
              </p>
              <div className={styles.techStack}>
                {['TypeScript', 'Anthropic Claude', 'Node.js 22+', 'nexus-core', 'Vitest', 'pino'].map(t => (
                  <span key={t} className={styles.techTag}>{t}</span>
                ))}
              </div>
            </div>
            <div className={styles.techRight}>
              <div className={styles.codeBlock}>
                <div className={styles.codeBlockBar}>
                  <span className={styles.dot} style={{background: '#ff5f57'}} />
                  <span className={styles.dot} style={{background: '#ffbd2e'}} />
                  <span className={styles.dot} style={{background: '#28c840'}} />
                  <span className={styles.codeBlockTitle}>nexus-core — quick start</span>
                </div>
                <pre className={styles.codeBlockBody}>{`import { Team } from 'nexus-core';

const team = new Team({
  protocol: 'sequential',
  agents: [
    {
      id: 'classifier',
      name: 'Classifier',
      systemPrompt: 'Classify inbound leads.',
      model: 'claude-sonnet-4-20250514',
    },
    {
      id: 'router',
      name: 'Router',
      systemPrompt: 'Route leads to agents.',
      model: 'claude-haiku-4-20250514',
    },
  ],
});

const result = await team.run({
  topic: 'New lead: 3-bedroom, Westboro'
});

// Self-healing is automatic.
// Every call. No configuration.
console.log(result.healingSummary);
// { successRate: 1.0, tombstones: [] }`}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTABanner
        headline="Ready to build AI that actually works in production?"
        subline="Book a free 30-minute call. No commitment, no pressure — just a conversation about what you're trying to build."
        ctaText="Book a Free Audit"
        ctaHref="/contact"
        secondaryText="View our services"
        secondaryHref="/services"
      />
    </>
  );
}
