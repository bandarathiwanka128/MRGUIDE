import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import BookingConfirmModal from '../components/BookingConfirmModal';
import './GuideProfile.css';

const TABS = ['Profile', 'Pricing', 'Gallery', 'Reviews'];

export default function GuideProfile({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Profile');
  const [showBooking, setShowBooking] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [testKm, setTestKm] = useState(10);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/guides/${id}`)
      .then(r => setGuide(r.data))
      .catch(() => navigate('/guides'))
      .finally(() => setLoading(false));
  }, [id]);

  const calcFare = (km) => {
    if (!guide) return 0;
    const d = parseFloat(km);
    const t1 = parseFloat(guide.tier_1km), t5 = parseFloat(guide.tier_5km);
    const t10 = parseFloat(guide.tier_10km), t20 = parseFloat(guide.tier_20km);
    const tE = parseFloat(guide.tier_per_km_over20);
    if (d <= 1) return t1; if (d <= 5) return t5;
    if (d <= 10) return t10; if (d <= 20) return t20;
    return t20 + (d - 20) * tE;
  };

  const submitReview = async () => {
    if (!user || reviewForm.rating === 0) return;
    setReviewLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Post review directly to guide (non-trip review)
      await axios.post(`${API_BASE_URL}/guides/${id}/review`, reviewForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviewForm({ rating: 0, comment: '' });
      const r = await axios.get(`${API_BASE_URL}/guides/${id}`);
      setGuide(r.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Review failed');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) return <div className="gp-loading"><div className="gp-spinner" /></div>;
  if (!guide) return null;

  const pricingTiers = [
    { label: 'Up to 1 km', value: guide.tier_1km, note: 'Flat rate' },
    { label: 'Up to 5 km', value: guide.tier_5km, note: 'Flat rate' },
    { label: 'Up to 10 km', value: guide.tier_10km, note: 'Flat rate' },
    { label: 'Up to 20 km', value: guide.tier_20km, note: 'Flat rate' },
    { label: 'Over 20 km', value: guide.tier_per_km_over20, note: 'Per extra km beyond 20km' },
  ];

  return (
    <div className="guide-profile-page">
      {/* Hero */}
      <div className="gp-hero" style={{ background: 'linear-gradient(135deg, #34699A 0%, #0D1B2A 100%)' }}>
        <div className="gp-hero-inner">
          <div className="gp-avatar-large">
            {guide.photo_url ? (
              <img src={guide.photo_url} alt={guide.display_name} />
            ) : (
              <div className="gp-avatar-placeholder">👤</div>
            )}
            {guide.is_available && <span className="gp-live-badge">● Live</span>}
          </div>
          <div className="gp-hero-info">
            <h1 className="gp-name">{guide.display_name}</h1>
            <div className="gp-rating">
              <span className="gp-stars">{'★'.repeat(Math.round(parseFloat(guide.avg_rating || 0)))}</span>
              <span className="gp-rating-val">{parseFloat(guide.avg_rating || 0).toFixed(1)}</span>
              <span className="gp-rating-count">({guide.total_reviews || 0} reviews)</span>
            </div>
            <div className="gp-langs">
              {(guide.languages || []).map(l => <span key={l} className="gp-lang">{l}</span>)}
            </div>
            <div className="gp-regions">
              {(guide.speciality_regions || []).map(r => <span key={r} className="gp-region">{r}</span>)}
            </div>
            <div className="gp-hero-pricing">
              <span>From LKR {parseFloat(guide.tier_1km).toLocaleString()} / 1km</span>
              <span>·</span>
              <span>LKR {parseFloat(guide.tier_5km).toLocaleString()} / 5km</span>
            </div>
          </div>
          <button className="gp-book-btn" onClick={() => setShowBooking(true)}>
            Book This Guide
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="gp-tabs-bar">
        {TABS.map(t => (
          <button key={t} className={`gp-tab ${tab === t ? 'gp-tab--active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="gp-content">
        {/* Profile tab */}
        {tab === 'Profile' && (
          <div className="gp-tab-panel">
            {guide.bio && (
              <div className="gp-section">
                <h3>About</h3>
                <p className="gp-bio">{guide.bio}</p>
              </div>
            )}
            {guide.about_tours && (
              <div className="gp-section">
                <h3>About My Tours</h3>
                <p className="gp-about-tours">{guide.about_tours}</p>
              </div>
            )}
            {(guide.languages || []).length > 0 && (
              <div className="gp-section">
                <h3>Languages</h3>
                <div className="gp-lang-grid">
                  {guide.languages.map(l => <span key={l} className="gp-lang-badge">{l}</span>)}
                </div>
              </div>
            )}
            {(guide.speciality_regions || []).length > 0 && (
              <div className="gp-section">
                <h3>Speciality Regions</h3>
                <div className="gp-lang-grid">
                  {guide.speciality_regions.map(r => <span key={r} className="gp-region-badge">{r}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pricing tab */}
        {tab === 'Pricing' && (
          <div className="gp-tab-panel">
            <div className="gp-section">
              <h3>Distance-Based Pricing</h3>
              <div className="pricing-tier-table">
                {pricingTiers.map((tier, i) => (
                  <div key={i} className="pricing-tier-row">
                    <div className="tier-band">{tier.label}</div>
                    <div className="tier-note">{tier.note}</div>
                    <div className="tier-price">LKR {parseFloat(tier.value).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="gp-section">
              <h3>Fare Calculator</h3>
              <div className="fare-calc">
                <label>Enter distance (km)</label>
                <input
                  type="number"
                  min="0.5"
                  max="100"
                  step="0.5"
                  value={testKm}
                  onChange={e => setTestKm(e.target.value)}
                  className="fare-calc-input"
                />
                <div className="fare-calc-result">
                  Estimated fare: <strong>LKR {calcFare(testKm).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gallery tab */}
        {tab === 'Gallery' && (
          <div className="gp-tab-panel">
            {(guide.photos || []).length === 0 ? (
              <div className="gp-empty">No gallery photos yet.</div>
            ) : (
              <div className="gp-gallery-grid">
                {guide.photos.map(photo => (
                  <div key={photo.id} className="gp-gallery-item" onClick={() => setLightboxImg(photo.url)}>
                    <img src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001'}${photo.url}`} alt={photo.caption} />
                    {photo.caption && <div className="gp-gallery-caption">{photo.caption}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reviews tab */}
        {tab === 'Reviews' && (
          <div className="gp-tab-panel">
            {user && (
              <div className="gp-section gp-review-form">
                <h3>Leave a Review</h3>
                <div className="star-input">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} className={`star-btn ${reviewForm.rating >= n ? 'star-btn--on' : ''}`}
                      onClick={() => setReviewForm(f => ({ ...f, rating: n }))}>★</button>
                  ))}
                </div>
                <textarea
                  className="review-textarea"
                  placeholder="Share your experience with this guide..."
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  rows={3}
                />
                <button className="review-submit-btn" onClick={submitReview} disabled={reviewLoading || reviewForm.rating === 0}>
                  {reviewLoading ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            )}

            <div className="gp-section">
              <h3>All Reviews ({guide.total_reviews || 0})</h3>
              {(guide.guide_reviews || []).length === 0 ? (
                <div className="gp-empty">No reviews yet. Be the first!</div>
              ) : (
                <div className="reviews-list">
                  {guide.guide_reviews.map(r => (
                    <div key={r.id} className="review-item">
                      <div className="review-top">
                        <div className="review-user-info">
                          <span className="review-avatar">{(r.reviewer?.username || 'U')[0].toUpperCase()}</span>
                          <span className="review-username">{r.reviewer?.username || 'Traveler'}</span>
                        </div>
                        <div className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                      </div>
                      {r.comment && <p className="review-comment">{r.comment}</p>}
                      <span className="review-date">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Tour photo" className="lightbox-img" />
        </div>
      )}

      {showBooking && (
        <BookingConfirmModal
          guide={guide}
          user={user}
          distanceKm={null}
          destInput=""
          onClose={() => setShowBooking(false)}
          onBooked={(trip) => { setShowBooking(false); navigate(`/trip/live/${trip.id}`); }}
        />
      )}
    </div>
  );
}
