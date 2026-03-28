import styles from './HealthBar.module.css';

interface HealthBarProps {
  value: number; // 0–1
}

function getColor(value: number): string {
  if (value >= 0.85) return 'var(--healthy-color)';
  if (value >= 0.40) return 'var(--degraded-color)';
  if (value >= 0.15) return 'var(--recovering-color)';
  return 'var(--failed-color)';
}

export function HealthBar({ value }: HealthBarProps) {
  const pct = Math.round(value * 100);
  const color = getColor(value);

  return (
    <div className={styles.wrapper}>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className={styles.label} style={{ color }}>
        {pct}
      </span>
    </div>
  );
}
