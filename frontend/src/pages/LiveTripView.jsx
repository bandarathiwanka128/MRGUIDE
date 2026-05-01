import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { io } from 'socket.io-client';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config';
import { QRCodeSVG } from 'qrcode.react';
import './LiveTripView.css';

const LIBRARIES = ['places'];
const MAP_CONTAINER = { width: '100%', height: '100%' };

export default function LiveTripView({ user }) {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: LIBRARIES });

  const [trip, setTrip] = useState(null);
  const [guide, setGuide] = useState(null);
  const [guidePos, setGuidePos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_BASE_URL}/guide-trips/${tripId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => {
      setTrip(r.data);
      if (r.data.Guide) setGuide(r.data.Guide);
      if (r.data.status === 'completed') setShowQR(true);
    }).catch(() => navigate('/guides'))
    .finally(() => setLoading(false));
  }, [tripId]);

  // Socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
      auth: { token }
    });
    socketRef.current = socket;

    socket.emit('trip:join', { trip_id: tripId });
    socket.emit('tourist:join', { tourist_id: user?.id });

    socket.on('trip:guide_location', ({ lat, lng }) => {
      setGuidePos({ lat: parseFloat(lat), lng: parseFloat(lng) });
    });

    socket.on('trip:ended', ({ final_fare }) => {
      setTrip(prev => ({ ...prev, status: 'completed', base_fare: final_fare }));
      setShowQR(true);
    });

    socket.on('trip:payment_confirmed', () => {
      navigate(`/guides/${trip?.guide_id}`);
    });

    return () => socket.disconnect();
  }, [tripId, user]);

  // Elapsed timer
  useEffect(() => {
    if (!trip?.started_at) return;
    const start = new Date(trip.started_at).getTime();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [trip?.started_at]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${m}:${String(s).padStart(2,'0')}`;
  };

  const paymentUrl = `${window.location.origin}/pay/${tripId}`;

  if (loading) return (
    <div className="ltv-loading">
      <div className="ltv-spinner" />
      <p>Loading trip...</p>
    </div>
  );

  return (
    <div className="live-trip-view">
      {/* Map */}
      <div className="ltv-map">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER}
            center={guidePos || { lat: 6.9271, lng: 79.8612 }}
            zoom={14}
            onLoad={map => { mapRef.current = map; }}
            options={{ disableDefaultUI: true, zoomControl: true }}
          >
            {guidePos && (
              <Marker
                position={guidePos}
                icon={{
                  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#34699A" stroke="white" stroke-width="3"/><text x="20" y="27" font-size="18" text-anchor="middle" fill="white">🚗</text></svg>')}`,
                  scaledSize: new window.google.maps.Size(40, 40),
                  anchor: new window.google.maps.Point(20, 20)
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="ltv-map-placeholder">
            <div className="ltv-spinner" />
          </div>
        )}
      </div>

      {/* Status overlay */}
      <div className="ltv-overlay">
        <div className="ltv-status-card">
          {/* Guide info */}
          <div className="ltv-guide-row">
            <div className="ltv-guide-avatar">
              {guide?.photo_url ? <img src={guide.photo_url} alt={guide.display_name} /> : '👤'}
            </div>
            <div className="ltv-guide-details">
              <span className="ltv-guide-name">{guide?.display_name || 'Your Guide'}</span>
              <span className={`ltv-trip-status ltv-status-${trip?.status}`}>
                {trip?.status === 'active' ? '● Trip in Progress' :
                 trip?.status === 'completed' ? '✓ Trip Completed' :
                 trip?.status === 'confirmed' ? '✓ Guide Confirmed' :
                 '⏳ Waiting for guide'}
              </span>
            </div>
          </div>

          {/* Stats */}
          {trip?.status === 'active' && (
            <div className="ltv-stats-row">
              <div className="ltv-stat">
                <span className="ltv-stat-label">Elapsed</span>
                <span className="ltv-stat-val">{formatTime(elapsed)}</span>
              </div>
              <div className="ltv-stat">
                <span className="ltv-stat-label">Distance</span>
                <span className="ltv-stat-val">{parseFloat(trip.distance_km || 0).toFixed(1)} km</span>
              </div>
              <div className="ltv-stat">
                <span className="ltv-stat-label">Est. Fare</span>
                <span className="ltv-stat-val ltv-fare">LKR {parseFloat(trip.base_fare || 0).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* QR payment */}
          {showQR && trip?.status === 'completed' && (
            <div className="ltv-qr-section">
              <h3>Scan to Pay</h3>
              <p>Final Fare: <strong>LKR {parseFloat(trip.base_fare || 0).toLocaleString()}</strong></p>
              <div className="ltv-qr-code">
                <QRCodeSVG value={paymentUrl} size={180} level="M" includeMargin />
              </div>
              <p className="ltv-qr-hint">Or tap below to open payment page</p>
              <button className="ltv-pay-btn" onClick={() => navigate(`/pay/${tripId}`)}>
                Pay Now →
              </button>
            </div>
          )}

          {/* Pending state */}
          {['pending', 'confirmed'].includes(trip?.status) && (
            <div className="ltv-pending-section">
              <div className="ltv-pending-dots"><span /><span /><span /></div>
              <p>{trip?.status === 'pending' ? 'Waiting for guide to accept your booking...' : 'Guide confirmed! They\'re on the way.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
