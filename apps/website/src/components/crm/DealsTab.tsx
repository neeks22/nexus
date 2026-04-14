'use client';

import { useState } from 'react';
import useIsMobile from './useIsMobile';
import { useDeals, useCreateDeal, useUpdateDeal } from '@/hooks/use-deals';
import { DEAL_STATUS_COLORS as STATUS_COLORS } from './tokens';
import { inputStyle } from './styles';

interface DealsTabProps {
  tenant: string;
  onSelectLead: (phone: string) => void;
}

const fmt = (n: number | null): string => n != null ? `$${n.toLocaleString()}` : '—';

export default function DealsTab({ tenant, onSelectLead }: DealsTabProps): React.ReactElement {
  const isMobile = useIsMobile();
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newDeal, setNewDeal] = useState({
    lead_phone: '', lead_name: '', vehicle_description: '',
    sale_price: '', trade_in_value: '', down_payment: '',
    monthly_payment: '', term_months: '', lender: '', notes: '',
  });

  const { data: deals = [], isLoading: loading } = useDeals(tenant, { status: filterStatus });
  const createMutation = useCreateDeal(tenant);
  const updateMutation = useUpdateDeal(tenant);
  const creating = createMutation.isPending;

  const handleCreate = async (): Promise<void> => {
    if (!newDeal.lead_phone) return;
    try {
      await createMutation.mutateAsync({
        lead_phone: newDeal.lead_phone,
        lead_name: newDeal.lead_name || undefined,
        vehicle_description: newDeal.vehicle_description || undefined,
        sale_price: newDeal.sale_price || undefined,
        trade_in_value: newDeal.trade_in_value || undefined,
        down_payment: newDeal.down_payment || undefined,
        monthly_payment: newDeal.monthly_payment || undefined,
        term_months: newDeal.term_months || undefined,
        lender: newDeal.lender || undefined,
        notes: newDeal.notes || undefined,
      });
      setShowCreate(false);
      setNewDeal({ lead_phone: '', lead_name: '', vehicle_description: '', sale_price: '', trade_in_value: '', down_payment: '', monthly_payment: '', term_months: '', lender: '', notes: '' });
    } catch (err) {
      console.error('Failed to create deal:', err);
    }
  };

  const updateStatus = async (id: string, status: string): Promise<void> => {
    try {
      await updateMutation.mutateAsync({ id, status });
    } catch (err) {
      console.error('Failed to update deal:', err);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading deals...</div>;
  }

  const counts: Record<string, number> = { negotiating: 0, approved: 0, funded: 0, delivered: 0, lost: 0 };
  let pipelineValue = 0;
  deals.forEach(d => {
    if (counts[d.status] !== undefined) counts[d.status]++;
    if (d.status !== 'lost' && d.sale_price) pipelineValue += d.sale_price;
  });

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', height: isMobile ? 'calc(100vh - 116px)' : 'calc(100vh - 52px)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#f0f0f5', fontSize: isMobile ? '18px' : '20px', fontWeight: 700, margin: 0 }}>Deals</h1>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '10px 20px', background: '#DC2626', color: '#fff', border: 'none',
          borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>+ New Deal</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {Object.entries(counts).map(([s, c]) => (
          <div key={s} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 20px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: STATUS_COLORS[s], fontWeight: 700, fontSize: '20px' }}>{c}</span>
            <span style={{ color: '#8888a0', fontSize: '13px', marginLeft: '8px' }}>{s}</span>
          </div>
        ))}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 20px', border: '1px solid rgba(220,38,38,0.2)' }}>
          <span style={{ color: '#DC2626', fontWeight: 700, fontSize: '20px' }}>${pipelineValue.toLocaleString()}</span>
          <span style={{ color: '#8888a0', fontSize: '13px', marginLeft: '8px' }}>pipeline</span>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ ...inputStyle, maxWidth: '180px', cursor: 'pointer' }}>
          <option value="">All Deals</option>
          <option value="negotiating">Negotiating</option>
          <option value="approved">Approved</option>
          <option value="funded">Funded</option>
          <option value="delivered">Delivered</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 0.8fr 0.8fr 0.8fr 0.8fr 0.7fr', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', color: '#8888a0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Lead</span><span>Vehicle</span><span>Sale Price</span><span>Down / Trade</span><span>Monthly</span><span>Lender</span><span>Status</span>
          </div>
        )}
        {deals.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8888a0' }}>No deals found. Create your first deal above.</div>
        ) : isMobile ? (
          deals.map(d => (
            <div key={d.id} style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span onClick={() => onSelectLead(d.lead_phone)} style={{ color: '#f0f0f5', fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}>
                  {d.lead_name || d.lead_phone}
                </span>
                <select value={d.status} onChange={e => updateStatus(d.id, e.target.value)}
                  style={{ background: 'transparent', border: `1px solid ${STATUS_COLORS[d.status] || '#666'}40`, borderRadius: '6px', color: STATUS_COLORS[d.status] || '#666', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                  <option value="negotiating">Negotiating</option>
                  <option value="approved">Approved</option>
                  <option value="funded">Funded</option>
                  <option value="delivered">Delivered</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              {d.vehicle_description && <div style={{ color: '#8888a0', fontSize: '12px', marginBottom: '4px' }}>{d.vehicle_description}</div>}
              <div style={{ display: 'flex', gap: '12px', color: '#ccc', fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: '#f0f0f5' }}>{fmt(d.sale_price)}</span>
                {d.monthly_payment != null && <span>{fmt(d.monthly_payment)}/mo</span>}
                {d.lender && <span>{d.lender}</span>}
              </div>
            </div>
          ))
        ) : (
          deals.map(d => (
            <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 0.8fr 0.8fr 0.8fr 0.8fr 0.7fr', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div>
                <span onClick={() => onSelectLead(d.lead_phone)} style={{ color: '#f0f0f5', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#DC2626')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#f0f0f5')}>
                  {d.lead_name || d.lead_phone}
                </span>
                {d.lead_name && <div style={{ color: '#8888a0', fontSize: '12px' }}>{d.lead_phone}</div>}
              </div>
              <span style={{ color: '#ccc', fontSize: '13px' }}>{d.vehicle_description || '—'}</span>
              <span style={{ color: '#f0f0f5', fontWeight: 600, fontSize: '14px' }}>{fmt(d.sale_price)}</span>
              <div style={{ fontSize: '12px' }}>
                {d.down_payment != null && <div style={{ color: '#ccc' }}>↓ {fmt(d.down_payment)}</div>}
                {d.trade_in_value != null && <div style={{ color: '#8888a0' }}>↔ {fmt(d.trade_in_value)}</div>}
                {d.down_payment == null && d.trade_in_value == null && <span style={{ color: '#666' }}>—</span>}
              </div>
              <div style={{ fontSize: '13px' }}>
                {d.monthly_payment != null ? (
                  <div>
                    <span style={{ color: '#f0f0f5' }}>{fmt(d.monthly_payment)}</span>
                    {d.term_months && <span style={{ color: '#8888a0' }}>/mo × {d.term_months}</span>}
                  </div>
                ) : <span style={{ color: '#666' }}>—</span>}
              </div>
              <span style={{ color: '#ccc', fontSize: '13px' }}>{d.lender || '—'}</span>
              <select value={d.status} onChange={e => updateStatus(d.id, e.target.value)}
                style={{ background: 'transparent', border: `1px solid ${STATUS_COLORS[d.status] || '#666'}40`, borderRadius: '6px', color: STATUS_COLORS[d.status] || '#666', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                <option value="negotiating">Negotiating</option>
                <option value="approved">Approved</option>
                <option value="funded">Funded</option>
                <option value="delivered">Delivered</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0 16px' : 0, backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCreate(false)}>
          <div style={{ background: '#1a1a2e', borderRadius: '16px', padding: isMobile ? '20px' : '32px', width: '100%', maxWidth: '520px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: isMobile ? '90vh' : undefined, overflowY: isMobile ? 'auto' : undefined }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#f0f0f5', fontSize: '18px', fontWeight: 700, margin: '0 0 20px 0' }}>New Deal</h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Phone *</label><input value={newDeal.lead_phone} onChange={e => setNewDeal({ ...newDeal, lead_phone: e.target.value })} style={inputStyle} placeholder="+16131234567" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Name</label><input value={newDeal.lead_name} onChange={e => setNewDeal({ ...newDeal, lead_name: e.target.value })} style={inputStyle} placeholder="John Smith" /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ color: '#8888a0', fontSize: '12px' }}>Vehicle</label><input value={newDeal.vehicle_description} onChange={e => setNewDeal({ ...newDeal, vehicle_description: e.target.value })} style={inputStyle} placeholder="2020 Toyota Corolla SE" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Sale Price</label><input type="number" value={newDeal.sale_price} onChange={e => setNewDeal({ ...newDeal, sale_price: e.target.value })} style={inputStyle} placeholder="18000" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Trade-In Value</label><input type="number" value={newDeal.trade_in_value} onChange={e => setNewDeal({ ...newDeal, trade_in_value: e.target.value })} style={inputStyle} placeholder="5000" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Down Payment</label><input type="number" value={newDeal.down_payment} onChange={e => setNewDeal({ ...newDeal, down_payment: e.target.value })} style={inputStyle} placeholder="2000" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Monthly Payment</label><input type="number" value={newDeal.monthly_payment} onChange={e => setNewDeal({ ...newDeal, monthly_payment: e.target.value })} style={inputStyle} placeholder="350" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Term (months)</label><input type="number" value={newDeal.term_months} onChange={e => setNewDeal({ ...newDeal, term_months: e.target.value })} style={inputStyle} placeholder="60" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Lender</label><input value={newDeal.lender} onChange={e => setNewDeal({ ...newDeal, lender: e.target.value })} style={inputStyle} placeholder="TD Auto Finance" /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ color: '#8888a0', fontSize: '12px' }}>Notes</label><input value={newDeal.notes} onChange={e => setNewDeal({ ...newDeal, notes: e.target.value })} style={inputStyle} placeholder="Optional notes..." /></div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              <button onClick={handleCreate} disabled={!newDeal.lead_phone || creating}
                style={{ padding: '10px 20px', background: !newDeal.lead_phone ? '#333' : '#DC2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: creating ? 0.6 : 1 }}>
                {creating ? 'Creating...' : 'Create Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
