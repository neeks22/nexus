import styles from './Hero.module.css';

interface HeroProps {
  badge?: string;
  headline: string;
  subline: string;
  primaryCta?: { text: string; href: string };
  secondaryCta?: { text: string; href: string };
  showStats?: boolean;
}

export function Hero({
  badge,
  headline,
  subline,
  primaryCta = { text: 'Book a Free Audit', href: '/contact' },
  secondaryCta,
  showStats = false,
}: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        {badge && (
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            {badge}
          </div>
        )}
        <h1 className={styles.headline}>{headline}</h1>
        <p className={styles.subline}>{subline}</p>
        <div className={styles.actions}>
          <a href={primaryCta.href} className={styles.primaryCta}>
            {primaryCta.text}
            <span>→</span>
          </a>
          {secondaryCta && (
            <a href={secondaryCta.href} className={styles.secondaryCta}>
              {secondaryCta.text}
            </a>
          )}
        </div>
        {showStats && (
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>$47K</div>
              <div className={styles.statLabel}>avg. annual savings</div>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <div className={styles.statValue}>89%</div>
              <div className={styles.statLabel}>failures recovered auto.</div>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <div className={styles.statValue}>24/7</div>
              <div className={styles.statLabel}>self-healing uptime</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
