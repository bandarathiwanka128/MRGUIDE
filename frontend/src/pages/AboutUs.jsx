import React from 'react';
import './AboutUs.css';

const AboutUs = () => {
  return (
    <div className="about-us-page">
      <div className="about-header">
        <h1>About Mr. Guide</h1>
        <p>Your trusted companion in discovering amazing places</p>
      </div>


      <div className="about-content">
        <section className="mission-section">
          <h2>Our Mission</h2>
          <p>

            At Mr. Guide, we revolutionize travel planning by combining intelligent route
            optimization with authentic local knowledge. Our platform helps travelers discover
            hidden gems, plan efficient routes, and make informed decisions based on verified
            information from local experts and fellow travelers.
          </p>
        </section>

        <section className="team-section">
          <h2>Development Team</h2>
          <div className="university-info">
            <h3>Faculty of Engineering, University of Ruhuna</h3>
            <p className="department">Department of Computer Engineering</p>
          </div>

          <div className="team-grid">
            <div className="team-member">
              <div className="member-avatar">
                <span>HT</span>
              </div>
              <h3>Herath H.M.T.B</h3>
              <p className="role">Team Member</p>
              <p className="reg-number">EG/2022/5067</p>
              <p className="description">Backend Development & Database Design</p>
            </div>

            <div className="team-member">
              <div className="member-avatar">
                <span>JT</span>
              </div>
              <h3>Jayasekara T.H.D.P.U</h3>
              <p className="role">Team Member</p>
              <p className="reg-number">EG/2022/5098</p>
              <p className="description">Frontend Development & UI/UX Design</p>
            </div>

            <div className="team-member">
              <div className="member-avatar">
                <span>HA</span>
              </div>
              <h3>Hapuarachchi H.A.C.R</h3>
              <p className="role">Team Member</p>
              <p className="reg-number">EG/2022/5058</p>
              <p className="description">Google Maps Integration & API Development</p>
            </div>

            <div className="team-member">
              <div className="member-avatar">
                <span>HG</span>
              </div>
              <h3>Hettiarachchi H.A.K.G</h3>
              <p className="role">Team Member</p>
              <p className="reg-number">EG/2022/5073</p>
              <p className="description">Algorithm Development & Route Optimization</p>
            </div>
          </div>

          <div className="team-overview">
            <h3>Team Overview</h3>
            <p>
              We are a group of four undergraduate students from the Faculty of Engineering,
              University of Ruhuna, specializing in software engineering. Our expertise covers
              frontend and backend development, mobile and web application design, database
              architecture, and project management.
            </p>
          </div>
        </section>

        <section className="features-section">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🗺️</div>
              <h3>Smart Route Planning</h3>
              <p>Our TSP algorithm finds the shortest path to visit all your selected destinations</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📍</div>
              <h3>Location-Based Search</h3>
              <p>Find hotels, restaurants, and attractions near any location</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">✓</div>
              <h3>Authentic Details</h3>
              <p>Verified information from local experts and business owners</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3>Community Reviews</h3>
              <p>Honest reviews and ratings from real travelers</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3>Global Coverage</h3>
              <p>Support for multiple countries with localized phone numbers</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Custom Routes</h3>
              <p>Distinctive yellow route markers for easy visualization</p>
            </div>
          </div>
        </section>

        <section className="tech-section">
          <h2>Technology Stack</h2>
          <div className="tech-grid">
            <div className="tech-item">
              <h4>Frontend</h4>
              <ul>
                <li>React.js</li>
                <li>Google Maps JavaScript API</li>
                <li>React Router</li>
                <li>Axios</li>
              </ul>
            </div>

            <div className="tech-item">
              <h4>Backend</h4>
              <ul>
                <li>Node.js</li>
                <li>Express.js</li>
                <li>Sequelize ORM</li>
                <li>JWT Authentication</li>
              </ul>
            </div>

            <div className="tech-item">
              <h4>Database</h4>
              <ul>
                <li>PostgreSQL</li>
                <li>Relational Schema</li>
                <li>Data Validation</li>
              </ul>
            </div>

            <div className="tech-item">
              <h4>APIs</h4>
              <ul>
                <li>Google Maps API</li>
                <li>Google Places API</li>
                <li>Directions API</li>
                <li>Geocoding API</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="contact-section">
          <h2>Contact Us</h2>
          <p>
            Have questions or suggestions? We'd love to hear from you!
          </p>
          <div className="contact-info">
            <div className="contact-item">
              <strong>Email:</strong> mrguide@eng.ruh.ac.lk
            </div>
            <div className="contact-item">
              <strong>Location:</strong> Faculty of Engineering, University of Ruhuna, Hapugala, Galle, Sri Lanka
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
