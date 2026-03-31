'use client';
export default function LeadsTab({ tenant, onSelectLead }: { tenant: string; onSelectLead: (phone: string) => void }): React.ReactElement {
  return <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Leads loading...</div>;
}
