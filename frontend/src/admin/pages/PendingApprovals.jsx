import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Eye, Clock, RefreshCw, MapPin, Phone, Mail, Globe } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import api from '../api/axios';

export default function PendingApprovals() {
  const [data, setData] = useState({ details: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [actionModal, setActionModal] = useState(null); // {item, action:'approve'|'reject'}
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status: 'pending', page, limit: 15 };
      if (typeFilter) params.type = typeFilter;
      const res = await api.get('/authentic-details', { params });
      setData(res.data);
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [page, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const openAction = (item, action) => {
    setActionModal({ item, action });
    setNotes('');
  };

  const confirm = async () => {
    setProcessing(true);
    try {
      const { item, action } = actionModal;
      await api.patch(`/authentic-details/${item.id}/${action}`, { admin_notes: notes });
      toast(action === 'approve' ? '✅ Approved — now visible on map!' : '❌ Rejected', action === 'approve' ? 'success' : 'error');
      setActionModal(null);
      load();
    } catch { toast('Action failed', 'error'); }
    finally { setProcessing(false); }
  };

  const openView = item => { setSelected(item); setViewModal(true); };

  return (
    <>
      <Header
        title="Pending Approvals"
        subtitle="Review authentic & business data before it appears on the map"
        actions={
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />
      <div className="page-content">

        <div className="note-box info" style={{ marginBottom: 20 }}>
          <strong>How approvals work:</strong> When authentic users submit location data or business profiles, they are held here. Once you <strong>approve</strong>, the data appears on the map for all users. <strong>Rejecting</strong> hides it permanently.
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="toolbar">
            <div className="tabs">
              {['', 'user', 'business'].map(t => (
                <button key={t} className={`tab-btn${typeFilter === t ? ' active' : ''}`} onClick={() => { setTypeFilter(t); setPage(1); }}>
                  {t === '' ? 'All' : t === 'user' ? '👤 Expert Data' : '🏢 Business Data'}
                </button>
              ))}
            </div>
            <div className="toolbar-spacer" />
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {data.total} item{data.total !== 1 ? 's' : ''} pending
            </span>
          </div>

          {loading ? (
            <div className="loading-wrap"><div className="spinner" /></div>
          ) : data.details.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 style={{ display: 'block', margin: '0 auto 12px' }} size={48} />
              <h3>All clear!</h3>
              <p>No pending submissions to review.</p>
            </div>
          ) : (
            <div style={{ padding: '0 20px' }}>
              {data.details.map(item => (
                <div key={item.id} className="approval-card pending" style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span className={`badge ${item.detail_type === 'business' ? 'badge-blue' : 'badge-purple'}`}>
                          {item.detail_type === 'business' ? '🏢 Business' : '👤 Expert'}
                        </span>
                        <span className="badge badge-yellow"><Clock size={10} /> Pending</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                        {item.business_name || item.title || item.job_title || 'Untitled'}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 8 }}>
                        Submitted by <strong style={{ color: 'var(--text-2)' }}>{item.User?.username}</strong> · {item.User?.email}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8, lineHeight: 1.5 }}>
                          {item.description.length > 180 ? item.description.slice(0, 180) + '…' : item.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        {item.phone && <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} />{item.phone}</span>}
                        {item.email && <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} />{item.email}</span>}
                        {item.Place?.name && <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{item.Place.name}</span>}
                      </div>
                    </div>
                    <div className="action-group" style={{ paddingTop: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openView(item)}>
                        <Eye size={14} /> View
                      </button>
                      <button className="btn btn-success btn-sm" onClick={() => openAction(item, 'approve')}>
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => openAction(item, 'reject')}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ marginBottom: 16 }} />
            </div>
          )}

          <Pagination page={page} pages={data.pages} total={data.total} limit={15} onPage={setPage} />
        </div>
      </div>

      {/* View Modal */}
      <Modal open={viewModal} onClose={() => setViewModal(false)} title="Submission Details" size="modal-lg">
        {selected && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span className={`badge ${selected.detail_type === 'business' ? 'badge-blue' : 'badge-purple'}`}>
                {selected.detail_type === 'business' ? 'Business' : 'Expert'}
              </span>
              <span className="badge badge-yellow">Pending</span>
            </div>
            <div className="detail-grid" style={{ marginBottom: 16 }}>
              {[
                ['Title / Role', selected.title || selected.job_title],
                ['Business Name', selected.business_name],
                ['Organization', selected.organization],
                ['Phone', selected.phone],
                ['Email', selected.email],
                ['Website', selected.website],
                ['Expertise', selected.expertise],
                ['Location', selected.Place?.name || selected.google_place_id],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div className="detail-item" key={l}><label>{l}</label><p>{v}</p></div>
              ))}
            </div>
            {selected.description && (
              <div className="form-group">
                <label className="form-label">Description</label>
                <div className="note-box">{selected.description}</div>
              </div>
            )}
            {selected.packages?.length > 0 && (
              <div className="form-group">
                <label className="form-label">Service Packages</label>
                {selected.packages.map((pkg, i) => (
                  <div key={i} className="note-box" style={{ marginBottom: 8 }}>
                    <strong>{pkg.name}</strong> — {pkg.price}
                    {pkg.description && <div style={{ marginTop: 4, fontSize: 12.5 }}>{pkg.description}</div>}
                  </div>
                ))}
              </div>
            )}
            {selected.photos?.length > 0 && (
              <div>
                <label className="form-label">Photos</label>
                <div className="photo-grid">
                  {selected.photos.map((url, i) => <img key={i} src={url} alt="" className="photo-thumb" onError={e => e.target.style.display='none'} />)}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="modal-footer" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-success" onClick={() => { setViewModal(false); openAction(selected, 'approve'); }}><CheckCircle2 size={15} /> Approve</button>
          <button className="btn btn-danger" onClick={() => { setViewModal(false); openAction(selected, 'reject'); }}><XCircle size={15} /> Reject</button>
        </div>
      </Modal>

      {/* Action confirm Modal */}
      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal?.action === 'approve' ? '✅ Approve Submission' : '❌ Reject Submission'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setActionModal(null)}>Cancel</button>
            <button
              className={`btn ${actionModal?.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
              onClick={confirm}
              disabled={processing}
            >
              {processing ? 'Processing…' : actionModal?.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
            </button>
          </>
        }
      >
        {actionModal && (
          <div>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 14 }}>
              {actionModal.action === 'approve'
                ? `This will make "${actionModal.item.business_name || actionModal.item.title || 'this submission'}" visible on the map for all users.`
                : `This will permanently hide "${actionModal.item.business_name || actionModal.item.title || 'this submission'}" from the map.`
              }
            </p>
            <div className="form-group">
              <label className="form-label">Admin Notes (optional)</label>
              <textarea
                className="form-textarea"
                placeholder={actionModal.action === 'approve' ? 'Any notes for approval…' : 'Reason for rejection…'}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
