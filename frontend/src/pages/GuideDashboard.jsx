import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { QRCodeSVG } from 'qrcode.react';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config';
import './GuideDashboard.css';

const TABS = ['Earnings', 'Trips', 'Payouts', 'Profile'];
const LIBRARIES = ['places'];
const BOOKING_MAP_STYLE = { width: '100%', height: 220, borderRadius: 12 };

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, parseInt(totalSeconds || 0, 10));
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateWaitingCharge(minutes, guide) {
  const mins = Math.max(0, parseFloat(minutes) || 0);
  const roundedMinutes = Math.round(mins * 100) / 100;
  const rate = key => parseFloat(guide?.[key]) || 0;
  let total = 0;

  if (roundedMinutes <= 10) total = rate('wait_rate_10m');
  else if (roundedMinutes <= 20) total = rate('wait_rate_20m');
  else if (roundedMinutes <= 30) total = rate('wait_rate_30m');
  else if (roundedMinutes <= 40) total = rate('wait_rate_40m');
  else if (roundedMinutes <= 60) total = rate('wait_rate_1h');
  else if (roundedMinutes <= 120) total = rate('wait_rate_2h');
  else if (roundedMinutes <= 180) total = rate('wait_rate_3h');
  else if (roundedMinutes <= 300) total = rate('wait_rate_5h');
  else {
    total = rate('wait_rate_5h');
    let remaining = roundedMinutes - 300;
    const hours = Math.floor(remaining / 60);
    total += hours * rate('wait_rate_per_hour');
    remaining = remaining % 60;
    const halfHours = Math.floor(remaining / 30);
    total += halfHours * rate('wait_rate_per_30m');
    remaining = remaining % 30;
    const quarterHours = Math.floor(remaining / 15);
    total += quarterHours * rate('wait_rate_per_15m');
  }

  return { minutes: roundedMinutes, charge_lkr: Math.round(total * 100) / 100 };
}

