import React, { useEffect, useState, useCallback } from 'react';
import { Search, Eye, Edit, Trash2, CheckCircle2, XCircle, Phone, Mail, Globe, RefreshCw } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import api from '../api/axios';

export default function BusinessData() {
  const [data, setData] = useState({ details: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('approved');
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
      const params = { status: statusF, type: 'business', page, limit: 20 };
      if (search) params.search = search;
      const res = await api.get('/authentic-details', { params });
      setData(res.data);
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [page, search, statusF]);

  useEffect(() => { load(); }, [load]);

  const openEdit = item => {
    setEditForm({ business_name: item.business_name || '', title: item.title || '', description: item.description || '', phone: item.phone || '', email: item.email || '', website: item.website || '', maps_link: item.maps_link || '' });
    setEditModal(item);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/authentic-details/${editModal.id}`, editForm);
      toast('Updated', 'success');
      setEditModal(null);
      load();
    } catch { toast('Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/authentic-details/${deleteTarget.id}`);
      toast('Deleted', 'success');
      setDeleteTarget(null);
      load();
    } catch { toast('Delete failed', 'error'); }
  };

  const approve = async id => { try { await api.patch(`/authentic-details/${id}/approve`); toast('Approved — visible on map', 'success'); load(); } catch { toast('Failed', 'error'); } };
  const reject = async id => { try { await api.patch(`/authentic-details/${id}/reject`); toast('Rejected', 'info'); load(); } catch { toast('Failed', 'error'); } };

  return (
    <>
      <Header title="Business Data" subtitle="Business listings submitted by authentic users" actions={<button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>} />
      <div className="page-content">
        <div className="card">
          <div className="toolbar">
            <div className="search-bar" style={{ minWidth: 220 }}>
              <Search size={15} />
              <input placeholder="Search businesses…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="tabs">
              {[['approved', '✅ Approved'], ['pending', '⏳ Pending'], ['rejected', '❌ Rejected']].map(([v, l]) => (
                <button key={v} className={`tab-btn${statusF === v ? ' active' : ''}`} onClick={() => { setStatusF(v); setPage(1); }}>{l}</button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>{data.total} businesses</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Business Name</th><th>Owner</th><th>Contact</th><th>Location</th><th>Packages</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
                {!loading && data.details.length === 0 && <tr><td colSpan={7}><div className="empty-state"><p>No business data found</p></div></td></tr>}
                {!loading && data.details.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{d.business_name || d.title || '—'}</div>
                      {d.title && d.business_name && <div className="td-muted">{d.title}</div>}
                    </td>
                    <td>
                      <div className="u-name">{d.User?.username}</div>
                      <div className="u-email">{d.User?.email}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {d.phone && <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{d.phone}</span>}
                        {d.email && <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{d.email}</span>}
                        {d.website && <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={11} />Website</span>}
                      </div>
                    </td>
                    <td className="td-muted">{d.Place?.name || d.google_place_id?.slice(0, 16) || '—'}</td>
                    <td className="td-muted">{d.packages?.length ? `${d.packages.length} pkg${d.packages.length > 1 ? 's' : ''}` : '—'}</td>
                    <td>
                      {!d.is_active ? <span className="badge badge-red">Rejected</span>
                        : d.verified ? <span className="badge badge-green">Approved</span>
                        : <span className="badge badge-yellow">Pending</span>}
                    </td>
                    <td>
                      <div className="action-group">
                        <button className="btn-icon" onClick={() => setViewModal(d)}><Eye size={14} /></button>
                        <button className="btn-icon" onClick={() => openEdit(d)}><Edit size={14} /></button>
                        {!d.verified && d.is_active && <button className="btn-icon success" title="Approve" onClick={() => approve(d.id)}><CheckCircle2 size={14} /></button>}
                        {d.verified && <button className="btn-icon" title="Revoke" onClick={() => reject(d.id)}><XCircle size={14} /></button>}
                        <button className="btn-icon danger" onClick={() => setDeleteTarget(d)}><Trash2 size={14} /></button>
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
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Business Details" size="modal-lg">
        {viewModal && (
          <div>
            <div className="detail-grid" style={{ marginBottom: 12 }}>
              {[['Business Name', viewModal.business_name], ['Title', viewModal.title], ['Owner', viewModal.User?.username], ['Phone', viewModal.phone], ['Email', viewModal.email], ['Website', viewModal.website], ['Maps Link', viewModal.maps_link], ['Location', viewModal.Place?.name]].filter(([, v]) => v).map(([l, v]) => (
                <div className="detail-item" key={l}><label>{l}</label><p>{v}</p></div>
              ))}
            </div>
            {viewModal.description && <div className="form-group"><label className="form-label">Description</label><div className="note-box">{viewModal.description}</div></div>}
            {viewModal.packages?.length > 0 && (
              <div><label className="form-label">Service Packages</label>
                {viewModal.packages.map((pkg, i) => (
                  <div key={i} className="note-box" style={{ marginBottom: 8 }}>
                    <strong>{pkg.name}</strong> — {pkg.price}
                    {pkg.description && <div style={{ marginTop: 4, fontSize: 12.5 }}>{pkg.description}</div>}
                  </div>
                ))}
              </div>
            )}
            {viewModal.photos?.length > 0 && <div><label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Photos</label><div className="photo-grid">{viewModal.photos.map((url, i) => <img key={i} src={url} alt="" className="photo-thumb" />)}</div></div>}
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Business"
        footer={<><button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
        {editModal && (
          <div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Business Name</label><input className="form-input" value={editForm.business_name} onChange={e => setEditForm(f => ({ ...f, business_name: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Title/Role</label><input className="form-input" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Website</label><input className="form-input" value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Maps Link</label><input className="form-input" value={editForm.maps_link} onChange={e => setEditForm(f => ({ ...f, maps_link: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
        )}
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Business"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></>}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div className="confirm-icon danger"><Trash2 size={24} /></div>
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Permanently delete <strong>{deleteTarget?.business_name}</strong>?</p>
        </div>
      </Modal>
    </>
  );
}
