'use client';

interface HotLead {
  phone: string;
  name: string;
  status: string;
  since: string;
  lastContactAt: string | null;
  appointmentAt: string | null;
  appointmentConfirmed: boolean;
}

interface HotLeadsPanelProps {
  leads: HotLead[];
  onSelectLead: (phone: string) => void;
}

interface Urgency {
  tier: 'critical' | 'warn' | 'ok';
  label: string;
}

// Derive a single urgency tier per lead — drives sort order + row color.
function urgencyOf(lead: HotLead, now: number): Urgency {
  // Appointment soon + unconfirmed → critical
  if (lead.appointmentAt) {
    const mins = (new Date(lead.appointmentAt).getTime() - now) / 60000;
    if (mins >= 0 && mins <= 120 && !lead.appointmentConfirmed) {
      return { tier: 'critical', label: 'Unconfirmed soon' };
    }
    if (mins >= 0 && mins <= 240 && !lead.appointmentConfirmed) {
      return { tier: 'warn', label: 'Unconfirmed' };
    }
  }
  // Unreplied >24h → warn/critical
  if (lead.lastContactAt) {
    const hrs = (now - new Date(lead.lastContactAt).getTime()) / 3600000;
    if (hrs >= 48) return { tier: 'critical', label: 'Cold 48h+' };
    if (hrs >= 24) return { tier: 'warn', label: 'Stale 24h+' };
  } else {
    return { tier: 'warn', label: 'No contact logged' };
  }
  return { tier: 'ok', label: '' };
}

function lastContactLabel(iso: string | null, now: number): string {
  if (!iso) return 'never';
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function apptCountdown(iso: string, now: number): string {
  const mins = Math.round((new Date(iso).getTime() - now) / 60000);
  if (mins < -5) return 'past';
  if (mins < 60) return `in ${Math.max(mins, 0)}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
}

function sortKey(lead: HotLead, now: number): number {
  // Smallest key sorts first. Soonest appointment first, then unconfirmed before confirmed,
  // then oldest last-contact.
  if (lead.appointmentAt) {
    const apptMin = (new Date(lead.appointmentAt).getTime() - now) / 60000;
    // Group appointments before non-appointments; unconfirmed ranked ahead of confirmed by -1M offset.
    return (lead.appointmentConfirmed ? 0 : -1_000_000) + apptMin;
  }
  // Non-appointment leads sorted by stalest (oldest) last-contact first.
  const lastMs = lead.lastContactAt ? new Date(lead.lastContactAt).getTime() : 0;
  return 10_000_000 + lastMs; // put after appointment leads
}

const TIER_BG: Record<Urgency['tier'], string> = {
  critical: 'rgba(239,68,68,0.12)',
  warn: 'rgba(245,158,11,0.10)',
  ok: 'rgba(255,255,255,0.02)',
};
const TIER_BORDER: Record<Urgency['tier'], string> = {
  critical: 'rgba(239,68,68,0.30)',
  warn: 'rgba(245,158,11,0.25)',
  ok: 'rgba(255,255,255,0.06)',
};
const TIER_BADGE: Record<Urgency['tier'], string> = {
  critical: '#ef4444',
  warn: '#f59e0b',
  ok: 'transparent',
};

export default function HotLeadsPanel({ leads, onSelectLead }: HotLeadsPanelProps): React.ReactElement {
  const now = Date.now();
  const sorted = [...leads].sort((a, b) => sortKey(a, now) - sortKey(b, now));
  const criticalCount = sorted.filter(l => urgencyOf(l, now).tier === 'critical').length;

  return (
    <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
      <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Hot Leads</span>
        <span style={{ color: '#8888a0', fontSize: '12px', fontWeight: 500 }}>
          {leads.length === 0 ? '0' : criticalCount > 0 ? `${criticalCount} critical · ${leads.length} total` : `${leads.length} total`}
        </span>
      </h3>
      {leads.length === 0 ? (
        <div style={{ color: '#666', fontSize: '13px' }}>No hot leads right now</div>
      ) : sorted.map(lead => {
        const urg = urgencyOf(lead, now);
        return (
          <div
            key={lead.phone}
            onClick={() => onSelectLead(lead.phone)}
            style={{
              padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '6px',
              background: TIER_BG[urg.tier], border: `1px solid ${TIER_BORDER[urg.tier]}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#f0f0f5', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lead.name}
              </span>
              <span style={{
                background: lead.status === 'appointment' ? '#8b5cf6' : '#06b6d4',
                color: '#fff', padding: '2px 8px', borderRadius: '10px',
                fontSize: '10px', fontWeight: 600, textTransform: 'capitalize', flexShrink: 0,
              }}>
                {lead.status}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '11px', color: '#8888a0' }}>
              {lead.appointmentAt && (
                <span style={{ color: urg.tier === 'critical' ? '#ef4444' : '#06b6d4', fontWeight: 600 }}>
                  Appt {apptCountdown(lead.appointmentAt, now)} {lead.appointmentConfirmed ? '✓' : '(unconf)'}
                </span>
              )}
              <span>Last contact: {lastContactLabel(lead.lastContactAt, now)}</span>
              {urg.label && (
                <span style={{
                  marginLeft: 'auto', background: TIER_BADGE[urg.tier], color: '#fff',
                  padding: '1px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                }}>
                  {urg.label}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
