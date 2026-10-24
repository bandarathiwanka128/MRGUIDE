import React, { useCallback, useEffect, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '../../config';
import { useMapTheme } from '../../utils/mapTheme';
import api from '../api/axios';
import Header from '../components/Header';

const LIBRARIES = ['places'];
const CENTER = { lat: 7.8731, lng: 80.7718 };
const money = value => `LKR ${Number(value || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;
const duration = started => {
  if (!started) return 'Not started';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(started).getTime()) / 1000));
  return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s`;
};

export default function AdminLiveTrips() {
  const [trips, setTrips] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);
  const mapTheme = useMapTheme();
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: LIBRARIES });
  const load = useCallback(async () => {
    setLoading(true);
    try { setTrips((await api.get('/guides/trips/live')).data); setError(''); }
    catch (err) { setError(err.response?.data?.error || 'Unable to load live trips.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    load();
    const poll = setInterval(load, 10000);
    const clock = setInterval(() => setTick(value => value + 1), 1000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [load]);
  const trip = trips.find(item => item.id === selected);
  return <>
    <Header title="Live trips" subtitle={`${trips.length} active trips. Refreshes every 10 seconds.`} actions={<button className="btn btn-primary" disabled={loading} onClick={load}>Refresh</button>} />
    <div className="page-content">
      {error && <p className="note-box warning" role="alert">{error}</p>}
      <div className="admin-live-grid">
        <div className="card" style={{ overflow: 'hidden', minHeight: 400 }}>
          {loadError ? <p className="empty-state">The map could not load. Trip details remain available.</p> : isLoaded ? <GoogleMap mapContainerStyle={{ width: '100%', height: '100%', minHeight: 400 }} center={trip && trip.guide_lat != null ? { lat: Number(trip.guide_lat), lng: Number(trip.guide_lng) } : CENTER} zoom={trip ? 12 : 8} options={{ styles: mapTheme.styles, streetViewControl: false, mapTypeControl: false }}>
            {trips.filter(item => item.guide_lat != null && item.guide_lng != null).map(item => <Marker key={item.id} position={{ lat: Number(item.guide_lat), lng: Number(item.guide_lng) }} title={`${item.guide_name} - trip ${item.id}`} onClick={() => setSelected(item.id)} />)}
          </GoogleMap> : <p className="empty-state" role="status">Loading map...</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 600, overflowY: 'auto' }}>
          {!trips.length && <p className="empty-state">{loading ? 'Loading trips...' : 'No active trips.'}</p>}
          {trips.map(item => <button type="button" key={item.id} className="card" onClick={() => setSelected(selected === item.id ? null : item.id)} aria-pressed={selected === item.id} style={{ padding: 18, textAlign: 'left', borderColor: selected === item.id ? 'var(--accent-ink)' : 'var(--border)' }}>
            <strong>{item.guide_name || 'Guide'}</strong><span className={`badge ${item.is_waiting ? 'badge-warning' : 'badge-success'}`} style={{ marginLeft: 8 }}>{item.is_waiting ? 'Waiting' : 'Active'}</span>
            <p style={{ color: 'var(--text-2)', margin: '8px 0' }}>Tourist: {item.tourist_name || 'Unknown'}</p>
            <small>{duration(item.started_at)} ? {Number(item.distance_km || 0).toFixed(1)} km</small>
            <p style={{ marginTop: 8, color: 'var(--accent-ink)', fontWeight: 700 }}>{money(Number(item.base_fare || 0) + Number(item.waiting_charge_total || 0))}</p>
          </button>)}
        </div>
      </div>
      {trip && <section className="card" style={{ padding: 24, marginTop: 24 }}>
        <h2 className="section-title">Trip details</h2>
        <div className="detail-grid">{[
          ['Trip ID', trip.id], ['Guide', trip.guide_name], ['Tourist', trip.tourist_name],
          ['Distance', `${Number(trip.distance_km || 0).toFixed(2)} km`], ['Base fare', money(trip.base_fare)],
          ['Waiting charge', money(trip.waiting_charge_total)], ['Total fare', money(Number(trip.base_fare || 0) + Number(trip.waiting_charge_total || 0))],
          ['Payment', trip.payment_method || 'Pending'], ['Duration', duration(trip.started_at)],
          ['Status', trip.is_waiting ? 'Waiting' : 'Traveling'], ['Origin', trip.origin_address], ['Destination', trip.dest_address],
        ].map(([label, value]) => <div className="detail-item" key={label}><label>{label}</label><p>{value ?? 'Unavailable'}</p></div>)}</div>
        {!!trip.waiting_sessions?.length && <><h3 className="section-title" style={{ marginTop: 24 }}>Stop sessions</h3><div className="table-wrap"><table><thead><tr><th>Stop</th><th>Started</th><th>Ended</th><th>Minutes</th><th>Charge</th></tr></thead><tbody>
          {trip.waiting_sessions.map((session, index) => <tr key={index}><td>{index + 1}</td><td>{session.start ? new Date(session.start).toLocaleTimeString() : 'Unavailable'}</td><td>{session.end ? new Date(session.end).toLocaleTimeString() : 'In progress'}</td><td>{Number(session.minutes || 0).toFixed(1)}</td><td>{money(session.charge_lkr)}</td></tr>)}
        </tbody></table></div></>}
      </section>}
    </div>
  </>;
}
