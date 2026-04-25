import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config';
import { calculateFare } from '../utils/fareCalculator';
import BookingConfirmModal from '../components/BookingConfirmModal';
import './GuideBooking.css';

const LIBRARIES = ['places'];
const MAP_CONTAINER = { width: '100%', height: '100%' };
const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 };

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_1km', label: 'Lowest 1km Price' },
  { value: 'price_5km', label: 'Lowest 5km Price' },
  { value: 'reviews', label: 'Most Reviews' },
];

const LANGUAGE_OPTIONS = ['Sinhala', 'Tamil', 'English', 'Japanese', 'Chinese', 'German', 'French'];
const REGION_OPTIONS = ['Colombo', 'Kandy', 'Galle', 'Ella', 'Sigiriya', 'Jaffna', 'Trincomalee', 'Anuradhapura', 'Nuwara Eliya'];

export default function GuideBooking({ user }) {
  const navigate = useNavigate();
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: LIBRARIES });

  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [hoveredGuide, setHoveredGuide] = useState(null);
  const [bookingGuide, setBookingGuide] = useState(null);

  const [destInput, setDestInput] = useState('');
  const [distanceKm, setDistanceKm] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const [sortBy, setSortBy] = useState('rating');
  const [filterLang, setFilterLang] = useState([]);
  const [filterRegion, setFilterRegion] = useState([]);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [maxPrice5km, setMaxPrice5km] = useState(5000);
  const [showFilters, setShowFilters] = useState(false);

  const mapRef = useRef(null);
  const destRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Load guides
  useEffect(() => {
    axios.get(`${API_BASE_URL}/guides/all`)
      .then(r => setGuides(r.data))
      .catch(() => setGuides([]))
      .finally(() => setLoading(false));
  }, []);

  // Google Places autocomplete for destination
  useEffect(() => {
    if (!isLoaded || !destRef.current) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(destRef.current, {
      componentRestrictions: { country: 'lk' },
      fields: ['geometry', 'name']
    });
    autocompleteRef.current.addListener('place_changed', handlePlaceSelected);
  }, [isLoaded]);

  const handlePlaceSelected = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry) return;
    const coords = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };
    setDestCoords(coords);
    setDestInput(place.name || '');
    calcDistances(coords);
  };

  const calcDistances = async (coords) => {
    if (!window.google || !mapRef.current) return;
    setCalcLoading(true);
    try {
      // Use Distance Matrix for first guide's origin as approximation; use map center
      const service = new window.google.maps.DistanceMatrixService();
      const origin = new window.google.maps.LatLng(6.9271, 79.8612); // Colombo default
      const destination = new window.google.maps.LatLng(coords.lat, coords.lng);
      service.getDistanceMatrix(
        { origins: [origin], destinations: [destination], travelMode: 'DRIVING', unitSystem: 0 },
        (resp, status) => {
          if (status === 'OK') {
            const meters = resp.rows[0]?.elements[0]?.distance?.value;
            if (meters) setDistanceKm(meters / 1000);
          }
          setCalcLoading(false);
        }
      );
    } catch {
      setCalcLoading(false);
    }
  };

  const onMapLoad = useCallback((map) => { mapRef.current = map; }, []);

  // Sort + filter
  const processedGuides = [...guides]
    .filter(g => {
      if (filterAvailable && !g.is_available) return false;
      if (filterLang.length > 0 && !filterLang.some(l => (g.languages || []).includes(l))) return false;
      if (filterRegion.length > 0 && !filterRegion.some(r => (g.speciality_regions || []).includes(r))) return false;
      if (parseFloat(g.tier_5km) > maxPrice5km) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return parseFloat(b.avg_rating || 0) - parseFloat(a.avg_rating || 0);
      if (sortBy === 'price_1km') return parseFloat(a.tier_1km) - parseFloat(b.tier_1km);
      if (sortBy === 'price_5km') return parseFloat(a.tier_5km) - parseFloat(b.tier_5km);
      if (sortBy === 'reviews') return (b.total_reviews || 0) - (a.total_reviews || 0);
      return 0;
    });

  const toggleLang = (l) => setFilterLang(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  const toggleRegion = (r) => setFilterRegion(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const guideMarkerIcon = (guide, isSelected) => ({
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 38 48">
        <ellipse cx="19" cy="45" rx="8" ry="3" fill="rgba(0,0,0,0.2)"/>
        <circle cx="19" cy="19" r="${isSelected ? 18 : 15}" fill="${isSelected ? '#FFCC00' : '#34699A'}" stroke="white" stroke-width="3"/>
        <text x="19" y="24" font-size="16" text-anchor="middle" fill="white">👤</text>
        ${guide.is_available ? '<circle cx="30" cy="8" r="6" fill="#22c55e" stroke="white" stroke-width="2"/>' : ''}
      </svg>
    `)}`,
    scaledSize: isLoaded ? new window.google.maps.Size(38, 48) : null,
    anchor: isLoaded ? new window.google.maps.Point(19, 48) : null,
  });

  return (
    <div className="guide-booking-page">
      {/* Sidebar */}
      <aside className="guide-sidebar">
        <div className="guide-sidebar-header">
          <h2>Find a Guide</h2>
          <span className="guide-count">{processedGuides.length} guides</span>
        </div>

        {/* Destination search */}
        <div className="dest-search-wrap">
          <div className="dest-search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input
            ref={destRef}
            type="text"
            className="dest-search-input"
            placeholder="Enter destination to estimate fare..."
            value={destInput}
            onChange={e => setDestInput(e.target.value)}
          />
          {calcLoading && <span className="dest-spinner" />}
        </div>

        {distanceKm && (
          <div className="dist-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/></svg>
            {distanceKm.toFixed(1)} km from Colombo
          </div>
        )}

        {/* Sort */}
        <div className="sort-row">
          <label className="sort-label">Sort by</label>
          <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="filter-toggle-btn" onClick={() => setShowFilters(f => !f)} title="Filters">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="filter-panel">
            <div className="filter-group">
              <label className="filter-group-label">Available Now</label>
              <label className="toggle-label">
                <input type="checkbox" checked={filterAvailable} onChange={e => setFilterAvailable(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="filter-group">
              <label className="filter-group-label">Max 5km Price: LKR {maxPrice5km.toLocaleString()}</label>
              <input type="range" min="200" max="5000" step="100" value={maxPrice5km} onChange={e => setMaxPrice5km(Number(e.target.value))} className="price-slider" />
            </div>
            <div className="filter-group">
              <label className="filter-group-label">Language</label>
              <div className="chip-group">
                {LANGUAGE_OPTIONS.map(l => (
                  <button key={l} className={`chip ${filterLang.includes(l) ? 'chip--active' : ''}`} onClick={() => toggleLang(l)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <label className="filter-group-label">Region</label>
              <div className="chip-group">
                {REGION_OPTIONS.map(r => (
                  <button key={r} className={`chip ${filterRegion.includes(r) ? 'chip--active' : ''}`} onClick={() => toggleRegion(r)}>{r}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Guide list */}
        <div className="guide-list">
          {loading ? (
            <div className="guide-list-loading">
              {[1,2,3].map(i => <div key={i} className="guide-card-skeleton" />)}
            </div>
          ) : processedGuides.length === 0 ? (
            <div className="guide-list-empty">
              <p>No guides found matching your filters.</p>
              <button onClick={() => { setFilterLang([]); setFilterRegion([]); setFilterAvailable(false); setMaxPrice5km(5000); }}>Clear filters</button>
            </div>
          ) : (
            processedGuides.map((guide, idx) => {
              const estimatedFare = distanceKm ? calculateFare(distanceKm, guide) : null;
              return (
                <div
                  key={guide.id}
                  className={`guide-card ${selectedGuide?.id === guide.id ? 'guide-card--selected' : ''}`}
                  style={{ '--delay': `${idx * 0.05}s` }}
                  onClick={() => setSelectedGuide(guide)}
                  onMouseEnter={() => setHoveredGuide(guide)}
                  onMouseLeave={() => setHoveredGuide(null)}
                >
                  <div className="guide-card-top">
                    <div className="guide-avatar-wrap">
                      {guide.photo_url ? (
                        <img src={guide.photo_url} alt={guide.display_name} className="guide-avatar" />
                      ) : (
                        <div className="guide-avatar-placeholder">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        </div>
                      )}
                      {guide.is_available && <span className="live-dot" title="Available now" />}
                    </div>
                    <div className="guide-card-info">
                      <h4 className="guide-card-name">{guide.display_name}</h4>
                      <div className="guide-card-rating">
                        <span className="stars">{'★'.repeat(Math.round(parseFloat(guide.avg_rating || 0)))}</span>
                        <span className="rating-val">{parseFloat(guide.avg_rating || 0).toFixed(1)}</span>
                        <span className="rating-count">({guide.total_reviews || 0})</span>
                      </div>
                      <div className="guide-card-langs">
                        {(guide.languages || []).slice(0, 3).map(l => (
                          <span key={l} className="lang-badge">{l}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="guide-card-pricing">
                    <span className="pricing-pill">LKR {parseFloat(guide.tier_1km).toLocaleString()} / 1km</span>
                    <span className="pricing-pill">LKR {parseFloat(guide.tier_5km).toLocaleString()} / 5km</span>
                  </div>

                  {estimatedFare !== null && (
                    <div className="guide-card-estimate">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/></svg>
                      Est. <strong>LKR {estimatedFare.toLocaleString()}</strong> for your trip
                    </div>
                  )}

                  {(guide.speciality_regions || []).length > 0 && (
                    <div className="guide-card-regions">
                      {guide.speciality_regions.slice(0, 3).map(r => (
                        <span key={r} className="region-tag">{r}</span>
                      ))}
                    </div>
                  )}

                  <div className="guide-card-actions">
                    <button className="btn-view-profile" onClick={e => { e.stopPropagation(); navigate(`/guides/${guide.id}`); }}>
                      View Profile
                    </button>
                    <button className="btn-book-now" onClick={e => { e.stopPropagation(); setBookingGuide(guide); }}>
                      Book Now
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="sidebar-register-cta">
          <p>Are you a local guide?</p>
          <button onClick={() => navigate('/guides/register')} className="btn-become-guide">
            Register as Guide
          </button>
        </div>
      </aside>

      {/* Map area */}
      <main className="guide-map-area">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER}
            center={SRI_LANKA_CENTER}
            zoom={8}
            onLoad={onMapLoad}
            options={{
              styles: [{ featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#ffffff' }] }],
              disableDefaultUI: false,
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
            }}
          >
            {processedGuides.map(guide => {
              const loc = guide.location;
              if (!loc) return null;
              return (
                <Marker
                  key={guide.id}
                  position={{ lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) }}
                  icon={guideMarkerIcon(guide, selectedGuide?.id === guide.id)}
                  onClick={() => setSelectedGuide(guide)}
                />
              );
            })}

            {selectedGuide && selectedGuide.location && (
              <InfoWindow
                position={{ lat: parseFloat(selectedGuide.location.lat), lng: parseFloat(selectedGuide.location.lng) }}
                onCloseClick={() => setSelectedGuide(null)}
              >
                <div className="map-info-window">
                  <strong>{selectedGuide.display_name}</strong>
                  <div>⭐ {parseFloat(selectedGuide.avg_rating || 0).toFixed(1)} · {selectedGuide.total_reviews || 0} reviews</div>
                  <div>LKR {parseFloat(selectedGuide.tier_1km).toLocaleString()} / 1km</div>
                  {distanceKm && <div>Est: LKR {calculateFare(distanceKm, selectedGuide).toLocaleString()}</div>}
                  <button onClick={() => setBookingGuide(selectedGuide)} style={{ marginTop: 6, background: '#FFCC00', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                    Book Now
                  </button>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div className="map-loading">
            <div className="map-loading-spinner" />
            <p>Loading map...</p>
          </div>
        )}

        {/* Register CTA overlay */}
        <div className="map-register-overlay">
          <button className="map-register-btn" onClick={() => navigate('/guides/register')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            Become a Guide
          </button>
        </div>
      </main>

      {/* Booking modal */}
      {bookingGuide && (
        <BookingConfirmModal
          guide={bookingGuide}
          user={user}
          distanceKm={distanceKm}
          destInput={destInput}
          onClose={() => setBookingGuide(null)}
          onBooked={(trip) => navigate(`/trip/live/${trip.id}`)}
        />
      )}
    </div>
  );
}
