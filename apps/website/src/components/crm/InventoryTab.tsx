'use client';

import { useState, useEffect, useCallback } from 'react';

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  color: string | null;
  price: number | null;
  mileage: number | null;
  stock_number: string | null;
  vin: string | null;
  status: 'available' | 'sold' | 'pending';
  notes: string | null;
  created_at: string;
}

interface InventoryTabProps {
  tenant: string;
  onSelectLead: (phone: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  available: '#10b981',
  sold: '#ef4444',
  pending: '#f59e0b',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
  color: '#f0f0f5', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
};

const fmt = (n: number | null): string => n != null ? `$${n.toLocaleString()}` : '—';
const fmtMi = (n: number | null): string => n != null ? `${n.toLocaleString()} km` : '—';

export default function InventoryTab({ tenant }: InventoryTabProps): React.ReactElement {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newV, setNewV] = useState({ year: '', make: '', model: '', trim: '', color: '', price: '', mileage: '', stock_number: '', vin: '' });

  const fetchVehicles = useCallback(async (): Promise<void> => {
    try {
      let url = `/api/inventory?tenant=${tenant}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [tenant, search, filterStatus]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleCreate = async (): Promise<void> => {
    if (!newV.year || !newV.make || !newV.model) return;
    setCreating(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, ...newV, year: parseInt(newV.year), price: newV.price || undefined, mileage: newV.mileage || undefined }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewV({ year: '', make: '', model: '', trim: '', color: '', price: '', mileage: '', stock_number: '', vin: '' });
        fetchVehicles();
      }
    } catch (err) {
      console.error('Failed to create vehicle:', err);
    }
    setCreating(false);
  };

  const updateStatus = async (id: string, status: string): Promise<void> => {
    try {
      await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, id, status }),
      });
      setVehicles(prev => prev.map(v => v.id === id ? { ...v, status: status as Vehicle['status'] } : v));
    } catch (err) {
      console.error('Failed to update vehicle:', err);
    }
  };

  const deleteVehicle = async (id: string): Promise<void> => {
    if (!confirm('Delete this vehicle?')) return;
    try {
      await fetch('/api/inventory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, id }),
      });
      setVehicles(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', color: '#8888a0', textAlign: 'center' }}>Loading inventory...</div>;
  }

  const counts = { available: 0, pending: 0, sold: 0 };
  vehicles.forEach(v => { if (counts[v.status] !== undefined) counts[v.status]++; });

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 52px)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#f0f0f5', fontSize: '20px', fontWeight: 700, margin: 0 }}>Inventory</h1>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '10px 20px', background: '#DC2626', color: '#fff', border: 'none',
          borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>+ Add Vehicle</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        {Object.entries(counts).map(([s, c]) => (
          <div key={s} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 20px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: STATUS_COLORS[s], fontWeight: 700, fontSize: '20px' }}>{c}</span>
            <span style={{ color: '#8888a0', fontSize: '13px', marginLeft: '8px' }}>{s}</span>
          </div>
        ))}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 20px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: '#f0f0f5', fontWeight: 700, fontSize: '20px' }}>{vehicles.length}</span>
          <span style={{ color: '#8888a0', fontSize: '13px', marginLeft: '8px' }}>total</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input placeholder="Search make, model, stock#, VIN..." value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchVehicles()}
          style={{ ...inputStyle, maxWidth: '320px' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ ...inputStyle, maxWidth: '160px', cursor: 'pointer' }}>
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="pending">Pending</option>
          <option value="sold">Sold</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.8fr 0.7fr 0.7fr 0.6fr 0.5fr', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', color: '#8888a0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>Vehicle</span><span>Price</span><span>Mileage</span><span>Stock #</span><span>Color</span><span>Status</span><span></span>
        </div>
        {vehicles.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8888a0' }}>No vehicles found. Add your first vehicle above.</div>
        ) : vehicles.map(v => (
          <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.8fr 0.7fr 0.7fr 0.6fr 0.5fr', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div>
              <span style={{ color: '#f0f0f5', fontWeight: 600, fontSize: '14px' }}>{v.year} {v.make} {v.model}</span>
              {v.trim && <span style={{ color: '#8888a0', fontSize: '12px', marginLeft: '6px' }}>{v.trim}</span>}
            </div>
            <span style={{ color: '#f0f0f5', fontSize: '14px' }}>{fmt(v.price)}</span>
            <span style={{ color: '#ccc', fontSize: '13px' }}>{fmtMi(v.mileage)}</span>
            <span style={{ color: '#ccc', fontSize: '13px' }}>{v.stock_number || '—'}</span>
            <span style={{ color: '#ccc', fontSize: '13px' }}>{v.color || '—'}</span>
            <select value={v.status} onChange={e => updateStatus(v.id, e.target.value)}
              style={{ background: 'transparent', border: `1px solid ${STATUS_COLORS[v.status]}40`, borderRadius: '6px', color: STATUS_COLORS[v.status], padding: '4px 8px', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
              <option value="available">Available</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
            </select>
            <button onClick={() => deleteVehicle(v.id)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '16px' }} title="Delete">✕</button>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCreate(false)}>
          <div style={{ background: '#1a1a2e', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '520px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#f0f0f5', fontSize: '18px', fontWeight: 700, marginBottom: '20px', margin: '0 0 20px 0' }}>Add Vehicle</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Year *</label><input type="number" value={newV.year} onChange={e => setNewV({ ...newV, year: e.target.value })} style={inputStyle} placeholder="2020" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Make *</label><input value={newV.make} onChange={e => setNewV({ ...newV, make: e.target.value })} style={inputStyle} placeholder="Toyota" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Model *</label><input value={newV.model} onChange={e => setNewV({ ...newV, model: e.target.value })} style={inputStyle} placeholder="Corolla" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Trim</label><input value={newV.trim} onChange={e => setNewV({ ...newV, trim: e.target.value })} style={inputStyle} placeholder="SE" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Color</label><input value={newV.color} onChange={e => setNewV({ ...newV, color: e.target.value })} style={inputStyle} placeholder="Silver" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Price</label><input type="number" value={newV.price} onChange={e => setNewV({ ...newV, price: e.target.value })} style={inputStyle} placeholder="15000" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Mileage (km)</label><input type="number" value={newV.mileage} onChange={e => setNewV({ ...newV, mileage: e.target.value })} style={inputStyle} placeholder="85000" /></div>
              <div><label style={{ color: '#8888a0', fontSize: '12px' }}>Stock #</label><input value={newV.stock_number} onChange={e => setNewV({ ...newV, stock_number: e.target.value })} style={inputStyle} placeholder="RC-001" /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ color: '#8888a0', fontSize: '12px' }}>VIN</label><input value={newV.vin} onChange={e => setNewV({ ...newV, vin: e.target.value })} style={inputStyle} placeholder="1HGBH41JXMN109186" maxLength={17} /></div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              <button onClick={handleCreate} disabled={!newV.year || !newV.make || !newV.model || creating}
                style={{ padding: '10px 20px', background: (!newV.year || !newV.make || !newV.model) ? '#333' : '#DC2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: creating ? 0.6 : 1 }}>
                {creating ? 'Adding...' : 'Add Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
