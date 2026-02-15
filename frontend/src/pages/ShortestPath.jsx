import { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import axios from 'axios';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config';
import './ShortestPath.css';

const LIBRARIES = ['places'];

const SRI_LANKA_BOUNDS = {
  south: 5.916,
  north: 9.835,
  west: 79.652,
  east: 81.879
};

const MAP_CENTER = { lat: 7.8731, lng: 80.7718 };

const MAP_OPTIONS = {
  restriction: {
    latLngBounds: SRI_LANKA_BOUNDS,
    strictBounds: false
  },
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  zoomControl: true
};

const GOOGLE_TRAVEL_MODES = {
  car: 'DRIVING',
  bus: 'TRANSIT',
  train: 'TRANSIT',
  walk: 'WALKING'
};

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
  { value: 'transport', label: 'Transport' }
];

const SORT_OPTIONS = [
  { value: 'default', label: 'Default Order' },
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Rating' },
  { value: 'price', label: 'Price Level' }
];

const TRAVEL_MODES = [
  { id: 'car', label: 'Car', svgPath: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z' },
  { id: 'bus', label: 'Bus', svgPath: 'M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z' },
  { id: 'train', label: 'Train', svgPath: 'M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H6V6h5v5zm2 0V6h5v5h-5zm3.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z' },
  { id: 'walk', label: 'Walk', svgPath: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7' }
];

// Marker icon helper
const getMarkerIcon = (color) => ({
  path: window.google?.maps?.SymbolPath?.CIRCLE,
  fillColor: color,
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 3,
  scale: 14,
  labelOrigin: { x: 0, y: 0 }
});

const ShortestPath = () => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  const [locations, setLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [optimizedOrder, setOptimizedOrder] = useState(null);
  const [directionsResult, setDirectionsResult] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [directions, setDirections] = useState([]);
  const [travelMode, setTravelMode] = useState('car');
  const [sortBy, setSortBy] = useState('default');
  const [filterCategory, setFilterCategory] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [placeDetails, setPlaceDetails] = useState({});

  const mapRef = useRef(null);
  const nextIdRef = useRef(1);

  const generateId = () => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    return id;
  };

  // Search using Google Places
  const searchPlaces = useCallback((query) => {
    if (!query.trim() || !mapRef.current) return;

    setSearchLoading(true);
    setSearchStatus('Searching in Sri Lanka...');
    setSearchResults([]);

    const service = new window.google.maps.places.PlacesService(mapRef.current);
    const request = {
      query: query + ' Sri Lanka',
      bounds: new window.google.maps.LatLngBounds(
        { lat: SRI_LANKA_BOUNDS.south, lng: SRI_LANKA_BOUNDS.west },
        { lat: SRI_LANKA_BOUNDS.north, lng: SRI_LANKA_BOUNDS.east }
      )
    };

    service.textSearch(request, (results, status) => {
      setSearchLoading(false);

      if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.length > 0) {
        const sriLankaResults = results.filter(place => {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          return lat >= SRI_LANKA_BOUNDS.south && lat <= SRI_LANKA_BOUNDS.north &&
                 lng >= SRI_LANKA_BOUNDS.west && lng <= SRI_LANKA_BOUNDS.east;
        });

        if (sriLankaResults.length > 0) {
          const mapped = sriLankaResults.slice(0, 10).map((place, index) => ({
            id: place.place_id || `search-${index}`,
            placeId: place.place_id || null,
            name: place.name || 'Unknown',
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address || '',
            category: place.types?.[0]?.replace(/_/g, ' ') || 'place',
            rating: place.rating || null,
            userRatingsTotal: place.user_ratings_total || 0,
            priceLevel: place.price_level ?? null,
            openNow: place.opening_hours?.isOpen?.() ?? null
          }));
          setSearchResults(mapped);
          setSearchStatus(`Found ${mapped.length} result${mapped.length !== 1 ? 's' : ''}`);
        } else {
          setSearchStatus(`No results found for "${query}" in Sri Lanka`);
        }
      } else {
        setSearchStatus(`No results found for "${query}" in Sri Lanka`);
      }
    });
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchPlaces(searchQuery.trim());
    }
  };

  const addLocationFromSearch = (result) => {
    if (locations.length >= 20) {
      setSearchStatus('Maximum 20 locations allowed.');
      return;
    }
    const newLoc = {
      id: generateId(),
      name: result.name,
      lat: result.lat,
      lng: result.lng,
      address: result.address || '',
      category: result.category || 'place',
      rating: result.rating || null,
      priceLevel: result.priceLevel || null
    };
    setLocations(prev => [...prev, newLoc]);
    setSearchResults([]);
    setSearchQuery('');
    setSearchStatus(`Added: ${result.name}`);
    clearRouteState();
  };

  // Reverse geocode on map click
  const handleMapClick = useCallback((e) => {
    if (locations.length >= 20) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    if (lat < SRI_LANKA_BOUNDS.south || lat > SRI_LANKA_BOUNDS.north ||
        lng < SRI_LANKA_BOUNDS.west || lng > SRI_LANKA_BOUNDS.east) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      let name = `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

      if (status === 'OK' && results?.[0]) {
        const components = results[0].address_components;
        const poi = components?.find(c => c.types.includes('point_of_interest'));
        const route = components?.find(c => c.types.includes('route'));
        const locality = components?.find(c => c.types.includes('locality'));
        name = poi?.long_name || route?.long_name || locality?.long_name || results[0].formatted_address?.split(',')[0] || name;
      }

      const newLoc = {
        id: generateId(),
        name,
        lat,
        lng,
        address: '',
        category: 'place',
        rating: null,
        priceLevel: null
      };

      setLocations(prev => [...prev, newLoc]);
      clearRouteState();
    });
  }, [locations.length]);

  const removeLocation = (locId) => {
    setLocations(prev => prev.filter(loc => loc.id !== locId));
    setSelectedMarker(null);
    clearRouteState();
  };

  const moveLocationUp = (index) => {
    if (index <= 0) return;
    setLocations(prev => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
    clearRouteState();
  };

  const moveLocationDown = (index) => {
    if (index >= locations.length - 1) return;
    setLocations(prev => {
      const updated = [...prev];
      [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
      return updated;
    });
    clearRouteState();
  };

  const clearRouteState = () => {
    setOptimizedOrder(null);
    setDirectionsResult(null);
    setRouteInfo(null);
    setDirections([]);
    setShowDirections(false);
  };

  // Optimize route via backend
  const optimizeRoute = async () => {
    if (locations.length < 2) {
      setSearchStatus('Add at least 2 locations to optimize a route.');
      return;
    }

    setOptimizing(true);
    setSearchStatus('Optimizing route...');
    clearRouteState();

    try {
      const locPayload = locations.map(loc => ({
        lat: loc.lat,
        lng: loc.lng,
        name: loc.name
      }));

      const response = await axios.post(`${API_BASE_URL}/places/optimize-route`, {
        locations: locPayload,
        startLocation: locPayload[0]
      });

      if (response.data?.optimizedOrder) {
        const ordered = response.data.optimizedOrder;
        setOptimizedOrder(ordered);
        const reordered = ordered.map(idx => locations[idx]).filter(Boolean);
        setLocations(reordered);
        setSearchStatus('Route optimized successfully.');
        await fetchRouteDirections(reordered);
      } else if (response.data?.orderedLocations) {
        const reordered = response.data.orderedLocations;
        const mappedLocations = reordered.map((loc, idx) => ({
          ...locations.find(l => Math.abs(l.lat - loc.lat) < 0.0001 && Math.abs(l.lng - loc.lng) < 0.0001) || {
            id: generateId(),
            name: loc.name || `Stop ${idx + 1}`,
            lat: loc.lat,
            lng: loc.lng,
            address: '',
            category: 'place',
            rating: null,
            priceLevel: null
          }
        }));
        setLocations(mappedLocations);
        setOptimizedOrder(mappedLocations.map((_, i) => i));
        setSearchStatus('Route optimized successfully.');
        await fetchRouteDirections(mappedLocations);
      } else {
        setOptimizedOrder(locations.map((_, i) => i));
        setSearchStatus('Route calculated with current order.');
        await fetchRouteDirections(locations);
      }
    } catch (error) {
      console.error('Optimize route error:', error);
      setOptimizedOrder(locations.map((_, i) => i));
      setSearchStatus('Using current order (optimization service unavailable).');
      await fetchRouteDirections(locations);
    } finally {
      setOptimizing(false);
    }
  };

  // Fetch directions using Google Directions Service
  const fetchRouteDirections = async (orderedLocs) => {
    if (!orderedLocs || orderedLocs.length < 2) return;

    setRouteLoading(true);

    try {
      const directionsService = new window.google.maps.DirectionsService();
      const mode = GOOGLE_TRAVEL_MODES[travelMode] || 'DRIVING';

      const origin = { lat: orderedLocs[0].lat, lng: orderedLocs[0].lng };
      const destination = { lat: orderedLocs[orderedLocs.length - 1].lat, lng: orderedLocs[orderedLocs.length - 1].lng };

      const waypoints = orderedLocs.length > 2
        ? orderedLocs.slice(1, -1).map(loc => ({
            location: { lat: loc.lat, lng: loc.lng },
            stopover: true
          }))
        : [];

      const result = await directionsService.route({
        origin,
        destination,
        waypoints,
        travelMode: window.google.maps.TravelMode[mode],
        optimizeWaypoints: false
      });

      setDirectionsResult(result);

      // Calculate total distance and duration
      let totalDistance = 0;
      let totalDuration = 0;
      const allSteps = [];

      result.routes[0].legs.forEach((leg, legIndex) => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;

        leg.steps.forEach((step, stepIndex) => {
          allSteps.push({
            id: `${legIndex}-${stepIndex}`,
            instruction: step.instructions?.replace(/<[^>]*>/g, '') || '',
            distance: (step.distance.value / 1000).toFixed(2),
            duration: Math.round(step.duration.value / 60),
            legIndex
          });
        });
      });

      setRouteInfo({
        distance: (totalDistance / 1000).toFixed(1),
        duration: Math.round(totalDuration / 60)
      });
      setDirections(allSteps);

      // Fit map to route bounds
      if (mapRef.current) {
        const bounds = new window.google.maps.LatLngBounds();
        result.routes[0].legs.forEach(leg => {
          bounds.extend(leg.start_location);
          bounds.extend(leg.end_location);
        });
        mapRef.current.fitBounds(bounds, { padding: 60 });
      }
    } catch (error) {
      console.error('Google Directions error:', error);
      setSearchStatus('Could not fetch route. Please try again.');
    } finally {
      setRouteLoading(false);
    }
  };

  // Recalculate route when travel mode changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (optimizedOrder && locations.length >= 2) {
      fetchRouteDirections(locations);
    }
  }, [travelMode]);

  // Fit map to markers when locations change (no route)
  useEffect(() => {
    if (mapRef.current && locations.length > 0 && !directionsResult) {
      const bounds = new window.google.maps.LatLngBounds();
      locations.forEach(loc => bounds.extend({ lat: loc.lat, lng: loc.lng }));
      if (locations.length === 1) {
        mapRef.current.setCenter({ lat: locations[0].lat, lng: locations[0].lng });
        mapRef.current.setZoom(16);
      } else {
        mapRef.current.fitBounds(bounds, { padding: 60 });
      }
    }
  }, [locations, directionsResult]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  };

  const getDisplayLocations = () => {
    let display = [...locations];

    if (filterCategory) {
      display = display.filter(loc =>
        loc.category && loc.category.toLowerCase().includes(filterCategory.toLowerCase())
      );
    }

    if (sortBy === 'distance' && display.length >= 2) {
      const ref = display[0];
      display = [ref, ...display.slice(1).sort((a, b) => {
        const distA = parseFloat(calculateDistance(ref.lat, ref.lng, a.lat, a.lng));
        const distB = parseFloat(calculateDistance(ref.lat, ref.lng, b.lat, b.lng));
        return distA - distB;
      })];
    } else if (sortBy === 'rating') {
      display.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'price') {
      display.sort((a, b) => (a.priceLevel || 0) - (b.priceLevel || 0));
    }

    return display;
  };

  // Handle marker click - fetch Place Details and show InfoWindow
  const handleMarkerClick = (loc) => {
    setSelectedMarker(loc.id);

    if (!placeDetails[loc.id] && loc.placeId && mapRef.current) {
      const service = new window.google.maps.places.PlacesService(mapRef.current);
      service.getDetails(
        {
          placeId: loc.placeId,
          fields: ['formatted_phone_number', 'website', 'opening_hours', 'url', 'business_status', 'reviews']
        },
        (result, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
            setPlaceDetails(prev => ({
              ...prev,
              [loc.id]: {
                phone: result.formatted_phone_number || null,
                website: result.website || null,
                googleUrl: result.url || null,
                businessStatus: result.business_status || null,
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

  const TravelModeIcon = ({ path }) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d={path} />
    </svg>
  );

  const displayLocations = getDisplayLocations();

  if (!isLoaded) {
    return (
      <div className="sp-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#FFD700', fontSize: '1.2rem' }}>Loading Google Maps...</p>
      </div>
    );
  }

  return (
    <div className="sp-container">
      {/* Sidebar */}
      <div className="sp-sidebar">
        <div className="sp-sidebar-header">
          <h2 className="sp-title">Shortest Path Finder</h2>
          <p className="sp-subtitle">Plan an optimized route across Sri Lanka</p>

          <form onSubmit={handleSearch} className="sp-search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for places in Sri Lanka..."
              className="sp-search-input"
            />
            <button type="submit" className="sp-search-btn" disabled={searchLoading}>
              {searchLoading ? '...' : 'Go'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="sp-search-results">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="sp-search-result-item"
                  onClick={() => addLocationFromSearch(result)}
                >
                  <strong>{result.name}</strong>
                  <small>{result.address}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        {searchStatus && (
          <div className={`sp-status-bar ${locations.length > 0 ? 'success' : ''}`}>
            {searchStatus}
          </div>
        )}

        <div className="sp-hint-bar">
          Click on the map to add a location, or use the search above.
        </div>

        <div className="sp-controls-section">
          <div className="sp-control-row">
            <div className="sp-control-group">
              <label className="sp-control-label">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sp-select"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="sp-control-group">
              <label className="sp-control-label">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="sp-select"
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="sp-travel-section">
          <p className="sp-section-label">Travel Mode</p>
          <div className="sp-travel-buttons">
            {TRAVEL_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setTravelMode(mode.id)}
                className={`sp-travel-btn ${travelMode === mode.id ? 'active' : ''}`}
              >
                <span className="sp-travel-icon">
                  <TravelModeIcon path={mode.svgPath} />
                </span>
                <span className="sp-travel-label">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sp-locations-list">
          {locations.length === 0 && (
            <div className="sp-empty-state">
              <p className="sp-empty-title">No locations added yet</p>
              <p className="sp-empty-hint">Search for places or click on the map to add stops.</p>
            </div>
          )}

          {displayLocations.map((loc, index) => {
            const originalIndex = locations.findIndex(l => l.id === loc.id);
            const isStart = index === 0;
            const markerColor = optimizedOrder ? '#00C853' : (isStart ? '#00C853' : '#E53935');

            return (
              <div key={loc.id} className={`sp-location-card ${isStart ? 'start' : ''}`}>
                <div className="sp-location-number" style={{ background: markerColor }}>
                  {index + 1}
                </div>
                <div className="sp-location-info">
                  <h4 className="sp-location-name">{loc.name}</h4>
                  {loc.address && <p className="sp-location-address">{loc.address}</p>}
                  <div className="sp-location-meta">
                    {loc.category && <span className="sp-location-category">{loc.category}</span>}
                    {index > 0 && (
                      <span className="sp-location-distance">
                        {calculateDistance(locations[0].lat, locations[0].lng, loc.lat, loc.lng)} km from start
                      </span>
                    )}
                  </div>
                </div>
                <div className="sp-location-actions">
                  <button
                    className="sp-action-btn"
                    onClick={() => moveLocationUp(originalIndex)}
                    disabled={originalIndex <= 0}
                    title="Move up"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                    </svg>
                  </button>
                  <button
                    className="sp-action-btn"
                    onClick={() => moveLocationDown(originalIndex)}
                    disabled={originalIndex >= locations.length - 1}
                    title="Move down"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                    </svg>
                  </button>
                  <button
                    className="sp-remove-btn"
                    onClick={() => removeLocation(loc.id)}
                    title="Remove"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {locations.length >= 2 && (
          <div className="sp-optimize-section">
            <button
              className="sp-optimize-btn"
              onClick={optimizeRoute}
              disabled={optimizing || routeLoading}
            >
              {optimizing ? 'Optimizing...' : routeLoading ? 'Loading route...' : 'Optimize Route'}
            </button>
            <span className="sp-location-count">{locations.length} location{locations.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {routeInfo && (
          <div className="sp-route-panel">
            <div className="sp-route-header">
              <h3 className="sp-route-title">Route Details</h3>
              <button onClick={clearRouteState} className="sp-route-close">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            <div className="sp-route-stats">
              <div className="sp-stat-item">
                <span className="sp-stat-value">{routeInfo.distance}</span>
                <span className="sp-stat-label">km</span>
              </div>
              <div className="sp-stat-item">
                <span className="sp-stat-value">{formatDuration(routeInfo.duration)}</span>
                <span className="sp-stat-label">travel time</span>
              </div>
              <div className="sp-stat-item">
                <span className="sp-stat-value">{locations.length}</span>
                <span className="sp-stat-label">stops</span>
              </div>
            </div>

            <div className="sp-route-stops">
              {locations.map((loc, idx) => (
                <div key={loc.id} className="sp-route-stop">
                  <span className="sp-stop-marker" style={{ background: idx === 0 ? '#00C853' : '#2979FF' }}>
                    {idx + 1}
                  </span>
                  <span className="sp-stop-name">{loc.name}</span>
                </div>
              ))}
            </div>

            {directions.length > 0 && (
              <button
                className="sp-toggle-directions-btn"
                onClick={() => setShowDirections(!showDirections)}
              >
                {showDirections ? 'Hide Directions' : 'Show Turn-by-Turn Directions'}
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                  style={{ transform: showDirections ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                </svg>
              </button>
            )}

            {showDirections && directions.length > 0 && (
              <div className="sp-directions-list">
                <h4 className="sp-directions-title">Turn-by-Turn Directions</h4>
                <ol className="sp-directions-steps">
                  {directions.map((step) => (
                    <li key={step.id} className="sp-direction-step">
                      <span className="sp-step-instruction">{step.instruction}</span>
                      <span className="sp-step-distance">{step.distance} km</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="sp-map-area">
        <GoogleMap
          mapContainerStyle={{ height: '100%', width: '100%' }}
          center={MAP_CENTER}
          zoom={8}
          options={MAP_OPTIONS}
          onClick={handleMapClick}
          onLoad={(map) => { mapRef.current = map; }}
        >
          {/* Directions route */}
          {directionsResult && (
            <DirectionsRenderer
              directions={directionsResult}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#4285F4',
                  strokeWeight: 6,
                  strokeOpacity: 0.9
                }
              }}
            />
          )}

          {/* Location markers */}
          {locations.map((loc, index) => {
            const isStart = index === 0;
            let color;
            if (optimizedOrder) {
              color = isStart ? '#00C853' : '#2979FF';
            } else {
              color = isStart ? '#00C853' : '#E53935';
            }

            return (
              <Marker
                key={loc.id}
                position={{ lat: loc.lat, lng: loc.lng }}
                icon={getMarkerIcon(color, String(index + 1))}
                label={{
                  text: String(index + 1),
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '11px'
                }}
                onClick={() => handleMarkerClick(loc)}
              />
            );
          })}

          {/* InfoWindow for selected marker */}
          {selectedMarker && (() => {
            const loc = locations.find(l => l.id === selectedMarker);
            if (!loc) return null;
            const index = locations.indexOf(loc);
            const details = placeDetails[loc.id];
            return (
              <InfoWindow
                position={{ lat: loc.lat, lng: loc.lng }}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div className="marker-popup" style={{ minWidth: '240px', maxWidth: '300px' }}>
                  <strong style={{ fontSize: '1.05rem' }}>Stop {index + 1}: {loc.name}</strong>
                  <br />
                  {loc.address && <small style={{ color: '#666' }}>{loc.address}</small>}

                  {/* Rating & Reviews */}
                  {loc.rating && (
                    <div style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#FFD700' }}>{'★'.repeat(Math.floor(loc.rating))}</span>
                      <span style={{ color: '#666', fontSize: '0.85rem' }}>
                        {loc.rating.toFixed(1)} {loc.userRatingsTotal ? `(${loc.userRatingsTotal} reviews)` : ''}
                      </span>
                    </div>
                  )}

                  {/* Price, Category, Open Status */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0', flexWrap: 'wrap' }}>
                    {loc.priceLevel !== null && loc.priceLevel !== undefined && (
                      <span style={{ color: '#4CAF50', fontWeight: 600 }}>{'$'.repeat(loc.priceLevel + 1)}</span>
                    )}
                    {loc.category && loc.category !== 'place' && (
                      <span style={{ color: '#888', fontSize: '0.8rem', background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                        {loc.category}
                      </span>
                    )}
                    {(details?.openNow ?? loc.openNow) !== null && (details?.openNow ?? loc.openNow) !== undefined && (
                      <span style={{ color: (details?.openNow ?? loc.openNow) ? '#4CAF50' : '#f44336', fontWeight: 600, fontSize: '0.85rem' }}>
                        {(details?.openNow ?? loc.openNow) ? 'Open Now' : 'Closed'}
                      </span>
                    )}
                  </div>

                  {/* Place Details: Phone, Website, Hours, Reviews */}
                  {details && (
                    <div style={{ borderTop: '1px solid #eee', marginTop: '6px', paddingTop: '6px' }}>
                      {details.phone && (
                        <div style={{ margin: '3px 0', fontSize: '0.85rem' }}>
                          <a href={`tel:${details.phone}`} style={{ color: '#1976D2', textDecoration: 'none' }}>
                            &#128222; {details.phone}
                          </a>
                        </div>
                      )}
                      {details.website && (
                        <div style={{ margin: '3px 0', fontSize: '0.85rem' }}>
                          <a href={details.website} target="_blank" rel="noopener noreferrer" style={{ color: '#1976D2', textDecoration: 'none' }}>
                            &#127760; Website
                          </a>
                        </div>
                      )}
                      {details.weekdayText.length > 0 && (
                        <details style={{ margin: '4px 0', fontSize: '0.8rem' }}>
                          <summary style={{ cursor: 'pointer', color: '#1976D2' }}>Opening Hours</summary>
                          <div style={{ marginTop: '4px', lineHeight: 1.6, color: '#555' }}>
                            {details.weekdayText.map((line, i) => (
                              <div key={i}>{line}</div>
                            ))}
                          </div>
                        </details>
                      )}
                      {details.reviews?.length > 0 && (
                        <details style={{ margin: '4px 0', fontSize: '0.8rem' }}>
                          <summary style={{ cursor: 'pointer', color: '#1976D2' }}>Top Reviews</summary>
                          <div style={{ marginTop: '4px' }}>
                            {details.reviews.map((review, i) => (
                              <div key={i} style={{ borderBottom: '1px solid #f0f0f0', padding: '4px 0' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{review.author_name}</div>
                                <div style={{ color: '#FFD700', fontSize: '0.75rem' }}>{'★'.repeat(review.rating)}</div>
                                <div style={{ color: '#555', fontSize: '0.75rem', lineHeight: 1.4 }}>
                                  {review.text?.substring(0, 120)}{review.text?.length > 120 ? '...' : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Action button */}
                  <button
                    onClick={() => removeLocation(loc.id)}
                    style={{ background: '#f44336', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', marginTop: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Remove Stop
                  </button>
                </div>
              </InfoWindow>
            );
          })()}
        </GoogleMap>
      </div>
    </div>
  );
};

export default ShortestPath;
