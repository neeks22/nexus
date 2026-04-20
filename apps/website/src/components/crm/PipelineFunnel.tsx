'use client';

interface PipelineFunnelProps {
  pipelineCounts: Record<string, number>;
}

const STAGES = [
  { key: 'new', label: 'New', color: '#6366f1' },
  { key: 'contacted', label: 'Contacted', color: '#8b5cf6' },
  { key: 'appointment', label: 'Appointment', color: '#a855f7' },
  { key: 'showed', label: 'Showed', color: '#f59e0b' },
  { key: 'credit_app', label: 'Credit App', color: '#f97316' },
  { key: 'approved', label: 'Approved', color: '#10b981' },
  { key: 'delivered', label: 'Delivered', color: '#22c55e' },
];

// Subprime internet-lead benchmark close rate (delivered / total lifetime leads).
const CLOSE_RATE_BENCHMARK = 0.08;

export default function PipelineFunnel({ pipelineCounts }: PipelineFunnelProps): React.ReactElement {
  const stageCounts = STAGES.map(s => pipelineCounts[s.key] || 0);
  const openTotal = stageCounts.slice(0, -1).reduce((a, b) => a + b, 0); // exclude delivered
  const delivered = pipelineCounts['delivered'] || 0;
  const lost = pipelineCounts['lost'] || 0;
  const lifetimeTotal = stageCounts.reduce((a, b) => a + b, 0) + lost;
  const maxCount = Math.max(1, ...stageCounts);
  const closeRate = lifetimeTotal > 0 ? delivered / lifetimeTotal : 0;
  const lossRate = lifetimeTotal > 0 ? lost / lifetimeTotal : 0;
  const closeColor = closeRate >= CLOSE_RATE_BENCHMARK ? '#10b981' : '#f59e0b';

  const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: 0 }}>Pipeline</h3>
          <div style={{ color: '#8888a0', fontSize: '11px', marginTop: '4px' }}>Current snapshot · {lifetimeTotal} leads lifetime</div>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
          <div>
            <div style={{ color: '#8888a0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Open</div>
            <div style={{ color: '#f0f0f5', fontWeight: 600, fontSize: '14px' }}>{openTotal}</div>
          </div>
          <div>
            <div style={{ color: '#8888a0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Close Rate</div>
            <div style={{ color: closeColor, fontWeight: 600, fontSize: '14px' }} title={`Target: ${pct(CLOSE_RATE_BENCHMARK)}+`}>{pct(closeRate)}</div>
          </div>
          <div>
            <div style={{ color: '#8888a0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lost</div>
            <div style={{ color: lost > 0 ? '#ef4444' : '#8888a0', fontWeight: 600, fontSize: '14px' }}>{lost} ({pct(lossRate)})</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {STAGES.map((stage, i) => {
          const count = stageCounts[i];
          const widthPct = Math.max(4, (count / maxCount) * 100);
          const prevCount = i > 0 ? stageCounts[i - 1] : null;
          const stageRatio = prevCount && prevCount > 0 ? count / prevCount : null;
          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#8888a0', fontSize: '12px', width: '84px', textAlign: 'right' }}>{stage.label}</span>
              <div style={{ flex: 1, height: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${widthPct}%`, height: '100%', background: stage.color,
                  borderRadius: '4px', transition: 'width 0.3s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px',
                }}>
                  {count > 0 && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>{count}</span>}
                </div>
              </div>
              <span style={{ color: '#8888a0', fontSize: '11px', width: '64px', textAlign: 'left' }}>
                {stageRatio != null ? `${(stageRatio * 100).toFixed(0)}% of prior` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
