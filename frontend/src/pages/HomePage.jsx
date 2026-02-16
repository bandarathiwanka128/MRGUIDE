import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './HomePage.css';

// Hero slider images - Sri Lanka tourism
const heroSlides = [
  {
    img: 'https://media.licdn.com/dms/image/v2/D5612AQGmIELLsSrSBQ/article-cover_image-shrink_720_1280/B56ZVbc.NmGoAM-/0/1740996077593?e=2147483647&v=beta&t=T3xZ-MIsw6a2u-jNLSAii7U4GLB_czKhpngK5Bn22Ao',
    caption: 'Discover Paradise',
    sub: 'Sri Lanka Tourism',
  },
  {
    img: 'https://media.licdn.com/dms/image/v2/D5612AQFnlw0w7ClGUg/article-cover_image-shrink_600_2000/article-cover_image-shrink_600_2000/0/1693919938172?e=2147483647&v=beta&t=_M7EdBsaazE7qM4mfQigB9spmg82meWdixclCsbDoSk',
    caption: 'Journey Through',
    sub: 'Ancient Heritage',
  },
  {
    img: 'https://res.cloudinary.com/jerrick/image/upload/d_642250b563292b35f27461a7.png,f_jpg,q_auto,w_720/637f71bba2f78a001d04492b.jpg',
    caption: 'Explore Nature',
    sub: 'Pristine Landscapes',
  },
  {
    img: 'https://img2.chinadaily.com.cn/images/202408/23/66c7e422a3106063b59472a8.jpeg',
    caption: 'Experience Culture',
    sub: 'Vibrant Traditions',
  },
];

const examplePrompts = [
  'Best beaches to visit in August',
  'Cultural temples near Kandy',
  'Adventure activities in Ella',
  'Where to see wildlife in Sri Lanka',
  'Best places for photography',
];

const categoryIcons = {
  beach: '\u{1F3D6}',
  temple: '\u{1F6D5}',
  nature: '\u{1F33F}',
  city: '\u{1F3D9}',
  adventure: '\u{26F0}',
  culture: '\u{1F3AD}',
  wildlife: '\u{1F406}',
};

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const [aiError, setAiError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const aiInputRef = useRef(null);
  const navigate = useNavigate();

  // Hero slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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

  // AI suggestion handler
  const handleAiSubmit = async (e) => {
    e.preventDefault();
    const q = aiQuery.trim();
    if (!q || q.length < 5) return;

    setAiLoading(true);
    setAiResults([]);
    setAiError('');

    try {
      const res = await axios.post(`${API_BASE_URL}/ai/travel-suggest`, { question: q });
      setAiResults(res.data.suggestions || []);
    } catch (err) {
      setAiError('Could not get suggestions right now. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleExampleClick = (prompt) => {
    setAiQuery(prompt);
    setAiResults([]);
    setAiError('');
    if (aiInputRef.current) aiInputRef.current.focus();
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
      {/* ===== HERO with Image Slider ===== */}
      <div className="hero-section">
        {/* Image slides */}
        <div className="hero-slider">
          {heroSlides.map((slide, i) => (
            <div
              key={i}
              className={`hero-slide ${i === currentSlide ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide.img})` }}
            />
          ))}
          <div className="hero-overlay" />
        </div>

        <div className="hero-content">
          {/* Rotating caption */}
          <div className="hero-caption-area">
            {heroSlides.map((slide, i) => (
              <div key={i} className={`caption-item ${i === currentSlide ? 'active' : ''}`}>
                <span className="caption-badge">{slide.caption}</span>
                <span className="caption-sub">{slide.sub}</span>
              </div>
            ))}
          </div>

          <h1 className="hero-title">
            Explore <span className="highlight">Sri Lanka</span>
          </h1>
          <p className="hero-subtitle">
            Discover ancient ruins, pristine beaches, lush mountains &amp; vibrant culture
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

        {/* Slide indicators */}
        <div className="hero-dots">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              className={`dot ${i === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(i)}
            />
          ))}
        </div>
      </div>

      {/* ===== AI Interactive Section ===== */}
      <div className="ai-section">
        <div className="ai-section-inner">
          <div className="ai-header">
            <div className="ai-icon-sparkle">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L9 12l-7 3 7 3 3 10 3-10 7-3-7-3z"/>
              </svg>
            </div>
            <h2 className="ai-title">What are you looking for?</h2>
            <p className="ai-subtitle">Ask anything about traveling in Sri Lanka</p>
          </div>

          <form onSubmit={handleAiSubmit} className="ai-form">
            <div className="ai-input-wrapper">
              <input
                ref={aiInputRef}
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="e.g. Best places to visit in August with good weather..."
                className="ai-input"
                disabled={aiLoading}
              />
              <button
                type="submit"
                className="ai-submit-btn"
                disabled={aiLoading || aiQuery.trim().length < 5}
              >
                {aiLoading ? (
                  <span className="ai-spinner" />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
              </button>
            </div>
          </form>

          {/* Example prompts */}
          {aiResults.length === 0 && !aiLoading && !aiError && (
            <div className="ai-examples">
              <p className="ai-examples-label">Try asking:</p>
              <div className="ai-example-chips">
                {examplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    className="ai-example-chip"
                    onClick={() => handleExampleClick(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {aiLoading && (
            <div className="ai-loading">
              <div className="ai-loading-dots">
                <span /><span /><span />
              </div>
              <p>Finding the best places for you...</p>
            </div>
          )}

          {/* Error state */}
          {aiError && (
            <div className="ai-error">
              <p>{aiError}</p>
            </div>
          )}

          {/* AI Results */}
          {aiResults.length > 0 && (
            <div className="ai-results">
              <p className="ai-results-label">Recommended for you</p>
              <div className="ai-results-grid">
                {aiResults.map((place, i) => (
                  <div key={i} className="ai-result-card">
                    <div className="ai-result-category">
                      <span className="ai-result-emoji">
                        {categoryIcons[place.category] || '\u{1F4CD}'}
                      </span>
                      <span className="ai-result-cat-text">{place.category}</span>
                    </div>
                    <h3 className="ai-result-name">{place.name}</h3>
                    <p className="ai-result-reason">{place.reason}</p>
                    <div className="ai-result-meta">
                      <span className="ai-result-months">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        Best: {place.best_months}
                      </span>
                    </div>
                    <button
                      className="ai-result-btn"
                      onClick={() => navigate(`/search?q=${encodeURIComponent(place.search_query)}`)}
                    >
                      View on Map
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Feature Cards ===== */}
      <div className="features-wrapper">
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

      {/* ===== Footer ===== */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <h3 className="footer-logo">Mr. Guide</h3>
            <p className="footer-tagline">Your trusted travel companion for Sri Lanka</p>
          </div>
          <div className="footer-links">
            <a href="/" className="footer-link">Home</a>
            <a href="/about" className="footer-link">About Us</a>
            <a href="/authentic" className="footer-link">Authentic Section</a>
            <a href="/trip-planner" className="footer-link">Trip Planner</a>
          </div>
          <div className="footer-bottom">
            <p>Made with care for Sri Lanka tourism</p>
            <p className="footer-copy">&copy; {new Date().getFullYear()} Mr. Guide. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
