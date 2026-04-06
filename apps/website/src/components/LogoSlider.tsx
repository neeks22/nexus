import styles from './LogoSlider.module.css';

const logos = [
  { name: 'Anthropic', width: 120 },
  { name: 'Twilio', width: 80 },
  { name: 'Supabase', width: 100 },
  { name: 'Vercel', width: 80 },
  { name: 'Stripe', width: 70 },
  { name: 'Next.js', width: 80 },
  { name: 'Sentry', width: 80 },
];

export function LogoSlider() {
  const renderLogo = (logo: typeof logos[0], index: number) => (
    <div key={`${logo.name}-${index}`} className={styles.logo} aria-label={logo.name}>
      <svg viewBox={`0 0 ${logo.width} 20`} fill="currentColor" height="20" width={logo.width}>
        <text x="0" y="15" fontFamily="Inter, system-ui" fontSize="16" fontWeight="600" letterSpacing="-0.02em">
          {logo.name}
        </text>
      </svg>
    </div>
  );

  return (
    <section className={styles.section}>
      <p className={styles.label}>BUILT WITH</p>
      <div className={styles.track}>
        <div className={styles.slider}>
          {logos.map((logo, i) => renderLogo(logo, i))}
          {logos.map((logo, i) => renderLogo(logo, i + logos.length))}
        </div>
      </div>
    </section>
  );
}
