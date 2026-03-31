'use client';

import { useState } from 'react';

interface TimelineEntry {
  id: string;
  time: string;
  role: string;
  channel: string;
  content: string;
}

interface ActivityTimelineProps {
  entries: TimelineEntry[];
}

const CHANNEL_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  sms: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', label: 'SMS' },
  email: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'EMAIL' },
  note: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'NOTE' },
  crm: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', label: 'CRM' },
  system: { bg: 'rgba(255,255,255,0.06)', color: '#8888a0', label: 'SYS' },
};

function tryParseCreditRouting(content: string): { profile: Record<string, string>; topLenders: { lender: string; tier: string; rate: string; score: number }[]; routedAt: string } | null {
  try {
    const data = JSON.parse(content);
    if (data.topLenders && data.profile) return data;
  } catch { /* not JSON */ }
  return null;
}

function CreditRoutingCard({ data }: { data: { profile: Record<string, string>; topLenders: { lender: string; tier: string; rate: string; score: number }[]; routedAt: string } }): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: 'rgba(139,92,246,0.06)',
      border: '1px solid rgba(139,92,246,0.15)',
      borderRadius: '8px',
      padding: '10px 12px',
      marginTop: '4px',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <span style={{ color: '#a78bfa', fontSize: '12px', fontWeight: 600 }}>Credit Routing Result</span>
          <span style={{ color: '#666', fontSize: '11px', marginLeft: '8px' }}>
            FICO {data.profile.fico} | ${data.profile.income}/mo
          </span>
        </div>
        <span style={{ color: '#666', fontSize: '11px' }}>{expanded ? 'Hide' : 'View'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '10px' }}>
          {/* Profile summary */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {data.profile.vehicleYear && <Tag label="Year" value={data.profile.vehicleYear} />}
            {data.profile.vehiclePrice && <Tag label="Price" value={`$${parseInt(data.profile.vehiclePrice).toLocaleString()}`} />}
            {data.profile.vehicleKm && <Tag label="KM" value={`${parseInt(data.profile.vehicleKm).toLocaleString()}`} />}
            {data.profile.downPayment && <Tag label="Down" value={`$${parseInt(data.profile.downPayment).toLocaleString()}`} />}
            {data.profile.situation && data.profile.situation !== 'standard' && <Tag label="Situation" value={data.profile.situation} />}
          </div>

          {/* Top lenders */}
          {data.topLenders.slice(0, 3).map((l, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <div>
                <span style={{ color: '#f0f0f5', fontSize: '13px', fontWeight: 500 }}>{l.lender}</span>
                <span style={{ color: '#666', fontSize: '11px', marginLeft: '8px' }}>{l.tier}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>{l.rate}</span>
                <span style={{
                  background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                  padding: '1px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                }}>{l.score}pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <span style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: '#ccc',
    }}>
      <span style={{ color: '#666' }}>{label}: </span>{value}
    </span>
  );
}

export default function ActivityTimeline({ entries }: ActivityTimelineProps): React.ReactElement {
  return (
    <div>
      {entries.length === 0 ? (
        <div style={{ color: '#666', fontSize: '13px', padding: '20px 0' }}>No activity yet</div>
      ) : (
        entries.map((entry) => {
          const creditData = entry.channel === 'crm' ? tryParseCreditRouting(entry.content) : null;
          const style = CHANNEL_STYLES[entry.channel] || CHANNEL_STYLES.system;

          return (
            <div
              key={entry.id}
              style={{
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                gap: '10px',
              }}
            >
              <span style={{
                background: style.bg,
                color: style.color,
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
                flexShrink: 0,
                marginTop: '2px',
              }}>
                {style.label}
              </span>
              <div style={{ flex: 1 }}>
                {creditData ? (
                  <CreditRoutingCard data={creditData} />
                ) : (
                  <div style={{ color: '#ccc', fontSize: '13px', lineHeight: 1.5 }}>
                    {entry.content}
                  </div>
                )}
                <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
                  {entry.role === 'ai' ? 'AI Agent' : entry.role === 'customer' ? 'Customer' : entry.role === 'system' ? 'System' : 'Rep'} &middot; {entry.time}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
