'use client';

import { DEAL_STATUS_COLORS } from './tokens';

interface ActiveDeal {
  id: string;
  leadPhone: string;
  leadName: string | null;
  vehicle: string | null;
  salePrice: number | null;
  status: string;
  lender: string | null;
  updatedAt: string;
  createdAt: string;
}

interface ActiveDealsPanelProps {
  deals: ActiveDeal[];
  totalValue: number;
  byStatus: Record<string, number>;
  onSelectLead: (phone: string) => void;
}

const fmt = (n: number): string => `$${n.toLocaleString()}`;

function daysAgo(iso: string, now: number): number {
  return Math.floor((now - new Date(iso).getTime()) / 86400000);
}

// Stall threshold per stage — subprime negotiations should move inside 3d, funded should deliver in 2d.
function stallThreshold(status: string): number {
  if (status === 'funded') return 2;
  if (status === 'approved') return 5;
  return 3; // negotiating
}

function isStalled(deal: ActiveDeal, now: number): boolean {
  return daysAgo(deal.updatedAt, now) >= stallThreshold(deal.status);
}

function ageLabel(iso: string, now: number): string {
  const d = daysAgo(iso, now);
  if (d === 0) {
    const h = Math.floor((now - new Date(iso).getTime()) / 3600000);
    return h <= 1 ? 'just now' : `${h}h ago`;
  }
  return `${d}d ago`;
}

export default function ActiveDealsPanel({ deals, totalValue, byStatus, onSelectLead }: ActiveDealsPanelProps): React.ReactElement {
  const now = Date.now();
  const stalledCount = deals.filter(d => isStalled(d, now)).length;
  // Sort: stalled first, then stalest (oldest updatedAt) first.
  const sorted = [...deals].sort((a, b) => {
    const aStalled = isStalled(a, now) ? 0 : 1;
    const bStalled = isStalled(b, now) ? 0 : 1;
    if (aStalled !== bStalled) return aStalled - bStalled;
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });

  const breakdown = [
    byStatus.negotiating ? `${byStatus.negotiating} neg` : null,
    byStatus.approved ? `${byStatus.approved} appr` : null,
    byStatus.funded ? `${byStatus.funded} funded` : null,
  ].filter(Boolean).join(' · ') || 'No deals';

  return (
    <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
      <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Active Deals</span>
        <span style={{ color: '#8888a0', fontSize: '12px', fontWeight: 500 }}>
          {deals.length === 0 ? '0' : `${deals.length} · ${fmt(totalValue)} pipeline`}
        </span>
      </h3>
      <div style={{ color: '#8888a0', fontSize: '11px', margin: '0 0 12px' }}>
        {breakdown}{stalledCount > 0 && <span style={{ color: '#ef4444', marginLeft: '8px', fontWeight: 600 }}>· {stalledCount} stalled</span>}
      </div>
      {deals.length === 0 ? (
        <div style={{ color: '#666', fontSize: '13px' }}>No active deals</div>
      ) : sorted.slice(0, 8).map(deal => {
        const stalled = isStalled(deal, now);
        return (
          <div
            key={deal.id}
            style={{
              padding: '10px 12px', borderRadius: '8px', marginBottom: '6px',
              background: stalled ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${stalled ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.04)'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span
                onClick={() => onSelectLead(deal.leadPhone)}
                style={{ color: '#f0f0f5', fontSize: '14px', fontWeight: 500, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#DC2626')}
                onMouseLeave={e => (e.currentTarget.style.color = '#f0f0f5')}
              >
                {deal.leadName || deal.leadPhone}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {deal.salePrice != null && <span style={{ color: '#f0f0f5', fontSize: '13px', fontWeight: 600 }}>{fmt(deal.salePrice)}</span>}
                <span style={{
                  color: DEAL_STATUS_COLORS[deal.status] || '#666',
                  fontSize: '11px', fontWeight: 600, textTransform: 'capitalize',
                }}>
                  {deal.status}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '11px', color: '#8888a0' }}>
              {deal.vehicle && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 auto', minWidth: 0 }}>
                  {deal.vehicle}
                </span>
              )}
              {deal.lender && <span style={{ flexShrink: 0 }}>· {deal.lender}</span>}
              <span style={{ flexShrink: 0, color: stalled ? '#ef4444' : '#8888a0', fontWeight: stalled ? 600 : 500 }}>
                · updated {ageLabel(deal.updatedAt, now)}
              </span>
              {stalled && (
                <span style={{
                  background: '#ef4444', color: '#fff', padding: '1px 6px',
                  borderRadius: '8px', fontSize: '10px', fontWeight: 600, flexShrink: 0,
                }}>
                  STALLED
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
