import { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '../config';
import './ShortestPath.css';

const LIBRARIES = ['places'];
const SRI_LANKA_BOUNDS = { south: 5.916, north: 9.835, west: 79.652, east: 81.879 };
const MAP_CENTER = { lat: 7.8731, lng: 80.7718 };
const GOOGLE_TRAVEL_MODES = { car: 'DRIVING', bus: 'TRANSIT', train: 'TRANSIT', walk: 'WALKING' };

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'tourism', label: 'Tourism' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'museum', label: 'Museum' },
  { value: 'temple', label: 'Temple' },
  { value: 'beach', label: 'Beach' },
  { value: 'park', label: 'Park' },
  { value: 'shopping', label: 'Shopping' },
];

const TRAVEL_MODES = [
  { id: 'car', label: 'Car', svgPath: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z' },
  { id: 'bus', label: 'Bus', svgPath: 'M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z' },
  { id: 'train', label: 'Train', svgPath: 'M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H6V6h5v5zm2 0V6h5v5h-5zm3.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z' },
  { id: 'walk', label: 'Walk', svgPath: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7' }
];

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nearest-neighbor TSP from a given origin
function nearestNeighborTSP(originLat, originLng, stops) {
  if (stops.length === 0) return [];
  const unvisited = [...stops];
  const result = [];
  let curLat = originLat, curLng = originLng;
  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = haversine(curLat, curLng, unvisited[0].lat, unvisited[0].lng);
    for (let i = 1; i < unvisited.length; i++) {
      const d = haversine(curLat, curLng, unvisited[i].lat, unvisited[i].lng);
      if (d < minDist) { minDist = d; nearestIdx = i; }
    }
    result.push(unvisited[nearestIdx]);
    curLat = unvisited[nearestIdx].lat;
    curLng = unvisited[nearestIdx].lng;
    unvisited.splice(nearestIdx, 1);
  }
  return result;
}

const TravelModeIcon = ({ path }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d={path} /></svg>
);

const StarRating = ({ rating }) => {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <span className="sp-stars">
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(empty)}
      <span className="sp-rating-val">{rating.toFixed(1)}</span>
    </span>
  );
};

