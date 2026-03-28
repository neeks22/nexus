import type { DebateRecord } from '@/lib/mock-data';
import styles from './DebateList.module.css';

interface DebateListProps {
  debates: DebateRecord[];
}

const OUTCOME_STYLES: Record<
  DebateRecord['outcome'],
  { label: string; className: string }
> = {
  completed: { label: 'COMPLETED', className: 'completed' },
  partial:   { label: 'PARTIAL',   className: 'partial'   },
  failed:    { label: 'FAILED',    className: 'failed'    },
};

const PROTOCOL_SHORT: Record<string, string> = {
  debate: 'DEBATE',
  sequential: 'SEQ',
  parallel: 'PAR',
  'parallel-then-synthesize': 'PAR+SYN',
};

export function DebateList({ debates }: DebateListProps) {
  return (
    <div className={styles.list}>
      {debates.map((debate) => {
        const outcome = OUTCOME_STYLES[debate.outcome];
        return (
          <div key={debate.id} className={styles.item}>
            <div className={styles.header}>
              <div className={styles.topicRow}>
                <span className={styles.topic}>{debate.topic}</span>
                <span className={`${styles.outcomeBadge} ${styles[outcome.className as keyof typeof styles]}`}>
                  {outcome.label}
                </span>
              </div>
              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>date</span>
                  {debate.date}
                </span>
                <span className={styles.metaDivider}>/</span>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>protocol</span>
                  <span className={styles.protocol}>
                    {PROTOCOL_SHORT[debate.protocol] ?? debate.protocol.toUpperCase()}
                  </span>
                </span>
                <span className={styles.metaDivider}>/</span>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>rounds</span>
                  {debate.rounds}
                </span>
                <span className={styles.metaDivider}>/</span>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>cost</span>
                  <span className={styles.cost}>${debate.totalCost.toFixed(2)}</span>
                </span>
                <span className={styles.metaDivider}>/</span>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>tokens</span>
                  {debate.totalTokens.toLocaleString()}
                </span>
              </div>
            </div>
            <div className={styles.agents}>
              {debate.agents.map((name) => (
                <span key={name} className={styles.agentTag}>{name}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
