import React, { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import Header from '../components/Header';

const money = value => `LKR ${Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminFinancials() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData((await api.get('/guides/financials')).data); }
    catch (err) { setError(err.response?.data?.error || 'Unable to load financials.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const maximum = Math.max(1, ...(data?.trend || []).map(point => Number(point.commission)));
  return <>
    <Header title="Financial dashboard" subtitle="Platform revenue, guide earnings and commissions" actions={<button className="btn btn-primary" onClick={load} disabled={loading}>Refresh</button>} />
    <div className="page-content">
      {error && <div className="note-box warning" role="alert">{error}</div>}
      {loading && !data && <div className="loading-wrap" role="status"><span className="spinner" /><span className="sr-only">Loading financials</span></div>}
      {data && <>
        <div className="stat-grid">
          {[
            ['This week commission', data.week?.commission, `${data.week?.trips || 0} paid trips`],
            ['This month commission', data.month?.commission, `${data.month?.trips || 0} paid trips`],
            ['All time commission', data.all_time?.commission, `${data.all_time?.trips || 0} paid trips`],
            ['Guide tips this week', data.week?.tips, '100% to guides'],
            ['QR received this week', data.qr_received_week],
            ['Payouts sent this week', data.payouts_sent_week],
            ['Cash commission owed', data.cash_commission_owed, 'Outstanding from guides'],
          ].map(([label, value, sub]) => <div className="card" key={label} style={{ padding: 20 }}><div className="stat-label">{label}</div><div style={{ fontSize: 23, fontWeight: 700, margin: '8px 0', color: 'var(--accent-ink)' }}>{money(value)}</div><small style={{ color: 'var(--text-3)' }}>{sub}</small></div>)}
        </div>
        <section className="card" style={{ padding: 24, marginBottom: 24 }} aria-labelledby="commission-trend">
          <h2 id="commission-trend" className="section-title">12-week commission trend</h2>
          {data.trend?.length ? <div className="admin-chart" role="list" aria-label="Weekly commissions in Sri Lankan rupees">
            {data.trend.map((point, index) => <div key={point.week_start || index} className="admin-chart-column" role="listitem" aria-label={`${point.week}: ${money(point.commission)}`} title={`${point.week}: ${money(point.commission)}`}>
              <span>{money(point.commission)}</span><div className="admin-chart-bar" style={{ height: `${Math.max(1, Number(point.commission) / maximum * 80)}%` }} /><span>{point.week}</span>
            </div>)}
          </div> : <p className="empty-state">No paid trips in this period.</p>}
        </section>
        <section className="card" aria-labelledby="top-guides">
          <div className="card-header"><h2 id="top-guides" className="card-title">Top 10 guides by earnings this month</h2></div>
          <div className="table-wrap"><table><thead><tr><th>Rank</th><th>Guide</th><th>Earnings</th><th>Paid trips</th></tr></thead><tbody>
            {!data.top_guides?.length && <tr><td colSpan={4} className="empty-state">No guide earnings yet.</td></tr>}
            {(data.top_guides || []).map((guide, index) => <tr key={guide.id || index}><td>{index + 1}</td><td>{guide.display_name || 'Unknown guide'}</td><td>{money(guide.total_earnings)}</td><td>{guide.trip_count}</td></tr>)}
          </tbody></table></div>
        </section>
      </>}
    </div>
  </>;
}
