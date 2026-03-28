import styles from './TestimonialCard.module.css';

interface TestimonialCardProps {
  quote: string;
  name: string;
  title: string;
  company: string;
  metric?: string;
}

export function TestimonialCard({ quote, name, title, company, metric }: TestimonialCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.stars}>★★★★★</div>
      {metric && <div className={styles.metric}>{metric}</div>}
      <blockquote className={styles.quote}>"{quote}"</blockquote>
      <div className={styles.author}>
        <div className={styles.avatar}>
          {name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className={styles.info}>
          <div className={styles.name}>{name}</div>
          <div className={styles.titleCompany}>{title}, {company}</div>
        </div>
      </div>
    </div>
  );
}
