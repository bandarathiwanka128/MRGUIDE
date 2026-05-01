import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './GuideRegister.css';

const STEPS = ['Personal', 'Pricing', 'Bank & Card', 'Media'];
const LANGUAGE_OPTIONS = ['Sinhala', 'Tamil', 'English', 'Japanese', 'Chinese', 'German', 'French', 'Spanish', 'Italian'];
const REGION_OPTIONS = ['Colombo', 'Kandy', 'Galle', 'Ella', 'Sigiriya', 'Jaffna', 'Trincomalee', 'Anuradhapura', 'Nuwara Eliya', 'Negombo', 'Mirissa', 'Polonnaruwa'];

const SAMPLE_FARES = [
  { km: 1, label: '1 km' },
  { km: 5, label: '5 km' },
  { km: 10, label: '10 km' },
  { km: 25, label: '25 km' },
];

const WAITING_RATE_FIELDS = [
  { label: '10 Minutes', duration: '10 min', key: 'wait_rate_10m' },
  { label: '20 Minutes', duration: '20 min', key: 'wait_rate_20m' },
  { label: '30 Minutes', duration: '30 min', key: 'wait_rate_30m' },
  { label: '40 Minutes', duration: '40 min', key: 'wait_rate_40m' },
  { label: '1 Hour', duration: '60 min', key: 'wait_rate_1h' },
  { label: '2 Hours', duration: '120 min', key: 'wait_rate_2h' },
  { label: '3 Hours', duration: '180 min', key: 'wait_rate_3h' },
  { label: '5 Hours', duration: '300 min', key: 'wait_rate_5h' },
  { label: 'Per additional hour', duration: '60 min', key: 'wait_rate_per_hour' },
  { label: 'Per additional 30m', duration: '30 min', key: 'wait_rate_per_30m' },
  { label: 'Per additional 15m', duration: '15 min', key: 'wait_rate_per_15m' }
];

function calcFare(km, form) {
  const d = parseFloat(km);
  const t1 = parseFloat(form.tier_1km) || 0;
  const t5 = parseFloat(form.tier_5km) || 0;
  const t10 = parseFloat(form.tier_10km) || 0;
  const t20 = parseFloat(form.tier_20km) || 0;
  const tE = parseFloat(form.tier_per_km_over20) || 0;
  if (d <= 1) return t1; if (d <= 5) return t5;
  if (d <= 10) return t10; if (d <= 20) return t20;
  return t20 + (d - 20) * tE;
}

