import styles from './ServiceCard.module.css';

interface ServiceCardProps {
  number: string;
  title: string;
  priceRange: string;
  description: string;
  deliverables: string[];
  featured?: boolean;
  cta?: string;
  href?: string;
}

export function ServiceCard({
  number,
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
      <div className={styles.number}>{number}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.price}>{priceRange}</p>
      <p className={styles.description}>{description}</p>
      <ul className={styles.deliverables}>
        {deliverables.map((d) => (
          <li key={d} className={styles.deliverable}>
            <span className={styles.check}>&#10003;</span>
            {d}
          </li>
        ))}
      </ul>
      <a href={href} className={styles.cta}>{cta}</a>
    </div>
  );
}
