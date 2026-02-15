import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow, DirectionsRenderer, Polyline } from '@react-google-maps/api';
import axios from 'axios';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config';
import './RouteOptimize.css';

const libraries = ['places'];
const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 };
const SRI_LANKA_BOUNDS = { south: 5.916, north: 9.835, west: 79.652, east: 81.879 };
const mapContainerStyle = { width: '100%', height: '100%' };

const GOOGLE_TRAVEL_MODES = {
  car: 'DRIVING',
  bus: 'TRANSIT',
  train: 'TRANSIT',
  walk: 'WALKING'
};

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

const RouteOptimize = () => {
  const { isLoaded } = useLoadScript({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries });

  const [stops, setStops] = useState([]);
  const [optimizedStops, setOptimizedStops] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [originalRouteInfo, setOriginalRouteInfo] = useState(null);
  const [directions, setDirections] = useState([]);
  const [directionsResult, setDirectionsResult] = useState(null);
  const [originalDirectionsResult, setOriginalDirectionsResult] = useState(null);
  const [travelMode, setTravelMode] = useState('car');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [placeDetails, setPlaceDetails] = useState({});

  const mapRef = useRef(null);
  const placesServiceRef = useRef(null);
  const geocoderRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    placesServiceRef.current = new window.google.maps.places.PlacesService(map);
    geocoderRef.current = new window.google.maps.Geocoder();
    directionsServiceRef.current = new window.google.maps.DirectionsService();
  }, []);

  // Fit map to stops
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const displayStops = optimizedStops || stops;
    if (displayStops.length === 0) return;
    if (directionsResult) return; // Let DirectionsRenderer handle the view when route is shown

    if (displayStops.length === 1) {
      mapRef.current.setCenter({ lat: displayStops[0].lat, lng: displayStops[0].lng });
      mapRef.current.setZoom(14);
    } else {
      const bounds = new window.google.maps.LatLngBounds();
      displayStops.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }));
      mapRef.current.fitBounds(bounds, 60);
    }
  }, [stops, optimizedStops, isLoaded, directionsResult]);

  // Search places using Google Places
  const searchPlaces = useCallback((query) => {
    if (!query.trim()) { setSearchResults([]); return; }
    if (!placesServiceRef.current) return;

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      const request = {
        query: query + ', Sri Lanka',
        bounds: new window.google.maps.LatLngBounds(
          { lat: SRI_LANKA_BOUNDS.south, lng: SRI_LANKA_BOUNDS.west },
          { lat: SRI_LANKA_BOUNDS.north, lng: SRI_LANKA_BOUNDS.east }
        )
      };

      placesServiceRef.current.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const filtered = results
            .filter(r => {
              const lat = r.geometry.location.lat();
              const lng = r.geometry.location.lng();
              return lat >= SRI_LANKA_BOUNDS.south && lat <= SRI_LANKA_BOUNDS.north &&
                     lng >= SRI_LANKA_BOUNDS.west && lng <= SRI_LANKA_BOUNDS.east;
            })
            .slice(0, 8)
            .map((r, i) => ({
              id: r.place_id || `sr-${i}`,
              placeId: r.place_id || null,
              name: r.name || 'Unknown',
              address: r.formatted_address || '',
              lat: r.geometry.location.lat(),
              lng: r.geometry.location.lng(),
              rating: r.rating || null,
              userRatingsTotal: r.user_ratings_total || 0,
              priceLevel: r.price_level ?? null,
              category: r.types?.[0]?.replace(/_/g, ' ') || 'place',
              openNow: r.opening_hours?.isOpen?.() ?? null
            }));
          setSearchResults(filtered);
        } else {
          setSearchResults([]);
        }
      });
    }, 300);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const addStop = useCallback((stop) => {
    setStops(prev => [...prev, { ...stop, id: Date.now() + '-' + Math.random() }]);
    setSearchResults([]);
    setSearchQuery('');
    resetOptimization();
  }, []);

  const handleMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    if (lat < SRI_LANKA_BOUNDS.south || lat > SRI_LANKA_BOUNDS.north ||
        lng < SRI_LANKA_BOUNDS.west || lng > SRI_LANKA_BOUNDS.east) {
      return;
    }

    if (geocoderRef.current) {
      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const result = results[0];
          const components = result.address_components || [];
          const nameComponent = components.find(c =>
            c.types.includes('point_of_interest') || c.types.includes('establishment')
          );
          const routeComponent = components.find(c => c.types.includes('route'));
          const localityComponent = components.find(c => c.types.includes('locality'));

          const name = nameComponent?.long_name ||
                       routeComponent?.long_name ||
                       localityComponent?.long_name ||
                       `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          const address = result.formatted_address || '';

          addStop({ name, address, lat, lng });
        } else {
          addStop({ name: `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`, address: '', lat, lng });
        }
      });
    } else {
      addStop({ name: `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`, address: '', lat, lng });
    }
  }, [addStop]);

  const removeStop = (index) => {
    setStops(prev => prev.filter((_, i) => i !== index));
    resetOptimization();
  };

  const moveStop = (index, direction) => {
    const newStops = [...stops];
    const target = index + direction;
    if (target < 0 || target >= newStops.length) return;
    [newStops[index], newStops[target]] = [newStops[target], newStops[index]];
    setStops(newStops);
    resetOptimization();
  };

  const resetOptimization = () => {
    setOptimizedStops(null);
    setDirectionsResult(null);
    setOriginalDirectionsResult(null);
    setRouteInfo(null);
    setOriginalRouteInfo(null);
    setDirections([]);
    setShowComparison(false);
    setSelectedMarker(null);
  };

  // Calculate route via Google Directions Service
  const calculateRoute = async (stopsArray) => {
    if (stopsArray.length < 2 || !directionsServiceRef.current) return null;

    const origin = { lat: stopsArray[0].lat, lng: stopsArray[0].lng };
    const destination = { lat: stopsArray[stopsArray.length - 1].lat, lng: stopsArray[stopsArray.length - 1].lng };

    const waypoints = stopsArray.slice(1, -1).map(s => ({
      location: { lat: s.lat, lng: s.lng },
      stopover: true
    }));

    const googleMode = GOOGLE_TRAVEL_MODES[travelMode] || 'DRIVING';

    return new Promise((resolve) => {
      directionsServiceRef.current.route(
        {
          origin,
          destination,
          waypoints,
          travelMode: window.google.maps.TravelMode[googleMode],
          optimizeWaypoints: false,
          region: 'lk'
        },
        (result, status) => {
          if (status === 'OK' && result) {
            let totalDistance = 0;
            let totalDuration = 0;
            const steps = [];

            result.routes[0].legs.forEach((leg, legIdx) => {
              totalDistance += leg.distance.value;
              totalDuration += leg.duration.value;

              leg.steps.forEach((step, stepIdx) => {
                steps.push({
                  id: `${legIdx}-${stepIdx}`,
                  instruction: step.instructions ? step.instructions.replace(/<[^>]*>/g, '') : '',
                  distance: (step.distance.value / 1000).toFixed(2),
                  duration: Math.round(step.duration.value / 60)
                });
              });
            });

            const distKm = (totalDistance / 1000).toFixed(1);
            const durMin = Math.round(totalDuration / 60);

            resolve({ directionsResult: result, distance: distKm, duration: durMin, steps });
          } else {
            console.error('Directions request failed:', status);
            resolve(null);
          }
        }
      );
    });
  };

  // Optimize route
  const optimizeRoute = async () => {
    if (stops.length < 3) {
      alert('Need at least 3 stops to optimize');
      return;
    }

    setOptimizing(true);

    try {
      // Calculate original route first
      const origResult = await calculateRoute(stops);
      if (origResult) {
        setOriginalDirectionsResult(origResult.directionsResult);
        setOriginalRouteInfo({ distance: origResult.distance, duration: origResult.duration });
      }

      // Call backend optimize
      const locations = stops.map(s => ({ lat: s.lat, lng: s.lng, name: s.name }));
      const response = await axios.post(`${API_BASE_URL}/places/optimize-route`, {
        locations,
        startLocation: locations[0]
      });

      if (response.data.optimizedRoute) {
        const optStops = response.data.optimizedRoute.map((loc, i) => {
          const original = stops.find(s =>
            Math.abs(s.lat - loc.lat) < 0.0001 && Math.abs(s.lng - loc.lng) < 0.0001
          );
          return {
            ...loc,
            id: original?.id || `opt-${i}`,
            name: loc.name || original?.name || `Stop ${i + 1}`,
            address: original?.address || ''
          };
        });

        setOptimizedStops(optStops);

        // Calculate optimized route
        const optResult = await calculateRoute(optStops);
        if (optResult) {
          setDirectionsResult(optResult.directionsResult);
          setRouteInfo({ distance: optResult.distance, duration: optResult.duration });
          setDirections(optResult.steps);
        }

        setShowComparison(true);
      }
    } catch (error) {
      console.error('Optimization error:', error);
      // Fallback: client-side nearest neighbor
      const optimized = clientSideTSP(stops);
      setOptimizedStops(optimized);

      // Calculate original route for comparison
      const origResult = await calculateRoute(stops);
      if (origResult) {
        setOriginalDirectionsResult(origResult.directionsResult);
        setOriginalRouteInfo({ distance: origResult.distance, duration: origResult.duration });
      }

      const optResult = await calculateRoute(optimized);
      if (optResult) {
        setDirectionsResult(optResult.directionsResult);
        setRouteInfo({ distance: optResult.distance, duration: optResult.duration });
        setDirections(optResult.steps);
      }
      setShowComparison(true);
    } finally {
      setOptimizing(false);
    }
  };

  // Client-side nearest neighbor TSP
  const clientSideTSP = (stopsArr) => {
    const unvisited = [...stopsArr];
    const result = [unvisited.shift()];
    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDist = haversine(result[result.length - 1].lat, result[result.length - 1].lng, unvisited[0].lat, unvisited[0].lng);
      for (let i = 1; i < unvisited.length; i++) {
        const d = haversine(result[result.length - 1].lat, result[result.length - 1].lng, unvisited[i].lat, unvisited[i].lng);
        if (d < minDist) { minDist = d; nearestIdx = i; }
      }
      result.push(unvisited[nearestIdx]);
      unvisited.splice(nearestIdx, 1);
    }
    return result;
  };

  // Show current route
  const showCurrentRoute = async () => {
    const activeStops = optimizedStops || stops;
    if (activeStops.length < 2) {
      setDirectionsResult(null);
      setRouteInfo(null);
      setDirections([]);
      return;
    }
    setLoading(true);
    const result = await calculateRoute(activeStops);
    if (result) {
      setDirectionsResult(result.directionsResult);
      setRouteInfo({ distance: result.distance, duration: result.duration });
      setDirections(result.steps);
    }
    setLoading(false);
  };

  // Extract polyline path from DirectionsResult for original route overlay
  const getPolylinePath = (dirResult) => {
    if (!dirResult || !dirResult.routes || !dirResult.routes[0]) return [];
    const path = [];
    dirResult.routes[0].legs.forEach(leg => {
      leg.steps.forEach(step => {
        const stepPath = step.path || [];
        stepPath.forEach(point => {
          path.push({ lat: point.lat(), lng: point.lng() });
        });
      });
    });
    return path;
  };

  const getMarkerIcon = (index, isOptimized) => {
    let color;
    if (index === 0) {
      color = '#00C853'; // green
    } else if (isOptimized) {
      color = '#2979FF'; // blue
    } else {
      color = '#E53935'; // red
    }

    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
      scale: 14,
      labelOrigin: new window.google.maps.Point(0, 0)
    };
  };

  const displayStops = optimizedStops || stops;

  const travelModes = [
    { id: 'car', label: 'Car', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2M5 17l-1 3m16-3l1 3M7 13h.01M17 13h.01M7 7l1-3h8l1 3"/></svg> },
    { id: 'bus', label: 'Bus', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="16" rx="2"/><line x1="4" y1="11" x2="20" y2="11"/><line x1="12" y1="3" x2="12" y2="11"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/><line x1="4" y1="19" x2="6" y2="21"/><line x1="20" y1="19" x2="18" y2="21"/></svg> },
    { id: 'train', label: 'Train', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="16" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="12" y1="2" x2="12" y2="10"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/><line x1="8" y1="18" x2="5" y2="22"/><line x1="16" y1="18" x2="19" y2="22"/></svg> },
    { id: 'walk', label: 'Walk', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13" cy="4" r="2"/><path d="M10 22l2-7 3 3v6M14 13l2-3-3-3-4 4 3 3"/></svg> }
  ];

  // Handle stop marker click - fetch Place Details
  const handleStopMarkerClick = (index) => {
    setSelectedMarker(index);
    const stop = (optimizedStops || stops)[index];
    if (!stop) return;

    if (!placeDetails[stop.id] && stop.placeId && placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        {
          placeId: stop.placeId,
          fields: ['formatted_phone_number', 'website', 'opening_hours', 'business_status', 'reviews']
        },
        (result, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
            setPlaceDetails(prev => ({
              ...prev,
              [stop.id]: {
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

  if (!isLoaded) {
    return (
      <div className="ro-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: '#FFD700' }}>
          Loading Google Maps...
        </div>
      </div>
    );
  }

  return (
    <div className="ro-container">
      {/* Sidebar */}
      <div className="ro-sidebar">
        <div className="ro-header">
          <h2>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            {' '}Route Optimization
          </h2>
        </div>

        {/* Search */}
        <div className="ro-search-section">
          <div className="ro-search-box">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchPlaces(e.target.value);
              }}
              placeholder="Search places to add as stops..."
              className="ro-search-input"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="ro-search-results">
              {searchResults.map((r) => (
                <div key={r.id} className="ro-search-item" onClick={() => addStop(r)}>
                  <strong>{r.name}</strong>
                  <small>{r.address}</small>
                </div>
              ))}
            </div>
          )}
          <p className="ro-hint">Or click on the map to add stops</p>
        </div>

        {/* Travel Mode */}
        <div className="ro-mode-section">
          <p className="ro-section-label">Travel Mode</p>
          <div className="ro-mode-buttons">
            {travelModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  setTravelMode(mode.id);
                  resetOptimization();
                }}
                className={`ro-mode-btn ${travelMode === mode.id ? 'active' : ''}`}
              >
                {mode.icon}
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stops List */}
        <div className="ro-stops-section">
          <div className="ro-stops-header">
            <p className="ro-section-label">Stops ({displayStops.length})</p>
            {optimizedStops && (
              <span className="ro-optimized-badge">Optimized</span>
            )}
          </div>

          <div className="ro-stops-list">
            {displayStops.length === 0 && (
              <div className="ro-empty">
                <p>No stops added yet. Search or click the map to add stops.</p>
              </div>
            )}
            {displayStops.map((stop, index) => (
              <div key={stop.id || index} className="ro-stop-card">
                <div className="ro-stop-marker" style={{
                  backgroundColor: index === 0 ? '#00C853' : optimizedStops ? '#2979FF' : '#E53935'
                }}>
                  {index + 1}
                </div>
                <div className="ro-stop-info">
                  <h4>{stop.name}</h4>
                  {stop.address && <p>{stop.address}</p>}
                  {index > 0 && (
                    <span className="ro-stop-distance">
                      {haversine(
                        displayStops[index - 1].lat, displayStops[index - 1].lng,
                        stop.lat, stop.lng
                      ).toFixed(1)} km from prev
                    </span>
                  )}
                </div>
                {!optimizedStops && (
                  <div className="ro-stop-actions">
                    <button onClick={() => moveStop(index, -1)} disabled={index === 0} className="ro-move-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button onClick={() => moveStop(index, 1)} disabled={index === stops.length - 1} className="ro-move-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <button onClick={() => removeStop(index)} className="ro-remove-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="ro-actions">
          {!optimizedStops ? (
            <>
              <button
                className="ro-optimize-btn"
                onClick={optimizeRoute}
                disabled={stops.length < 3 || optimizing}
              >
                {optimizing ? 'Optimizing...' : 'Optimize Route'}
              </button>
              <button
                className="ro-show-route-btn"
                onClick={showCurrentRoute}
                disabled={stops.length < 2 || loading}
              >
                {loading ? 'Calculating...' : 'Show Current Route'}
              </button>
            </>
          ) : (
            <button className="ro-reset-btn" onClick={() => { resetOptimization(); }}>
              Reset Optimization
            </button>
          )}
        </div>

        {/* Comparison */}
        {showComparison && originalRouteInfo && routeInfo && (
          <div className="ro-comparison">
            <h3>Before vs After</h3>
            <div className="ro-comparison-grid">
              <div className="ro-comp-card original">
                <span className="ro-comp-label">Original</span>
                <span className="ro-comp-value">{originalRouteInfo.distance} km</span>
                <span className="ro-comp-time">{originalRouteInfo.duration} min</span>
              </div>
              <div className="ro-comp-card optimized">
                <span className="ro-comp-label">Optimized</span>
                <span className="ro-comp-value">{routeInfo.distance} km</span>
                <span className="ro-comp-time">{routeInfo.duration} min</span>
              </div>
            </div>
            {parseFloat(originalRouteInfo.distance) > parseFloat(routeInfo.distance) && (
              <div className="ro-savings">
                Saved {(parseFloat(originalRouteInfo.distance) - parseFloat(routeInfo.distance)).toFixed(1)} km
                ({Math.round(((parseFloat(originalRouteInfo.distance) - parseFloat(routeInfo.distance)) / parseFloat(originalRouteInfo.distance)) * 100)}% shorter)
              </div>
            )}
          </div>
        )}

        {/* Route Info */}
        {routeInfo && !showComparison && (
          <div className="ro-route-info">
            <div className="ro-route-stats">
              <div className="ro-stat">
                <span className="ro-stat-value">{routeInfo.distance}</span>
                <span className="ro-stat-label">km</span>
              </div>
              <div className="ro-stat">
                <span className="ro-stat-value">{routeInfo.duration}</span>
                <span className="ro-stat-label">min</span>
              </div>
              <div className="ro-stat">
                <span className="ro-stat-value">{displayStops.length}</span>
                <span className="ro-stat-label">stops</span>
              </div>
            </div>
          </div>
        )}

        {/* Directions */}
        {directions.length > 0 && (
          <div className="ro-directions">
            <h4>Turn-by-turn Directions</h4>
            <ol className="ro-directions-list">
              {directions.map((step) => (
                <li key={step.id} className="ro-direction-step">
                  <span className="ro-step-text">{step.instruction}</span>
                  <span className="ro-step-dist">{step.distance} km</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="ro-map">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={SRI_LANKA_CENTER}
          zoom={8}
          onLoad={onMapLoad}
          onClick={handleMapClick}
          options={{
            restriction: {
              latLngBounds: SRI_LANKA_BOUNDS,
              strictBounds: false
            },
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            styles: [
              {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#193341' }]
              },
              {
                featureType: 'landscape',
                elementType: 'geometry',
                stylers: [{ color: '#2c5a71' }]
              }
            ]
          }}
        >
          {/* Stop markers */}
          {displayStops.map((stop, index) => (
            <Marker
              key={stop.id || index}
              position={{ lat: stop.lat, lng: stop.lng }}
              icon={getMarkerIcon(index, !!optimizedStops)}
              label={{
                text: String(index + 1),
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '11px'
              }}
              onClick={() => handleStopMarkerClick(index)}
              zIndex={index === 0 ? 1000 : 500}
            />
          ))}

          {/* InfoWindow */}
          {selectedMarker !== null && displayStops[selectedMarker] && (() => {
            const stop = displayStops[selectedMarker];
            const details = placeDetails[stop.id];
            return (
            <InfoWindow
              position={{ lat: stop.lat, lng: stop.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div style={{ minWidth: '240px', maxWidth: '300px', color: '#333' }}>
                <strong style={{ fontSize: '1.05rem' }}>Stop {selectedMarker + 1}: {stop.name}</strong>
                {stop.address && (
                  <><br /><small style={{ color: '#666' }}>{stop.address}</small></>
                )}

                {/* Rating */}
                {stop.rating && (
                  <div style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#FFD700' }}>{'★'.repeat(Math.floor(stop.rating))}</span>
                    <span style={{ color: '#666', fontSize: '0.85rem' }}>
                      {stop.rating.toFixed(1)} {stop.userRatingsTotal ? `(${stop.userRatingsTotal} reviews)` : ''}
                    </span>
                  </div>
                )}

                {/* Price, Category, Open Status */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0', flexWrap: 'wrap' }}>
                  {stop.priceLevel !== null && stop.priceLevel !== undefined && (
                    <span style={{ color: '#4CAF50', fontWeight: 600 }}>{'$'.repeat(stop.priceLevel + 1)}</span>
                  )}
                  {stop.category && stop.category !== 'place' && (
                    <span style={{ color: '#888', fontSize: '0.8rem', background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                      {stop.category}
                    </span>
                  )}
                  {(details?.openNow ?? stop.openNow) !== null && (details?.openNow ?? stop.openNow) !== undefined && (
                    <span style={{ color: (details?.openNow ?? stop.openNow) ? '#4CAF50' : '#f44336', fontWeight: 600, fontSize: '0.85rem' }}>
                      {(details?.openNow ?? stop.openNow) ? 'Open Now' : 'Closed'}
                    </span>
                  )}
                </div>

                {/* Place Details */}
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
              </div>
            </InfoWindow>
            );
          })()}

          {/* Original route as dashed red polyline (comparison mode) */}
          {showComparison && originalDirectionsResult && (
            <Polyline
              path={getPolylinePath(originalDirectionsResult)}
              options={{
                strokeColor: '#f44336',
                strokeWeight: 4,
                strokeOpacity: 0.5,
                icons: [{
                  icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                  offset: '0',
                  repeat: '15px'
                }],
                strokeOpacity: 0
              }}
            />
          )}

          {/* Optimized/current route via DirectionsRenderer */}
          {directionsResult && (
            <DirectionsRenderer
              directions={directionsResult}
              options={{
                polylineOptions: {
                  strokeColor: '#4285F4',
                  strokeWeight: 6,
                  strokeOpacity: 0.9
                },
                suppressMarkers: true,
                preserveViewport: showComparison
              }}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  );
};

export default RouteOptimize;
