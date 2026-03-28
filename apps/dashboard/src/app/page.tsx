import { StatCard } from '@/components/StatCard';
import { AgentTable } from '@/components/AgentTable';
import { DebateList } from '@/components/DebateList';
import {
  MOCK_AGENTS,
  MOCK_DEBATES,
  DASHBOARD_STATS,
} from '@/lib/mock-data';
import styles from './page.module.css';

const VERSION = '0.1.0';

export default function DashboardPage() {
  const stats = DASHBOARD_STATS;

  return (
    <div className={styles.root}>
      {/* ── Header ─────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoMark}>N</div>
          <div>
            <h1 className={styles.title}>NEXUS DASHBOARD</h1>
            <p className={styles.subtitle}>
              Self-healing multi-agent orchestration
            </p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.systemStatus}>
            <span className={styles.statusDot} />
            <span className={styles.statusText}>ALL SYSTEMS OPERATIONAL</span>
          </div>
          <div className={styles.versionBadge}>v{VERSION}</div>
          <div className={styles.timestamp}>
            {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC
          </div>
        </div>
      </header>

      <main className={styles.main}>

        {/* ── Stat Cards ─────────────────────────────── */}
        <section className={styles.statsGrid}>
          <StatCard
            label="Total Debates"
            value={stats.totalDebates}
            delta={stats.debatesDelta}
            deltaLabel="vs last week"
          />
          <StatCard
            label="Active Agents"
            value={stats.totalAgents}
          />
          <StatCard
            label="Avg Health Score"
            value={Math.round(stats.avgHealthScore * 100)}
            unit="%"
          />
          <StatCard
            label="Total Cost"
            value={`$${stats.totalCost.toFixed(2)}`}
            delta={stats.costDelta}
            deltaLabel="vs last week"
            deltaPositiveIsGood={false}
          />
        </section>

        {/* ── Uptime strip ───────────────────────────── */}
        <div className={styles.uptimeStrip}>
          <span className={styles.uptimeLabel}>30-DAY UPTIME</span>
          <div className={styles.uptimeBlocks}>
            {Array.from({ length: 30 }).map((_, i) => {
              // Simulate mostly healthy with a couple blips
              const state =
                i === 21 ? 'degraded' : i === 22 ? 'failed' : 'healthy';
              return (
                <div
                  key={i}
                  className={`${styles.uptimeBlock} ${styles[state as keyof typeof styles]}`}
                  title={`Day ${i + 1}: ${state}`}
                />
              );
            })}
          </div>
          <span className={styles.uptimePct}>{stats.uptimePct}%</span>
        </div>

        {/* ── Agent Health Table ─────────────────────── */}
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <span className={styles.panelIcon}>◈</span>
              Agent Health
            </div>
            <div className={styles.panelMeta}>
              {MOCK_AGENTS.length} agents monitored
            </div>
          </div>
          <AgentTable agents={MOCK_AGENTS} />
        </section>

        {/* ── Debates ────────────────────────────────── */}
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <span className={styles.panelIcon}>◆</span>
              Recent Debates
            </div>
            <div className={styles.panelMeta}>
              {MOCK_DEBATES.length} debates this week
            </div>
          </div>
          <DebateList debates={MOCK_DEBATES} />
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className={styles.footer}>
        <span>Nexus v{VERSION}</span>
        <span className={styles.footerDivider}>·</span>
        <span>Data refreshes every 30s in production</span>
        <span className={styles.footerDivider}>·</span>
        <span style={{ color: 'var(--text-muted)' }}>v0.1 — mock data</span>
      </footer>
    </div>
  );
}
