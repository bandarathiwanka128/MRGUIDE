import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Eye, EyeOff, AlertCircle, ArrowRight, Compass, BadgeCheck } from 'lucide-react';
import AuthShell from '../components/layout/AuthShell';

// Country data with flags and codes
const countries = [
  { value: 'US', label: 'United States', code: '+1', flag: '🇺🇸' },
  { value: 'LK', label: 'Sri Lanka', code: '+94', flag: '🇱🇰' },
  { value: 'IN', label: 'India', code: '+91', flag: '🇮🇳' },
  { value: 'GB', label: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { value: 'AU', label: 'Australia', code: '+61', flag: '🇦🇺' },
  { value: 'CA', label: 'Canada', code: '+1', flag: '🇨🇦' },
  { value: 'DE', label: 'Germany', code: '+49', flag: '🇩🇪' },
  { value: 'FR', label: 'France', code: '+33', flag: '🇫🇷' },
  { value: 'JP', label: 'Japan', code: '+81', flag: '🇯🇵' },
  { value: 'CN', label: 'China', code: '+86', flag: '🇨🇳' },
  { value: 'BR', label: 'Brazil', code: '+55', flag: '🇧🇷' },
  { value: 'AE', label: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { value: 'SG', label: 'Singapore', code: '+65', flag: '🇸🇬' },
  { value: 'MY', label: 'Malaysia', code: '+60', flag: '🇲🇾' },
  { value: 'TH', label: 'Thailand', code: '+66', flag: '🇹🇭' }
];

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: 48,
    background: 'var(--surface-1)',
    border: `1px solid ${state.isFocused ? 'var(--accent)' : 'var(--border-strong)'}`,
    borderRadius: '10px',
    boxShadow: state.isFocused ? '0 0 0 3px var(--accent-soft)' : 'none',
    color: 'var(--text-1)',
    '&:hover': {
      borderColor: 'rgba(var(--fg-rgb), 0.3)'
    }
  }),
  menu: (provided) => ({
    ...provided,
    background: 'var(--surface-1)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-3)',
    borderRadius: '12px',
    overflow: 'hidden',
    zIndex: 20
  }),
  option: (provided, state) => ({
    ...provided,
    background: state.isSelected ? 'var(--accent-soft)' : state.isFocused ? 'rgba(var(--fg-rgb), 0.06)' : 'var(--surface-1)',
    color: 'var(--text-1)',
    cursor: 'pointer'
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--text-1)'
  }),
  input: (provided) => ({
    ...provided,
    color: 'var(--text-1)'
  }),
  indicatorSeparator: () => ({ display: 'none' })
};

