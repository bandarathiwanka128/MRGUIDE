import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const fmt = (n) => `LKR ${parseFloat(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLORS = {
  pending: 'badge-warning',
  processing: 'badge-info',
  paid: 'badge-success',
  failed: 'badge-danger',
};

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [refInputs, setRefInputs] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (statusFilter) params.set('status', statusFilter);
      const r = await api.get(`/guides/payouts/all?${params}`);
      setPayouts(r.data.payouts || []);
      setTotal(r.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const runPayoutJob = async () => {
    if (!window.confirm('Run the weekly payout job now? This will create payout records for all guides with unpaid QR trips.')) return;
    setRunning(true);
    try {
      const r = await api.post('/guides/payouts/run');
      alert(`Payout job complete: ${r.data.processed || 0} guides processed.`);
      load();
    } catch (e) {
      alert('Payout job failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setRunning(false);
    }
  };

  const markPaid = async (payout) => {
    const ref = refInputs[payout.id] || '';
    setMarkingId(payout.id);
    try {
      await api.put(`/guides/payouts/${payout.id}/mark-paid`, { ref });
      setPayouts(prev => prev.map(p => p.id === payout.id ? { ...p, status: 'paid', bank_transfer_ref: ref || 'MANUAL' } : p));
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payout Management</h1>
          <p className="page-sub">{total} payout record{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={runPayoutJob}
          disabled={running}
        >
          {running ? 'Running...' : '⚡ Run Payout Job'}
        </button>
      </div>

      <div className="filter-bar">
        <select className="filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Guide</th>
              <th>Period</th>
              <th>QR Base</th>
              <th>Tips</th>
              <th>Commission</th>
              <th>Cash Comm. Deducted</th>
              <th>Net Payout</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></td></tr>
            ) : payouts.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No payouts found</td></tr>
            ) : payouts.map(p => (
              <tr key={p.id}>
                <td>
                  <div className="cell-main">{p.Guide?.display_name || '—'}</div>
                  <div className="cell-sub">{p.Guide?.bank_name} · {p.Guide?.bank_account_number}</div>
                  <div className="cell-sub">{p.Guide?.bank_branch}</div>
                </td>
                <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                  {p.period_start ? new Date(p.period_start).toLocaleDateString() : '—'}<br />
                  <span style={{ color: 'var(--text-3)' }}>to</span> {p.period_end ? new Date(p.period_end).toLocaleDateString() : '—'}
                </td>
                <td>{fmt(p.qr_base_total)}</td>
                <td>{fmt(p.tips_total)}</td>
                <td style={{ color: '#ef4444' }}>{fmt(p.qr_commission)}</td>
                <td style={{ color: '#ef4444' }}>{fmt(p.cash_commission_recovered)}</td>
                <td style={{ fontWeight: 700, color: 'var(--blue-ink)' }}>{fmt(p.net_payout)}</td>
                <td>
                  <span className={`badge ${STATUS_COLORS[p.status] || 'badge-info'}`}>{p.status}</span>
                  {p.bank_transfer_ref && p.status === 'paid' && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>{p.bank_transfer_ref}</div>
                  )}
                  {p.paid_at && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{new Date(p.paid_at).toLocaleDateString()}</div>
                  )}
                </td>
                <td>
                  {p.status !== 'paid' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        className="search-input"
                        style={{ fontSize: '0.78rem', padding: '4px 8px', width: 120 }}
                        placeholder="Ref # (optional)"
                        value={refInputs[p.id] || ''}
                        onChange={e => setRefInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                      />
                      <button
                        className="btn btn-sm btn-success"
                        disabled={markingId === p.id}
                        onClick={() => markPaid(p)}
                      >
                        {markingId === p.id ? '...' : 'Mark Paid'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 30 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-sm">← Prev</button>
          <span className="page-info">Page {page} of {Math.ceil(total / 30)}</span>
          <button disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)} className="btn btn-sm">Next →</button>
        </div>
      )}
    </div>
  );
}
