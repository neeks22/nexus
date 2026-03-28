import styles from './CTABanner.module.css';

interface CTABannerProps {
  headline: string;
  subline?: string;
  ctaText?: string;
  ctaHref?: string;
  secondaryText?: string;
  secondaryHref?: string;
}

export function CTABanner({
  headline,
  subline,
  ctaText = 'Book a Free Audit',
  ctaHref = '/contact',
  secondaryText,
  secondaryHref,
}: CTABannerProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.content}>
          <p className={styles.label}>Ready to start?</p>
          <h2 className={styles.headline}>{headline}</h2>
          {subline && <p className={styles.subline}>{subline}</p>}
        </div>
        <div className={styles.actions}>
          <a href={ctaHref} className={styles.primaryCta}>
            {ctaText}
          </a>
          {secondaryText && secondaryHref && (
            <a href={secondaryHref} className={styles.secondaryCta}>
              {secondaryText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
