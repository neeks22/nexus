import styles from './ServiceCard.module.css';

interface ServiceCardProps {
  icon: string;
  title: string;
  priceRange: string;
  description: string;
  deliverables: string[];
  featured?: boolean;
  cta?: string;
  href?: string;
}

export function ServiceCard({
  icon,
  title,
  priceRange,
  description,
  deliverables,
  featured = false,
  cta = 'Learn More',
  href = '/contact',
}: ServiceCardProps) {
  return (
    <div className={`${styles.card} ${featured ? styles.featured : ''}`}>
      {featured && <div className={styles.featuredBadge}>Most Popular</div>}
      <div className={styles.icon}>{icon}</div>
      <div className={styles.priceRange}>{priceRange}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      <ul className={styles.deliverables}>
        {deliverables.map((item, i) => (
          <li key={i} className={styles.deliverable}>
            <span className={styles.check}>✓</span>
            {item}
          </li>
        ))}
      </ul>
      <a href={href} className={`${styles.cta} ${featured ? styles.ctaFeatured : ''}`}>
        {cta}
      </a>
    </div>
  );
}
