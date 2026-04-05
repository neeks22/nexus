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

export default function PipelineFunnel({ pipelineCounts }: PipelineFunnelProps): React.ReactElement {
  const maxCount = Math.max(1, ...STAGES.map(s => pipelineCounts[s.key] || 0));
  const lostCount = pipelineCounts['lost'] || 0;

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
      <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Pipeline</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {STAGES.map(stage => {
          const count = pipelineCounts[stage.key] || 0;
          const pct = Math.max(4, (count / maxCount) * 100);
          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#8888a0', fontSize: '12px', width: '80px', textAlign: 'right' }}>{stage.label}</span>
              <div style={{ flex: 1, height: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', background: stage.color,
                  borderRadius: '4px', transition: 'width 0.3s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px',
                }}>
                  {count > 0 && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>{count}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {lostCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: '#ef4444', fontSize: '12px', width: '80px', textAlign: 'right' }}>Lost</span>
          <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>{lostCount}</span>
        </div>
      )}
    </div>
  );
}
