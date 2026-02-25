import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './PlaceDetailsPanel.css';

const StarRating = ({ rating, max = 5, interactive = false, onSelect }) => {
  const [hovered, setHovered] = React.useState(0);
  const displayRating = interactive ? (hovered || rating) : rating;
  return (
    <div
      className="star-rating"
      onMouseLeave={() => interactive && setHovered(0)}
    >
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`star ${i < Math.round(displayRating) ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
          onMouseEnter={() => interactive && setHovered(i + 1)}
          onClick={() => interactive && onSelect && onSelect(i + 1)}
          title={interactive ? `${i + 1} star${i + 1 > 1 ? 's' : ''}` : undefined}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const PlaceDetailsPanel = ({ place, onClose, onAddAuthenticData, user }) => {
  const [activeTab, setActiveTab] = useState('google');
  const [authenticUsers, setAuthenticUsers] = useState([]);
  const [authenticBusinesses, setAuthenticBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ avgRating: 0, totalCount: 0 });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  const googlePlaceId = place?.placeId || place?.id;
  const placeLat = place?.position?.lat ?? place?.lat;
  const placeLng = place?.position?.lng ?? place?.lng;

  useEffect(() => {
    if (place) {
      fetchAuthenticDetails();
      fetchReviews();
    }
  }, [place]);

  const fetchAuthenticDetails = async () => {
    setLoading(true);
    try {
      let users = [];
      let businesses = [];

      if (googlePlaceId) {
        const response = await axios.get(
          `${API_BASE_URL}/places/google/${googlePlaceId}/authentic-details`
        );
        users = response.data.users || [];
        businesses = response.data.businesses || [];
      }

      if (users.length === 0 && businesses.length === 0) {
        const params = new URLSearchParams();
        if (place.name) params.append('name', place.name);
        if (placeLat) params.append('lat', placeLat);
        if (placeLng) params.append('lng', placeLng);

        const fallback = await axios.get(
          `${API_BASE_URL}/places/search-authentic?${params.toString()}`
        );
        users = fallback.data.users || [];
        businesses = fallback.data.businesses || [];
      }

      setAuthenticUsers(users);
      setAuthenticBusinesses(businesses);
    } catch (error) {
      console.error('Error fetching authentic details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!googlePlaceId) return;
    setReviewLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/places/google/${googlePlaceId}/reviews`);
      setReviews(res.data.reviews || []);
      setReviewStats({
        avgRating: res.data.avgRating || 0,
        totalCount: res.data.totalCount || 0
      });
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  const submitReview = async () => {
    if (!user) {
      setReviewMsg('Please log in to submit a review.');
      return;
    }
    if (myRating === 0) {
      setReviewMsg('Please select a star rating.');
      return;
    }

    setSubmitting(true);
    setReviewMsg('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/places/google/${googlePlaceId}/reviews`,
        {
          rating: myRating,
          comment: myComment,
          place_name: place.name,
          place_address: place.address,
          place_lat: placeLat,
          place_lng: placeLng,
          place_category: place.type || place.types?.[0] || 'place'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReviewMsg('Review submitted! Thank you.');
      setMyRating(0);
      setMyComment('');
      fetchReviews();
    } catch (err) {
      setReviewMsg(err.response?.data?.error || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCall = (phone) => phone && (window.location.href = `tel:${phone}`);
  const handleEmail = (email) => email && (window.location.href = `mailto:${email}`);
  const handleWebsite = (website) => {
    if (website) window.open(website.startsWith('http') ? website : `https://${website}`, '_blank');
  };

  if (!place) return null;

  return (
    <div className="place-details-panel">
      <div className="panel-header">
        <div className="header-content">
          <h2>{place.name}</h2>
          <p className="place-address">{place.address}</p>
          {(reviewStats.totalCount > 0 || place.rating) && (
            <div className="place-rating-header">
              {reviewStats.totalCount > 0 ? (
                <>⭐ {reviewStats.avgRating} / 5.0 <span className="rating-count">({reviewStats.totalCount} reviews)</span></>
              ) : (
                <>⭐ {place.rating?.toFixed(1)} / 5.0 <span className="rating-count">(Google)</span></>
              )}
            </div>
          )}
        </div>
        <button className="close-panel-btn" onClick={onClose}>×</button>
      </div>

      <div className="panel-tabs">
        <button
          className={`tab-btn ${activeTab === 'google' ? 'active' : ''}`}
          onClick={() => setActiveTab('google')}
        >
          Info
        </button>
        <button
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews {reviewStats.totalCount > 0 ? `(${reviewStats.totalCount})` : ''}
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users ({authenticUsers.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'business' ? 'active' : ''}`}
          onClick={() => setActiveTab('business')}
        >
          Biz ({authenticBusinesses.length})
        </button>
      </div>

      <div className="panel-content">
        {/* ── Google Info Tab ── */}
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
                      <span key={i} className="type-tag">{type.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              )}
              {place.rating && (
                <div className="info-item">
                  <strong>Google Rating:</strong>
                  <p>⭐ {place.rating.toFixed(1)} / 5.0</p>
                </div>
              )}
            </div>

            <div className="add-data-section">
              <h3>Contribute Your Knowledge</h3>
              <p>Have authentic information about this place? Share it with travelers!</p>
              <button className="add-authentic-btn" onClick={() => onAddAuthenticData(place, 'user')}>
                + Add as Authentic User
              </button>
              <button className="add-authentic-btn business" onClick={() => onAddAuthenticData(place, 'business')}>
                + Add as Business
              </button>
            </div>
          </div>
        )}

        {/* ── Reviews Tab ── */}
        {activeTab === 'reviews' && (
          <div className="reviews-tab">
            {/* Submit review form */}
            <div className="review-form-card">
              <h3>Rate This Place</h3>
              {user ? (
                <>
                  <div className="review-stars-row">
                    <span className="review-stars-label">Your Rating:</span>
                    <StarRating rating={myRating} interactive onSelect={setMyRating} />
                    {myRating > 0 && (
                      <span className="rating-selected">
                        {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][myRating]}
                      </span>
                    )}
                  </div>
                  <textarea
                    className="review-comment-input"
                    placeholder="Share your experience about this place... (optional)"
                    value={myComment}
                    onChange={(e) => setMyComment(e.target.value)}
                    rows={3}
                  />
                  {reviewMsg && (
                    <p className={`review-msg ${reviewMsg.includes('Thank') ? 'success' : 'error'}`}>
                      {reviewMsg}
                    </p>
                  )}
                  <button
                    className="review-submit-btn"
                    onClick={submitReview}
                    disabled={submitting || myRating === 0}
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </>
              ) : (
                <p className="review-login-prompt">
                  <span>🔒</span> Please log in to rate and review this place.
                </p>
              )}
            </div>

            {/* Reviews list */}
            <div className="reviews-list-section">
              <h3>
                Community Reviews
                {reviewStats.totalCount > 0 && (
                  <span className="reviews-avg-badge">⭐ {reviewStats.avgRating}</span>
                )}
              </h3>

              {reviewLoading ? (
                <div className="loading-state">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="empty-state">
                  <p>No reviews yet. Be the first to rate this place!</p>
                </div>
              ) : (
                <div className="reviews-list">
                  {reviews.map((r, i) => (
                    <div key={r.id || i} className="review-card">
                      <div className="review-card-header">
                        <div className="review-user-info">
                          <span className="review-username">{r.User?.username || 'Anonymous'}</span>
                          <span className="review-date">
                            {new Date(r.created_at).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </span>
                        </div>
                        <StarRating rating={r.rating} />
                      </div>
                      {r.comment && <p className="review-comment">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Authentic Users Tab ── */}
        {activeTab === 'users' && (
          <div className="authentic-users-tab">
            {loading ? (
              <div className="loading-state">Loading authentic user data...</div>
            ) : authenticUsers.length === 0 ? (
              <div className="empty-state">
                <p>No authentic user information available yet.</p>
                <p className="empty-state-subtitle">Be the first to share your knowledge!</p>
                <button className="add-authentic-btn" onClick={() => onAddAuthenticData(place, 'user')}>
                  + Add Authentic Data
                </button>
              </div>
            ) : (
              <div className="authentic-list">
                {authenticUsers.map((au, index) => {
                  const profile = au.User?.AuthenticProfile;
                  const displayTitle = au.title || profile?.title;
                  const displayJobTitle = au.job_title || profile?.job_title;
                  const displayPhone = au.phone || au.User?.mobile_number;
                  const displayEmail = au.email || au.User?.email;
                  return (
                  <div key={index} className="authentic-card">
                    <div className="authentic-header">
                      <div className="user-info">
                        <h4>{au.User?.username || 'Anonymous'}</h4>
                        {displayTitle && <p className="user-title">{displayTitle}</p>}
                        {au.organization && <p className="user-org">{au.organization}</p>}
                        {displayJobTitle && <p className="user-job">{displayJobTitle}</p>}
                      </div>
                      {au.verified && <span className="verified-badge">✓ Verified</span>}
                    </div>
                    {au.expertise && (
                      <div className="expertise-section">
                        <strong>Expertise:</strong>
                        <p>{au.expertise}</p>
                      </div>
                    )}
                    {au.description && (
                      <div className="description-section">
                        <strong>About This Place:</strong>
                        <p>{au.description}</p>
                      </div>
                    )}
                    <div className="contact-actions">
                      {displayPhone && (
                        <button className="contact-btn call" onClick={() => handleCall(displayPhone)}>📞 Call</button>
                      )}
                      {displayEmail && (
                        <button className="contact-btn email" onClick={() => handleEmail(displayEmail)}>✉️ Email</button>
                      )}
                      {au.website && (
                        <button className="contact-btn website" onClick={() => handleWebsite(au.website)}>🌐 Website</button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Business Tab ── */}
        {activeTab === 'business' && (
          <div className="authentic-business-tab">
            {loading ? (
              <div className="loading-state">Loading business data...</div>
            ) : authenticBusinesses.length === 0 ? (
              <div className="empty-state">
                <p>No business information available yet.</p>
                <p className="empty-state-subtitle">Are you a business at this location?</p>
                <button className="add-authentic-btn business" onClick={() => onAddAuthenticData(place, 'business')}>
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
                        {business.organization && <p className="business-org">{business.organization}</p>}
                        {business.title && <p className="business-type">{business.title}</p>}
                      </div>
                      {business.verified && <span className="verified-badge business">✓ Verified</span>}
                    </div>
                    {business.description && (
                      <div className="description-section"><p>{business.description}</p></div>
                    )}
                    {business.packages && business.packages.length > 0 && (
                      <div className="packages-section">
                        <strong>Packages & Services:</strong>
                        <div className="packages-list">
                          {business.packages.map((pkg, i) => (
                            <div key={i} className="package-item">
                              <div className="package-header">
                                <span className="package-name">{pkg.name}</span>
                                {pkg.price && <span className="package-price">{pkg.price}</span>}
                              </div>
                              {pkg.description && <p className="package-desc">{pkg.description}</p>}
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
                            <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                              <img src={photo} alt={`Photo ${i + 1}`} className="business-photo"
                                onError={e => { e.target.style.display = 'none'; }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="contact-actions">
                      {business.phone && (
                        <button className="contact-btn call" onClick={() => handleCall(business.phone)}>📞 Call Now</button>
                      )}
                      {business.email && (
                        <button className="contact-btn email" onClick={() => handleEmail(business.email)}>✉️ Email</button>
                      )}
                      {business.website && (
                        <button className="contact-btn website" onClick={() => handleWebsite(business.website)}>🌐 Website</button>
                      )}
                      {business.maps_link && (
                        <button className="contact-btn maps"
                          onClick={() => window.open(business.maps_link, '_blank', 'noopener,noreferrer')}>
                          🗺️ View on Map
                        </button>
                      )}
                    </div>
                    <div className="added-by">
                      Added by {business.User?.username} on {new Date(business.created_at).toLocaleDateString()}
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
