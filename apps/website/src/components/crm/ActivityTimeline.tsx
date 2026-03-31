'use client';

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

const CHANNEL_ICONS: Record<string, string> = {
  sms: 'SMS',
  email: 'EMAIL',
  note: 'NOTE',
  system: 'SYS',
};

export default function ActivityTimeline({ entries }: ActivityTimelineProps): React.ReactElement {
  return (
    <div>
      {entries.length === 0 ? (
        <div style={{ color: '#666', fontSize: '13px', padding: '20px 0' }}>No activity yet</div>
      ) : (
        entries.map((entry) => (
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
              background: entry.role === 'ai' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
              color: entry.role === 'ai' ? '#818cf8' : '#8888a0',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
              flexShrink: 0,
              marginTop: '2px',
            }}>
              {CHANNEL_ICONS[entry.channel] || entry.channel?.toUpperCase() || 'MSG'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: 1.5 }}>
                {entry.content}
              </div>
              <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
                {entry.role === 'ai' ? 'AI Agent' : entry.role === 'customer' ? 'Customer' : 'Rep'} &middot; {entry.time}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
