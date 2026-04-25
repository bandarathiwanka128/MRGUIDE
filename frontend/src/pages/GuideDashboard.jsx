import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './GuideDashboard.css';

const TABS = ['Earnings', 'Trips', 'Payouts', 'Profile'];

export default function GuideDashboard({ user }) {
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [trips, setTrips] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Earnings');
  const [notGuide, setNotGuide] = useState(false);
  const [liveToggling, setLiveToggling] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/guides/me/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => {
      setGuide(r.data);
      return Promise.all([
        axios.get(`${API_BASE_URL}/guides/${r.data.id}/earnings`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/guides/${r.data.id}/trips`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/payouts/guide/${r.data.id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
    }).then(([e, t, p]) => {
      setEarnings(e.data);
      setTrips(t.data.trips || []);
      setPayouts(p.data || []);
    }).catch(err => {
      if (err.response?.status === 404) setNotGuide(true);
    }).finally(() => setLoading(false));
  }, []);

  const toggleLive = async () => {
    if (!guide || !guide.is_verified) return;
    setLiveToggling(true);
    try {
      const newStatus = !guide.is_available;
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      ).catch(() => null);

      await axios.put(`${API_BASE_URL}/guides/${guide.id}/availability`, {
        is_available: newStatus,
        lat: pos?.coords.latitude,
        lng: pos?.coords.longitude
      }, { headers: { Authorization: `Bearer ${token}` } });

      setGuide(g => ({ ...g, is_available: newStatus }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update availability');
    } finally {
      setLiveToggling(false);
    }
  };

  if (loading) return (
    <div className="gd-loading"><div className="gd-spinner" /></div>
  );

  if (notGuide) return (
    <div className="gd-not-guide">
      <div className="gd-not-guide-card">
        <h2>You're not registered as a guide</h2>
        <p>Join Mr. Guide as a local guide and start earning!</p>
        <button onClick={() => navigate('/guides/register')} className="gd-register-btn">Register as Guide</button>
      </div>
    </div>
  );

  return (
    <div className="guide-dashboard">
      {/* Header */}
      <div className="gd-header">
        <div className="gd-header-inner">
          <div className="gd-hero-info">
            <div className="gd-avatar">
              {guide?.photo_url ? <img src={guide.photo_url} alt="" /> : '👤'}
            </div>
            <div>
              <h1>{guide?.display_name}</h1>
              <div className="gd-status-row">
                {guide?.is_verified ? (
                  <span className="gd-badge gd-badge--verified">✓ Verified Guide</span>
                ) : (
                  <span className="gd-badge gd-badge--pending">⏳ Pending Verification</span>
                )}
                <span className={`gd-badge ${guide?.is_available ? 'gd-badge--live' : 'gd-badge--offline'}`}>
                  {guide?.is_available ? '● Live' : '○ Offline'}
                </span>
              </div>
            </div>
          </div>

          {guide?.is_verified && (
            <button
              className={`gd-live-toggle ${guide.is_available ? 'gd-live-toggle--on' : ''}`}
              onClick={toggleLive}
              disabled={liveToggling}
            >
              {liveToggling ? <span className="gd-toggle-spinner" /> : null}
              {guide.is_available ? 'Go Offline' : 'Go Live'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="gd-tabs">
        {TABS.map(t => (
          <button key={t} className={`gd-tab ${tab === t ? 'gd-tab--active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="gd-content">
        {/* Earnings tab */}
        {tab === 'Earnings' && earnings && (
          <div className="gd-section-grid">
            {[
              { label: 'This Week', data: earnings.week },
              { label: 'This Month', data: earnings.month },
              { label: 'All Time', data: earnings.all_time }
            ].map(({ label, data }) => (
              <div key={label} className="gd-earnings-card">
                <h3>{label}</h3>
                <div className="gd-earnings-base">LKR {parseFloat(data.base || 0).toLocaleString()}</div>
                <div className="gd-earnings-breakdown">
                  <span>Tips: LKR {parseFloat(data.tips || 0).toLocaleString()}</span>
                  <span>{data.trips} trips</span>
                </div>
              </div>
            ))}
            <div className="gd-earnings-card gd-commission-card">
              <h3>Cash Commission Owed</h3>
              <div className="gd-earnings-base gd-commission-val">
                LKR {parseFloat(earnings.pending_cash_commission || 0).toLocaleString()}
              </div>
              <div className="gd-earnings-breakdown"><span>Will be deducted from next payout</span></div>
            </div>
          </div>
        )}

        {/* Trips tab */}
        {tab === 'Trips' && (
          <div className="gd-table-wrap">
            {trips.length === 0 ? (
              <div className="gd-empty">No trips yet.</div>
            ) : (
              <table className="gd-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Tourist</th>
                    <th>Distance</th>
                    <th>Base Fare</th>
                    <th>Tip</th>
                    <th>Method</th>
                    <th>Guide (95%)</th>
                    <th>Platform (5%)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map(t => (
                    <tr key={t.id}>
                      <td>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td>{t.tourist?.username || '—'}</td>
                      <td>{parseFloat(t.distance_km || 0).toFixed(1)} km</td>
                      <td>LKR {parseFloat(t.base_fare || 0).toLocaleString()}</td>
                      <td>LKR {parseFloat(t.tip_amount || 0).toLocaleString()}</td>
                      <td><span className={`method-badge method-${t.payment_method}`}>{t.payment_method || '—'}</span></td>
                      <td className="gd-guide-share">LKR {parseFloat(t.guide_earnings || 0).toLocaleString()}</td>
                      <td className="gd-platform-share">LKR {parseFloat(t.platform_commission || 0).toLocaleString()}</td>
                      <td><span className={`status-badge status-${t.status}`}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Payouts tab */}
        {tab === 'Payouts' && (
          <div className="gd-table-wrap">
            {payouts.length === 0 ? (
              <div className="gd-empty">No payouts yet. Payouts are processed weekly every Monday.</div>
            ) : (
              <table className="gd-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>QR Fares</th>
                    <th>Tips</th>
                    <th>Commission (5%)</th>
                    <th>Cash Comm. Deducted</th>
                    <th>Net Payout</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p.id}>
                      <td>{p.period_start} → {p.period_end}</td>
                      <td>LKR {parseFloat(p.qr_base_total || 0).toLocaleString()}</td>
                      <td>LKR {parseFloat(p.tips_total || 0).toLocaleString()}</td>
                      <td className="gd-platform-share">LKR {parseFloat(p.qr_commission || 0).toLocaleString()}</td>
                      <td>LKR {parseFloat(p.cash_commission_recovered || 0).toLocaleString()}</td>
                      <td className="gd-guide-share"><strong>LKR {parseFloat(p.net_payout || 0).toLocaleString()}</strong></td>
                      <td><span className={`status-badge status-${p.status}`}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Profile tab */}
        {tab === 'Profile' && guide && (
          <div className="gd-profile-section">
            <div className="gd-profile-grid">
              <div className="gd-profile-field"><label>Display Name</label><span>{guide.display_name}</span></div>
              <div className="gd-profile-field"><label>Phone</label><span>{guide.phone || '—'}</span></div>
              <div className="gd-profile-field"><label>Languages</label><span>{(guide.languages || []).join(', ') || '—'}</span></div>
              <div className="gd-profile-field"><label>Regions</label><span>{(guide.speciality_regions || []).join(', ') || '—'}</span></div>
              <div className="gd-profile-field"><label>1km Fare</label><span>LKR {parseFloat(guide.tier_1km || 0).toLocaleString()}</span></div>
              <div className="gd-profile-field"><label>5km Fare</label><span>LKR {parseFloat(guide.tier_5km || 0).toLocaleString()}</span></div>
              <div className="gd-profile-field"><label>10km Fare</label><span>LKR {parseFloat(guide.tier_10km || 0).toLocaleString()}</span></div>
              <div className="gd-profile-field"><label>20km Fare</label><span>LKR {parseFloat(guide.tier_20km || 0).toLocaleString()}</span></div>
              <div className="gd-profile-field"><label>Extra /km over 20</label><span>LKR {parseFloat(guide.tier_per_km_over20 || 0).toLocaleString()}</span></div>
              <div className="gd-profile-field"><label>Bank</label><span>{guide.bank_name || '—'}</span></div>
              <div className="gd-profile-field"><label>Rating</label><span>⭐ {parseFloat(guide.avg_rating || 0).toFixed(1)} ({guide.total_reviews || 0} reviews)</span></div>
            </div>
            <button className="gd-edit-profile-btn" onClick={() => navigate(`/guides/${guide.id}`)}>
              View Public Profile →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
