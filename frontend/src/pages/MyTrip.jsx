import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function MyTrip({ user }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('mrguide_active_trip');
    if (stored) {
      navigate(`/trip/live/${stored}`, { replace: true });
      return;
    }

    const token = localStorage.getItem('token');
    axios.get(`${API_BASE_URL}/guide-trips/my/active`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => {
      if (r.data?.id) {
        localStorage.setItem('mrguide_active_trip', r.data.id);
        navigate(`/trip/live/${r.data.id}`, { replace: true });
      } else {
        navigate('/guides', { replace: true });
      }
    }).catch(() => navigate('/guides', { replace: true }))
    .finally(() => setChecking(false));
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--text-secondary, #64748b)' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#34699A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ margin: 0, fontSize: '0.95rem' }}>Finding your trip...</p>
    </div>
  );
}
