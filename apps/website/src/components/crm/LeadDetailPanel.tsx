'use client';
export default function LeadDetailPanel({ tenant, phone, onClose }: { tenant: string; phone: string; onClose: () => void }): React.ReactElement {
  return <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: '#12121f', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 100, padding: '20px' }}>
    <button onClick={onClose} style={{ color: '#8888a0', background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
    <div style={{ color: '#f0f0f5', marginTop: '20px' }}>Lead: {phone}</div>
  </div>;
}
