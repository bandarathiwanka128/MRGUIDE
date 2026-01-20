import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AboutUs from './pages/AboutUs';
import MapSearch from './pages/MapSearch';

import { API_BASE_URL } from './config';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <Link to="/" className="logo">Mr. Guide</Link>
          
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/map-search">Map Search</Link>
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
          </div>

          <div className="auth-buttons">
            {user ? (
              <>
                <span className="welcome-user">Welcome, {user.username}!</span>
                <button onClick={handleLogout} className="btn btn-logout">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-login">Login</Link>
                <Link to="/register" className="btn btn-register">Register</Link>
              </>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Landing user={user} />} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register setUser={setUser} />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/search" element={<MapSearch />} />
          <Route path="/map-search" element={<MapSearch />} />
          <Route path="/contact" element={<div style={{padding: '3rem', textAlign: 'center'}}><h2>Contact Us Page - Coming Soon</h2></div>} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;