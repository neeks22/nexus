import type { HealthState } from '@/lib/mock-data';
import styles from './HealthBadge.module.css';

interface HealthBadgeProps {
  state: HealthState;
}

const STATE_LABELS: Record<HealthState, string> = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  RECOVERING: 'RECOVERING',
  FAILED: 'FAILED',
};

export function HealthBadge({ state }: HealthBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[state.toLowerCase() as Lowercase<HealthState>]}`}>
      <span className={styles.dot} />
      {STATE_LABELS[state]}
    </span>
  );
}