export default function GuideRegister({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    display_name: user?.username || '',
    bio: '',
    about_tours: '',
    languages: [],
    speciality_regions: [],
    phone: '',
    whatsapp: '',
    nic_number: '',
    tier_1km: '',
    tier_5km: '',
    tier_10km: '',
    tier_20km: '',
    tier_per_km_over20: '',
    wait_rate_10m: '',
    wait_rate_20m: '',
    wait_rate_30m: '',
    wait_rate_40m: '',
    wait_rate_1h: '',
    wait_rate_2h: '',
    wait_rate_3h: '',
    wait_rate_5h: '',
    wait_rate_per_hour: '',
    wait_rate_per_30m: '',
    wait_rate_per_15m: '',
    bank_name: '',
    bank_account_number: '',
    bank_branch: '',
    payment_ref: '',
    card_last4: '',
    card_expiry: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleList = (key, val) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val]
    }));
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.display_name.trim()) return 'Display name is required';
      if (!form.phone.trim()) return 'Phone number is required';
      if (!form.nic_number.trim()) return 'NIC number is required';
    }
    if (step === 1) {
      if (!form.tier_1km || !form.tier_5km || !form.tier_10km || !form.tier_20km || !form.tier_per_km_over20) {
        return 'All pricing tiers are required';
      }
    }
    if (step === 2) {
      if (!form.bank_name || !form.bank_account_number) return 'Bank name and account number required';
    }
    return '';
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    if (step < 3) setStep(s => s + 1);
  };

  const submit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/guides/register`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="gr-success-page">
      <div className="gr-success-card">
        <div className="gr-success-icon">✓</div>
        <h2>Registration Submitted!</h2>
        <p>Your guide profile has been submitted for admin review. You'll be notified once approved (usually within 24 hours).</p>
        <button onClick={() => navigate('/')} className="gr-success-btn">Back to Home</button>
      </div>
    </div>
  );

  return (
    <div className="gr-page">
      <div className="gr-container">
        <div className="gr-header">
          <h1>Register as a Guide</h1>
          <p>Join Mr. Guide and start earning by sharing your knowledge of Sri Lanka</p>
        </div>

        {/* Step indicators */}
        <div className="gr-steps">
          {STEPS.map((s, i) => (
            <div key={i} className={`gr-step ${i === step ? 'gr-step--active' : ''} ${i < step ? 'gr-step--done' : ''}`}>
              <div className="gr-step-circle">{i < step ? '✓' : i + 1}</div>
              <span className="gr-step-label">{s}</span>
              {i < 3 && <div className="gr-step-line" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="gr-form-card">
          {error && <div className="gr-error">{error}</div>}

          {/* Step 1: Personal */}
          {step === 0 && (
            <div className="gr-form-section">
              <h2>Personal Details</h2>
              <div className="gr-field">
                <label>Display Name *</label>
                <input value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="Your public name" />
              </div>
              <div className="gr-field">
                <label>Phone Number *</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+94 7X XXX XXXX" />
              </div>
              <div className="gr-field">
                <label>WhatsApp Number</label>
                <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+94 7X XXX XXXX" />
              </div>
              <div className="gr-field">
                <label>NIC Number * <small>(Admin verification only, not shown publicly)</small></label>
                <input value={form.nic_number} onChange={e => set('nic_number', e.target.value)} placeholder="123456789V" />
              </div>
              <div className="gr-field">
                <label>Short Bio <small>(max 500 characters)</small></label>
                <textarea value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell tourists about yourself..." rows={3} maxLength={500} />
                <span className="gr-char-count">{form.bio.length}/500</span>
              </div>
              <div className="gr-field">
                <label>Languages Spoken</label>
                <div className="gr-chip-group">
                  {LANGUAGE_OPTIONS.map(l => (
                    <button key={l} type="button" className={`gr-chip ${form.languages.includes(l) ? 'gr-chip--on' : ''}`} onClick={() => toggleList('languages', l)}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="gr-field">
                <label>Speciality Regions</label>
                <div className="gr-chip-group">
                  {REGION_OPTIONS.map(r => (
                    <button key={r} type="button" className={`gr-chip ${form.speciality_regions.includes(r) ? 'gr-chip--on' : ''}`} onClick={() => toggleList('speciality_regions', r)}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pricing */}
          {step === 1 && (
            <div className="gr-form-section">
              <h2>Distance Pricing</h2>
              <p className="gr-pricing-note">Set your own rates. Tourists will see these before booking. All prices in LKR.</p>
              <div className="gr-pricing-grid">
                <div className="gr-pricing-row">
                  <label>Up to 1 km (flat rate) *</label>
                  <div className="gr-price-input"><span>LKR</span><input type="number" min="0" value={form.tier_1km} onChange={e => set('tier_1km', e.target.value)} placeholder="e.g. 250" /></div>
                </div>
                <div className="gr-pricing-row">
                  <label>Up to 5 km (flat rate) *</label>
                  <div className="gr-price-input"><span>LKR</span><input type="number" min="0" value={form.tier_5km} onChange={e => set('tier_5km', e.target.value)} placeholder="e.g. 700" /></div>
                </div>
                <div className="gr-pricing-row">
                  <label>Up to 10 km (flat rate) *</label>
                  <div className="gr-price-input"><span>LKR</span><input type="number" min="0" value={form.tier_10km} onChange={e => set('tier_10km', e.target.value)} placeholder="e.g. 1300" /></div>
                </div>
                <div className="gr-pricing-row">
                  <label>Up to 20 km (flat rate) *</label>
                  <div className="gr-price-input"><span>LKR</span><input type="number" min="0" value={form.tier_20km} onChange={e => set('tier_20km', e.target.value)} placeholder="e.g. 2000" /></div>
                </div>
                <div className="gr-pricing-row">
                  <label>Over 20 km (per extra km) *</label>
                  <div className="gr-price-input"><span>LKR/km</span><input type="number" min="0" value={form.tier_per_km_over20} onChange={e => set('tier_per_km_over20', e.target.value)} placeholder="e.g. 100" /></div>
                </div>
              </div>

              {/* Live preview */}
              <div className="gr-fare-preview">
                <h4>Live Preview</h4>
                <div className="gr-fare-preview-grid">
                  {SAMPLE_FARES.map(sf => (
                    <div key={sf.km} className="gr-fare-preview-item">
                      <span className="gr-fare-preview-km">{sf.label}</span>
                      <span className="gr-fare-preview-val">
                        {form.tier_1km ? `LKR ${calcFare(sf.km, form).toLocaleString()}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="gr-fare-note">Example: 28 km trip = LKR {calcFare(28, form).toLocaleString()} (using your tier_20km + (8 × per_km))</p>
              </div>

              <div className="gr-waiting-section">
                <h3>Waiting / Stop Charges</h3>
                <p className="gr-pricing-note">Optional rates for stops during a trip. Enter 0 for free waiting.</p>
                <div className="gr-waiting-table">
                  <div className="gr-waiting-row gr-waiting-header">
                    <span>Bracket</span>
                    <span>Duration</span>
                    <span>Rate (LKR)</span>
                  </div>
                  {WAITING_RATE_FIELDS.map(field => (
                    <div className="gr-waiting-row" key={field.key}>
                      <span className="gr-waiting-label">{field.label}</span>
                      <span className="gr-waiting-duration">{field.duration}</span>
                      <div className="gr-waiting-input">
                        <span>LKR</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form[field.key]}
                          onChange={e => set(field.key, e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Bank & Card */}
          {step === 2 && (
            <div className="gr-form-section">
              <h2>Bank & Payment Details</h2>
              <div className="gr-commission-notice">
                <strong>📋 Commission Notice:</strong> Mr. Guide charges 5% of every trip fare as a platform commission. This is deducted automatically from your weekly payouts for QR payments, or from your next payout for cash trips.
              </div>
              <h3>Bank Details (for weekly payouts)</h3>
              <div className="gr-field">
                <label>Bank Name *</label>
                <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="e.g. Commercial Bank of Ceylon" />
              </div>
              <div className="gr-field">
                <label>Account Number *</label>
                <input value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} placeholder="Enter your account number" />
              </div>
              <div className="gr-field">
                <label>Branch</label>
                <input value={form.bank_branch} onChange={e => set('bank_branch', e.target.value)} placeholder="e.g. Colombo Fort" />
              </div>
              <div className="gr-field">
                <label>Your Payment Reference (shown to tourist for cash trips)</label>
                <input value={form.payment_ref} onChange={e => set('payment_ref', e.target.value)} placeholder="e.g. your name or mobile payment number" />
              </div>
              <h3>Card Details (Test Mode)</h3>
              <div className="gr-test-card-notice">
                🧪 <strong>Test mode:</strong> Use test card <code>4242 4242 4242 4242</code>, any expiry, any CVC.
              </div>
              <div className="gr-field">
                <label>Card Last 4 Digits</label>
                <input value={form.card_last4} onChange={e => set('card_last4', e.target.value.slice(0,4))} placeholder="4242" maxLength={4} />
              </div>
              <div className="gr-field">
                <label>Card Expiry (MM/YYYY)</label>
                <input value={form.card_expiry} onChange={e => set('card_expiry', e.target.value)} placeholder="12/2026" maxLength={7} />
              </div>
            </div>
          )}

          {/* Step 4: Media */}
          {step === 3 && (
            <div className="gr-form-section">
              <h2>Profile Media & Story</h2>
              <div className="gr-field">
                <label>About My Tours</label>
                <textarea
                  value={form.about_tours}
                  onChange={e => set('about_tours', e.target.value)}
                  placeholder="Tell tourists what makes your tours special. Your experience, favourite routes, hidden gems you know..."
                  rows={6}
                />
              </div>
              <div className="gr-photo-note">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <p>You can add gallery photos after registration from your Guide Dashboard. Up to 10 photos allowed.</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="gr-nav-buttons">
            {step > 0 && (
              <button className="gr-btn-back" onClick={() => { setError(''); setStep(s => s - 1); }}>
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button className="gr-btn-next" onClick={next}>
                Next →
              </button>
            ) : (
              <button className="gr-btn-submit" onClick={submit} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Registration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
