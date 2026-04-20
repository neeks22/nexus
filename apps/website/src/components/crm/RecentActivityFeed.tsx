'use client';

interface Activity {
  time: string;
  channel: string;
  role: string;
  content: string;
  phone: string;
  leadName: string | null;
}

interface RecentActivityFeedProps {
  items: Activity[];
  onSelectLead: (phone: string) => void;
}

function relativeTime(iso: string, now: number): string {
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CHANNEL_ICON: Record<string, string> = {
  sms: '💬', email: '✉', call: '📞', crm: '✎', web: '🌐',
};

const ROLE_META: Record<string, { label: string; color: string }> = {
  assistant: { label: 'AI', color: '#06b6d4' },
  user: { label: 'Lead', color: '#10b981' },
  system: { label: 'Sys', color: '#8888a0' },
  agent: { label: 'Human', color: '#f59e0b' },
};

export default function RecentActivityFeed({ items, onSelectLead }: RecentActivityFeedProps): React.ReactElement {
  const now = Date.now();

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
      <h3 style={{ color: '#f0f0f5', fontSize: '15px', fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Recent Activity</span>
        <span style={{ color: '#8888a0', fontSize: '12px', fontWeight: 500 }}>{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <div style={{ color: '#666', fontSize: '13px' }}>No activity yet today</div>
      ) : items.map((item, i) => {
        const role = ROLE_META[item.role] || ROLE_META.system;
        const icon = CHANNEL_ICON[item.channel] || '💬';
        return (
          <div
            key={i}
            onClick={() => onSelectLead(item.phone)}
            style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
              <span style={{ fontSize: '12px' }} title={item.channel}>{icon}</span>
              <span style={{ color: '#f0f0f5', fontWeight: 600, fontSize: '13px' }}>
                {item.leadName || item.phone}
              </span>
              <span style={{
                color: role.color, background: `${role.color}20`,
                padding: '1px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
              }}>
                {role.label}
              </span>
              <span style={{ color: '#8888a0', marginLeft: 'auto' }}>{relativeTime(item.time, now)}</span>
            </div>
            <div style={{ color: '#ccc', fontSize: '13px', marginTop: '4px', lineHeight: 1.4 }}>
              {item.content}{item.content.length >= 140 ? '...' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
