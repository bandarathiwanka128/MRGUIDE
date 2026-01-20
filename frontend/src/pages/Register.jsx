import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './Register.css';

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
  control: (provided) => ({
    ...provided,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 215, 0, 0.3)',
    borderRadius: '10px',
    padding: '0.3rem',
    color: '#fff',
    '&:hover': {
      borderColor: '#FFD700'
    }
  }),
  menu: (provided) => ({
    ...provided,
    background: '#1a2942',
    border: '1px solid rgba(255, 215, 0, 0.3)'
  }),
  option: (provided, state) => ({
    ...provided,
    background: state.isFocused ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
    color: '#fff',
    '&:hover': {
      background: 'rgba(255, 215, 0, 0.3)'
    }
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#fff'
  }),
  input: (provided) => ({
    ...provided,
    color: '#fff'
  })
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
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2 className="register-title">Create Your Account</h2>
        <p className="register-subtitle">Join the community of travelers and explorers</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="section-title-small">Basic Information</h3>

            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a unique username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                required
              />
            </div>

            {/* Country and Mobile Number */}
            <div className="form-group">
              <label>Country *</label>
              <Select
                options={countries}
                value={selectedCountry}
                onChange={setSelectedCountry}
                styles={customSelectStyles}
                formatOptionLabel={(country) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>{country.flag}</span>
                    <span>{country.label}</span>
                    <span style={{ color: '#FFD700', marginLeft: 'auto' }}>{country.code}</span>
                  </div>
                )}
              />
            </div>

            <div className="form-group">
              <label htmlFor="mobileNumber">Mobile Number *</label>
              <div className="mobile-input-group">
                <span className="country-code">{selectedCountry.code}</span>
                <input
                  type="tel"
                  id="mobileNumber"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder="Enter your mobile number"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                required
              />
            </div>
          </div>

          {/* User Role Selection */}
          <div className="form-section">
            <h3 className="section-title-small">Account Type</h3>
            <div className="role-selection">
              <div
                className={`role-card ${formData.role === 'user' ? 'active' : ''}`}
                onClick={() => handleRoleChange('user')}
              >
                <div className="role-icon">👤</div>
                <h4>Regular User</h4>
                <p>Explore places, add reviews, and plan your trips</p>
              </div>

              <div
                className={`role-card ${formData.role === 'authentic_user' ? 'active' : ''}`}
                onClick={() => handleRoleChange('authentic_user')}
              >
                <div className="role-icon">✓</div>
                <h4>Authentic User</h4>
                <p>Share expert knowledge and verified business information</p>
              </div>
            </div>
          </div>

          {/* Authentic User Additional Fields */}
          {showAuthenticFields && (
            <div className="form-section authentic-section">
              <h3 className="section-title-small">Authentic User Profile</h3>
              <p className="section-description">
                Provide your credentials to become a verified contributor
              </p>

              <div className="form-group">
                <label htmlFor="title">Title/Position</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={authenticData.title}
                  onChange={handleAuthenticChange}
                  placeholder="e.g., Dr., Prof., Manager"
                />
              </div>

              <div className="form-group">
                <label htmlFor="education">Educational Qualifications</label>
                <textarea
                  id="education"
                  name="education"
                  value={authenticData.education}
                  onChange={handleAuthenticChange}
                  placeholder="Your educational background..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="jobTitle">Job Title</label>
                <input
                  type="text"
                  id="jobTitle"
                  name="jobTitle"
                  value={authenticData.jobTitle}
                  onChange={handleAuthenticChange}
                  placeholder="Your current position"
                />
              </div>

              <div className="form-group">
                <label htmlFor="age">Age</label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={authenticData.age}
                  onChange={handleAuthenticChange}
                  placeholder="Your age"
                  min="18"
                  max="120"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">About You</label>
                <textarea
                  id="description"
                  name="description"
                  value={authenticData.description}
                  onChange={handleAuthenticChange}
                  placeholder="Brief description about yourself and your expertise..."
                  rows="4"
                />
              </div>

              {/* Business Information */}
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="hasBusiness"
                    checked={authenticData.hasBusiness}
                    onChange={handleAuthenticChange}
                  />
                  <span>I have business information to share</span>
                </label>
              </div>

              {authenticData.hasBusiness && (
                <>
                  <div className="form-group">
                    <label htmlFor="businessName">Business Name *</label>
                    <input
                      type="text"
                      id="businessName"
                      name="businessName"
                      value={authenticData.businessName}
                      onChange={handleAuthenticChange}
                      placeholder="Your business name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="businessType">Business Type *</label>
                    <input
                      type="text"
                      id="businessType"
                      name="businessType"
                      value={authenticData.businessType}
                      onChange={handleAuthenticChange}
                      placeholder="e.g., Hotel, Restaurant, Tour Agency"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="businessDescription">Business Description *</label>
                    <textarea
                      id="businessDescription"
                      name="businessDescription"
                      value={authenticData.businessDescription}
                      onChange={handleAuthenticChange}
                      placeholder="Describe your business and services..."
                      rows="4"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <button type="submit" className="submit-button">
            Create Account
          </button>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
