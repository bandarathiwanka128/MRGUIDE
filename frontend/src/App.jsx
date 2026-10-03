import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

import HomePage from './pages/HomePage';
import SearchResults from './pages/SearchResults';
import Login from './pages/Login';
import Register from './pages/Register';
import AboutUs from './pages/AboutUs';
import ShortestPath from './pages/ShortestPath';
import TripPlanner from './pages/TripPlanner';
import AuthenticSection from './pages/AuthenticSection';
import GuideBooking from './pages/GuideBooking';
import GuideProfile from './pages/GuideProfile';
import GuideRegister from './pages/GuideRegister';
import GuideDashboard from './pages/GuideDashboard';
import TripPayment from './pages/TripPayment';
import LiveTripView from './pages/LiveTripView';
import MyTrip from './pages/MyTrip';

import { API_BASE_URL } from './config';

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('mrguide-theme');
    return saved ? saved === 'dark' : true;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('mrguide-theme', darkMode ? 'dark' : 'light');
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
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <Link to="/" className="logo">
            <span className="logo-mr">Mr.</span>
            <span className="logo-guide">Guide</span>
          </Link>

          <button
            className="mobile-menu-toggle"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="primary-navigation"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          <button
            className={`mobile-menu-backdrop${mobileMenuOpen ? ' is-visible' : ''}`}
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          />

          <div id="primary-navigation" className={`nav-links${mobileMenuOpen ? ' is-open' : ''}`}>
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link to="/guides" onClick={() => setMobileMenuOpen(false)}>Find a Guide</Link>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)}>About Us</Link>
            {user && <Link to="/guide/dashboard" onClick={() => setMobileMenuOpen(false)}>My Guide</Link>}
            {user && localStorage.getItem('mrguide_active_trip') && (
              <Link to="/my-trip" className="nav-active-trip" onClick={() => setMobileMenuOpen(false)}>🗺 My Trip</Link>
            )}

            <div className="mobile-menu-auth">
              {user ? (
                <>
                  <span className="welcome-user">Hi, {user.username}!</span>
                  <button onClick={handleLogout} className="btn btn-logout">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                  <Link to="/register" className="btn btn-register" onClick={() => setMobileMenuOpen(false)}>Register</Link>
                </>
              )}
            </div>
          </div>

          <div className="nav-right">
            <button
              className="theme-toggle"
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle theme"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>

            <div className="auth-buttons">
              {user ? (
                <>
                  <span className="welcome-user">Hi, {user.username}!</span>
                  <button onClick={handleLogout} className="btn btn-logout">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-login">Login</Link>
                  <Link to="/register" className="btn btn-register">Register</Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage />} />
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
          <Route path="/about" element={<AboutUs />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
