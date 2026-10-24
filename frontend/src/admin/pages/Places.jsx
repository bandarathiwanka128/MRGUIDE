import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, Eye, MapPin } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import api from '../api/axios';

const CATEGORIES = ['tourism', 'temple', 'park', 'beach', 'hotel', 'restaurant', 'museum', 'monument', 'wildlife', 'other'];
const EMPTY_FORM = { name: '', category: 'tourism', latitude: '', longitude: '', description: '', address: '', google_place_id: '', price_level: '' };

export default function Places() {
  const [data, setData] = useState({ places: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catF, setCatF] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (catF) params.category = catF;
      const res = await api.get('/places', { params });
      setData(res.data);
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [page, search, catF, toast]);

  useEffect(() => { load(); }, [load]);

  const openEdit = p => { setForm({ name: p.name, category: p.category || 'tourism', latitude: p.latitude || '', longitude: p.longitude || '', description: p.description || '', address: p.address || '', google_place_id: p.google_place_id || '', price_level: p.price_level || '' }); setEditModal(p); };
  const openCreate = () => { setForm(EMPTY_FORM); setCreateModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (editModal) {
        await api.put(`/places/${editModal.id}`, form);
        toast('Place updated', 'success');
        setEditModal(null);
      } else {
        await api.post('/places', form);
        toast('Place created', 'success');
        setCreateModal(false);
      }
      load();
    } catch (err) { toast(err.response?.data?.error || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/places/${deleteTarget.id}`); toast('Deleted', 'success'); setDeleteTarget(null); load(); }
    catch { toast('Delete failed', 'error'); }
  };

  const renderFormBody = () => (
    <div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Place name" /></div>
        <div className="form-group"><label className="form-label">Category</label>
          <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Latitude</label><input className="form-input" type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="7.8731" /></div>
        <div className="form-group"><label className="form-label">Longitude</label><input className="form-input" type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="80.7718" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Google Place ID</label><input className="form-input" value={form.google_place_id} onChange={e => setForm(f => ({ ...f, google_place_id: e.target.value }))} placeholder="ChIJ..." /></div>
        <div className="form-group"><label className="form-label">Price Level (1–5)</label><input className="form-input" type="number" min="1" max="5" value={form.price_level} onChange={e => setForm(f => ({ ...f, price_level: e.target.value }))} /></div>
      </div>
      <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" /></div>
      <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Place description…" /></div>
    </div>
  );

  return (
    <>
      <Header title="Locations / Places" subtitle={`${data.total} places in database`} actions={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Place</button>} />
      <div className="page-content">
        <div className="card">
          <div className="toolbar">
            <div className="search-bar" style={{ minWidth: 220 }}>
              <Search size={15} />
              <input placeholder="Search places…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="form-select" style={{ width: 'auto', fontSize: 13 }} value={catF} onChange={e => { setCatF(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>{data.total} records</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Category</th><th>Coordinates</th><th>Rating</th><th>Reviews</th><th>Price</th><th>Actions</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={7}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
                {!loading && data.places.length === 0 && <tr><td colSpan={7}><div className="empty-state"><p>No places found</p></div></td></tr>}
                {!loading && data.places.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={13} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                          {p.address && <div className="td-muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{p.category}</span></td>
                    <td className="td-mono">{p.latitude ? `${parseFloat(p.latitude).toFixed(4)}, ${parseFloat(p.longitude).toFixed(4)}` : '—'}</td>
                    <td>{p.avgRating ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>★ {p.avgRating}</span> : <span className="td-muted">—</span>}</td>
                    <td className="td-muted">{p.reviewCount || 0}</td>
                    <td className="td-muted">{p.price_level ? '💰'.repeat(p.price_level) : '—'}</td>
                    <td>
                      <div className="action-group">
                        <button className="btn-icon" onClick={() => setViewModal(p)}><Eye size={14} /></button>
                        <button className="btn-icon" onClick={() => openEdit(p)}><Edit size={14} /></button>
                        <button className="btn-icon danger" onClick={() => setDeleteTarget(p)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={data.pages} total={data.total} limit={20} onPage={setPage} />
        </div>
      </div>

      {/* Create / Edit */}
      {[createModal && { title: 'Add Place', onClose: () => setCreateModal(false) }, editModal && { title: 'Edit Place', onClose: () => setEditModal(null) }].filter(Boolean).map(({ title, onClose }) => (
        <Modal key={title} open size="modal-lg" onClose={onClose} title={title}
          footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
          {renderFormBody()}
        </Modal>
      ))}

      {/* View */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Place Details" size="modal-lg">
        {viewModal && (
          <div className="detail-grid">
            {[['ID', viewModal.id], ['Name', viewModal.name], ['Category', viewModal.category], ['Latitude', viewModal.latitude], ['Longitude', viewModal.longitude], ['Price Level', viewModal.price_level || '—'], ['Avg Rating', viewModal.avgRating || '—'], ['Reviews', viewModal.reviewCount], ['Google Place ID', viewModal.google_place_id || '—']].map(([l, v]) => (
              <div className="detail-item" key={l}><label>{l}</label><p>{String(v)}</p></div>
            ))}
            {viewModal.address && <div className="detail-item" style={{ gridColumn: 'span 2' }}><label>Address</label><p>{viewModal.address}</p></div>}
            {viewModal.description && <div className="detail-item" style={{ gridColumn: 'span 2' }}><label>Description</label><p>{viewModal.description}</p></div>}
          </div>
        )}
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Place"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></>}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div className="confirm-icon danger"><Trash2 size={24} /></div>
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Delete <strong>{deleteTarget?.name}</strong>? This will also remove associated reviews and authentic details.</p>
        </div>
      </Modal>
    </>
  );
}
