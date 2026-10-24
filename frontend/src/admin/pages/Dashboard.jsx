import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, Star, Route, Store, ShieldCheck, Clock, UserCheck } from 'lucide-react';
import Header from '../components/Header';
import api from '../api/axios';

const STAT_CONFIG = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: 'var(--blue-ink)', bg: 'rgba(52,105,154,.12)' },
  { key: 'authenticUsers', label: 'Authentic Users', icon: UserCheck, color: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
  { key: 'pendingApprovals', label: 'Pending Approvals', icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,.15)', link: '/admin/pending' },
  { key: 'approvedDetails', label: 'Approved Details', icon: ShieldCheck, color: '#22c55e', bg: 'rgba(34,197,94,.12)' },
  { key: 'totalPlaces', label: 'Locations', icon: MapPin, color: 'var(--blue-ink)', bg: 'rgba(52,105,154,.12)' },
  { key: 'totalReviews', label: 'Reviews', icon: Star, color: '#FFCC00', bg: 'rgba(255,204,0,.15)' },
  { key: 'totalTrips', label: 'Trips', icon: Route, color: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
  { key: 'totalStores', label: 'Stores', icon: Store, color: 'var(--blue-ink)', bg: 'rgba(52,105,154,.12)' },
];

function StatCard({ cfg, value }) {
  const navigate = useNavigate();
  return (
    <div
      className="stat-card"
      style={{ '--accent-color': cfg.color, '--icon-bg': cfg.bg, cursor: cfg.link ? 'pointer' : 'default' }}
      onClick={() => cfg.link && navigate(cfg.link)}
    >
      <div className="stat-icon"><cfg.icon /></div>
      <div className="stat-body">
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{cfg.label}</div>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const map = { admin: 'badge-purple', authentic_user: 'badge-blue', user: 'badge-gray' };
  return <span className={`badge ${map[role] || 'badge-gray'}`}>{role}</span>;
}

function StatusBadge({ status }) {
  return <span className={`badge ${status === 'active' ? 'badge-green' : 'badge-red'}`}>{status}</span>;
}

function RatingStars({ rating }) {
  return (
    <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)} <span style={{ color: 'var(--text-3)' }}>({rating})</span>
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/recent')
    ]).then(([s, r]) => {
      setStats(s.data);
      setRecent(r.data);
    }).catch(console.error);
  }, []);

  return (
    <>
      <Header title="Dashboard" subtitle="Mr. Guide Admin Overview" />
      <div className="page-content">

        {/* Stat Grid */}
        <div className="stat-grid">
          {STAT_CONFIG.map(cfg => (
            <StatCard key={cfg.key} cfg={cfg} value={stats?.[cfg.key]} />
          ))}
        </div>

        {/* Pending Alert */}
        {stats?.pendingApprovals > 0 && (
          <div className="note-box warning" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <strong>⚠ {stats.pendingApprovals} pending approval{stats.pendingApprovals > 1 ? 's' : ''}</strong> — Authentic and business data submitted by users are waiting for your review before appearing on the map.
            </div>
            <button className="btn btn-gold btn-sm" onClick={() => navigate('/admin/pending')}>
              Review Now
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* Recent Users */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Users size={16} /> Recent Users</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/users')}>View All</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>User</th><th>Role</th><th>Status</th></tr></thead>
                <tbody>
                  {recent?.recentUsers?.length === 0 && (
                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 20 }}>No users yet</td></tr>
                  )}
                  {recent?.recentUsers?.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-cell">
                          <div className="u-avatar">{u.username.charAt(0)}</div>
                          <div><div className="u-name">{u.username}</div><div className="u-email">{u.email}</div></div>
                        </div>
                      </td>
                      <td><RoleBadge role={u.role} /></td>
                      <td><StatusBadge status={u.status || 'active'} /></td>
                    </tr>
                  ))}
                  {!recent && <tr><td colSpan={3}><div className="spinner" style={{ margin: '16px auto', width: 24, height: 24, borderWidth: 2 }} /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Clock size={16} /> Pending Approvals</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/pending')}>View All</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Submitted By</th><th>Type</th><th>Title</th></tr></thead>
                <tbody>
                  {recent?.recentPending?.length === 0 && (
                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 20 }}>All clear!</td></tr>
                  )}
                  {recent?.recentPending?.map(d => (
                    <tr key={d.id} className="pending-row">
                      <td><div className="u-name">{d.User?.username}</div><div className="u-email">{d.User?.email}</div></td>
                      <td><span className={`badge ${d.detail_type === 'business' ? 'badge-blue' : 'badge-purple'}`}>{d.detail_type}</span></td>
                      <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title || d.business_name || '—'}</td>
                    </tr>
                  ))}
                  {!recent && <tr><td colSpan={3}><div className="spinner" style={{ margin: '16px auto', width: 24, height: 24, borderWidth: 2 }} /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Star size={16} /> Recent Reviews</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/reviews')}>View All</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Place</th><th>Rating</th><th>Comment</th></tr></thead>
              <tbody>
                {recent?.recentReviews?.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 20 }}>No reviews yet</td></tr>
                )}
                {recent?.recentReviews?.map(r => (
                  <tr key={r.id}>
                    <td className="u-name">{r.User?.username}</td>
                    <td className="td-muted">{r.Place?.name || '—'}</td>
                    <td><RatingStars rating={r.rating} /></td>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="td-muted">{r.comment || '—'}</td>
                  </tr>
                ))}
                {!recent && <tr><td colSpan={4}><div className="spinner" style={{ margin: '16px auto', width: 24, height: 24, borderWidth: 2 }} /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
