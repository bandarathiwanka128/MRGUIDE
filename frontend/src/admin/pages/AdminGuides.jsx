import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useToast } from '../components/Toast';

export default function AdminGuides() {
  const toast = useToast();
  const [guides, setGuides] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [verified, setVerified] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [verifying, setVerifying] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (search) params.set('search', search);
      if (verified) params.set('verified', verified);
      const r = await api.get(`/guides?${params}`);
      setGuides(r.data.guides || []);
      setTotal(r.data.total || 0);
    } catch (e) {
      toast(e.response?.data?.error || 'Unable to load data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, verified, search, toast]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  const toggleVerify = async (guide) => {
    setVerifying(guide.id);
    try {
      await api.put(`/guides/${guide.id}/verify`, { is_verified: !guide.is_verified });
      setGuides(prev => prev.map(g => g.id === guide.id ? { ...g, is_verified: !g.is_verified } : g));
      if (selectedGuide?.id === guide.id) setSelectedGuide(g => ({ ...g, is_verified: !g.is_verified }));
    } catch (e) {
      toast(e.response?.data?.error || 'Failed to update verification', 'error');
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Guide Management</h1>
          <p className="page-sub">{total} registered guides</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flex: 1 }}>
          <input className="search-input" placeholder="Search guides..." value={search} onChange={e => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <select className="filter-select" value={verified} onChange={e => { setVerified(e.target.value); setPage(1); }}>
          <option value="">All Guides</option>
          <option value="true">Verified Only</option>
          <option value="false">Pending Only</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Guide list */}
        <div style={{ flex: 1 }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Guide</th>
                  <th>Pricing (1km / 5km)</th>
                  <th>Rating</th>
                  <th>Earnings</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></td></tr>
                ) : guides.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No guides found</td></tr>
                ) : guides.map(g => (
                  <tr key={g.id} className={selectedGuide?.id === g.id ? 'row-selected' : ''} onClick={() => setSelectedGuide(g)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="cell-main">{g.display_name}</div>
                      <div className="cell-sub">{g.email}</div>
                    </td>
                    <td>LKR {parseFloat(g.tier_1km || 0).toLocaleString()} / {parseFloat(g.tier_5km || 0).toLocaleString()}</td>
                    <td>⭐ {parseFloat(g.avg_rating || 0).toFixed(1)} ({g.total_reviews || 0})</td>
                    <td>LKR {parseFloat(g.total_earnings_base || 0).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${g.is_verified ? 'badge-success' : 'badge-warning'}`}>
                        {g.is_verified ? 'Verified' : 'Pending'}
                      </span>
                      {g.is_available && <span className="badge badge-info" style={{ marginLeft: 4 }}>Live</span>}
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${g.is_verified ? 'btn-danger' : 'btn-success'}`}
                        disabled={verifying === g.id}
                        onClick={e => { e.stopPropagation(); toggleVerify(g); }}
                      >
                        {verifying === g.id ? '...' : g.is_verified ? 'Revoke' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 30 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-sm">← Prev</button>
              <span className="page-info">Page {page} of {Math.ceil(total / 30)}</span>
              <button disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)} className="btn btn-sm">Next →</button>
            </div>
          )}
        </div>

        {/* Guide detail panel */}
        {selectedGuide && (
          <div className="detail-panel" style={{ width: 320 }}>
            <div className="detail-panel-header">
              <h3>{selectedGuide.display_name}</h3>
              <button onClick={() => setSelectedGuide(null)} className="close-btn">✕</button>
            </div>
            <div className="detail-panel-body">
              <div className="detail-field"><label>Email</label><span>{selectedGuide.email}</span></div>
              <div className="detail-field"><label>NIC</label><span>{selectedGuide.nic_number || '—'}</span></div>
              <div className="detail-field"><label>Phone</label><span>{selectedGuide.phone || '—'}</span></div>
              <div className="detail-field"><label>Languages</label><span>{(selectedGuide.languages || []).join(', ') || '—'}</span></div>
              <div className="detail-field"><label>Regions</label><span>{(selectedGuide.speciality_regions || []).join(', ') || '—'}</span></div>
              <div className="detail-field"><label>1km</label><span>LKR {parseFloat(selectedGuide.tier_1km || 0).toLocaleString()}</span></div>
              <div className="detail-field"><label>5km</label><span>LKR {parseFloat(selectedGuide.tier_5km || 0).toLocaleString()}</span></div>
              <div className="detail-field"><label>10km</label><span>LKR {parseFloat(selectedGuide.tier_10km || 0).toLocaleString()}</span></div>
              <div className="detail-field"><label>20km</label><span>LKR {parseFloat(selectedGuide.tier_20km || 0).toLocaleString()}</span></div>
              <div className="detail-field"><label>Extra /km</label><span>LKR {parseFloat(selectedGuide.tier_per_km_over20 || 0).toLocaleString()}</span></div>
              <div className="detail-field"><label>Bank</label><span>{selectedGuide.bank_name || '—'}</span></div>
              <div className="detail-field"><label>Account</label><span>{selectedGuide.bank_account_number || '—'}</span></div>
              <div className="detail-field"><label>Branch</label><span>{selectedGuide.bank_branch || '—'}</span></div>
              <div className="detail-field"><label>Total Earnings</label><span>LKR {parseFloat(selectedGuide.total_earnings_base || 0).toLocaleString()}</span></div>
              <div className="detail-field"><label>Cash Commission Owed</label><span style={{ color: parseFloat(selectedGuide.pending_cash_commission || 0) > 0 ? '#ef4444' : 'inherit' }}>LKR {parseFloat(selectedGuide.pending_cash_commission || 0).toLocaleString()}</span></div>
              <div className="detail-field"><label>Bio</label><span style={{ fontSize: 12 }}>{selectedGuide.bio || '—'}</span></div>
            </div>
            <div className="detail-panel-footer">
              <button
                className={`btn ${selectedGuide.is_verified ? 'btn-danger' : 'btn-success'}`}
                style={{ width: '100%' }}
                disabled={verifying === selectedGuide.id}
                onClick={() => toggleVerify(selectedGuide)}
              >
                {selectedGuide.is_verified ? 'Revoke Verification' : 'Approve Guide'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
