import styles from './PricingCard.module.css';

interface PricingCardProps {
  tier: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  notIncluded?: string[];
  featured?: boolean;
  cta?: string;
}

export function PricingCard({
  tier,
  price,
  period = '/month',
  description,
  features,
  notIncluded = [],
  featured = false,
  cta = 'Get Started',
}: PricingCardProps) {
  return (
    <div className={`${styles.card} ${featured ? styles.featured : ''}`}>
      {featured && <div className={styles.badge}>Recommended</div>}
      <div className={styles.header}>
        <div className={styles.tier}>{tier}</div>
        <div className={styles.pricing}>
          <span className={styles.price}>{price}</span>
          {period && <span className={styles.period}>{period}</span>}
        </div>
        <p className={styles.description}>{description}</p>
      </div>
      <div className={styles.divider} />
      <ul className={styles.features}>
        {features.map((f, i) => (
          <li key={i} className={styles.feature}>
            <span className={styles.check}>✓</span>
            {f}
          </li>
        ))}
        {notIncluded.map((f, i) => (
          <li key={`no-${i}`} className={`${styles.feature} ${styles.notIncluded}`}>
            <span className={styles.x}>✕</span>
            {f}
          </li>
        ))}
      </ul>
      <a href="/contact" className={`${styles.cta} ${featured ? styles.ctaFeatured : ''}`}>
        {cta}
      </a>
    </div>
  );
}
