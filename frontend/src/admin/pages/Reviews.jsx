import React, { useEffect, useState, useCallback } from 'react';
import { Search, Edit, Trash2, Star } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import api from '../api/axios';

function Stars({ n }) {
  return <span style={{ color: '#f59e0b', letterSpacing: 1 }}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export default function Reviews() {
  const [data, setData] = useState({ reviews: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ratingF, setRatingF] = useState('');
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 5, comment: '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (ratingF) params.rating = ratingF;
      const res = await api.get('/admin/reviews', { params });
      setData(res.data);
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [page, search, ratingF]);

  useEffect(() => { load(); }, [load]);

  const openEdit = r => { setEditForm({ rating: r.rating, comment: r.comment || '' }); setEditModal(r); };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/reviews/${editModal.id}`, editForm);
      toast('Review updated', 'success');
      setEditModal(null);
      load();
    } catch { toast('Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/reviews/${deleteTarget.id}`); toast('Deleted', 'success'); setDeleteTarget(null); load(); }
    catch { toast('Delete failed', 'error'); }
  };

  return (
    <>
      <Header title="Reviews" subtitle={`${data.total} total reviews`} />
      <div className="page-content">
        <div className="card">
          <div className="toolbar">
            <div className="search-bar" style={{ minWidth: 220 }}>
              <Search size={15} />
              <input placeholder="Search reviews…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="form-select" style={{ width: 'auto', fontSize: 13 }} value={ratingF} onChange={e => { setRatingF(e.target.value); setPage(1); }}>
              <option value="">All Ratings</option>
              {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{'★'.repeat(r)} ({r} stars)</option>)}
            </select>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>{data.total} reviews</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Place</th><th>Rating</th><th>Comment</th><th>Photos</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={7}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
                {!loading && data.reviews.length === 0 && <tr><td colSpan={7}><div className="empty-state"><p>No reviews found</p></div></td></tr>}
                {!loading && data.reviews.map(r => (
                  <tr key={r.id}>
                    <td><div className="u-name">{r.User?.username}</div><div className="u-email">{r.User?.email}</div></td>
                    <td className="td-muted">{r.Place?.name || '—'}</td>
                    <td><Stars n={r.rating} /> <span style={{ fontSize: 11, color: 'var(--text-3)' }}>({r.rating})</span></td>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="td-muted">{r.comment || '—'}</td>
                    <td className="td-muted">{r.photos?.length || 0}</td>
                    <td className="td-muted">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="action-group">
                        <button className="btn-icon" onClick={() => openEdit(r)}><Edit size={14} /></button>
                        <button className="btn-icon danger" onClick={() => setDeleteTarget(r)}><Trash2 size={14} /></button>
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

      {/* Edit */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Review"
        footer={<><button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
        {editModal && (
          <div>
            <div className="form-group">
              <label className="form-label">Rating</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setEditForm(f => ({ ...f, rating: n }))}
                    style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: n <= editForm.rating ? '#f59e0b' : 'var(--border)' }}>★</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Comment</label>
              <textarea className="form-textarea" value={editForm.comment} onChange={e => setEditForm(f => ({ ...f, comment: e.target.value }))} rows={4} />
            </div>
          </div>
        )}
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Review"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></>}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div className="confirm-icon danger"><Trash2 size={24} /></div>
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Delete this review by <strong>{deleteTarget?.User?.username}</strong>?</p>
        </div>
      </Modal>
    </>
  );
}
