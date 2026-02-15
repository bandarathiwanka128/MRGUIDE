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

  const features = [
    {
      title: 'Find Shortest Path',
      description: 'Calculate the shortest route between multiple locations with sorting by rating, distance, or price.',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/>
          <path d="M6 8v2a4 4 0 004 4h4a4 4 0 004-4V8"/>
          <path d="M8 6h8"/><line x1="18" y1="8" x2="18" y2="16"/>
        </svg>
      ),
      path: '/shortest-path',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      accentColor: '#667eea'
    },
    {
      title: 'Trip Planner',
      description: 'Plan your perfect Sri Lanka trip with AI suggestions, weather forecasts, and smart itineraries.',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
        </svg>
      ),
      path: '/trip-planner',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      accentColor: '#f5576c'
    },
    {
      title: 'Authentic Section',
      description: 'Access verified local insights from authentic users and businesses. Add your own data to help travelers.',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      ),
      path: '/authentic',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      accentColor: '#4facfe'
    },
    {
      title: 'Map Search',
      description: 'Search and explore places on an interactive map with turn-by-turn navigation and multiple travel modes.',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
      ),
      path: '/search',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      accentColor: '#43e97b'
    },
    {
      title: 'Route Optimization',
      description: 'Optimize multi-stop routes using smart algorithms. Compare before and after with detailed segment analysis.',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
      path: '/optimize-route',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      accentColor: '#fa709a'
    }
  ];

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
              <span className="search-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
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
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card"
              onClick={() => navigate(feature.path)}
              style={{ '--card-gradient': feature.gradient, '--card-accent': feature.accentColor }}
            >
              <div className="feature-card-glow"></div>
              <div className="feature-icon-wrapper">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <div className="feature-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
