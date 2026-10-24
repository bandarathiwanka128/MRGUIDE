import React, { useEffect, useState, useCallback } from 'react';
import { Search, Edit, Trash2, Eye, CheckCircle, Store as StoreIcon } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import api from '../api/axios';

const BUSINESS_TYPES = ['hotel', 'restaurant', 'cafe', 'shop', 'pharmacy', 'bank', 'hospital', 'supermarket', 'fuel', 'other'];

export default function Stores() {
  const [data, setData] = useState({ stores: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeF, setTypeF] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (typeF) params.business_type = typeF;
      const res = await api.get('/stores', { params });
      setData(res.data);
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [page, search, typeF, toast]);

  useEffect(() => { load(); }, [load]);

  const openEdit = s => {
    setEditForm({ name: s.name, business_type: s.business_type || 'other', address: s.address, phone: s.phone || '', email: s.email || '', website: s.website || '', description: s.description || '', status: s.status || 'active' });
    setEditModal(s);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/stores/${editModal.id}`, editForm);
      toast('Updated', 'success');
      setEditModal(null);
      load();
    } catch { toast('Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const toggleVerify = async s => {
    try {
      const res = await api.patch(`/stores/${s.id}/verify`);
      toast(res.data.message, 'success');
      load();
    } catch { toast('Failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/stores/${deleteTarget.id}`); toast('Deleted', 'success'); setDeleteTarget(null); load(); }
    catch { toast('Delete failed', 'error'); }
  };

  return (
    <>
      <Header title="Stores / Locator Businesses" subtitle={`${data.total} registered stores`} />
      <div className="page-content">
        <div className="card">
          <div className="toolbar">
            <div className="search-bar" style={{ minWidth: 220 }}>
              <Search size={15} />
              <input placeholder="Search stores…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="form-select" style={{ width: 'auto', fontSize: 13 }} value={typeF} onChange={e => { setTypeF(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Store</th><th>Type</th><th>Owner</th><th>Rating</th><th>Verified</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={7}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
                {!loading && data.stores.length === 0 && <tr><td colSpan={7}><div className="empty-state"><p>No stores found</p></div></td></tr>}
                {!loading && data.stores.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StoreIcon size={13} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.name}</div>
                          <div className="td-muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.address}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{s.business_type}</span></td>
                    <td className="td-muted">{s.Owner?.username || '—'}</td>
                    <td>{s.rating > 0 ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>★ {parseFloat(s.rating).toFixed(1)}</span> : <span className="td-muted">—</span>}</td>
                    <td><span className={`badge ${s.is_verified ? 'badge-green' : 'badge-gray'}`}>{s.is_verified ? 'Verified' : 'Unverified'}</span></td>
                    <td><span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-red'}`}>{s.status}</span></td>
                    <td>
                      <div className="action-group">
                        <button className="btn-icon" onClick={() => setViewModal(s)}><Eye size={14} /></button>
                        <button className="btn-icon" onClick={() => openEdit(s)}><Edit size={14} /></button>
                        <button className={`btn-icon ${s.is_verified ? '' : 'success'}`} title={s.is_verified ? 'Unverify' : 'Verify'} onClick={() => toggleVerify(s)}><CheckCircle size={14} /></button>
                        <button className="btn-icon danger" onClick={() => setDeleteTarget(s)}><Trash2 size={14} /></button>
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

      {/* View */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Store Details" size="modal-lg">
        {viewModal && (
          <div className="detail-grid">
            {[['Name', viewModal.name], ['Type', viewModal.business_type], ['Owner', viewModal.Owner?.username || '—'], ['Phone', viewModal.phone || '—'], ['Email', viewModal.email || '—'], ['Website', viewModal.website || '—'], ['Rating', viewModal.rating], ['Verified', viewModal.is_verified ? 'Yes' : 'No'], ['Status', viewModal.status], ['Lat/Lng', viewModal.latitude ? `${viewModal.latitude}, ${viewModal.longitude}` : '—']].map(([l, v]) => (
              <div className="detail-item" key={l}><label>{l}</label><p>{String(v)}</p></div>
            ))}
            {viewModal.address && <div className="detail-item" style={{ gridColumn: 'span 2' }}><label>Address</label><p>{viewModal.address}</p></div>}
            {viewModal.description && <div className="detail-item" style={{ gridColumn: 'span 2' }}><label>Description</label><p>{viewModal.description}</p></div>}
            {viewModal.amenities?.length > 0 && <div className="detail-item" style={{ gridColumn: 'span 2' }}><label>Amenities</label><p>{viewModal.amenities.join(', ')}</p></div>}
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Store"
        footer={<><button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
        {editModal && (
          <div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Type</label>
                <select className="form-select" value={editForm.business_type} onChange={e => setEditForm(f => ({ ...f, business_type: e.target.value }))}>
                  {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Website</label><input className="form-input" value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Status</label>
                <select className="form-select" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
        )}
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Store"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></>}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div className="confirm-icon danger"><Trash2 size={24} /></div>
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Delete <strong>{deleteTarget?.name}</strong>?</p>
        </div>
      </Modal>
    </>
  );
}
