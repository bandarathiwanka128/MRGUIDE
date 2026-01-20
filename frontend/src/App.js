import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Page imports
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AboutUs from './pages/AboutUs';
import MapSearch from './pages/MapSearch';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get('http://localhost:3001/api/auth/me', {
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
    <BrowserRouter>
      <div className="App">
        <nav className="navbar">
          <Link to="/" className="logo">Mr. Guide</Link>
          
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/about">About Us</Link>
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
          <Route path="/login" element={
            user ? <Navigate to="/" /> : <Login setUser={setUser} />
          } />
          <Route path="/register" element={
            user ? <Navigate to="/" /> : <Register setUser={setUser} />
          } />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/search" element={
            user ? <MapSearch /> : <Navigate to="/login" />
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
