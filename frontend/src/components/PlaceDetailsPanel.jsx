import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './PlaceDetailsPanel.css';

const PlaceDetailsPanel = ({ place, onClose, onAddAuthenticData }) => {
  const [activeTab, setActiveTab] = useState('google');
  const [authenticUsers, setAuthenticUsers] = useState([]);
  const [authenticBusinesses, setAuthenticBusinesses] = useState([]);
  const [placeDetails, setPlaceDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (place) {
      fetchPlaceDetails();
      fetchAuthenticDetails();
    }
  }, [place]);

  const fetchPlaceDetails = () => {
    // Get detailed info from Google Maps if available
    if (place.photos || place.rating) {
      setPlaceDetails({
        name: place.name,
        address: place.address,
        rating: place.rating,
        photos: place.photos,
        types: place.types
      });
    }
  };

  const fetchAuthenticDetails = async () => {
    if (!place.id) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/places/google/${place.id}/authentic-details`
      );
      setAuthenticUsers(response.data.users || []);
      setAuthenticBusinesses(response.data.businesses || []);
    } catch (error) {
      console.error('Error fetching authentic details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleEmail = (email) => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  const handleWebsite = (website) => {
    if (website) {
      window.open(website.startsWith('http') ? website : `https://${website}`, '_blank');
    }
  };

  if (!place) return null;

  return (
    <div className="place-details-panel">
      <div className="panel-header">
        <div className="header-content">
          <h2>{place.name}</h2>
          <p className="place-address">{place.address}</p>
          {place.rating && (
            <div className="place-rating-header">
              ⭐ {place.rating.toFixed(1)} / 5.0
            </div>
          )}
        </div>
        <button className="close-panel-btn" onClick={onClose}>×</button>
      </div>

      <div className="panel-tabs">
        <button
          className={activeTab === 'google' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('google')}
        >
          Google Info
        </button>
        <button
          className={activeTab === 'users' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('users')}
        >
          Authentic Users ({authenticUsers.length})
        </button>
        <button
          className={activeTab === 'business' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('business')}
        >
          Businesses ({authenticBusinesses.length})
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'google' && (
          <div className="google-info-tab">
            <div className="info-section">
              <h3>About This Place</h3>
              <div className="info-item">
                <strong>Address:</strong>
                <p>{place.address}</p>
              </div>
              {place.types && (
                <div className="info-item">
                  <strong>Categories:</strong>
                  <div className="type-tags">
                    {place.types.slice(0, 5).map((type, i) => (
                      <span key={i} className="type-tag">
                        {type.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {place.rating && (
                <div className="info-item">
                  <strong>Rating:</strong>
                  <p>⭐ {place.rating.toFixed(1)} / 5.0</p>
                </div>
              )}
            </div>

            <div className="add-data-section">
              <h3>Contribute Your Knowledge</h3>
              <p>Have authentic information about this place? Share it with travelers!</p>
              <button
                className="add-authentic-btn"
                onClick={() => onAddAuthenticData(place, 'user')}
              >
                + Add as Authentic User
              </button>
              <button
                className="add-authentic-btn business"
                onClick={() => onAddAuthenticData(place, 'business')}
              >
                + Add as Business
              </button>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="authentic-users-tab">
            {loading ? (
              <div className="loading-state">Loading authentic user data...</div>
            ) : authenticUsers.length === 0 ? (
              <div className="empty-state">
                <p>No authentic user information available yet.</p>
                <p className="empty-state-subtitle">
                  Be the first to share your knowledge about this place!
                </p>
                <button
                  className="add-authentic-btn"
                  onClick={() => onAddAuthenticData(place, 'user')}
                >
                  + Add Authentic Data
                </button>
              </div>
            ) : (
              <div className="authentic-list">
                {authenticUsers.map((user, index) => (
                  <div key={index} className="authentic-card">
                    <div className="authentic-header">
                      <div className="user-info">
                        <h4>{user.User?.username || 'Anonymous'}</h4>
                        {user.title && <p className="user-title">{user.title}</p>}
                        {user.organization && (
                          <p className="user-org">{user.organization}</p>
                        )}
                        {user.job_title && (
                          <p className="user-job">{user.job_title}</p>
                        )}
                      </div>
                      {user.verified && (
                        <span className="verified-badge">✓ Verified</span>
                      )}
                    </div>

                    {user.expertise && (
                      <div className="expertise-section">
                        <strong>Expertise:</strong>
                        <p>{user.expertise}</p>
                      </div>
                    )}

                    {user.description && (
                      <div className="description-section">
                        <strong>About This Place:</strong>
                        <p>{user.description}</p>
                      </div>
                    )}

                    <div className="contact-actions">
                      {user.phone && (
                        <button
                          className="contact-btn call"
                          onClick={() => handleCall(user.phone)}
                        >
                          📞 Call
                        </button>
                      )}
                      {user.email && (
                        <button
                          className="contact-btn email"
                          onClick={() => handleEmail(user.email)}
                        >
                          ✉️ Email
                        </button>
                      )}
                      {user.website && (
                        <button
                          className="contact-btn website"
                          onClick={() => handleWebsite(user.website)}
                        >
                          🌐 Website
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'business' && (
          <div className="authentic-business-tab">
            {loading ? (
              <div className="loading-state">Loading business data...</div>
            ) : authenticBusinesses.length === 0 ? (
              <div className="empty-state">
                <p>No business information available yet.</p>
                <p className="empty-state-subtitle">
                  Are you a business at this location? Register now!
                </p>
                <button
                  className="add-authentic-btn business"
                  onClick={() => onAddAuthenticData(place, 'business')}
                >
                  + Register Business
                </button>
              </div>
            ) : (
              <div className="authentic-list">
                {authenticBusinesses.map((business, index) => (
                  <div key={index} className="authentic-card business-card">
                    <div className="authentic-header">
                      <div className="business-info">
                        <h4>{business.business_name || business.User?.username}</h4>
                        {business.organization && (
                          <p className="business-org">{business.organization}</p>
                        )}
                        {business.title && <p className="business-type">{business.title}</p>}
                      </div>
                      {business.verified && (
                        <span className="verified-badge business">✓ Verified Business</span>
                      )}
                    </div>

                    {business.description && (
                      <div className="description-section">
                        <p>{business.description}</p>
                      </div>
                    )}

                    {business.packages && business.packages.length > 0 && (
                      <div className="packages-section">
                        <strong>Packages & Services:</strong>
                        <div className="packages-list">
                          {business.packages.map((pkg, i) => (
                            <div key={i} className="package-item">
                              <div className="package-header">
                                <span className="package-name">{pkg.name}</span>
                                {pkg.price && (
                                  <span className="package-price">{pkg.price}</span>
                                )}
                              </div>
                              {pkg.description && (
                                <p className="package-desc">{pkg.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {business.photos && business.photos.length > 0 && (
                      <div className="photos-section">
                        <strong>Photos:</strong>
                        <div className="photos-grid">
                          {business.photos.map((photo, i) => (
                            <img
                              key={i}
                              src={photo}
                              alt={`Photo ${i + 1}`}
                              className="business-photo"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="contact-actions">
                      {business.phone && (
                        <button
                          className="contact-btn call"
                          onClick={() => handleCall(business.phone)}
                        >
                          📞 Call Now
                        </button>
                      )}
                      {business.email && (
                        <button
                          className="contact-btn email"
                          onClick={() => handleEmail(business.email)}
                        >
                          ✉️ Email
                        </button>
                      )}
                      {business.website && (
                        <button
                          className="contact-btn website"
                          onClick={() => handleWebsite(business.website)}
                        >
                          🌐 Visit Website
                        </button>
                      )}
                    </div>

                    <div className="added-by">
                      Added by {business.User?.username} on{' '}
                      {new Date(business.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaceDetailsPanel;
