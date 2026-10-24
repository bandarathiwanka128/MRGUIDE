import React, { useEffect, useState, useCallback } from 'react';
import { Search, Eye, UserCheck } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import api from '../api/axios';

export default function AuthenticProfiles() {
  const [data, setData] = useState({ profiles: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const res = await api.get('/authentic-details/profiles/list', { params });
      setData(res.data);
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [page, search, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Header title="Authentic Profiles" subtitle="Users registered as authentic guides or experts" />
      <div className="page-content">
        <div className="card">
          <div className="toolbar">
            <div className="search-bar" style={{ minWidth: 220 }}>
              <Search size={15} />
              <input placeholder="Search by name or email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>{data.total} authentic users</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Title</th><th>Job Title</th><th>Has Business</th><th>Business Name</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={7}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
                {!loading && data.profiles.length === 0 && <tr><td colSpan={7}><div className="empty-state"><UserCheck style={{ display: 'block', margin: '0 auto 10px' }} size={40} /><h3>No authentic users yet</h3></div></td></tr>}
                {!loading && data.profiles.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <div className="u-avatar" style={{ background: 'var(--purple)' }}>{u.username.charAt(0).toUpperCase()}</div>
                        <div><div className="u-name">{u.username}</div><div className="u-email">{u.email}</div></div>
                      </div>
                    </td>
                    <td className="td-muted">{u.AuthenticProfile?.title || '—'}</td>
                    <td className="td-muted">{u.AuthenticProfile?.job_title || '—'}</td>
                    <td>
                      {u.AuthenticProfile?.has_business
                        ? <span className="badge badge-blue">Yes</span>
                        : <span className="badge badge-gray">No</span>}
                    </td>
                    <td className="td-muted">{u.AuthenticProfile?.business_name || '—'}</td>
                    <td className="td-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <button className="btn-icon" onClick={() => setViewModal(u)}><Eye size={14} /></button>
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
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Authentic Profile Details" size="modal-lg">
        {viewModal && (
          <div>
            <div className="detail-grid" style={{ marginBottom: 14 }}>
              {[['Username', viewModal.username], ['Email', viewModal.email], ['Mobile', viewModal.mobile_number || '—'], ['Country', viewModal.country || '—'], ['Status', viewModal.status || 'active'], ['Joined', viewModal.created_at ? new Date(viewModal.created_at).toLocaleString() : '—']].map(([l, v]) => (
                <div className="detail-item" key={l}><label>{l}</label><p>{v}</p></div>
              ))}
            </div>
            {viewModal.AuthenticProfile && (
              <>
                <div style={{ margin: '14px 0 10px', fontWeight: 700, fontSize: 13, color: 'var(--text-2)', borderTop: '1px solid var(--border)', paddingTop: 14 }}>Profile Information</div>
                <div className="detail-grid">
                  {[['Title', viewModal.AuthenticProfile.title], ['Job Title', viewModal.AuthenticProfile.job_title], ['Age', viewModal.AuthenticProfile.age], ['Education', viewModal.AuthenticProfile.education], ['Has Business', viewModal.AuthenticProfile.has_business ? 'Yes' : 'No'], ['Business Name', viewModal.AuthenticProfile.business_name || '—'], ['Business Type', viewModal.AuthenticProfile.business_type || '—']].filter(([, v]) => v !== undefined).map(([l, v]) => (
                    <div className="detail-item" key={l}><label>{l}</label><p>{String(v || '—')}</p></div>
                  ))}
                </div>
                {viewModal.AuthenticProfile.description && (
                  <div style={{ marginTop: 12 }}>
                    <label className="form-label">Bio / Description</label>
                    <div className="note-box">{viewModal.AuthenticProfile.description}</div>
                  </div>
                )}
                {viewModal.AuthenticProfile.business_description && (
                  <div style={{ marginTop: 10 }}>
                    <label className="form-label">Business Description</label>
                    <div className="note-box">{viewModal.AuthenticProfile.business_description}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