const Register = ({ setUser }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobileNumber: '',
    role: 'user'
  });

  const [selectedCountry, setSelectedCountry] = useState(countries[1]); // Default to Sri Lanka
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAuthenticFields, setShowAuthenticFields] = useState(false);

  // Authentic user fields
  const [authenticData, setAuthenticData] = useState({
    title: '',
    education: '',
    jobTitle: '',
    age: '',
    description: '',
    hasBusiness: false,
    businessName: '',
    businessType: '',
    businessDescription: ''
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAuthenticChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setAuthenticData({
      ...authenticData,
      [e.target.name]: value
    });
  };

  const handleRoleChange = (role) => {
    setFormData({ ...formData, role });
    setShowAuthenticFields(role === 'authentic_user');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.mobileNumber) {
      setError('Please enter your mobile number');
      return;
    }

    setSubmitting(true);
    try {
      const registrationData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        mobileNumber: formData.mobileNumber,
        countryCode: selectedCountry.code,
        country: selectedCountry.label,
        role: formData.role
      };

      // Add authentic user data if applicable
      if (formData.role === 'authentic_user') {
        Object.assign(registrationData, authenticData);
      }

      const response = await axios.post(`${API_BASE_URL}/auth/register`, registrationData);

      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during registration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      wide
      eyebrow="Join Mr. Guide"
      title="Create your account"
      subtitle="Save trips, book local guides and share what you know about Sri Lanka."
    >
      {error && (
        <div className="ui-alert ui-alert--error" role="alert" id="register-error">
          <AlertCircle size={18} aria-hidden="true" /> <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        {/* Basic information */}
        <fieldset className="auth-section">
          <legend className="auth-section__title">Basic information</legend>

          <div className="auth-grid-2">
            <div className="ui-field">
              <label htmlFor="username" className="ui-label">Username <span className="ui-required" aria-hidden="true">*</span></label>
              <input
                type="text"
                id="username"
                name="username"
                className="ui-input"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a unique username"
                autoComplete="username"
                minLength={3}
                required
              />
              <span className="ui-help">At least 3 characters.</span>
            </div>

            <div className="ui-field">
              <label htmlFor="email" className="ui-label">Email address <span className="ui-required" aria-hidden="true">*</span></label>
              <input
                type="email"
                id="email"
                name="email"
                className="ui-input"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>
          </div>

          <div className="ui-field">
            <label htmlFor="country" className="ui-label">Country <span className="ui-required" aria-hidden="true">*</span></label>
            <Select
              inputId="country"
              options={countries}
              value={selectedCountry}
              onChange={setSelectedCountry}
              styles={customSelectStyles}
              formatOptionLabel={(country) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.25rem' }} aria-hidden="true">{country.flag}</span>
                  <span>{country.label}</span>
                  <span style={{ color: 'var(--text-3)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{country.code}</span>
                </div>
              )}
            />
          </div>

          <div className="ui-field">
            <label htmlFor="mobileNumber" className="ui-label">Mobile number <span className="ui-required" aria-hidden="true">*</span></label>
            <div className="auth-phone">
              <span className="auth-phone__code" aria-hidden="true">{selectedCountry.code}</span>
              <input
                type="tel"
                id="mobileNumber"
                name="mobileNumber"
                className="ui-input"
                value={formData.mobileNumber}
                onChange={handleChange}
                placeholder="Mobile number"
                autoComplete="tel-national"
                inputMode="tel"
                aria-describedby="mobile-help"
                required
              />
            </div>
            <span className="ui-help" id="mobile-help">Country code {selectedCountry.code} is added for you.</span>
          </div>

          <div className="auth-grid-2">
            <div className="ui-field">
              <label htmlFor="password" className="ui-label">Password <span className="ui-required" aria-hidden="true">*</span></label>
              <div className="auth-password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="ui-input"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="auth-password__toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="ui-field">
              <label htmlFor="confirmPassword" className="ui-label">Confirm password <span className="ui-required" aria-hidden="true">*</span></label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                className="ui-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                aria-invalid={formData.confirmPassword && formData.confirmPassword !== formData.password ? true : undefined}
                required
              />
              {formData.confirmPassword && formData.confirmPassword !== formData.password && (
                <span className="ui-error-text">Passwords don&rsquo;t match yet.</span>
              )}
            </div>
          </div>
        </fieldset>

        {/* Account type */}
        <fieldset className="auth-section">
          <legend className="auth-section__title">Account type</legend>
          <div className="auth-roles">
            <button
              className="auth-role"
              type="button"
              aria-pressed={formData.role === 'user'}
              onClick={() => handleRoleChange('user')}
            >
              <span className="auth-role__icon"><Compass size={18} aria-hidden="true" /></span>
              <strong>Traveller</strong>
              <span>Explore places, add reviews and plan your trips.</span>
            </button>

            <button
              className="auth-role"
              type="button"
              aria-pressed={formData.role === 'authentic_user'}
              onClick={() => handleRoleChange('authentic_user')}
            >
              <span className="auth-role__icon"><BadgeCheck size={18} aria-hidden="true" /></span>
              <strong>Authentic user</strong>
              <span>Share local knowledge and verified business information.</span>
            </button>
          </div>
        </fieldset>

        {/* Authentic user details */}
        {showAuthenticFields && (
          <fieldset className="auth-section">
            <legend className="auth-section__title">Authentic user profile</legend>
            <p className="auth-section__desc">Tell travellers who you are so they can trust what you share.</p>

            <div className="auth-grid-2">
              <div className="ui-field">
                <label htmlFor="title" className="ui-label">Title or position</label>
                <input type="text" id="title" name="title" className="ui-input" value={authenticData.title} onChange={handleAuthenticChange} placeholder="e.g. Dr., Prof., Manager" />
              </div>
              <div className="ui-field">
                <label htmlFor="jobTitle" className="ui-label">Job title</label>
                <input type="text" id="jobTitle" name="jobTitle" className="ui-input" value={authenticData.jobTitle} onChange={handleAuthenticChange} placeholder="Your current position" autoComplete="organization-title" />
              </div>
            </div>

            <div className="ui-field">
              <label htmlFor="education" className="ui-label">Educational qualifications</label>
              <textarea id="education" name="education" className="ui-textarea" value={authenticData.education} onChange={handleAuthenticChange} placeholder="Your educational background" rows="3" />
            </div>

            <div className="ui-field" style={{ maxWidth: 200 }}>
              <label htmlFor="age" className="ui-label">Age</label>
              <input type="number" id="age" name="age" className="ui-input" value={authenticData.age} onChange={handleAuthenticChange} placeholder="Your age" min="18" max="120" inputMode="numeric" />
            </div>

            <div className="ui-field">
              <label htmlFor="description" className="ui-label">About you</label>
              <textarea id="description" name="description" className="ui-textarea" value={authenticData.description} onChange={handleAuthenticChange} placeholder="A short description of yourself and your expertise" rows="4" />
            </div>

            <label className="auth-check">
              <input type="checkbox" name="hasBusiness" checked={authenticData.hasBusiness} onChange={handleAuthenticChange} />
              <span>I have business information to share</span>
            </label>

            {authenticData.hasBusiness && (
              <>
                <div className="auth-grid-2">
                  <div className="ui-field">
                    <label htmlFor="businessName" className="ui-label">Business name <span className="ui-required" aria-hidden="true">*</span></label>
                    <input type="text" id="businessName" name="businessName" className="ui-input" value={authenticData.businessName} onChange={handleAuthenticChange} placeholder="Your business name" autoComplete="organization" />
                  </div>
                  <div className="ui-field">
                    <label htmlFor="businessType" className="ui-label">Business type <span className="ui-required" aria-hidden="true">*</span></label>
                    <input type="text" id="businessType" name="businessType" className="ui-input" value={authenticData.businessType} onChange={handleAuthenticChange} placeholder="e.g. Hotel, Restaurant, Tour agency" />
                  </div>
                </div>
                <div className="ui-field">
                  <label htmlFor="businessDescription" className="ui-label">Business description <span className="ui-required" aria-hidden="true">*</span></label>
                  <textarea id="businessDescription" name="businessDescription" className="ui-textarea" value={authenticData.businessDescription} onChange={handleAuthenticChange} placeholder="Describe your business and services" rows="4" />
                </div>
              </>
            )}
          </fieldset>
        )}

        <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block auth-submit" disabled={submitting}>
          {submitting ? <><span className="ui-spinner" aria-hidden="true" /> Creating your account…</> : <>Create account <ArrowRight size={18} aria-hidden="true" /></>}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
};

export default Register;
