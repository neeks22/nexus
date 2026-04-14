'use client';

import type { ScoredResult, CustomerProfile } from './types';
import { LENDER_DB, tierColor, tierLabel } from './scoring-engine';
import ScoreCircle from './ScoreCircle';
import LenderCard from './LenderCard';

interface CreditResultsProps {
  profile: CustomerProfile;
  results: ScoredResult[];
  aiInsight: string;
  notes: string;
  saved: boolean;
  isMobile: boolean;
  onBack: () => void;
  styles: {
    page: React.CSSProperties;
    card: React.CSSProperties;
    label: React.CSSProperties;
    badge: (bg: string, fg: string) => React.CSSProperties;
    btnSecondary: React.CSSProperties;
  };
}

export default function CreditResults({
  profile, results, aiInsight, notes, saved, isMobile, onBack, styles: s,
}: CreditResultsProps): React.ReactElement {
  const ficoNum = parseInt(profile.fico, 10);

  return (
    <div style={s.page}>
      <style>{`
        @keyframes crSlide { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .cr-enter { animation: crSlide .35s ease-out forwards }
      `}</style>

      {/* RESULTS HEADER */}
      <div className="cr-enter" style={{ ...s.card, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: 20, gap: isMobile ? 16 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 14 : 20 }}>
          <ScoreCircle fico={ficoNum} isMobile={isMobile} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: tierColor(ficoNum), textTransform: 'uppercase' }}>{tierLabel(ficoNum)}</div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#f0f0f5', letterSpacing: '-0.02em', marginTop: 2 }}>${parseInt(profile.income, 10).toLocaleString()}<span style={{ fontSize: 13, color: '#55556a', fontWeight: 400 }}>/mo</span></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {profile.situation !== 'standard' && (
                <span style={s.badge('rgba(245,158,11,0.12)', '#f59e0b')}>{profile.situation.toUpperCase()}</span>
              )}
              {profile.selfEmployed && (
                <span style={s.badge('rgba(99,102,241,0.12)', '#DC2626')}>SELF-EMPLOYED</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && (
            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>Saved to Activity</span>
          )}
          <button onClick={onBack} style={s.btnSecondary}>
            <span style={{ marginRight: 6 }}>&larr;</span> Back
          </button>
        </div>
      </div>

      {/* AI INSIGHT */}
      {aiInsight && (
        <div className="cr-enter" style={{ ...s.card, background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.15)', marginBottom: 20, animationDelay: '0.05s' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#DC2626', marginBottom: 8, textTransform: 'uppercase' }}>AI Bureau Analysis</div>
          <pre style={{ fontSize: 13, color: '#8888a0', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>{aiInsight}</pre>
        </div>
      )}

      {/* NOTES */}
      {notes && (
        <div className="cr-enter" style={{ ...s.card, background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.15)', marginBottom: 20, animationDelay: '0.08s' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#f59e0b', marginBottom: 6, textTransform: 'uppercase' }}>Sales Rep Notes</div>
          <div style={{ fontSize: 14, color: '#8888a0', lineHeight: 1.6 }}>{notes}</div>
        </div>
      )}

      {/* LENDER MATCHES HEADING */}
      <div style={{ ...s.label, marginBottom: 14, color: '#55556a' }}>Lender Matches &mdash; ranked by approval probability &amp; rate</div>

      {/* LENDER CARDS */}
      {results.map((r, i) => {
        const lenderData = LENDER_DB.find((l) => l.name === r.lender);
        return (
          <LenderCard
            key={r.lender}
            result={r}
            lenderData={lenderData}
            rank={i}
            isMobile={isMobile}
            styles={{ card: s.card, badge: s.badge }}
          />
        );
      })}

      {results.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#55556a' }}>
          <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }}>&#128269;</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>No matching lenders found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Adjust income or credit score and try again.</div>
        </div>
      )}
    </div>
  );
}
