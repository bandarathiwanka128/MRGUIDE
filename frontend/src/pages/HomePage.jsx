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

const statsItems = [
  { icon: '🌴', number: '200+', label: 'Destinations' },
  { icon: '🗺️', number: 'Smart', label: 'Route Planning' },
  { icon: '🤖', number: 'AI', label: 'Travel Guide' },
  { icon: '🏆', number: '100%', label: 'Free Access' },
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
      gradient: 'linear-gradient(135deg, #34699A 0%, #1e4a75 100%)',
      accentColor: '#34699A'
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
      gradient: 'linear-gradient(135deg, #FFCC00 0%, #e6a800 100%)',
      accentColor: '#FFCC00'
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
      gradient: 'linear-gradient(135deg, #4a89c0 0%, #34699A 100%)',
      accentColor: '#4a89c0'
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
      gradient: 'linear-gradient(135deg, #34699A 0%, #0D1B2A 100%)',
      accentColor: '#34699A'
    },
    {
      title: 'Find a Guide',
      description: 'Book a verified local travel guide with transparent distance-based pricing. Live tracking, QR payment, real reviews.',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          <path d="M18 14l2 2 4-4" strokeWidth="2"/>
        </svg>
      ),
      path: '/guides',
      gradient: 'linear-gradient(135deg, #FFCC00 0%, #34699A 100%)',
      accentColor: '#FFCC00'
    },
    {
      title: 'Download App',
      description: 'Take Mr. Guide wherever you go. Available soon on Android and iOS devices.',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
          <line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
      ),
      path: null,
      gradient: 'linear-gradient(135deg, #1a2d42 0%, #34699A 100%)',
      accentColor: '#FFCC00',
      isDownload: true
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

        {/* Seamless bottom blend into page content */}
        <div className="hero-bottom-fade" />

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

      {/* ===== Stats Bar ===== */}
      <div className="stats-bar">
        {statsItems.map((s, i) => (
          <div className="stat-pill" key={i}>
            <span className="stat-pill-icon">{s.icon}</span>
            <div className="stat-pill-text">
              <span className="stat-pill-num">{s.number}</span>
              <span className="stat-pill-label">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ===== AI Interactive Section ===== */}
      <div className="ai-section">
        <div className="ai-section-inner">

          {/* Bot Avatar + Greeting */}
          <div className="bot-wrapper">
            <div className="bot-top-row">
              <div className="bot-avatar-container">
                <span className="bot-ring"></span>
                <span className="bot-ring ring-2"></span>
                <div className="bot-avatar-inner">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                  </svg>
                </div>
              </div>
              <div className="bot-meta">
                <span className="bot-name">Lanka Guide <span className="bot-ai-badge">AI</span></span>
                <span className="bot-online"><span className="online-dot"></span>Online · Ready to help</span>
              </div>
            </div>
            <div className="bot-bubble">
              <p>Hello traveller! 🌴 I'm your personal Sri Lanka travel guide. Ask me about must-see temples, pristine beaches, wildlife safaris, best seasons to visit, hidden gems, or local cuisine. I'm here to make your journey unforgettable!</p>
            </div>
          </div>

          <div className="ai-header">
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
                  <div key={i} className={`ai-result-card${place.source === 'database' ? ' ai-result-card--local' : ''}`}>
                    <div className="ai-result-card-top">
                      <div className="ai-result-category">
                        <span className="ai-result-emoji">
                          {categoryIcons[place.category] || '\u{1F4CD}'}
                        </span>
                        <span className="ai-result-cat-text">{place.category}</span>
                      </div>
                      {place.source === 'database' && (
                        <span className="ai-local-badge">
                          {place.db_type === 'business' ? '🏢 Local Business' : '👤 Local Expert'}
                        </span>
                      )}
                    </div>
                    <h3 className="ai-result-name">{place.name}</h3>
                    {place.db_type === 'business' && place.added_by && (
                      <p className="ai-result-owner">by {place.added_by}</p>
                    )}
                    {place.db_type === 'user' && place.expert_name && (
                      <p className="ai-result-owner">
                        {place.expert_title ? `${place.expert_title} · ` : ''}{place.expert_name}
                      </p>
                    )}
                    <p className="ai-result-reason">{place.reason}</p>
                    <div className="ai-result-meta">
                      <span className="ai-result-months">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        Best: {place.best_months}
                      </span>
                      {place.contact && (
                        <span className="ai-result-contact">
                          📞 {place.contact}
                        </span>
                      )}
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

      {/* ===== Features Section ===== */}
      <section className="features-section-outer">
        <div className="features-section-header">
          <span className="features-eyebrow">WHAT WE OFFER</span>
          <h2 className="features-title">Key Features</h2>
          <p className="features-subtitle">
            Smart tools for every step of your journey — from first search to final destination
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`feature-card${feature.isDownload ? ' download-card' : ''}`}
              onClick={feature.isDownload ? undefined : () => navigate(feature.path)}
              style={{
                '--card-gradient': feature.gradient,
                '--card-accent': feature.accentColor,
                '--delay': `${index * 0.1}s`
              }}
            >
              <div className="feature-icon-wrapper">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>

              {feature.isDownload ? (
                <div className="store-buttons">
                  <a
                    className="store-btn"
                    href="#"
                    onClick={e => { e.stopPropagation(); e.preventDefault(); }}
                    title="Coming Soon on Google Play"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.18 23.76c.37.2.8.22 1.2.05l11.84-6.6-2.9-2.9-10.14 9.45zM20.44 9.23L5.08.87C4.68.63 4.23.6 3.82.79L13.87 11.5 20.44 9.23zM.44 1.85C.16 2.17 0 2.61 0 3.13v17.74c0 .52.16.96.44 1.28l.07.07 9.94-9.94v-.23L.44 1.85zM22.56 11.05l-2.9-1.66-3.02 3.02 3.02 3.02 2.91-1.66c.83-.48.83-1.24-.01-1.72z"/>
                    </svg>
                    <span className="store-label">
                      <small>GET IT ON</small>
                      <strong>Google Play</strong>
                    </span>
                  </a>
                  <a
                    className="store-btn"
                    href="#"
                    onClick={e => { e.stopPropagation(); e.preventDefault(); }}
                    title="Coming Soon on App Store"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <span className="store-label">
                      <small>DOWNLOAD ON THE</small>
                      <strong>App Store</strong>
                    </span>
                  </a>
                  <span className="coming-soon-badge">Coming Soon</span>
                </div>
              ) : (
                <div className="feature-arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

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
