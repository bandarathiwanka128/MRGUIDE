import React, { useEffect, useState, useCallback } from 'react';
import { Search, Eye, Edit, Trash2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import api from '../api/axios';

export default function AuthenticData() {
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
      const params = { status: statusF, type: 'user', page, limit: 20 };
      if (search) params.search = search;
      const res = await api.get('/authentic-details', { params });
      setData(res.data);
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [page, search, statusF]);

  useEffect(() => { load(); }, [load]);

  const openEdit = item => {
    setEditForm({ title: item.title || '', job_title: item.job_title || '', organization: item.organization || '', expertise: item.expertise || '', description: item.description || '', phone: item.phone || '', email: item.email || '', website: item.website || '' });
    setEditModal(item);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/authentic-details/${editModal.id}`, editForm);
      toast('Updated successfully', 'success');
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

  const approve = async id => {
    try {
      await api.patch(`/authentic-details/${id}/approve`);
      toast('Approved', 'success');
      load();
    } catch { toast('Failed', 'error'); }
  };

  const reject = async id => {
    try {
      await api.patch(`/authentic-details/${id}/reject`);
      toast('Rejected', 'info');
      load();
    } catch { toast('Failed', 'error'); }
  };

  return (
    <>
      <Header title="Authentic Data" subtitle="Expert user submissions for locations" actions={<button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>} />
      <div className="page-content">
        <div className="card">
          <div className="toolbar">
            <div className="search-bar" style={{ minWidth: 220 }}>
              <Search size={15} />
              <input placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="tabs">
              {[['approved', '✅ Approved'], ['pending', '⏳ Pending'], ['rejected', '❌ Rejected']].map(([v, l]) => (
                <button key={v} className={`tab-btn${statusF === v ? ' active' : ''}`} onClick={() => { setStatusF(v); setPage(1); }}>{l}</button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>{data.total} records</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>User</th><th>Title / Role</th><th>Expertise</th><th>Contact</th><th>Location</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
                {!loading && data.details.length === 0 && <tr><td colSpan={7}><div className="empty-state"><p>No records found</p></div></td></tr>}
                {!loading && data.details.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className="u-name">{d.User?.username}</div>
                      <div className="u-email">{d.User?.email}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{d.title || d.job_title || '—'}</div>
                      {d.organization && <div className="td-muted">{d.organization}</div>}
                    </td>
                    <td className="td-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.expertise || '—'}</td>
                    <td className="td-muted">{d.phone || d.email || '—'}</td>
                    <td className="td-muted">{d.Place?.name || d.google_place_id?.slice(0, 12) || '—'}</td>
                    <td>
                      {!d.is_active ? <span className="badge badge-red">Rejected</span>
                        : d.verified ? <span className="badge badge-green">Approved</span>
                        : <span className="badge badge-yellow">Pending</span>}
                    </td>
                    <td>
                      <div className="action-group">
                        <button className="btn-icon" onClick={() => setViewModal(d)}><Eye size={14} /></button>
                        <button className="btn-icon" onClick={() => openEdit(d)}><Edit size={14} /></button>
                        {!d.verified && d.is_active && <button className="btn-icon success" onClick={() => approve(d.id)}><CheckCircle2 size={14} /></button>}
                        {d.verified && <button className="btn-icon" onClick={() => reject(d.id)} title="Revoke"><XCircle size={14} /></button>}
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
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Expert Detail" size="modal-lg">
        {viewModal && (
          <div>
            <div className="detail-grid" style={{ marginBottom: 12 }}>
              {[['ID', viewModal.id], ['Submitted By', viewModal.User?.username], ['Email', viewModal.User?.email], ['Title', viewModal.title], ['Job Title', viewModal.job_title], ['Organization', viewModal.organization], ['Phone', viewModal.phone], ['Contact Email', viewModal.email], ['Website', viewModal.website], ['Location', viewModal.Place?.name]].filter(([, v]) => v).map(([l, v]) => (
                <div className="detail-item" key={l}><label>{l}</label><p>{v}</p></div>
              ))}
            </div>
            {viewModal.expertise && <div className="form-group"><label className="form-label">Expertise</label><div className="note-box">{viewModal.expertise}</div></div>}
            {viewModal.description && <div className="form-group"><label className="form-label">Description</label><div className="note-box">{viewModal.description}</div></div>}
            {viewModal.admin_notes && <div className="note-box info">Admin Notes: {viewModal.admin_notes}</div>}
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Expert Detail"
        footer={<><button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
        {editModal && (
          <div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Job Title</label><input className="form-input" value={editForm.job_title} onChange={e => setEditForm(f => ({ ...f, job_title: e.target.value }))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Organization</label><input className="form-input" value={editForm.organization} onChange={e => setEditForm(f => ({ ...f, organization: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Website</label><input className="form-input" value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Expertise</label><textarea className="form-textarea" value={editForm.expertise} onChange={e => setEditForm(f => ({ ...f, expertise: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Record"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></>}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div className="confirm-icon danger"><Trash2 size={24} /></div>
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Permanently delete this authentic detail? This cannot be undone.</p>
        </div>
      </Modal>
    </>
  );
}
