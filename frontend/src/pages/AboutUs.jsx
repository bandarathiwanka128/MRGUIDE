import React from 'react';

import './AboutUs.css';

const keyFeatures = [
  {
    icon: '🗺️',
    title: 'Smart Route Planning',
    desc: 'Navigate Sri Lanka like a pro. Our TSP algorithm calculates the most efficient path through all your chosen destinations — saving time, fuel, and effort on every journey.',
    accent: 'blue'
  },
  {
    icon: '📍',
    title: 'Location Search',
    desc: 'Discover the perfect hotel, hidden restaurant, or iconic attraction near you. Search by type, rating, and distance with Google Maps-powered results in real time.',
    accent: 'yellow'
  },
  {
    icon: '✅',
    title: 'Authentic Local Insights',
    desc: 'Go beyond the guidebook. Get verified tips and detailed information directly from local experts, business owners, and experienced Sri Lanka travelers you can trust.',
    accent: 'blue'
  },
  {
    icon: '⭐',
    title: 'Community Reviews',
    desc: 'Real places, real opinions. Browse honest star ratings, personal stories, and practical tips from fellow travelers who have actually been to each destination.',
    accent: 'yellow'
  },
  {
    icon: '🌍',
    title: 'Multi-Country Support',
    desc: 'Plan your Sri Lanka adventure from anywhere in the world. The platform supports international phone numbers, localized formats, and country-specific information.',
    accent: 'blue'
  },
  {
    icon: '🎯',
    title: 'Route Optimization',
    desc: 'Turn a scattered itinerary into a masterpiece. Compare your original route against the smart-optimized version with detailed segment-by-segment time and distance analysis.',
    accent: 'yellow'
  },
];

const team = [
  { initials: 'HT', name: 'Herath H.M.T.B', reg: 'EG/2022/5067', role: 'Backend & Database Design' },
  { initials: 'JT', name: 'Jayasekara T.H.D.P.U', reg: 'EG/2022/5098', role: 'Frontend & UI/UX Design' },
  { initials: 'HA', name: 'Hapuarachchi H.A.C.R', reg: 'EG/2022/5058', role: 'Google Maps & API Development' },
  { initials: 'HG', name: 'Hettiarachchi H.A.K.G', reg: 'EG/2022/5073', role: 'Algorithms & Route Optimization' },
];

const AboutUs = () => {
  return (
    <div className="about-page">

      {/* ── HEADER ── */}
      <div className="about-header">
        <div className="about-header-inner">
          <span className="about-badge">Est. 2024</span>
          <h1>
            About&nbsp;
            <span className="hdr-yellow">Mr.</span>
            <span className="hdr-blue">Guide</span>
          </h1>
          <p>Your intelligent travel companion for discovering Sri Lanka's best experiences</p>
        </div>
        <div className="header-wave">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 70L60 58C120 46 240 22 360 22C480 22 600 46 720 52C840 58 960 46 1080 36C1200 26 1320 18 1380 14L1440 10V0H0Z" fill="var(--bg)" />
          </svg>
        </div>
      </div>

      <div className="about-body">

        {/* ── MISSION ── */}
        <section className="mission-section">
          <div className="mission-card">
            <div className="mission-left">
              <div className="mission-emblem">🧭</div>
              <div className="mission-divider" />
              <div className="mission-stats">
                <div className="stat-item">
                  <span className="stat-number">6+</span>
                  <span className="stat-label">Features</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">100+</span>
                  <span className="stat-label">Places</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">4</span>
                  <span className="stat-label">Engineers</span>
                </div>
              </div>
            </div>

            <div className="mission-right">
              <span className="eyebrow">Our Purpose</span>
              <h2>Our Mission</h2>
              <p>
                At Mr. Guide, we revolutionize travel planning by combining intelligent route
                optimization with authentic local knowledge. Our platform helps travelers discover
                hidden gems, plan efficient routes, and make informed decisions based on verified
                information from local experts and fellow travelers.
              </p>
              <p>
                We are a team of four undergraduate engineers from the University of Ruhuna,
                passionate about making Sri Lanka's beautiful destinations more accessible
                to travelers from around the world.
              </p>
            </div>
          </div>
        </section>

        {/* ── KEY FEATURES (horizontal 3×2 grid) ── */}
        <section className="features-section">
          <div className="section-header">
            <span className="eyebrow">What We Offer</span>
            <h2 className="section-title">Key Features</h2>
          </div>
          <div className="features-grid">
            {keyFeatures.map((f, i) => (
              <div className={`feature-card fc-${f.accent}`} key={i}>
                <div className="feature-card-top">
                  <div className="feature-icon-box">
                    <span className="feature-emoji">{f.icon}</span>
                  </div>
                  <div className="feature-text">
                    <h3>{f.title}</h3>
                  </div>
                </div>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TEAM ── */}
        <section className="team-section">
          <div className="section-header">
            <span className="eyebrow">The People</span>
            <h2 className="section-title">Development Team</h2>
            <div className="university-tag">
              🎓 Faculty of Engineering, University of Ruhuna — Computer Engineering
            </div>
          </div>
          <div className="team-grid">
            {team.map((m, i) => (
              <div className="team-card" key={i}>
                <div className="team-avatar">{m.initials}</div>
                <h3 className="team-name">{m.name}</h3>
                <p className="team-role">{m.role}</p>
                <span className="team-reg">{m.reg}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── CONTACT ── */}
        <section className="contact-section">
          <div className="contact-card">
            <div className="contact-icon">✉️</div>
            <h2>Get In Touch</h2>
            <p>Have questions or suggestions? We'd love to hear from you!</p>
            <div className="contact-items">
              <a href="mailto:mrguide@eng.ruh.ac.lk" className="contact-item">
                <span className="contact-item-icon">📧</span>
                <span>mrguide@eng.ruh.ac.lk</span>
              </a>
              <div className="contact-item">
                <span className="contact-item-icon">📍</span>
                <span>Faculty of Engineering, University of Ruhuna, Hapugala, Galle, Sri Lanka</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default AboutUs;
