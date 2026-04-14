'use client';

import type { ScoredResult, Lender } from './types';

interface LenderCardProps {
  result: ScoredResult;
  lenderData: Lender | undefined;
  rank: number;
  isMobile: boolean;
  styles: {
    card: React.CSSProperties;
    badge: (bg: string, fg: string) => React.CSSProperties;
  };
}

const RANK_LABELS = ['Best Match', '2nd Option', '3rd Option'];

export default function LenderCard({ result: r, lenderData, rank, isMobile, styles: s }: LenderCardProps): React.ReactElement {
  const isTop = rank === 0;

  return (
    <div
      className="cr-enter"
      style={{
        ...s.card,
        marginBottom: 12,
        animationDelay: `${0.1 + rank * 0.06}s`,
        borderColor: isTop ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
        boxShadow: isTop ? '0 0 40px rgba(99,102,241,0.08)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {rank < 3 && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: isTop ? 'linear-gradient(135deg, #DC2626, #B91C1C)' : '#1a1a25',
          color: isTop ? '#fff' : '#55556a',
          fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
          padding: '5px 14px', borderBottomLeftRadius: 10,
          textTransform: 'uppercase',
        }}>{RANK_LABELS[rank]}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#f0f0f5', letterSpacing: '-0.02em' }}>{r.lender}</div>
          {r.tier && (
            <div style={{ fontSize: isMobile ? 11 : 13, color: '#55556a', marginTop: 4, fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-word' }}>
              {r.tier.tier} &mdash; {r.tier.rate} &mdash; LTV {r.tier.maxLTV} &mdash; Reserve {r.tier.reserve}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: isMobile ? 12 : 20 }}>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: isTop ? '#DC2626' : '#55556a', lineHeight: 1 }}>{Math.round(r.score)}</div>
          <div style={{ fontSize: 10, color: '#55556a', letterSpacing: '0.05em', marginTop: 2 }}>SCORE</div>
        </div>
      </div>

      {r.reasons.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {r.reasons.map((reason, j) => (
            <span key={j} style={s.badge('rgba(16,185,129,0.1)', '#10b981')}>{reason}</span>
          ))}
        </div>
      )}

      {r.warnings.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {r.warnings.map((w, j) => (
            <span key={j} style={s.badge('rgba(239,68,68,0.1)', '#ef4444')}>{w}</span>
          ))}
        </div>
      )}

      {lenderData?.special && (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {lenderData.special.map((feat, j) => (
            <span key={j} style={{
              background: 'rgba(255,255,255,0.03)',
              color: '#55556a',
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 11,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>{feat}</span>
          ))}
        </div>
      )}
    </div>
  );
}
