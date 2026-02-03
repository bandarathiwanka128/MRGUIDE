import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const popularDestinations = [
    { name: 'Sigiriya', query: 'Sigiriya Rock Fortress' },
    { name: 'Temple of the Tooth', query: 'Temple of the Tooth Kandy' },
    { name: 'Galle Fort', query: 'Galle Fort' },
    { name: 'Yala National Park', query: 'Yala National Park' },
    { name: 'Ella', query: 'Ella Sri Lanka' },
    { name: 'Colombo Hotels', query: 'Colombo hotels' },
  ];

  const handleQuickSearch = (query) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Explore <span className="highlight">Sri Lanka</span>
          </h1>
          <p className="hero-subtitle">
            Discover amazing places, find the best routes, and plan your perfect journey
          </p>

          <form onSubmit={handleSearch} className="search-form">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for places, hotels, restaurants..."
                className="home-search-input"
                autoFocus
              />
              <button type="submit" className="home-search-btn">
                Search
              </button>
            </div>
          </form>

          <div className="popular-section">
            <p className="popular-label">Popular Destinations</p>
            <div className="popular-tags">
              {popularDestinations.map((dest, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSearch(dest.query)}
                  className="popular-tag"
                >
                  {dest.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="features-section">
          <div className="feature-card">
            <span className="feature-icon">🗺️</span>
            <h3>Interactive Maps</h3>
            <p>Explore with detailed dark-themed maps</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🚗</span>
            <h3>Route Planning</h3>
            <p>Get directions by car, bus, train, or walking</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">📍</span>
            <h3>Find Places</h3>
            <p>Search hotels, restaurants, and attractions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
