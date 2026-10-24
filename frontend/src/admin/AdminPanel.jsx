import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Briefcase, Clock, CreditCard, DollarSign, LayoutDashboard, MapPin, Route as RouteIcon, ShieldCheck, Star, Store, UserCheck, Users, Wallet } from 'lucide-react';
import api from './api/axios';
import { ToastProvider } from './components/Toast';
import './admin.css';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const UsersPage = lazy(() => import('./pages/Users'));
const AuthenticProfiles = lazy(() => import('./pages/AuthenticProfiles'));
const PendingApprovals = lazy(() => import('./pages/PendingApprovals'));
const AuthenticData = lazy(() => import('./pages/AuthenticData'));
const BusinessData = lazy(() => import('./pages/BusinessData'));
const Places = lazy(() => import('./pages/Places'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Trips = lazy(() => import('./pages/Trips'));
const Stores = lazy(() => import('./pages/Stores'));
const AdminGuides = lazy(() => import('./pages/AdminGuides'));
const AdminLiveTrips = lazy(() => import('./pages/AdminLiveTrips'));
const AdminFinancials = lazy(() => import('./pages/AdminFinancials'));
const AdminPayouts = lazy(() => import('./pages/AdminPayouts'));
const AdminCommissions = lazy(() => import('./pages/AdminCommissions'));

const NAV = [
  { group: 'Overview', path: '', label: 'Dashboard', icon: LayoutDashboard },
  { group: 'Approvals', path: 'pending', label: 'Pending approvals', icon: Clock },
  { group: 'Guide marketplace', path: 'guides', label: 'Guides', icon: UserCheck },
  { path: 'live-trips', label: 'Live trips', icon: Activity },
  { path: 'financials', label: 'Financials', icon: DollarSign },
  { path: 'payouts', label: 'Payouts', icon: CreditCard },
  { path: 'commissions', label: 'Commission owed', icon: Wallet },
  { group: 'Data management', path: 'users', label: 'Users', icon: Users },
  { path: 'authentic-profiles', label: 'Authentic profiles', icon: UserCheck },
  { path: 'authentic-data', label: 'Authentic data', icon: ShieldCheck },
  { path: 'business-data', label: 'Business data', icon: Briefcase },
  { path: 'places', label: 'Locations / places', icon: MapPin },
  { path: 'reviews', label: 'Reviews', icon: Star },
  { path: 'trips', label: 'Trips', icon: RouteIcon },
  { path: 'stores', label: 'Stores', icon: Store },
];

export default function AdminPanel({ user, onAccessDenied }) {
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const verify = useCallback(async () => {
    setError('');
    try { await api.get('/auth/me'); setVerified(true); }
    catch (err) { setError(err.response?.data?.error || 'Unable to verify admin access. Please try again.'); }
  }, []);
  useEffect(() => { verify(); }, [verify]);
  useEffect(() => {
    const denied = () => { setVerified(false); onAccessDenied(); };
    window.addEventListener('mrguide:admin-access-denied', denied);
    return () => window.removeEventListener('mrguide:admin-access-denied', denied);
  }, [onAccessDenied]);
  useEffect(() => {
    if (!verified) return undefined;
    const refresh = () => api.get('/dashboard/stats').then(response => setPending(response.data.pendingApprovals || 0)).catch(() => {});
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [verified, location.pathname]);
  if (!verified) return <div className="container" style={{ padding: 40 }} role="status">{error ? <><p role="alert">{error}</p><button className="ui-btn ui-btn--primary" onClick={verify}>Retry</button></> : 'Verifying administrator access...'}</div>;
  return <div className="admin-panel">
    <aside className="sidebar" aria-label="Admin navigation">
      <div className="sidebar-logo"><strong>Admin panel</strong><small>{user.email || user.username}</small></div>
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }} aria-label="Administration">
        {NAV.map(({ group, path, label, icon: Icon }) => <React.Fragment key={path}>
          {group && <div className="sidebar-section"><p className="sidebar-section-title">{group}</p></div>}
          <NavLink to={`/admin${path ? `/${path}` : ''}`} end={!path} className="sidebar-link"><Icon size={17} aria-hidden="true" />{label}{path === 'pending' && pending > 0 && <span className="sidebar-badge gold">{pending}</span>}</NavLink>
        </React.Fragment>)}
      </nav>
      <div className="sidebar-footer"><Link to="/" className="sidebar-link"><ArrowLeft size={17} aria-hidden="true" /> Back to Mr. Guide</Link></div>
    </aside>
    <div className="main-area">
      <div className="admin-mobile-nav"><label className="sr-only" htmlFor="admin-section">Admin section</label><select id="admin-section" value={location.pathname.replace(/^\/admin\/?/, '').split('/')[0]} onChange={event => navigate(`/admin/${event.target.value}`)}>{NAV.map(item => <option key={item.path} value={item.path}>{item.label}{item.path === 'pending' && pending ? ` (${pending})` : ''}</option>)}</select></div>
      <ToastProvider><Suspense fallback={<div className="loading-wrap" role="status"><span className="spinner" /><span className="sr-only">Loading admin section</span></div>}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="pending" element={<PendingApprovals />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="authentic-profiles" element={<AuthenticProfiles />} />
          <Route path="authentic-data" element={<AuthenticData />} />
          <Route path="business-data" element={<BusinessData />} />
          <Route path="places" element={<Places />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="trips" element={<Trips />} />
          <Route path="stores" element={<Stores />} />
          <Route path="guides" element={<AdminGuides />} />
          <Route path="live-trips" element={<AdminLiveTrips />} />
          <Route path="financials" element={<AdminFinancials />} />
          <Route path="payouts" element={<AdminPayouts />} />
          <Route path="commissions" element={<AdminCommissions />} />
          <Route path="*" element={<div className="page-content"><h1>Admin section not found</h1><Link to="/admin">Return to dashboard</Link></div>} />
        </Routes>
      </Suspense></ToastProvider>
    </div>
  </div>;
}
