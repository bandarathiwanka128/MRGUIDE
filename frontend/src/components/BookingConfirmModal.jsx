import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { fareBreakdown } from '../utils/fareCalculator';
import './BookingConfirmModal.css';

export default function BookingConfirmModal({ guide, user, distanceKm, destInput, onClose, onBooked }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [payMethod, setPayMethod] = useState('qr');

  const fare = distanceKm ? fareBreakdown(distanceKm, guide) : null;

  const handleBook = async () => {
    if (!user) { setError('Please log in to book a guide.'); return; }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/guide-trips`, {
        guide_id: guide.id,
        distance_km: distanceKm || 0,
        dest_address: destInput || '',
        origin_address: 'Current Location'
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(true);
      setTimeout(() => onBooked(res.data), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="booking-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-guide-header">
          <div className="modal-guide-avatar">
            {guide.photo_url ? (
              <img src={guide.photo_url} alt={guide.display_name} />
            ) : (
              <div className="modal-avatar-placeholder">👤</div>
            )}
            {guide.is_available && <span className="modal-live-dot" />}
          </div>
          <div className="modal-guide-info">
            <h3>{guide.display_name}</h3>
            <div className="modal-rating">
              <span className="modal-stars">{'★'.repeat(Math.round(parseFloat(guide.avg_rating || 0)))}</span>
              <span>{parseFloat(guide.avg_rating || 0).toFixed(1)} · {guide.total_reviews || 0} reviews</span>
            </div>
            <div className="modal-langs">
              {(guide.languages || []).slice(0, 3).map(l => <span key={l} className="modal-lang">{l}</span>)}
            </div>
          </div>
        </div>

        {/* Fare breakdown */}
        <div className="modal-fare-section">
          <h4>Fare Estimate</h4>
          {fare ? (
            <div className="fare-table">
              <div className="fare-row"><span>Distance</span><span>{fare.distance_km} km</span></div>
              <div className="fare-row"><span>Base Fare</span><span className="fare-amount">LKR {fare.base_fare.toLocaleString()}</span></div>
              <div className="fare-row fare-row--muted"><span>Platform (5%)</span><span>LKR {fare.platform_commission.toLocaleString()}</span></div>
              <div className="fare-row fare-row--muted"><span>Guide earns (95%)</span><span>LKR {fare.guide_earnings.toLocaleString()}</span></div>
              <div className="fare-row fare-total"><span>You Pay</span><span>LKR {fare.base_fare.toLocaleString()}</span></div>
            </div>
          ) : (
            <div className="fare-no-dest">
              <p>No destination entered. Fare will be calculated from actual trip distance.</p>
              <div className="fare-tiers">
                <span>≤1km: LKR {parseFloat(guide.tier_1km).toLocaleString()}</span>
                <span>≤5km: LKR {parseFloat(guide.tier_5km).toLocaleString()}</span>
                <span>≤10km: LKR {parseFloat(guide.tier_10km).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="modal-payment-section">
          <h4>Payment Method</h4>
          <div className="payment-method-options">
            <label className={`pay-option ${payMethod === 'qr' ? 'pay-option--active' : ''}`}>
              <input type="radio" name="pay" value="qr" checked={payMethod === 'qr'} onChange={() => setPayMethod('qr')} />
              <span className="pay-icon">📱</span>
              <div>
                <strong>QR Code</strong>
                <small>Scan and pay at trip end via platform</small>
              </div>
            </label>
            <label className={`pay-option ${payMethod === 'cash' ? 'pay-option--active' : ''}`}>
              <input type="radio" name="pay" value="cash" checked={payMethod === 'cash'} onChange={() => setPayMethod('cash')} />
              <span className="pay-icon">💵</span>
              <div>
                <strong>Cash</strong>
                <small>Pay guide directly at trip end</small>
              </div>
            </label>
          </div>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <button
          className={`modal-confirm-btn ${success ? 'modal-confirm-btn--success' : ''}`}
          onClick={handleBook}
          disabled={loading || success}
        >
          {success ? (
            <span className="confirm-success-inner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              Booking confirmed!
            </span>
          ) : loading ? (
            <span className="confirm-loading-inner">
              <span className="confirm-spinner" />
              Sending request...
            </span>
          ) : (
            'Confirm Booking'
          )}
        </button>

        {!user && (
          <p className="modal-login-hint">
            <a href="/login">Log in</a> to book a guide
          </p>
        )}
      </div>
    </div>
  );
}