const ShortestPath = () => {
  const { isLoaded } = useLoadScript({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: LIBRARIES });

  const [locations, setLocations] = useState([]);
  const [startLocation, setStartLocation] = useState(null);
  const [startSearch, setStartSearch] = useState('');
  const [startResults, setStartResults] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');

  const [sortMode, setSortMode] = useState('manual');
  const [filterCategory, setFilterCategory] = useState('');
  const [travelMode, setTravelMode] = useState('car');

  const [directionsResult, setDirectionsResult] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [directions, setDirections] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showDirections, setShowDirections] = useState(false);

  const [selectedMarker, setSelectedMarker] = useState(null);
  const [placeDetails, setPlaceDetails] = useState({});

  const mapRef = useRef(null);
  const nextIdRef = useRef(1);

  const generateId = () => { const id = nextIdRef.current; nextIdRef.current += 1; return id; };

  // ─── Sorted / displayed locations ─────────────────────────────────────────
  const getSortedLocations = useCallback(() => {
    let filtered = [...locations];
    if (filterCategory) {
      filtered = filtered.filter(l => l.category?.toLowerCase().includes(filterCategory.toLowerCase()));
    }
    if (sortMode === 'rating') {
      return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    if (sortMode === 'shortest') {
      const origin = startLocation || (filtered[0] || null);
      if (origin && filtered.length >= 1) {
        return nearestNeighborTSP(origin.lat, origin.lng, filtered);
      }
    }
    return filtered;
  }, [locations, sortMode, filterCategory, startLocation]);

  // Full route including start
  const getFullRoute = useCallback(() => {
    const sorted = getSortedLocations();
    return startLocation ? [{ ...startLocation, id: 'start', isStart: true }, ...sorted] : sorted;
  }, [getSortedLocations, startLocation]);

  // ─── Map fit ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    if (directionsResult) return;
    const route = getFullRoute();
    if (route.length === 0) return;
    if (route.length === 1) {
      mapRef.current.setCenter({ lat: route[0].lat, lng: route[0].lng });
      mapRef.current.setZoom(13);
    } else {
      const bounds = new window.google.maps.LatLngBounds();
      route.forEach(l => bounds.extend({ lat: l.lat, lng: l.lng }));
      mapRef.current.fitBounds(bounds, { padding: 60 });
      window.google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
        if (mapRef.current.getZoom() > 13) mapRef.current.setZoom(13);
      });
    }
  }, [locations, startLocation, isLoaded, directionsResult, getFullRoute]);

  // ─── Google Places search ──────────────────────────────────────────────────
  const doSearch = useCallback((query, setResults, setLoading) => {
    if (!query.trim() || !mapRef.current) return;
    setLoading(true);
    const service = new window.google.maps.places.PlacesService(mapRef.current);
    service.textSearch(
      {
        query: query + ' Sri Lanka',
        bounds: new window.google.maps.LatLngBounds(
          { lat: SRI_LANKA_BOUNDS.south, lng: SRI_LANKA_BOUNDS.west },
          { lat: SRI_LANKA_BOUNDS.north, lng: SRI_LANKA_BOUNDS.east }
        )
      },
      (results, status) => {
        setLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.length) {
          const filtered = results
            .filter(r => {
              const lat = r.geometry.location.lat(), lng = r.geometry.location.lng();
              return lat >= SRI_LANKA_BOUNDS.south && lat <= SRI_LANKA_BOUNDS.north &&
                     lng >= SRI_LANKA_BOUNDS.west && lng <= SRI_LANKA_BOUNDS.east;
            })
            .slice(0, 8)
            .map((r, i) => ({
              id: r.place_id || `r-${i}`,
              placeId: r.place_id,
              name: r.name,
              lat: r.geometry.location.lat(),
              lng: r.geometry.location.lng(),
              address: r.formatted_address || '',
              category: r.types?.[0]?.replace(/_/g, ' ') || 'place',
              rating: r.rating || null,
              userRatingsTotal: r.user_ratings_total || 0,
              priceLevel: r.price_level ?? null,
              openNow: r.opening_hours?.isOpen?.() ?? null
            }));
          setResults(filtered);
        } else {
          setResults([]);
        }
      }
    );
  }, []);

  // ─── GPS current location ─────────────────────────────────────────────────
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setSearchStatus('Geolocation not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          setGpsLoading(false);
          const address = (status === 'OK' && results?.[0])
            ? results[0].formatted_address
            : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setStartLocation({ id: 'start', name: 'My Location', address, lat, lng, isStart: true });
          setStartSearch('My Location');
          clearRoute();
        });
      },
      () => {
        setGpsLoading(false);
        setSearchStatus('Could not get your location. Please allow location access.');
      }
    );
  };

  // ─── Add stop ─────────────────────────────────────────────────────────────
  const addLocationFromSearch = (result) => {
    if (locations.length >= 20) { setSearchStatus('Maximum 20 stops allowed.'); return; }
    setLocations(prev => [...prev, { ...result, id: generateId() }]);
    setSearchResults([]);
    setSearchQuery('');
    setSearchStatus(`Added: ${result.name}`);
    clearRoute();
  };

  // ─── Map click ────────────────────────────────────────────────────────────
  const handleMapClick = useCallback((e) => {
    if (locations.length >= 20) return;
    const lat = e.latLng.lat(), lng = e.latLng.lng();
    if (lat < SRI_LANKA_BOUNDS.south || lat > SRI_LANKA_BOUNDS.north ||
        lng < SRI_LANKA_BOUNDS.west || lng > SRI_LANKA_BOUNDS.east) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      let name = `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      let address = '';
      if (status === 'OK' && results?.[0]) {
        const c = results[0].address_components;
        const poi = c?.find(x => x.types.includes('point_of_interest'));
        const route = c?.find(x => x.types.includes('route'));
        const locality = c?.find(x => x.types.includes('locality'));
        name = poi?.long_name || route?.long_name || locality?.long_name || results[0].formatted_address?.split(',')[0] || name;
        address = results[0].formatted_address || '';
      }
      setLocations(prev => [...prev, { id: generateId(), name, address, lat, lng, category: 'place', rating: null, priceLevel: null, placeId: null }]);
      clearRoute();
    });
  }, [locations.length]);

  // ─── Route utils ──────────────────────────────────────────────────────────
  const clearRoute = () => {
    setDirectionsResult(null);
    setRouteInfo(null);
    setDirections([]);
    setShowDirections(false);
  };

  const removeLocation = (id) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    if (selectedMarker === id) setSelectedMarker(null);
    clearRoute();
  };

  const moveUp = (index) => {
    if (index <= 0) return;
    setLocations(prev => {
      const a = [...prev];
      [a[index - 1], a[index]] = [a[index], a[index - 1]];
      return a;
    });
    clearRoute();
  };

  const moveDown = (index) => {
    if (index >= locations.length - 1) return;
    setLocations(prev => {
      const a = [...prev];
      [a[index], a[index + 1]] = [a[index + 1], a[index]];
      return a;
    });
    clearRoute();
  };

  // ─── Directions ───────────────────────────────────────────────────────────
  const fetchRouteDirections = async (orderedLocs) => {
    if (!orderedLocs || orderedLocs.length < 2) return;
    setRouteLoading(true);
    try {
      const service = new window.google.maps.DirectionsService();
      const mode = GOOGLE_TRAVEL_MODES[travelMode] || 'DRIVING';
      const origin = { lat: orderedLocs[0].lat, lng: orderedLocs[0].lng };
      const destination = { lat: orderedLocs[orderedLocs.length - 1].lat, lng: orderedLocs[orderedLocs.length - 1].lng };
      const waypoints = orderedLocs.slice(1, -1).map(l => ({ location: { lat: l.lat, lng: l.lng }, stopover: true }));

      const result = await service.route({
        origin, destination, waypoints,
        travelMode: window.google.maps.TravelMode[mode],
        optimizeWaypoints: false
      });

      setDirectionsResult(result);
      let totalDistance = 0, totalDuration = 0;
      const allSteps = [];
      result.routes[0].legs.forEach((leg, li) => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;
        leg.steps.forEach((step, si) => {
          allSteps.push({
            id: `${li}-${si}`,
            instruction: step.instructions?.replace(/<[^>]*>/g, '') || '',
            distance: (step.distance.value / 1000).toFixed(2),
            duration: Math.round(step.duration.value / 60)
          });
        });
      });
      setRouteInfo({ distance: (totalDistance / 1000).toFixed(1), duration: Math.round(totalDuration / 60) });
      setDirections(allSteps);

      if (mapRef.current) {
        const bounds = new window.google.maps.LatLngBounds();
        result.routes[0].legs.forEach(leg => { bounds.extend(leg.start_location); bounds.extend(leg.end_location); });
        mapRef.current.fitBounds(bounds, { padding: 60 });
      }
    } catch (err) {
      console.error('Directions error:', err);
      setSearchStatus('Could not calculate route. Please try again.');
    } finally {
      setRouteLoading(false);
    }
  };

  const showRoute = async () => {
    const route = getFullRoute();
    if (route.length < 2) { setSearchStatus('Add at least 2 locations to show a route.'); return; }
    setSearchStatus('');
    await fetchRouteDirections(route);
  };

  // Recalculate when travel mode changes (if route active)
  useEffect(() => {
    if (directionsResult && getFullRoute().length >= 2) {
      fetchRouteDirections(getFullRoute());
    }
  }, [travelMode]);

  // ─── Marker click ─────────────────────────────────────────────────────────
  const handleMarkerClick = (loc) => {
    setSelectedMarker(loc.id);
    if (!placeDetails[loc.id] && loc.placeId && mapRef.current) {
      const svc = new window.google.maps.places.PlacesService(mapRef.current);
      svc.getDetails(
        { placeId: loc.placeId, fields: ['formatted_phone_number', 'website', 'opening_hours', 'reviews'] },
        (result, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
            setPlaceDetails(prev => ({
              ...prev,
              [loc.id]: {
                phone: result.formatted_phone_number || null,
                website: result.website || null,
                openNow: result.opening_hours?.isOpen?.() ?? null,
                weekdayText: result.opening_hours?.weekday_text || [],
                reviews: (result.reviews || []).slice(0, 3)
              }
            }));
          }
        }
      );
    }
  };

  const formatDuration = (min) => {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h} hr ${m} min` : `${h} hr`;
  };

  if (!isLoaded) {
    return (
      <div className="sp-container sp-loading-screen">
        <div className="sp-loading-spinner" />
        <p>Loading Google Maps...</p>
      </div>
    );
  }

  const sortedLocations = getSortedLocations();
  const fullRoute = getFullRoute();

  return (
    <div className="sp-container">
      {/* ── Sidebar ── */}
      <div className="sp-sidebar">
        {/* Header */}
        <div className="sp-sidebar-header">
          <div className="sp-header-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="sp-title">Shortest Path Finder</h2>
            <p className="sp-subtitle">Plan an optimized route across Sri Lanka</p>
          </div>
        </div>

        <div className="sp-scroll-area">
          {/* ── Starting Location ── */}
          <div className="sp-section sp-start-section">
            <div className="sp-section-label-row">
              <span className="sp-section-label">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ marginRight: 5 }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Starting Location
              </span>
              <button className={`sp-gps-btn ${gpsLoading ? 'loading' : ''}`} onClick={useMyLocation} disabled={gpsLoading} title="Use GPS location">
                {gpsLoading ? (
                  <span className="sp-gps-spin">↻</span>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                  </svg>
                )}
                <span>{gpsLoading ? 'Getting...' : 'Use GPS'}</span>
              </button>
            </div>

            {startLocation ? (
              <div className="sp-start-card">
                <div className="sp-start-dot">S</div>
                <div className="sp-start-info">
                  <span className="sp-start-name">{startLocation.name}</span>
                  {startLocation.address && startLocation.address !== startLocation.name && (
                    <span className="sp-start-addr">{startLocation.address}</span>
                  )}
                </div>
                <button className="sp-start-remove" onClick={() => { setStartLocation(null); setStartSearch(''); clearRoute(); }} title="Clear start">×</button>
              </div>
            ) : (
              <div className="sp-start-search-wrap">
                <input
                  type="text"
                  className="sp-start-input"
                  placeholder="Search starting point..."
                  value={startSearch}
                  onChange={(e) => { setStartSearch(e.target.value); if (e.target.value.trim()) doSearch(e.target.value, setStartResults, () => {}); else setStartResults([]); }}
                />
                {startResults.length > 0 && (
                  <div className="sp-start-results">
                    {startResults.map(r => (
                      <div key={r.id} className="sp-start-result-item" onClick={() => {
                        setStartLocation({ ...r, id: 'start', isStart: true });
                        setStartSearch(r.name);
                        setStartResults([]);
                        clearRoute();
                      }}>
                        <strong>{r.name}</strong>
                        <small>{r.address}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Add Stops ── */}
          <div className="sp-section">
            <span className="sp-section-label">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ marginRight: 5 }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Add Stops
            </span>
            <form
              className="sp-search-form"
              onSubmit={(e) => { e.preventDefault(); if (searchQuery.trim()) doSearch(searchQuery, setSearchResults, setSearchLoading); }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destinations in Sri Lanka..."
                className="sp-search-input"
              />
              <button type="submit" className="sp-search-btn" disabled={searchLoading}>
                {searchLoading ? (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="sp-btn-spin"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                )}
              </button>
            </form>
            {searchResults.length > 0 && (
              <div className="sp-search-results">
                {searchResults.map(r => (
                  <div key={r.id} className="sp-search-result-item" onClick={() => addLocationFromSearch(r)}>
                    <div className="sp-sr-left">
                      <strong>{r.name}</strong>
                      <small>{r.address}</small>
                    </div>
                    {r.rating && <span className="sp-sr-rating">★ {r.rating.toFixed(1)}</span>}
                  </div>
                ))}
              </div>
            )}
            <p className="sp-hint">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style={{ marginRight: 4 }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              </svg>
              Or click on the map to add stops
            </p>
            {searchStatus && (
              <div className={`sp-status-pill ${searchStatus.includes('Added') ? 'success' : ''}`}>
                {searchStatus}
              </div>
            )}
          </div>

          {/* ── Sort Mode ── */}
          <div className="sp-section">
            <span className="sp-section-label">Sort Mode</span>
            <div className="sp-sort-tabs">
              <button
                className={`sp-sort-tab ${sortMode === 'manual' ? 'active' : ''}`}
                onClick={() => { setSortMode('manual'); clearRoute(); }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                </svg>
                My Order
              </button>
              <button
                className={`sp-sort-tab ${sortMode === 'rating' ? 'active rating' : ''}`}
                onClick={() => { setSortMode('rating'); clearRoute(); }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                By Rating
              </button>
              <button
                className={`sp-sort-tab ${sortMode === 'shortest' ? 'active shortest' : ''}`}
                onClick={() => { setSortMode('shortest'); clearRoute(); }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M7 4v2h3v2H7l-4 4 4 4h3v2H7v2h3l5-5h3.5c1.93 0 3.5-1.57 3.5-3.5S20.43 8 18.5 8H15l-5-5H7z"/>
                </svg>
                Shortest Path
              </button>
            </div>
            {sortMode === 'shortest' && locations.length >= 2 && (
              <div className="sp-sort-hint">
                ⚡ Stops reordered for minimum travel distance using nearest-neighbor algorithm
              </div>
            )}
            {sortMode === 'rating' && (
              <div className="sp-sort-hint">
                ★ Stops sorted highest → lowest Google rating
              </div>
            )}
          </div>

          {/* ── Category Filter + Travel Mode ── */}
          <div className="sp-section sp-controls-row">
            <div className="sp-control-group">
              <span className="sp-control-label">Category</span>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="sp-select">
                {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="sp-control-group">
              <span className="sp-control-label">Travel Mode</span>
              <div className="sp-mini-modes">
                {TRAVEL_MODES.map(m => (
                  <button
                    key={m.id}
                    className={`sp-mini-mode ${travelMode === m.id ? 'active' : ''}`}
                    onClick={() => setTravelMode(m.id)}
                    title={m.label}
                  >
                    <TravelModeIcon path={m.svgPath} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Stops List ── */}
          <div className="sp-section sp-stops-section">
            <div className="sp-stops-header">
              <span className="sp-section-label">
                Stops
                {sortedLocations.length > 0 && (
                  <span className="sp-stops-count">{sortedLocations.length}</span>
                )}
              </span>
              {sortMode === 'shortest' && sortedLocations.length >= 2 && (
                <span className="sp-optimized-badge">⚡ Optimized</span>
              )}
              {sortMode === 'rating' && sortedLocations.length >= 2 && (
                <span className="sp-rating-badge">★ By Rating</span>
              )}
            </div>

            {/* Start location pin (in list) */}
            {startLocation && (
              <div className="sp-loc-card sp-loc-start">
                <div className="sp-loc-num start">S</div>
                <div className="sp-loc-info">
                  <span className="sp-loc-name">{startLocation.name}</span>
                  <span className="sp-loc-tag start-tag">Starting Point</span>
                </div>
              </div>
            )}

            {sortedLocations.length === 0 ? (
              <div className="sp-empty-state">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" style={{ color: '#2a3a4e', marginBottom: 10 }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <p className="sp-empty-title">No stops added yet</p>
                <p className="sp-empty-hint">Search for places above or click the map to add stops.</p>
              </div>
            ) : (
              sortedLocations.map((loc, index) => {
                const originalIndex = locations.findIndex(l => l.id === loc.id);
                const distFromStart = startLocation
                  ? haversine(startLocation.lat, startLocation.lng, loc.lat, loc.lng).toFixed(1)
                  : (index > 0 ? haversine(sortedLocations[0].lat, sortedLocations[0].lng, loc.lat, loc.lng).toFixed(1) : null);

                return (
                  <div key={loc.id} className="sp-loc-card">
                    <div className="sp-loc-num" style={{ background: index === 0 && !startLocation ? '#00C853' : '#2979FF' }}>
                      {index + 1}
                    </div>
                    <div className="sp-loc-info">
                      <span className="sp-loc-name">{loc.name}</span>
                      {loc.address && <span className="sp-loc-addr">{loc.address}</span>}
                      <div className="sp-loc-meta">
                        {loc.rating && <StarRating rating={loc.rating} />}
                        {loc.priceLevel !== null && loc.priceLevel !== undefined && (
                          <span className="sp-price-tag">{'$'.repeat(loc.priceLevel + 1)}</span>
                        )}
                        {loc.category && loc.category !== 'place' && (
                          <span className="sp-cat-tag">{loc.category}</span>
                        )}
                        {distFromStart && (
                          <span className="sp-dist-tag">
                            {distFromStart} km {index === 0 && !startLocation ? '' : 'from start'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="sp-loc-actions">
                      {sortMode === 'manual' && (
                        <>
                          <button className="sp-move-btn" onClick={() => moveUp(originalIndex)} disabled={originalIndex <= 0} title="Move up">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                          </button>
                          <button className="sp-move-btn" onClick={() => moveDown(originalIndex)} disabled={originalIndex >= locations.length - 1} title="Move down">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
                          </button>
                        </>
                      )}
                      <button className="sp-remove-btn" onClick={() => removeLocation(loc.id)} title="Remove">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Action buttons (sticky bottom) ── */}
        <div className="sp-bottom-actions">
          {routeInfo && (
            <div className="sp-route-stats-bar">
              <div className="sp-stat">
                <span className="sp-stat-val">{routeInfo.distance}</span>
                <span className="sp-stat-lbl">km</span>
              </div>
              <div className="sp-stat-divider" />
              <div className="sp-stat">
                <span className="sp-stat-val">{formatDuration(routeInfo.duration)}</span>
                <span className="sp-stat-lbl">travel time</span>
              </div>
              <div className="sp-stat-divider" />
              <div className="sp-stat">
                <span className="sp-stat-val">{fullRoute.length}</span>
                <span className="sp-stat-lbl">stops</span>
              </div>
              <button className="sp-clear-route" onClick={clearRoute} title="Clear route">×</button>
            </div>
          )}
          <div className="sp-action-row">
            <button
              className="sp-show-route-btn"
              onClick={showRoute}
              disabled={fullRoute.length < 2 || routeLoading}
            >
              {routeLoading ? (
                <>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="sp-btn-spin"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>
                  Calculating...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"/>
                  </svg>
                  {sortMode === 'shortest' ? 'Show Shortest Path' : 'Show Route on Map'}
                </>
              )}
            </button>
            {directionsResult && directions.length > 0 && (
              <button
                className="sp-directions-toggle"
                onClick={() => setShowDirections(!showDirections)}
                title="Turn-by-turn directions"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Turn-by-turn directions */}
          {showDirections && directions.length > 0 && (
            <div className="sp-directions-panel">
              <h4 className="sp-dir-title">Turn-by-Turn Directions</h4>
              <ol className="sp-dir-list">
                {directions.map(step => (
                  <li key={step.id} className="sp-dir-step">
                    <span className="sp-dir-text">{step.instruction}</span>
                    <span className="sp-dir-dist">{step.distance} km</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* ── Map ── */}
      <div className="sp-map-area">
        <GoogleMap
          mapContainerStyle={{ height: '100%', width: '100%' }}
          center={MAP_CENTER}
          zoom={8}
          options={{
            restriction: { latLngBounds: SRI_LANKA_BOUNDS, strictBounds: false },
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            styles: [
              { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#193341' }] },
              { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#2c5a71' }] }
            ]
          }}
          onClick={handleMapClick}
          onLoad={(map) => { mapRef.current = map; }}
        >
          {/* Route line */}
          {directionsResult && (
            <DirectionsRenderer
              directions={directionsResult}
              options={{
                suppressMarkers: true,
                polylineOptions: { strokeColor: '#FFCC00', strokeWeight: 5, strokeOpacity: 0.9 }
              }}
            />
          )}

          {/* Start marker */}
          {startLocation && (
            <Marker
              position={{ lat: startLocation.lat, lng: startLocation.lng }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#00C853', fillOpacity: 1,
                strokeColor: '#ffffff', strokeWeight: 3, scale: 16,
                labelOrigin: new window.google.maps.Point(0, 0)
              }}
              label={{ text: 'S', color: '#ffffff', fontWeight: 'bold', fontSize: '12px' }}
              onClick={() => handleMarkerClick(startLocation)}
              zIndex={1000}
            />
          )}

          {/* Stop markers */}
          {sortedLocations.map((loc, index) => (
            <Marker
              key={loc.id}
              position={{ lat: loc.lat, lng: loc.lng }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: index === 0 && !startLocation ? '#00C853' : '#2979FF',
                fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3, scale: 14,
                labelOrigin: new window.google.maps.Point(0, 0)
              }}
              label={{ text: String(index + 1), color: '#ffffff', fontWeight: 'bold', fontSize: '11px' }}
              onClick={() => handleMarkerClick(loc)}
              zIndex={500}
            />
          ))}

          {/* InfoWindow */}
          {selectedMarker && (() => {
            const loc = selectedMarker === 'start'
              ? startLocation
              : sortedLocations.find(l => l.id === selectedMarker) || locations.find(l => l.id === selectedMarker);
            if (!loc) return null;
            const details = placeDetails[loc.id];
            return (
              <InfoWindow position={{ lat: loc.lat, lng: loc.lng }} onCloseClick={() => setSelectedMarker(null)}>
                <div style={{ minWidth: '240px', maxWidth: '300px', color: '#333' }}>
                  <strong style={{ fontSize: '1rem', display: 'block', marginBottom: 4 }}>{loc.name}</strong>
                  {loc.address && <small style={{ color: '#666', display: 'block', marginBottom: 8 }}>{loc.address}</small>}
                  {loc.rating && (
                    <div style={{ margin: '4px 0', color: '#FFD700' }}>
                      {'★'.repeat(Math.floor(loc.rating))}
                      <span style={{ color: '#666', fontSize: '0.85rem', marginLeft: 4 }}>{loc.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {loc.priceLevel !== null && loc.priceLevel !== undefined && (
                    <div style={{ color: '#4CAF50', fontWeight: 600, marginBottom: 4 }}>{'$'.repeat(loc.priceLevel + 1)}</div>
                  )}
                  {details && (
                    <div style={{ borderTop: '1px solid #eee', marginTop: 6, paddingTop: 6 }}>
                      {details.phone && <div style={{ margin: '3px 0', fontSize: '0.85rem' }}><a href={`tel:${details.phone}`} style={{ color: '#1976D2' }}>&#128222; {details.phone}</a></div>}
                      {details.website && <div style={{ margin: '3px 0', fontSize: '0.85rem' }}><a href={details.website} target="_blank" rel="noopener noreferrer" style={{ color: '#1976D2' }}>&#127760; Website</a></div>}
                      {details.openNow !== null && details.openNow !== undefined && (
                        <div style={{ color: details.openNow ? '#4CAF50' : '#f44336', fontWeight: 600, fontSize: '0.85rem' }}>
                          {details.openNow ? '✓ Open Now' : '✗ Closed'}
                        </div>
                      )}
                    </div>
                  )}
                  {!loc.isStart && (
                    <button onClick={() => removeLocation(loc.id)}
                      style={{ background: '#f44336', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', marginTop: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Remove Stop
                    </button>
                  )}
                </div>
              </InfoWindow>
            );
          })()}
        </GoogleMap>

        {/* Map overlay hint */}
        {fullRoute.length < 2 && (
          <div className="sp-map-hint">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            Click on the map to add a location
          </div>
        )}
      </div>
    </div>
  );
};

export default ShortestPath;
