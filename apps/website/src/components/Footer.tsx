import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link href="/" className={styles.logo}>
              <span className={styles.logoMark}>N</span>
              <span className={styles.logoText}>Nexus AI</span>
            </Link>
            <p className={styles.tagline}>
              Self-healing AI agent systems for companies that can't afford downtime.
            </p>
            <p className={styles.location}>Ottawa, Canada</p>
          </div>

          <div className={styles.columns}>
            <div className={styles.column}>
              <h4 className={styles.columnTitle}>Services</h4>
              <ul className={styles.columnLinks}>
                <li><Link href="/services#audit">AI Agent Audit</Link></li>
                <li><Link href="/services#build">Custom Agent Build</Link></li>
                <li><Link href="/services#retainer">Managed Operations</Link></li>
              </ul>
            </div>

            <div className={styles.column}>
              <h4 className={styles.columnTitle}>Company</h4>
              <ul className={styles.columnLinks}>
                <li><Link href="/about">About</Link></li>
                <li><Link href="/case-studies">Case Studies</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>

            <div className={styles.column}>
              <h4 className={styles.columnTitle}>Get Started</h4>
              <ul className={styles.columnLinks}>
                <li><Link href="/contact">Book a Free Audit</Link></li>
                <li>
                  <a href="https://github.com/nexus-agents/nexus-core" target="_blank" rel="noopener noreferrer">
                    GitHub (OSS)
                  </a>
                </li>
                <li>
                  <a href="https://npmjs.com/package/nexus-core" target="_blank" rel="noopener noreferrer">
                    npm Package
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>&copy; 2026 Nexus AI Inc. All rights reserved.</p>
          <p className={styles.builtWith}>
            Built with{' '}
            <code className={styles.code}>nexus-core</code>
            {' '}&mdash; self-healing, always.
          </p>
        </div>
      </div>
    </footer>
  );
}
