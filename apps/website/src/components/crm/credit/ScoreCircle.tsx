'use client';

import { tierColor } from './scoring-engine';

interface ScoreCircleProps {
  fico: number;
  isMobile: boolean;
}

export default function ScoreCircle({ fico, isMobile }: ScoreCircleProps): React.ReactElement {
  const color = tierColor(fico);
  const outerSize = isMobile ? 56 : 72;
  const innerSize = isMobile ? 46 : 60;

  return (
    <div style={{
      width: outerSize, height: outerSize, borderRadius: '50%',
      background: `conic-gradient(${color} ${(fico / 900) * 100}%, rgba(255,255,255,0.06) 0)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <div style={{
        width: innerSize, height: innerSize, borderRadius: '50%', background: '#111119',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color, lineHeight: 1 }}>{fico}</div>
        <div style={{ fontSize: 9, color: '#55556a', letterSpacing: '0.05em', marginTop: 2 }}>BEACON</div>
      </div>
    </div>
  );
}
