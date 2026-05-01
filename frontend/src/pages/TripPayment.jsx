import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { API_BASE_URL } from '../config';
import './TripPayment.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function PaymentForm({ trip, clientSecret, tip, setTip, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

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

      // Check if already paid (idempotency)
      if (trip.paid) { onSuccess(); return; }

      // Confirm card payment with Stripe using fetched client_secret
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

      // Mark trip as paid in our DB
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
    <form onSubmit={handlePay} className="payment-form">
      <div className="payment-fare-breakdown">
        <div className="pf-row"><span>Base Fare</span><span>LKR {parseFloat(trip.base_fare || 0).toLocaleString()}</span></div>
        <div className="pf-row"><span>Waiting Charge</span><span>LKR {waitingCharge.toLocaleString()}</span></div>
        <div className="pf-row pf-tip-row">
          <span>Add Tip (optional)</span>
          <div className="tip-input-wrap">
            <span>LKR</span>
            <input type="number" min="0" step="50" value={tip} onChange={e => setTip(e.target.value)} placeholder="0" className="tip-input" />
          </div>
        </div>
        <div className="pf-row pf-total"><span>Total</span><strong>LKR {total.toLocaleString()}</strong></div>
        <div className="pf-row pf-muted"><span>Platform (5%)</span><span>LKR {((baseFare + waitingCharge) * 0.05).toLocaleString()}</span></div>
        <div className="pf-row pf-muted"><span>Tip goes 100% to guide</span><span>LKR {tipAmount.toLocaleString()}</span></div>
      </div>

      <div className="card-element-wrap">
        <label>Card Details</label>
        <div className="card-element-box">
          <CardElement options={{ style: { base: { fontSize: '16px', color: '#1a202c', '::placeholder': { color: '#94a3b8' } } } }} />
        </div>
        <p className="card-test-hint">Test card: 4242 4242 4242 4242 · Any future expiry · Any CVC</p>
      </div>

      <button type="submit" className="pay-btn" disabled={loading || !stripe}>
        {loading ? (
          <span className="pay-spinner" />
        ) : (
          <>Pay LKR {total.toLocaleString()}</>
        )}
      </button>
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
      // Fetch Stripe client_secret separately (not stored in DB)
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
    <div className="tp-loading">
      <div className="tp-spinner" />
      <p>Loading payment...</p>
    </div>
  );

  if (error) return (
    <div className="tp-error">
      <h2>Trip Not Found</h2>
      <p>{error}</p>
      <button onClick={() => navigate('/')}>Go Home</button>
    </div>
  );

  if (paid) return (
    <div className="tp-success-page">
      <div className="tp-success-card">
        <div className="tp-success-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2>Payment Successful!</h2>
        <p>LKR {(parseFloat(trip?.base_fare || 0) + parseFloat(trip?.waiting_charge_total || 0) + parseFloat(tip || 0)).toLocaleString()} paid.</p>
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
        <div className="tp-header">
          <div className="tp-qr-icon">📱</div>
          <h1>Complete Payment</h1>
          {guide && <p>Trip with <strong>{guide.display_name}</strong></p>}
        </div>

        <div className="tp-card">
          <div className="tp-trip-info">
            <div className="tp-info-row">
              <span>Distance</span>
              <span>{parseFloat(trip.distance_km || 0).toFixed(1)} km</span>
            </div>
            <div className="tp-info-row">
              <span>Trip status</span>
              <span className="tp-status-badge">{trip.status}</span>
            </div>
          </div>

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

        <div className="tp-security-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Secured by Stripe · 5% platform fee applies
        </div>
      </div>
    </div>
  );
}
