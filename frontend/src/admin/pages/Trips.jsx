import React, { useEffect, useState, useCallback } from 'react';
import { Search, Trash2, Eye, Route } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import api from '../api/axios';

export default function Trips() {
  const [data, setData] = useState({ trips: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusF) params.status = statusF;
      const res = await api.get('/trips', { params });
      setData(res.data);
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [page, search, statusF, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    try { await api.delete(`/trips/${deleteTarget.id}`); toast('Deleted', 'success'); setDeleteTarget(null); load(); }
    catch { toast('Delete failed', 'error'); }
  };

  const statusColor = s => ({ draft: 'badge-gray', planning: 'badge-blue', completed: 'badge-green' }[s] || 'badge-gray');

  return (
    <>
      <Header title="Trips" subtitle={`${data.total} user trips`} />
      <div className="page-content">
        <div className="card">
          <div className="toolbar">
            <div className="search-bar" style={{ minWidth: 220 }}>
              <Search size={15} />
              <input placeholder="Search trips…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="tabs">
              {[['', 'All'], ['draft', 'Draft'], ['planning', 'Planning'], ['completed', 'Completed']].map(([v, l]) => (
                <button key={v} className={`tab-btn${statusF === v ? ' active' : ''}`} onClick={() => { setStatusF(v); setPage(1); }}>{l}</button>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Trip</th><th>User</th><th>Destinations</th><th>Mode</th><th>Distance</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={8}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
                {!loading && data.trips.length === 0 && <tr><td colSpan={8}><div className="empty-state"><p>No trips found</p></div></td></tr>}
                {!loading && data.trips.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Route size={13} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                        {t.title}
                      </div>
                      {t.description && <div className="td-muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>}
                    </td>
                    <td><div className="u-name">{t.User?.username}</div><div className="u-email">{t.User?.email}</div></td>
                    <td className="td-muted">{t.destinations?.length || 0} stops</td>
                    <td><span className="badge badge-blue">{t.travel_mode}</span></td>
                    <td className="td-muted">{t.total_distance ? `${parseFloat(t.total_distance).toFixed(1)} km` : '—'}</td>
                    <td><span className={`badge ${statusColor(t.status)}`}>{t.status}</span></td>
                    <td className="td-muted">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="action-group">
                        <button className="btn-icon" onClick={() => setViewModal(t)}><Eye size={14} /></button>
                        <button className="btn-icon danger" onClick={() => setDeleteTarget(t)}><Trash2 size={14} /></button>
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
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Trip Details" size="modal-lg">
        {viewModal && (
          <div>
            <div className="detail-grid" style={{ marginBottom: 14 }}>
              {[['Title', viewModal.title], ['User', viewModal.User?.username], ['Status', viewModal.status], ['Travel Mode', viewModal.travel_mode], ['Distance', viewModal.total_distance ? `${parseFloat(viewModal.total_distance).toFixed(1)} km` : '—'], ['Duration', viewModal.total_duration ? `${Math.round(viewModal.total_duration)} min` : '—'], ['Start Date', viewModal.start_date || '—'], ['End Date', viewModal.end_date || '—']].map(([l, v]) => (
                <div className="detail-item" key={l}><label>{l}</label><p>{v}</p></div>
              ))}
            </div>
            {viewModal.destinations?.length > 0 && (
              <div className="form-group">
                <label className="form-label">Destinations ({viewModal.destinations.length})</label>
                {viewModal.destinations.map((d, i) => (
                  <div key={i} className="note-box" style={{ marginBottom: 6 }}>
                    <strong>{i + 1}.</strong> {d.name || d.address || JSON.stringify(d)}
                  </div>
                ))}
              </div>
            )}
            {viewModal.ai_suggestions && (
              <div className="form-group"><label className="form-label">AI Suggestions</label><div className="note-box info" style={{ whiteSpace: 'pre-wrap', fontSize: 12.5 }}>{viewModal.ai_suggestions}</div></div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Trip"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></>}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div className="confirm-icon danger"><Trash2 size={24} /></div>
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Delete trip <strong>{deleteTarget?.title}</strong>?</p>
        </div>
      </Modal>
    </>
  );
}
