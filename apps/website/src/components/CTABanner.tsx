import styles from './CTABanner.module.css';

interface CTABannerProps {
  headline: string;
  subline?: string;
  ctaText?: string;
  ctaHref?: string;
}

export function CTABanner({
  headline,
  subline,
  ctaText = 'Book a Free Audit',
  ctaHref = '/contact',
}: CTABannerProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.headline}>{headline}</h2>
        {subline && <p className={styles.subline}>{subline}</p>}
        <a href={ctaHref} className={styles.cta}>
          {ctaText}
        </a>
      </div>
    </section>
  );
}
