'use client';
export default function PipelineTab({ tenant, onSelectLead }: { tenant: string; onSelectLead: (phone: string) => void }): React.ReactElement {
  return <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Pipeline loading...</div>;
}
