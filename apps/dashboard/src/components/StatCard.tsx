import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  deltaPositiveIsGood?: boolean;
}

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  deltaPositiveIsGood = true,
}: StatCardProps) {
  const hasDelta = delta !== undefined;
  const isPositive = (delta ?? 0) >= 0;
  const isGood = deltaPositiveIsGood ? isPositive : !isPositive;

  const deltaClass = !hasDelta
    ? ''
    : isGood
    ? styles.deltaPositive
    : styles.deltaNegative;

  const arrow = isPositive ? '↑' : '↓';
  const absVal = Math.abs(delta ?? 0);

  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>
        {value}
        {unit && <span>{unit}</span>}
      </div>
      {hasDelta && (
        <div className={`${styles.delta} ${deltaClass}`}>
          <span>{arrow} {absVal}%</span>
          {deltaLabel && (
            <span style={{ color: 'var(--text-muted)' }}>{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
