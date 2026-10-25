import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './App.css';

import HomePage from './pages/HomePage';
import SiteNav from './components/layout/SiteNav';
import AdminRoute from './components/auth/AdminRoute';
import SiteFooter from './components/layout/SiteFooter';
import AIAssistant, { AssistantLauncher } from './components/assistant/AIAssistant';
import { BrandMark } from './components/brand/Logo';

import { API_BASE_URL } from './config';

// Route-level code splitting: maps, Stripe and D3 load only when needed
const SearchResults = lazy(() => import('./pages/SearchResults'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const ShortestPath = lazy(() => import('./pages/ShortestPath'));
const TripPlanner = lazy(() => import('./pages/TripPlanner'));
const AuthenticSection = lazy(() => import('./pages/AuthenticSection'));
const GuideBooking = lazy(() => import('./pages/GuideBooking'));
const GuideProfile = lazy(() => import('./pages/GuideProfile'));
const GuideRegister = lazy(() => import('./pages/GuideRegister'));
const GuideDashboard = lazy(() => import('./pages/GuideDashboard'));
const TripPayment = lazy(() => import('./pages/TripPayment'));
const LiveTripView = lazy(() => import('./pages/LiveTripView'));
const MyTrip = lazy(() => import('./pages/MyTrip'));
const AdminPanel = lazy(() => import('./admin/AdminPanel'));
const NotFound = lazy(() => import('./pages/NotFound'));

/* Full-height workspace routes: no footer, no floating assistant button
   (it would sit on top of map controls). */
const WORKSPACE_PREFIXES = ['/admin', '/search', '/shortest-path', '/trip-planner', '/authentic', '/trip/live', '/my-trip'];
const isWorkspace = (path) => path === '/guides' || WORKSPACE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

const PageFallback = () => (
  <div className="page-fallback" role="status" aria-live="polite">
    <span className="ui-spinner" aria-hidden="true" />
    <span className="sr-only">Loading page</span>
  </div>
);

const AppShell = ({ user, setUser, onLogout, darkMode, onToggleTheme, onRefreshAuth }) => {
  const location = useLocation();
  const mainRef = useRef(null);
  const launcherRef = useRef(null);
  const firstRender = useRef(true);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const path = location.pathname;
  const workspace = isWorkspace(path);
  const isHome = path === '/';

  // On navigation: back to top (unless an anchor) and focus the main region for screen readers
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (!location.hash) window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [path, location.hash]);

  const closeAssistant = useCallback(() => {
    setAssistantOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);
  const toggleAssistant = () => setAssistantOpen((o) => !o);

  /* One consistent entry point in the navigation: it never covers map
     controls, payment buttons or the mobile menu. */
  const navLauncher = (
    <AssistantLauncher ref={launcherRef} onOpen={toggleAssistant} open={assistantOpen} />
  );

  return (
    <div className={`App${workspace ? ' App--workspace' : ''}${isHome ? ' App--home' : ''}`}>
      <a href="#main" className="skip-link">Skip to content</a>

      <SiteNav
        user={user}
        onLogout={onLogout}
        darkMode={darkMode}
        onToggleTheme={onToggleTheme}
        overHero={isHome}
        assistantButton={navLauncher}
      />

      <main id="main" ref={mainRef} tabIndex={-1} className="app-main">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage user={user} onOpenAssistant={() => setAssistantOpen(true)} />} />
            <Route path="/search" element={<SearchResults user={user} />} />
            <Route path="/shortest-path" element={<ShortestPath />} />
            <Route path="/trip-planner" element={<TripPlanner user={user} />} />
            <Route path="/authentic" element={<AuthenticSection user={user} />} />
            <Route path="/authentic/:placeName" element={<AuthenticSection user={user} />} />
            <Route path="/guides" element={<GuideBooking user={user} />} />
            <Route path="/guides/register" element={user ? <GuideRegister user={user} /> : <Navigate to="/login" />} />
            <Route path="/guides/:id" element={<GuideProfile user={user} />} />
            <Route path="/guide/dashboard" element={user ? <GuideDashboard user={user} /> : <Navigate to="/login" />} />
            <Route path="/pay/:tripId" element={<TripPayment user={user} />} />
            <Route path="/trip/live/:tripId" element={user ? <LiveTripView user={user} /> : <Navigate to="/login" />} />
            <Route path="/my-trip" element={user ? <MyTrip user={user} /> : <Navigate to="/login" />} />
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
            <Route path="/register" element={user ? <Navigate to="/" /> : <Register setUser={setUser} />} />
            <Route path="/admin/*" element={<AdminRoute user={user}><AdminPanel user={user} onAccessDenied={onRefreshAuth} /></AdminRoute>} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {!workspace && <SiteFooter />}

      <AIAssistant open={assistantOpen} onClose={closeAssistant} />
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('mrguide-theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mrguide-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', darkMode ? '#0D1B2A' : '#F4F7FA');
  }, [darkMode]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
      } catch (error) {
        console.error('Auth check failed:', error);
        if ([401, 403].includes(error.response?.status)) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <BrandMark />
        <span>Loading Mr. Guide…</span>
      </div>
    );
  }

  return (
    <Router>
      <AppShell
        user={user}
        setUser={setUser}
        onLogout={handleLogout}
        onRefreshAuth={checkAuth}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((d) => !d)}
      />
    </Router>
  );
};

export default App;
