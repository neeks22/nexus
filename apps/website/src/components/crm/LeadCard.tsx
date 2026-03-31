'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LeadCardProps {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  daysInStage: number;
  onClick: () => void;
}

export default function LeadCard({ id, name, phone, vehicle, daysInStage, onClick }: LeadCardProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '8px',
        cursor: 'grab',
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div style={{ color: '#f0f0f5', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
        {name || phone}
      </div>
      {vehicle && <div style={{ color: '#8888a0', fontSize: '12px', marginBottom: '4px' }}>{vehicle}</div>}
      <div style={{ color: '#666', fontSize: '11px' }}>
        {daysInStage === 0 ? 'Today' : `${daysInStage}d in stage`}
      </div>
    </div>
  );
}
