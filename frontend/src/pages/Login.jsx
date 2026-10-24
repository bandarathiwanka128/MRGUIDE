import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../config';
import AuthShell from '../components/layout/AuthShell';

const Login = ({ setUser }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, formData);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      const destination = location.state?.from;
      navigate(response.data.user.role === 'admin' && typeof destination === 'string' && destination.startsWith('/admin') ? destination : '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'We couldn’t log you in. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell eyebrow="Welcome back" title="Log in to Mr. Guide" subtitle="Pick up your trips, guides and saved places where you left them.">
      {error && (
        <div className="ui-alert ui-alert--error" role="alert" id="login-error">
          <AlertCircle size={18} aria-hidden="true" /> <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="ui-field">
          <label htmlFor="email" className="ui-label">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            className="ui-input"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            inputMode="email"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            required
          />
        </div>

        <div className="ui-field">
          <label htmlFor="password" className="ui-label">Password</label>
          <div className="auth-password">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              className="ui-input"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              aria-invalid={error ? true : undefined}
              required
            />
            <button
              type="button"
              className="auth-password__toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block auth-submit" disabled={submitting}>
          {submitting ? <><span className="ui-spinner" aria-hidden="true" /> Logging in…</> : <>Log in <ArrowRight size={18} aria-hidden="true" /></>}
        </button>
      </form>

      <p className="auth-footer">
        New to Mr. Guide? <Link to="/register">Create an account</Link>
      </p>
    </AuthShell>
  );
};

export default Login;
