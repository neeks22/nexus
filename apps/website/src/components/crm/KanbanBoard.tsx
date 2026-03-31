'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import LeadCard from './LeadCard';

interface Lead {
  phone: string;
  first_name: string;
  last_name: string;
  status: string;
  vehicle_type: string;
  created_at: string;
}

interface KanbanBoardProps {
  leads: Lead[];
  onMoveLead: (phone: string, newStatus: string) => void;
  onSelectLead: (phone: string) => void;
}

const STAGES = [
  { id: 'new', label: 'New Lead', color: '#6366f1' },
  { id: 'contacted', label: 'Contacted', color: '#f59e0b' },
  { id: 'appointment', label: 'Appointment', color: '#10b981' },
  { id: 'showed', label: 'Showed', color: '#06b6d4' },
  { id: 'credit_app', label: 'Credit App', color: '#8b5cf6' },
  { id: 'approved', label: 'Approved', color: '#22c55e' },
  { id: 'delivered', label: 'Delivered', color: '#10b981' },
  { id: 'lost', label: 'Lost', color: '#ef4444' },
];

export default function KanbanBoard({ leads, onMoveLead, onSelectLead }: KanbanBoardProps): React.ReactElement {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const leadsByStage: Record<string, Lead[]> = {};
  for (const stage of STAGES) {
    leadsByStage[stage.id] = leads.filter((l) => (l.status || 'new') === stage.id);
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over) return;

    const draggedPhone = active.id as string;
    const targetId = over.id as string;

    // Check if dropped on a stage column
    const targetStage = STAGES.find((s) => s.id === targetId);
    if (targetStage) {
      onMoveLead(draggedPhone, targetStage.id);
      return;
    }

    // Check if dropped on another lead card — use that lead's stage
    const targetLead = leads.find((l) => l.phone === targetId);
    if (targetLead) {
      onMoveLead(draggedPhone, targetLead.status || 'new');
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        padding: '0 0 16px',
        height: 'calc(100vh - 100px)',
      }}>
        {STAGES.map((stage) => {
          const stageLeads = leadsByStage[stage.id] || [];
          return (
            <div
              key={stage.id}
              id={stage.id}
              style={{
                minWidth: '240px',
                width: '240px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
              }}
            >
              {/* Column Header */}
              <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: stage.color, display: 'inline-block',
                  }} />
                  <span style={{ color: '#f0f0f5', fontSize: '13px', fontWeight: 600 }}>{stage.label}</span>
                </div>
                <span style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#8888a0',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                }}>{stageLeads.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding: '8px', flex: 1, overflowY: 'auto' }}>
                <SortableContext items={stageLeads.map((l) => l.phone)} strategy={verticalListSortingStrategy}>
                  {stageLeads.map((lead) => {
                    const daysSince = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000);
                    return (
                      <LeadCard
                        key={lead.phone}
                        id={lead.phone}
                        name={[lead.first_name, lead.last_name].filter(Boolean).join(' ')}
                        phone={lead.phone}
                        vehicle={lead.vehicle_type || ''}
                        daysInStage={daysSince}
                        onClick={() => onSelectLead(lead.phone)}
                      />
                    );
                  })}
                </SortableContext>
              </div>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