export default function GuideDashboard({ user }) {
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [trips, setTrips] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Earnings');
  const [notGuide, setNotGuide] = useState(false);
  const [liveToggling, setLiveToggling] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [liveFare, setLiveFare] = useState({
    elapsed_seconds: 0,
    distance_km: 0,
    base_fare: 0,
    waiting_charge: 0
  });
  const [waitingTotal, setWaitingTotal] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingStartedAt, setWaitingStartedAt] = useState(null);
  const [waitingPreview, setWaitingPreview] = useState({ minutes: 0, charge_lkr: 0 });
  const [waitingElapsed, setWaitingElapsed] = useState(0);
  const [stopPrompt, setStopPrompt] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [guidePos, setGuidePos] = useState(null);
  const [guideElapsed, setGuideElapsed] = useState(0);
  const [completedTripQR, setCompletedTripQR] = useState(null);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastCoordsRef = useRef(null);
  const distanceKmRef = useRef(0);
  const activeTripRef = useRef(null);

  const token = localStorage.getItem('token');
  const { isLoaded: mapsLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: LIBRARIES });

  useEffect(() => {
    axios.get(`${API_BASE_URL}/guides/me/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => {
      setGuide(r.data);
      return Promise.all([
        axios.get(`${API_BASE_URL}/guides/${r.data.id}/earnings`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/guides/${r.data.id}/trips`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/payouts/guide/${r.data.id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
    }).then(([e, t, p]) => {
      setEarnings(e.data);
      const sortedTrips = [...(t.data.trips || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setTrips(sortedTrips);
      const currentTrip = sortedTrips.find(trip => ['active', 'confirmed', 'pending'].includes(trip.status)) || null;
      setActiveTrip(currentTrip);
      if (currentTrip) {
        setWaitingTotal(parseFloat(currentTrip.waiting_charge_total || 0));
        setIsWaiting(!!currentTrip.is_waiting);
        setWaitingStartedAt(currentTrip.waiting_started_at || null);
      }
      setPayouts(p.data || []);
    }).catch(err => {
      if (err.response?.status === 404) setNotGuide(true);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  useEffect(() => {
    if (!guide?.id || socketRef.current) return;
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
      auth: { token }
    });
    socketRef.current = socket;
    socket.emit('guide:join', { guide_id: guide.id });

    socket.on('trip:fare_update', (payload) => {
      const currentTrip = activeTripRef.current;
      if (!currentTrip || String(payload.trip_id) !== String(currentTrip.id)) return;
      setLiveFare({
        elapsed_seconds: payload.elapsed_seconds,
        distance_km: payload.distance_km,
        base_fare: payload.base_fare,
        waiting_charge: payload.waiting_charge
      });
      setWaitingTotal(parseFloat(payload.waiting_charge || 0));
    });

    socket.on('trip:waiting_started', (payload) => {
      const currentTrip = activeTripRef.current;
      if (!currentTrip || String(payload.trip_id) !== String(currentTrip.id)) return;
      setIsWaiting(true);
      setWaitingStartedAt(payload.started_at);
    });

    socket.on('trip:waiting_stopped', (payload) => {
      const currentTrip = activeTripRef.current;
      if (!currentTrip || String(payload.trip_id) !== String(currentTrip.id)) return;
      setIsWaiting(false);
      setWaitingStartedAt(null);
      setWaitingTotal(parseFloat(payload.total || 0));
    });

    socket.on('trip:stop_detected', (payload) => {
      const currentTrip = activeTripRef.current;
      if (!currentTrip || String(payload.trip_id) !== String(currentTrip.id)) return;
      setStopPrompt(true);
    });

    socket.on('trip:payment_confirmed', () => {
      setCompletedTripQR(null);
    });

    socket.on('booking:new', (payload) => {
      axios.get(`${API_BASE_URL}/guide-trips/${payload.trip_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => {
        setActiveTrip(r.data);
        setTrips(prev => [r.data, ...prev.filter(t => t.id !== r.data.id)]);
      }).catch(() => {});
    });

    return () => socket.disconnect();
  }, [guide?.id]);

  useEffect(() => {
    if (!socketRef.current) return;
    if (activeTrip?.id) socketRef.current.emit('trip:join', { trip_id: activeTrip.id });
  }, [activeTrip?.id]);

  useEffect(() => {
    if (!activeTrip) {
      setIsWaiting(false);
      setWaitingStartedAt(null);
      setWaitingTotal(0);
      setWaitingElapsed(0);
      setWaitingPreview({ minutes: 0, charge_lkr: 0 });
      setLiveFare({ elapsed_seconds: 0, distance_km: 0, base_fare: 0, waiting_charge: 0 });
      setStopPrompt(false);
      return;
    }
    setIsWaiting(!!activeTrip.is_waiting);
    setWaitingStartedAt(activeTrip.waiting_started_at || null);
    setWaitingTotal(parseFloat(activeTrip.waiting_charge_total || 0));
    setStopPrompt(false);
  }, [activeTrip?.id]);

  useEffect(() => {
    if (!activeTrip || !['active', 'confirmed'].includes(activeTrip.status)) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGuidePos({ lat, lng });
        const last = lastCoordsRef.current;
        if (activeTrip.status === 'active' && last) {
          const delta = haversineKm(last.lat, last.lng, lat, lng);
          distanceKmRef.current = distanceKmRef.current + delta;
        }
        lastCoordsRef.current = { lat, lng };

        if (socketRef.current) {
          socketRef.current.emit('guide:location_update', {
            guide_id: guide?.id,
            lat,
            lng,
            accuracy: pos.coords.accuracy,
            trip_id: activeTrip.id,
            distance_km_total: activeTrip.status === 'active' ? distanceKmRef.current : 0
          });
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    watchIdRef.current = watchId;
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      lastCoordsRef.current = null;
      distanceKmRef.current = 0;
    };
  }, [activeTrip?.id, activeTrip?.status, guide?.id]);

  useEffect(() => {
    if (!isWaiting || !waitingStartedAt) return;
    const tick = () => {
      const started = new Date(waitingStartedAt).getTime();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
      setWaitingElapsed(elapsedSeconds);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isWaiting, waitingStartedAt]);

  useEffect(() => {
    if (!isWaiting || !waitingStartedAt) {
      setWaitingPreview({ minutes: 0, charge_lkr: 0 });
      return;
    }
    const updatePreview = () => {
      const minutes = (Date.now() - new Date(waitingStartedAt).getTime()) / 60000;
      setWaitingPreview(calculateWaitingCharge(minutes, guide));
    };
    updatePreview();
    const interval = setInterval(updatePreview, 10000);
    return () => clearInterval(interval);
  }, [isWaiting, waitingStartedAt, guide]);

  // Independent elapsed timer for active trip (not dependent on socket)
  useEffect(() => {
    if (!activeTrip?.started_at || activeTrip.status !== 'active') {
      setGuideElapsed(0);
      return;
    }
    const start = new Date(activeTrip.started_at).getTime();
    const tick = () => setGuideElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeTrip?.started_at, activeTrip?.status]);

  const toggleLive = async () => {
    if (!guide || !guide.is_verified) return;
    setLiveToggling(true);
    try {
      const newStatus = !guide.is_available;
      const payload = { is_available: newStatus };

      if (newStatus) {
        let pos;
        try {
          pos = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, enableHighAccuracy: true })
          );
        } catch {
          alert('Location access is required to go live.\n\nPlease allow location permission in your browser and try again.');
          return;
        }
        payload.lat = pos.coords.latitude;
        payload.lng = pos.coords.longitude;
      }

      await axios.put(`${API_BASE_URL}/guides/${guide.id}/availability`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGuide(g => ({ ...g, is_available: newStatus }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update availability');
    } finally {
      setLiveToggling(false);
    }
  };

  const acceptTrip = async () => {
    if (!activeTrip) return;
    try {
      const res = await axios.put(`${API_BASE_URL}/guide-trips/${activeTrip.id}/confirm`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveTrip(res.data);
      setTrips(prev => prev.map(t => (t.id === res.data.id ? res.data : t)));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept trip');
    }
  };

  const rejectTrip = async () => {
    if (!activeTrip) return;
    try {
      await axios.put(`${API_BASE_URL}/guide-trips/${activeTrip.id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveTrip(null);
      setTrips(prev => prev.filter(t => t.id !== activeTrip.id));
      setShowRejectConfirm(false);
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || 'Failed to reject trip';
      alert(msg);
      setShowRejectConfirm(false);
    }
  };

  const startTrip = async () => {
    if (!activeTrip) return;
    try {
      const res = await axios.put(`${API_BASE_URL}/guide-trips/${activeTrip.id}/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveTrip(res.data);
      setTrips(prev => prev.map(t => (t.id === res.data.id ? res.data : t)));
      setLiveFare({ elapsed_seconds: 0, distance_km: 0, base_fare: 0, waiting_charge: 0 });
      setWaitingTotal(parseFloat(res.data.waiting_charge_total || 0));
      distanceKmRef.current = 0;
      lastCoordsRef.current = null;
      setShowStartConfirm(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start trip');
    }
  };

  const endTrip = async () => {
    if (!activeTrip) return;
    try {
      const res = await axios.put(`${API_BASE_URL}/guide-trips/${activeTrip.id}/end`, {
        distance_km: distanceKmRef.current
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedTrip = res.data.trip;
      setTrips(prev => prev.map(t => (t.id === updatedTrip.id ? updatedTrip : t)));
      setActiveTrip(null);
      setLiveFare({ elapsed_seconds: 0, distance_km: 0, base_fare: 0, waiting_charge: 0 });
      setWaitingTotal(0);
      setIsWaiting(false);
      setWaitingStartedAt(null);
      setWaitingElapsed(0);
      setWaitingPreview({ minutes: 0, charge_lkr: 0 });
      setStopPrompt(false);
      setShowEndConfirm(false);
      // Show QR code for guide to present to tourist
      const paymentUrl = `${window.location.origin}/pay/${updatedTrip.id}`;
      setCompletedTripQR({
        tripId: updatedTrip.id,
        paymentUrl,
        baseFare: parseFloat(updatedTrip.base_fare || 0),
        waitingCharge: parseFloat(updatedTrip.waiting_charge_total || 0),
        distance: parseFloat(updatedTrip.distance_km || 0)
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to end trip');
    }
  };

  const startWaitingCharge = async () => {
    if (!activeTrip) return;
    try {
      const res = await axios.put(`${API_BASE_URL}/guide-trips/${activeTrip.id}/waiting/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveTrip(res.data);
      setIsWaiting(true);
      setWaitingStartedAt(res.data.waiting_started_at);
      setWaitingTotal(parseFloat(res.data.waiting_charge_total || 0));
      setStopPrompt(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start waiting charge');
    }
  };

  const stopWaitingCharge = async () => {
    if (!activeTrip) return;
    try {
      const res = await axios.put(`${API_BASE_URL}/guide-trips/${activeTrip.id}/waiting/stop`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveTrip(res.data);
      setIsWaiting(false);
      setWaitingStartedAt(null);
      setWaitingTotal(parseFloat(res.data.waiting_charge_total || 0));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to stop waiting charge');
    }
  };

  if (loading) return (
    <div className="gd-loading"><div className="gd-spinner" /></div>
  );

  if (notGuide) return (
    <div className="gd-not-guide">
      <div className="gd-not-guide-card">
        <h2>You're not registered as a guide</h2>
        <p>Join Mr. Guide as a local guide and start earning!</p>
        <button onClick={() => navigate('/guides/register')} className="gd-register-btn">Register as Guide</button>
      </div>
    </div>
  );

  return (
    <div className="guide-dashboard">
      {activeTrip && (
        <div className="gd-live-trip">
          <div className="gd-live-trip-card">
            <div className="gd-live-trip-header">
              <div>
                <h2>Active Trip</h2>
                <p>{activeTrip.tourist?.username || 'Tourist'} · {activeTrip.origin_address || 'Origin'} → {activeTrip.dest_address || 'Destination'}</p>
              </div>
              <span className={`status-badge status-${activeTrip.status}`}>{activeTrip.status}</span>
            </div>

            {activeTrip.status === 'active' && (
              <div className="gd-active-section">
                {/* Live map */}
                {mapsLoaded && (
                  <div className="gd-booking-map-wrap">
                    <GoogleMap
                      mapContainerStyle={BOOKING_MAP_STYLE}
                      center={guidePos || { lat: 6.9271, lng: 79.8612 }}
                      zoom={15}
                      options={{ disableDefaultUI: true, zoomControl: true }}
                    >
                      {guidePos && (
                        <Marker
                          position={guidePos}
                          icon={{
                            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#34699A" stroke="white" stroke-width="3"/><text x="20" y="27" font-size="18" text-anchor="middle">🚗</text></svg>')}`,
                            scaledSize: new window.google.maps.Size(40, 40),
                            anchor: new window.google.maps.Point(20, 20)
                          }}
                        />
                      )}
                    </GoogleMap>
                    <p className="gd-booking-map-label">Your live position</p>
                  </div>
                )}

                {/* Fare stats */}
                <div className="gd-fare-panel">
                  <div className="gd-fare-item">
                    <span>Elapsed Time</span>
                    <strong>{formatDuration(guideElapsed)}</strong>
                  </div>
                  <div className="gd-fare-item">
                    <span>Distance</span>
                    <strong>{parseFloat(liveFare.distance_km || 0).toFixed(2)} km</strong>
                  </div>
                  <div className="gd-fare-item">
                    <span>Base Fare</span>
                    <strong>LKR {parseFloat(liveFare.base_fare || activeTrip.base_fare || 0).toLocaleString()}</strong>
                  </div>
                  <div className="gd-fare-item">
                    <span>Waiting Charge</span>
                    <strong>LKR {parseFloat(waitingTotal || 0).toLocaleString()}</strong>
                  </div>
                  <div className="gd-fare-item gd-fare-total">
                    <span>Running Total</span>
                    <strong>LKR {(parseFloat(liveFare.base_fare || activeTrip.base_fare || 0) + parseFloat(waitingTotal || 0)).toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            )}

            {activeTrip.status === 'pending' && (
              <div className="gd-booking-request">
                {mapsLoaded && activeTrip.origin_lat && (
                  <div className="gd-booking-map-wrap">
                    <GoogleMap
                      mapContainerStyle={BOOKING_MAP_STYLE}
                      center={{ lat: parseFloat(activeTrip.origin_lat), lng: parseFloat(activeTrip.origin_lng) }}
                      zoom={14}
                      options={{ disableDefaultUI: true, zoomControl: true }}
                    >
                      <Marker
                        position={{ lat: parseFloat(activeTrip.origin_lat), lng: parseFloat(activeTrip.origin_lng) }}
                        icon={{
                          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#FFCC00" stroke="white" stroke-width="2.5"/><text x="18" y="24" font-size="16" text-anchor="middle">👤</text></svg>')}`,
                          scaledSize: new window.google.maps.Size(36, 36),
                          anchor: new window.google.maps.Point(18, 18)
                        }}
                      />
                    </GoogleMap>
                    <p className="gd-booking-map-label">Tourist pickup location</p>
                  </div>
                )}
                <div className="gd-booking-actions">
                  <button className="gd-trip-btn gd-trip-btn--reject" onClick={() => setShowRejectConfirm(true)}>
                    Reject
                  </button>
                  <button className="gd-trip-btn gd-trip-btn--accept" onClick={acceptTrip}>
                    Accept Trip
                  </button>
                </div>
              </div>
            )}

            {activeTrip.status === 'confirmed' && (
              <div className="gd-confirmed-section">
                {mapsLoaded && (
                  <div className="gd-booking-map-wrap">
                    <GoogleMap
                      mapContainerStyle={BOOKING_MAP_STYLE}
                      center={
                        guidePos ||
                        (activeTrip.origin_lat
                          ? { lat: parseFloat(activeTrip.origin_lat), lng: parseFloat(activeTrip.origin_lng) }
                          : { lat: 6.9271, lng: 79.8612 })
                      }
                      zoom={13}
                      options={{ disableDefaultUI: true, zoomControl: true }}
                    >
                      {activeTrip.origin_lat && (
                        <Marker
                          position={{ lat: parseFloat(activeTrip.origin_lat), lng: parseFloat(activeTrip.origin_lng) }}
                          icon={{
                            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#FFCC00" stroke="white" stroke-width="2.5"/><text x="18" y="24" font-size="16" text-anchor="middle">📍</text></svg>')}`,
                            scaledSize: new window.google.maps.Size(36, 36),
                            anchor: new window.google.maps.Point(18, 18)
                          }}
                        />
                      )}
                      {guidePos && (
                        <Marker
                          position={guidePos}
                          icon={{
                            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#34699A" stroke="white" stroke-width="2.5"/><text x="18" y="24" font-size="16" text-anchor="middle">🚗</text></svg>')}`,
                            scaledSize: new window.google.maps.Size(36, 36),
                            anchor: new window.google.maps.Point(18, 18)
                          }}
                        />
                      )}
                    </GoogleMap>
                    <p className="gd-booking-map-label">Head to tourist · 📍 = pickup point · 🚗 = you</p>
                  </div>
                )}
                <button className="gd-trip-btn gd-trip-btn--start gd-trip-btn--full" onClick={() => setShowStartConfirm(true)}>
                  I've Arrived — Start Trip
                </button>
              </div>
            )}

            {activeTrip.status === 'active' && (
              <div className="gd-waiting-card">
                <div className="gd-waiting-header">
                  <div>
                    <h3>Waiting Charges</h3>
                    <span className={`gd-waiting-status ${isWaiting ? 'gd-waiting-status--on' : 'gd-waiting-status--off'}`}>
                      {isWaiting ? 'Stopped - Charging' : 'Traveling'}
                    </span>
                  </div>
                  <div className="gd-waiting-total">
                    Total: LKR {parseFloat(waitingTotal || 0).toLocaleString()}
                  </div>
                </div>

                <div className="gd-waiting-body">
                  <div className="gd-waiting-metrics">
                    <div>
                      <span>Current Stop</span>
                      <strong>{formatDuration(waitingElapsed)}</strong>
                    </div>
                    <div>
                      <span>Current Charge</span>
                      <strong>LKR {parseFloat(waitingPreview.charge_lkr || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                  <div className="gd-waiting-actions">
                    {!isWaiting && (
                      <button className="gd-trip-btn gd-trip-btn--wait" onClick={startWaitingCharge}>
                        Start Waiting Charge
                      </button>
                    )}
                    {isWaiting && (
                      <button className="gd-trip-btn gd-trip-btn--stop" onClick={stopWaitingCharge}>
                        Stop Waiting Charge
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {stopPrompt && activeTrip.status === 'active' && (
              <div className="gd-stop-toast">
                <div>
                  <strong>You've been stopped for 4 minutes.</strong>
                  <span>Add a waiting charge?</span>
                </div>
                <div className="gd-stop-actions">
                  <button className="gd-trip-btn gd-trip-btn--wait" onClick={startWaitingCharge}>Add Charge</button>
                  <button className="gd-trip-btn gd-trip-btn--ghost" onClick={() => setStopPrompt(false)}>Dismiss</button>
                </div>
              </div>
            )}

            {activeTrip.status === 'active' && (
              <button className="gd-trip-btn gd-trip-btn--end gd-trip-btn--full" onClick={() => setShowEndConfirm(true)}>
                End Trip
              </button>
            )}
          </div>
        </div>
      )}

      {/* Guide QR panel — shown after trip ends until tourist pays */}
      {completedTripQR && (
        <div className="gd-qr-panel">
          <div className="gd-qr-card">
            <div className="gd-qr-header">
              <div>
                <h3>Trip Completed — Awaiting Payment</h3>
                <p>Show this QR code to your tourist to scan and pay</p>
              </div>
              <button className="gd-qr-dismiss" onClick={() => setCompletedTripQR(null)}>✕</button>
            </div>
            <div className="gd-qr-body">
              <div className="gd-qr-code-wrap">
                <QRCodeSVG value={completedTripQR.paymentUrl} size={180} level="M" includeMargin />
              </div>
              <div className="gd-qr-details">
                <div className="gd-qr-row"><span>Distance</span><strong>{completedTripQR.distance.toFixed(2)} km</strong></div>
                <div className="gd-qr-row"><span>Base Fare</span><strong>LKR {completedTripQR.baseFare.toLocaleString()}</strong></div>
                {completedTripQR.waitingCharge > 0 && (
                  <div className="gd-qr-row"><span>Waiting</span><strong>LKR {completedTripQR.waitingCharge.toLocaleString()}</strong></div>
                )}
                <div className="gd-qr-row gd-qr-total"><span>Total</span><strong>LKR {(completedTripQR.baseFare + completedTripQR.waitingCharge).toLocaleString()}</strong></div>
                <button className="gd-trip-btn gd-trip-btn--start" style={{width:'100%',marginTop:8}} onClick={() => window.open(completedTripQR.paymentUrl, '_blank')}>
                  Open Payment Page ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="gd-header">
        <div className="gd-header-inner">
          <div className="gd-hero-info">
            <div className="gd-avatar">
              {guide?.photo_url ? <img src={guide.photo_url} alt="" /> : '👤'}
            </div>
            <div>
              <h1>{guide?.display_name}</h1>
              <div className="gd-status-row">
                {guide?.is_verified ? (
                  <span className="gd-badge gd-badge--verified">✓ Verified Guide</span>
                ) : (
                  <span className="gd-badge gd-badge--pending">⏳ Pending Verification</span>
                )}
                <span className={`gd-badge ${guide?.is_available ? 'gd-badge--live' : 'gd-badge--offline'}`}>
                  {guide?.is_available ? '● Live' : '○ Offline'}
                </span>
              </div>
            </div>
          </div>

          {guide?.is_verified && (
            <button
              className={`gd-live-toggle ${guide.is_available ? 'gd-live-toggle--on' : ''}`}
              onClick={toggleLive}
              disabled={liveToggling}
            >
              {liveToggling ? <span className="gd-toggle-spinner" /> : null}
              {guide.is_available ? 'Go Offline' : 'Go Live'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="gd-tabs">
        {TABS.map(t => (
          <button key={t} className={`gd-tab ${tab === t ? 'gd-tab--active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="gd-content">
        {/* Earnings tab */}
        {tab === 'Earnings' && earnings && (
          <div className="gd-section-grid">
            {[
              { label: 'This Week', data: earnings.week },
              { label: 'This Month', data: earnings.month },
              { label: 'All Time', data: earnings.all_time }
            ].map(({ label, data }) => (
              <div key={label} className="gd-earnings-card">
                <h3>{label}</h3>
                <div className="gd-earnings-base">LKR {parseFloat(data.base || 0).toLocaleString()}</div>
                <div className="gd-earnings-breakdown">
                  <span>Tips: LKR {parseFloat(data.tips || 0).toLocaleString()}</span>
                  <span>{data.trips} trips</span>
                </div>
              </div>
            ))}
            <div className="gd-earnings-card gd-commission-card">
              <h3>Cash Commission Owed</h3>
              <div className="gd-earnings-base gd-commission-val">
                LKR {parseFloat(earnings.pending_cash_commission || 0).toLocaleString()}
              </div>
              <div className="gd-earnings-breakdown"><span>Will be deducted from next payout</span></div>
            </div>
          </div>
        )}

        {/* Trips tab */}
        {tab === 'Trips' && (
          <div className="gd-table-wrap">
            {trips.length === 0 ? (
              <div className="gd-empty">No trips yet.</div>
            ) : (
              <table className="gd-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Tourist</th>
                    <th>Distance</th>
                    <th>Base Fare</th>
                    <th>Tip</th>
                    <th>Method</th>
                    <th>Guide (95%)</th>
                    <th>Platform (5%)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map(t => (
                    <tr key={t.id}>
                      <td>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td>{t.tourist?.username || '—'}</td>
                      <td>{parseFloat(t.distance_km || 0).toFixed(1)} km</td>
                      <td>LKR {parseFloat(t.base_fare || 0).toLocaleString()}</td>
                      <td>LKR {parseFloat(t.tip_amount || 0).toLocaleString()}</td>
                      <td><span className={`method-badge method-${t.payment_method}`}>{t.payment_method || '—'}</span></td>
                      <td className="gd-guide-share">LKR {parseFloat(t.guide_earnings || 0).toLocaleString()}</td>
                      <td className="gd-platform-share">LKR {parseFloat(t.platform_commission || 0).toLocaleString()}</td>
                      <td><span className={`status-badge status-${t.status}`}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Payouts tab */}
        {tab === 'Payouts' && (
          <div className="gd-table-wrap">
            {payouts.length === 0 ? (
              <div className="gd-empty">No payouts yet. Payouts are processed weekly every Monday.</div>
            ) : (
              <table className="gd-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>QR Fares</th>
                    <th>Tips</th>
                    <th>Commission (5%)</th>
                    <th>Cash Comm. Deducted</th>
                    <th>Net Payout</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p.id}>
                      <td>{p.period_start} → {p.period_end}</td>
                      <td>LKR {parseFloat(p.qr_base_total || 0).toLocaleString()}</td>
                      <td>LKR {parseFloat(p.tips_total || 0).toLocaleString()}</td>
                      <td className="gd-platform-share">LKR {parseFloat(p.qr_commission || 0).toLocaleString()}</td>
                      <td>LKR {parseFloat(p.cash_commission_recovered || 0).toLocaleString()}</td>
                      <td className="gd-guide-share"><strong>LKR {parseFloat(p.net_payout || 0).toLocaleString()}</strong></td>
                      <td><span className={`status-badge status-${p.status}`}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Profile tab */}
        {tab === 'Profile' && guide && (
          <div className="gd-profile-section">
            <div className="gd-profile-grid">
              <div className="gd-profile-field"><label>Display Name</label><span>{guide.display_name}</span></div>
              <div className="gd-profile-field"><label>Phone</label><span>{guide.phone || '—'}</span></div>
              <div className="gd-profile-field"><label>Languages</label><span>{(guide.languages || []).join(', ') || '—'}</span></div>
              <div className="gd-profile-field"><label>Regions</label><span>{(guide.speciality_regions || []).join(', ') || '—'}</span></div>
              <div className="gd-profile-field"><label>1km Fare</label><span>LKR {parseFloat(guide.tier_1km || 0).toLocaleString()}</span></div>
              <div className="gd-profile-field"><label>5km Fare</label><span>LKR {parseFloat(guide.tier_5km || 0).toLocaleString()}</span></div>
              <div className="gd-profile-field"><label>10km Fare</label><span>LKR {parseFloat(guide.tier_10km || 0).toLocaleString()}</span></div>
              <div className="gd-profile-field"><label>20km Fare</label><span>LKR {parseFloat(guide.tier_20km || 0).toLocaleString()}</span></div>
              <div className="gd-profile-field"><label>Extra /km over 20</label><span>LKR {parseFloat(guide.tier_per_km_over20 || 0).toLocaleString()}</span></div>
              <div className="gd-profile-field"><label>Bank</label><span>{guide.bank_name || '—'}</span></div>
              <div className="gd-profile-field"><label>Rating</label><span>⭐ {parseFloat(guide.avg_rating || 0).toFixed(1)} ({guide.total_reviews || 0} reviews)</span></div>
            </div>
            <button className="gd-edit-profile-btn" onClick={() => navigate(`/guides/${guide.id}`)}>
              View Public Profile →
            </button>
          </div>
        )}
      </div>

      {showStartConfirm && activeTrip && (
        <div className="gd-modal-backdrop" onClick={() => setShowStartConfirm(false)}>
          <div className="gd-modal" onClick={e => e.stopPropagation()}>
            <h3>Are you sure you want to start the trip?</h3>
            <div className="gd-modal-body">
              <p><strong>Tourist:</strong> {activeTrip.tourist?.username || 'Tourist'}</p>
              <p><strong>Route:</strong> {activeTrip.origin_address || 'Origin'} → {activeTrip.dest_address || 'Destination'}</p>
              <p><strong>Estimated distance:</strong> {parseFloat(activeTrip.distance_km || 0).toFixed(2)} km</p>
              <p><strong>Estimated fare:</strong> LKR {parseFloat(activeTrip.base_fare || 0).toLocaleString()}</p>
            </div>
            <div className="gd-modal-actions">
              <button className="gd-trip-btn gd-trip-btn--ghost" onClick={() => setShowStartConfirm(false)}>Cancel</button>
              <button className="gd-trip-btn gd-trip-btn--start" onClick={startTrip}>Yes, Start Trip</button>
            </div>
          </div>
        </div>
      )}

      {showEndConfirm && activeTrip && (
        <div className="gd-modal-backdrop" onClick={() => setShowEndConfirm(false)}>
          <div className="gd-modal" onClick={e => e.stopPropagation()}>
            <h3>Are you sure you want to end the trip?</h3>
            <div className="gd-modal-body">
              <p><strong>Elapsed time:</strong> {formatDuration(guideElapsed)}</p>
              <p><strong>Distance tracked:</strong> {distanceKmRef.current.toFixed(2)} km</p>
              <p><strong>Current fare:</strong> LKR {(parseFloat(liveFare.base_fare || activeTrip.base_fare || 0) + parseFloat(waitingTotal || 0)).toLocaleString()}</p>
            </div>
            <div className="gd-modal-actions">
              <button className="gd-trip-btn gd-trip-btn--ghost" onClick={() => setShowEndConfirm(false)}>Cancel</button>
              <button className="gd-trip-btn gd-trip-btn--end" onClick={endTrip}>Yes, End Trip</button>
            </div>
          </div>
        </div>
      )}

      {showRejectConfirm && activeTrip && (
        <div className="gd-modal-backdrop" onClick={() => setShowRejectConfirm(false)}>
          <div className="gd-modal" onClick={e => e.stopPropagation()}>
            <h3>Reject this booking?</h3>
            <div className="gd-modal-body">
              <p><strong>Tourist:</strong> {activeTrip.tourist?.username || 'Tourist'}</p>
              <p><strong>From:</strong> {activeTrip.origin_address || '—'}</p>
              <p><strong>To:</strong> {activeTrip.dest_address || '—'}</p>
            </div>
            <div className="gd-modal-actions">
              <button className="gd-trip-btn gd-trip-btn--ghost" onClick={() => setShowRejectConfirm(false)}>Cancel</button>
              <button className="gd-trip-btn gd-trip-btn--reject" onClick={rejectTrip}>Yes, Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
