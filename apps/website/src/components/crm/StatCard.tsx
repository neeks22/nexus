'use client';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

export default function StatCard({ title, value, subtitle, color = '#6366f1' }: StatCardProps): React.ReactElement {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: '20px',
      flex: '1 1 200px',
      minWidth: '180px',
    }}>
      <div style={{ color: '#8888a0', fontSize: '13px', marginBottom: '8px' }}>{title}</div>
      <div style={{ color: '#f0f0f5', fontSize: '28px', fontWeight: 700 }}>{value}</div>
      {subtitle && <div style={{ color: color, fontSize: '12px', marginTop: '4px' }}>{subtitle}</div>}
    </div>
  );
}
