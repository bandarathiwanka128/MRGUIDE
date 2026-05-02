import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { API_BASE_URL } from '../config';
import './TripPayment.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const VisaIcon = () => (
  <svg width="48" height="30" viewBox="0 0 48 30" fill="none">
    <rect width="48" height="30" rx="5" fill="#1A1F71"/>
    <text x="7" y="22" fontFamily="Arial" fontWeight="900" fontSize="16" fontStyle="italic" fill="#FFFFFF" letterSpacing="1">VISA</text>
  </svg>
);

const MastercardIcon = () => (
  <svg width="48" height="30" viewBox="0 0 48 30" fill="none">
    <rect width="48" height="30" rx="5" fill="#252525"/>
    <circle cx="18" cy="15" r="10" fill="#EB001B"/>
    <circle cx="30" cy="15" r="10" fill="#F79E1B"/>
    <path d="M24 7.5a10 10 0 0 1 0 15 10 10 0 0 1 0-15z" fill="#FF5F00"/>
  </svg>
);

function PaymentForm({ trip, clientSecret, tip, setTip, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const waitingCharge = parseFloat(trip.waiting_charge_total || 0);
  const baseFare = parseFloat(trip.base_fare || 0);
  const tipAmount = parseFloat(tip || 0);
  const total = baseFare + waitingCharge + tipAmount;

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      if (trip.paid) { onSuccess(); return; }

      if (trip.stripe_payment_intent_id) {
        if (!clientSecret) {
          onError('Payment details not ready. Please refresh and try again.');
          setLoading(false);
          return;
        }
        const cardEl = elements.getElement(CardElement);
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardEl }
        });
        if (result.error) {
          onError(result.error.message);
          setLoading(false);
          return;
        }
      }

      const res = await axios.put(`${API_BASE_URL}/guide-trips/${trip.id}/pay/qr`, {
        tip_amount: parseFloat(tip) || 0,
        payment_intent_id: trip.stripe_payment_intent_id
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.already_paid || res.data.ok) onSuccess();
    } catch (err) {
      onError(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="tp-form">
      {/* Fare summary */}
      <div className="tp-fare-summary">
        <div className="tp-fare-row">
          <span>Base Fare</span>
          <span>LKR {baseFare.toLocaleString()}</span>
        </div>
        {waitingCharge > 0 && (
          <div className="tp-fare-row">
            <span>Waiting Charge</span>
            <span>LKR {waitingCharge.toLocaleString()}</span>
          </div>
        )}
        <div className="tp-fare-row tp-fare-tip">
          <span>Tip <span className="tp-optional">(optional)</span></span>
          <div className="tp-tip-wrap">
            <span className="tp-tip-lkr">LKR</span>
            <input
              type="number"
              min="0"
              step="50"
              value={tip}
              onChange={e => setTip(e.target.value)}
              placeholder="0"
              className="tp-tip-input"
            />
          </div>
        </div>
        <div className="tp-fare-divider" />
        <div className="tp-fare-row tp-fare-total">
          <span>Total</span>
          <strong>LKR {total.toLocaleString()}</strong>
        </div>
        {tipAmount > 0 && (
          <div className="tp-tip-note">💛 LKR {tipAmount.toLocaleString()} tip goes 100% to your guide</div>
        )}
      </div>

      {/* Card input */}
      <div className="tp-card-section">
        <div className="tp-card-header">
          <span className="tp-card-label">Card Details</span>
          <div className="tp-card-icons">
            <VisaIcon />
            <MastercardIcon />
          </div>
        </div>
        <div className={`tp-card-input-box ${focused ? 'tp-card-input-box--focused' : ''}`}>
          <CardElement
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  fontFamily: '"Inter", system-ui, sans-serif',
                  '::placeholder': { color: '#64748b' },
                  iconColor: '#94a3b8',
                },
                invalid: { color: '#f87171', iconColor: '#f87171' }
              }
            }}
          />
        </div>
        <p className="tp-test-hint">
          🧪 Test: <strong>4242 4242 4242 4242</strong> · any future date · any CVC
        </p>
      </div>

      {/* Pay button */}
      <button type="submit" className="tp-pay-btn" disabled={loading || !stripe || !clientSecret}>
        {loading ? (
          <span className="tp-pay-spinner" />
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Pay LKR {total.toLocaleString()}
          </>
        )}
      </button>

      <div className="tp-stripe-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Secured by Stripe · 256-bit SSL encryption
      </div>
    </form>
  );
}

export default function TripPayment({ user }) {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tip, setTip] = useState(0);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_BASE_URL}/guide-trips/${tripId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(r => {
      setTrip(r.data);
      if (r.data.Guide) setGuide(r.data.Guide);
      if (r.data.paid) { setPaid(true); return; }
      if (r.data.stripe_payment_intent_id && token) {
        axios.get(`${API_BASE_URL}/guide-trips/${tripId}/client-secret`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(cs => {
          if (cs.data.already_paid) setPaid(true);
          else setClientSecret(cs.data.client_secret);
        }).catch(() => {});
      }
    }).catch(() => setError('Trip not found'))
    .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return (
    <div className="tp-fullpage-center">
      <div className="tp-spinner" />
      <p>Loading payment...</p>
    </div>
  );

  if (error) return (
    <div className="tp-fullpage-center">
      <h2>Trip Not Found</h2>
      <p>{error}</p>
      <button className="tp-home-btn" onClick={() => navigate('/')}>Go Home</button>
    </div>
  );

  if (paid) return (
    <div className="tp-fullpage-center">
      <div className="tp-success-card">
        <div className="tp-success-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2>Payment Successful!</h2>
        <p className="tp-success-amount">LKR {(parseFloat(trip?.base_fare || 0) + parseFloat(trip?.waiting_charge_total || 0) + parseFloat(tip || 0)).toLocaleString()}</p>
        <p className="tp-success-sub">Your guide has been notified. Thank you for using Mr. Guide!</p>
        {trip && (
          <button onClick={() => navigate(`/guides/${trip.guide_id}`)} className="tp-rate-btn">
            Rate Your Guide →
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="trip-payment-page">
      <div className="tp-container">

        {/* Guide + trip header */}
        <div className="tp-header">
          <div className="tp-guide-avatar">
            {guide?.photo_url ? <img src={guide.photo_url} alt={guide.display_name} /> : '👤'}
          </div>
          <div className="tp-header-info">
            <h1>Complete Payment</h1>
            {guide && <p>Trip with <strong>{guide.display_name}</strong></p>}
          </div>
          <div className="tp-header-meta">
            <span className="tp-dist-badge">{parseFloat(trip.distance_km || 0).toFixed(1)} km</span>
          </div>
        </div>

        {/* Payment card */}
        <div className="tp-main-card">
          <Elements stripe={stripePromise}>
            <PaymentForm
              trip={trip}
              clientSecret={clientSecret}
              tip={tip}
              setTip={setTip}
              onSuccess={() => {
                localStorage.removeItem('mrguide_active_trip');
                setPaid(true);
              }}
              onError={setError}
            />
          </Elements>
          {error && <div className="tp-error-msg">{error}</div>}
        </div>

      </div>
    </div>
  );
}
