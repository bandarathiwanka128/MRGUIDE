import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const fmt = (n) => `LKR ${parseFloat(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminCommissions() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/guides/commissions/owed');
      const list = r.data || [];
      setGuides(list);
      setTotal(list.reduce((a, g) => a + parseFloat(g.pending_cash_commission || 0), 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getAlertLevel = (amount) => {
    if (amount >= 10000) return { color: '#ef4444', label: 'HIGH', bg: 'rgba(239,68,68,0.1)' };
    if (amount >= 3000) return { color: '#f59e0b', label: 'MEDIUM', bg: 'rgba(245,158,11,0.1)' };
    return { color: 'var(--blue-ink)', label: 'LOW', bg: 'rgba(52,105,154,0.1)' };
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cash Commission Owed</h1>
          <p className="page-sub">
            {guides.length} guide{guides.length !== 1 ? 's' : ''} with outstanding commission ·{' '}
            <strong style={{ color: '#ef4444' }}>{fmt(total)} total</strong>
          </p>
        </div>
        <button className="btn btn-primary" onClick={load} disabled={loading}>
          {loading ? '...' : 'Refresh'}
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 24,
        fontSize: '0.88rem', color: 'var(--text-2)'
      }}>
        <strong style={{ color: '#f59e0b' }}>How this works:</strong> When a guide receives cash from a tourist, the platform's 5% commission is tracked here. This amount is automatically deducted from their next QR payout. If a guide only takes cash, the balance accumulates until their next QR trip's payout.
      </div>

      {/* Summary cards */}
      {guides.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Total Owed</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{fmt(total)}</div>
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Guides Affected</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{guides.length}</div>
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>High Alert (≥10k)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>
              {guides.filter(g => parseFloat(g.pending_cash_commission) >= 10000).length}
            </div>
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Avg per Guide</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{fmt(total / (guides.length || 1))}</div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Guide</th>
              <th>Cash Commission Owed</th>
              <th>Total Earnings (All Time)</th>
              <th>Cash % of Earnings</th>
              <th>Alert Level</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></td></tr>
            ) : guides.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                  <div style={{ color: 'var(--text-3)', fontWeight: 600 }}>No outstanding cash commissions</div>
                </td>
              </tr>
            ) : guides.map((g, i) => {
              const owed = parseFloat(g.pending_cash_commission || 0);
              const earnings = parseFloat(g.total_earnings_base || 0);
              const pct = earnings > 0 ? ((owed / earnings) * 100).toFixed(1) : '—';
              const alert = getAlertLevel(owed);
              return (
                <tr key={g.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-3)' }}>#{i + 1}</td>
                  <td>
                    <div className="cell-main">{g.display_name}</div>
                    <div className="cell-sub">{g.username}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ef4444' }}>
                      {fmt(owed)}
                    </div>
                  </td>
                  <td>{fmt(earnings)}</td>
                  <td>
                    {pct !== '—' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(parseFloat(pct), 100)}%`, height: '100%', background: '#ef4444', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, minWidth: 36 }}>{pct}%</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    <span style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700,
                      color: alert.color, background: alert.bg, border: `1px solid ${alert.color}40`
                    }}>
                      {alert.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {guides.length > 0 && (
        <div style={{ marginTop: 16, fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'right' }}>
          Commissions are automatically recovered on next QR payout. Run the payout job from the Payouts page.
        </div>
      )}
    </div>
  );
}
