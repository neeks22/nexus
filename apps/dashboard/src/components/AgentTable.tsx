import type { AgentHealth } from '@/lib/mock-data';
import { HealthBadge } from './HealthBadge';
import { HealthBar } from './HealthBar';
import styles from './AgentTable.module.css';

interface AgentTableProps {
  agents: AgentHealth[];
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function AgentTable({ agents }: AgentTableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Agent</th>
            <th>State</th>
            <th>Health Score</th>
            <th>Success Rate</th>
            <th>Avg Latency</th>
            <th>Calls</th>
            <th>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id} className={styles.row}>
              <td>
                <div className={styles.agentCell}>
                  <span className={styles.agentName}>{agent.name}</span>
                  <span className={styles.agentModel}>{agent.model}</span>
                </div>
              </td>
              <td>
                <HealthBadge state={agent.state} />
              </td>
              <td>
                <HealthBar value={agent.overall} />
              </td>
              <td>
                <span
                  className={styles.rate}
                  style={{
                    color:
                      agent.successRate >= 0.9
                        ? 'var(--healthy-color)'
                        : agent.successRate >= 0.7
                        ? 'var(--degraded-color)'
                        : 'var(--failed-color)',
                  }}
                >
                  {Math.round(agent.successRate * 100)}%
                </span>
              </td>
              <td>
                <span
                  className={styles.latency}
                  style={{
                    color:
                      agent.avgLatencyMs <= 2000
                        ? 'var(--healthy-color)'
                        : agent.avgLatencyMs <= 5000
                        ? 'var(--degraded-color)'
                        : agent.avgLatencyMs <= 10000
                        ? 'var(--recovering-color)'
                        : 'var(--failed-color)',
                  }}
                >
                  {formatLatency(agent.avgLatencyMs)}
                </span>
              </td>
              <td className={styles.calls}>{agent.totalCalls}</td>
              <td className={styles.lastSeen}>{agent.lastSeen}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
