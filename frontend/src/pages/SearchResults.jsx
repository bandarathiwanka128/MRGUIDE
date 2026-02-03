import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './SearchResults.css';

// MapTiler API Key
const MAPTILER_KEY = 'xsEVv6FORhLcPcw7bN85';

// Sri Lanka Bounding Box (to restrict searches)
const SRI_LANKA_BOUNDS = {
  south: 5.916,
  north: 9.835,
  west: 79.652,
  east: 81.879
};

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createMarkerIcon = (color, label = '') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 11px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${label}</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

const greenIcon = createMarkerIcon('#00C853', 'A');
const blueIcon = createMarkerIcon('#2979FF', 'B');

// Component to fit bounds
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      const latLngs = bounds.map(b => [b.lat, b.lng]);
      if (latLngs.length === 1) {
        map.setView(latLngs[0], 16);
      } else {
        map.fitBounds(latLngs, { padding: [60, 60], maxZoom: 16 });
      }
    }
  }, [bounds, map]);
  return null;
}

// Component to fit route bounds
function FitRouteBounds({ route }) {
  const map = useMap();
  useEffect(() => {
    if (route && route.length > 0) {
      map.fitBounds(route, { padding: [60, 60] });
    }
  }, [route, map]);
  return null;
}

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [travelMode, setTravelMode] = useState('car');
  const [mapCenter, setMapCenter] = useState([7.8731, 80.7718]); // Sri Lanka center

  // Start location state
  const [startLocation, setStartLocation] = useState(null);
  const [startSearchQuery, setStartSearchQuery] = useState('');
  const [startSearchResults, setStartSearchResults] = useState([]);
  const [showStartSearch, setShowStartSearch] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const mapRef = useRef(null);

  // Get user's current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            name: 'Your Current Location'
          };
          setCurrentLocation(userLoc);
          setStartLocation(userLoc);
          setMapCenter([userLoc.lat, userLoc.lng]);
          setGettingLocation(false);
        },
        (error) => {
          console.log('Location access denied:', error.message);
          // Default to Colombo if location denied
          const defaultLoc = { lat: 6.9271, lng: 79.8612, name: 'Colombo (Default)' };
          setStartLocation(defaultLoc);
          setMapCenter([defaultLoc.lat, defaultLoc.lng]);
          setSearchStatus('Location denied. Using Colombo as default start.');
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGettingLocation(false);
    }
  };

  // Search places - STRICTLY in Sri Lanka using MapTiler Geocoding
  const searchPlaces = useCallback(async (query) => {
    if (!query.trim()) return;

    setSearchLoading(true);
    setSearchStatus('Searching in Sri Lanka...');
    setPlaces([]);
    setSelectedPlace(null);
    setRoute(null);
    setRouteInfo(null);
    setDirections([]);

    try {
      // Use MapTiler Geocoding API with Sri Lanka bounding box
      const response = await axios.get(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(query + ', Sri Lanka')}.json`,
        {
          params: {
            key: MAPTILER_KEY,
            bbox: `${SRI_LANKA_BOUNDS.west},${SRI_LANKA_BOUNDS.south},${SRI_LANKA_BOUNDS.east},${SRI_LANKA_BOUNDS.north}`,
            limit: 15,
            language: 'en'
          }
        }
      );

      if (response.data.features && response.data.features.length > 0) {
        // Filter results to ensure they're in Sri Lanka
        const sriLankaResults = response.data.features.filter(feature => {
          const [lng, lat] = feature.geometry.coordinates;
          return lat >= SRI_LANKA_BOUNDS.south && lat <= SRI_LANKA_BOUNDS.north &&
                 lng >= SRI_LANKA_BOUNDS.west && lng <= SRI_LANKA_BOUNDS.east;
        });

        if (sriLankaResults.length > 0) {
          const results = sriLankaResults.map((feature, index) => ({
            id: feature.id || `place-${index}`,
            name: feature.text || feature.place_name?.split(',')[0] || 'Unknown',
            position: {
              lat: feature.geometry.coordinates[1],
              lng: feature.geometry.coordinates[0]
            },
            address: feature.place_name || '',
            type: feature.properties?.category || feature.place_type?.[0] || 'place'
          }));

          setPlaces(results);
          setSearchStatus(`Found ${results.length} place${results.length !== 1 ? 's' : ''} in Sri Lanka`);

          if (results.length > 0) {
            setMapCenter([results[0].position.lat, results[0].position.lng]);
          }
        } else {
          // Fallback: Try Nominatim with strict Sri Lanka filter
          await searchWithNominatim(query);
        }
      } else {
        await searchWithNominatim(query);
      }
    } catch (error) {
      console.error('MapTiler search error:', error);
      // Fallback to Nominatim
      await searchWithNominatim(query);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Fallback search with Nominatim
  const searchWithNominatim = async (query) => {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query + ', Sri Lanka',
          format: 'json',
          addressdetails: 1,
          limit: 15,
          countrycodes: 'lk',
          viewbox: `${SRI_LANKA_BOUNDS.west},${SRI_LANKA_BOUNDS.north},${SRI_LANKA_BOUNDS.east},${SRI_LANKA_BOUNDS.south}`,
          bounded: 1
        },
        headers: { 'Accept-Language': 'en' }
      });

      if (response.data && response.data.length > 0) {
        const results = response.data.map((item, index) => ({
          id: item.place_id || `place-${index}`,
          name: item.name || item.display_name.split(',')[0],
          position: {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          },
          address: item.display_name,
          type: item.type || item.class || 'place'
        }));

        setPlaces(results);
        setSearchStatus(`Found ${results.length} place${results.length !== 1 ? 's' : ''} in Sri Lanka`);

        if (results.length > 0) {
          setMapCenter([results[0].position.lat, results[0].position.lng]);
        }
      } else {
        setSearchStatus(`No places found for "${query}" in Sri Lanka`);
      }
    } catch (error) {
      console.error('Nominatim search error:', error);
      setSearchStatus('Search failed. Please try again.');
    }
  };

  // Search on initial load
  useEffect(() => {
    if (initialQuery) {
      searchPlaces(initialQuery);
    }
  }, [initialQuery, searchPlaces]);

  // Search for start location in Sri Lanka
  const searchStartLocation = async (query) => {
    if (!query.trim()) {
      setStartSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(query + ', Sri Lanka')}.json`,
        {
          params: {
            key: MAPTILER_KEY,
            bbox: `${SRI_LANKA_BOUNDS.west},${SRI_LANKA_BOUNDS.south},${SRI_LANKA_BOUNDS.east},${SRI_LANKA_BOUNDS.north}`,
            limit: 5,
            language: 'en'
          }
        }
      );

      if (response.data.features && response.data.features.length > 0) {
        const sriLankaResults = response.data.features.filter(feature => {
          const [lng, lat] = feature.geometry.coordinates;
          return lat >= SRI_LANKA_BOUNDS.south && lat <= SRI_LANKA_BOUNDS.north &&
                 lng >= SRI_LANKA_BOUNDS.west && lng <= SRI_LANKA_BOUNDS.east;
        });

        const results = sriLankaResults.map((feature, index) => ({
          id: feature.id || `start-${index}`,
          name: feature.text || feature.place_name?.split(',')[0] || 'Unknown',
          position: {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0]
          },
          address: feature.place_name || ''
        }));
        setStartSearchResults(results);
      } else {
        setStartSearchResults([]);
      }
    } catch (error) {
      console.error('Start location search error:', error);
      setStartSearchResults([]);
    }
  };

  // Select start location
  const selectStartLocation = (location) => {
    setStartLocation({
      lat: location.position.lat,
      lng: location.position.lng,
      name: location.name
    });
    setStartSearchQuery(location.name);
    setStartSearchResults([]);
    setShowStartSearch(false);
    setRoute(null);
    setRouteInfo(null);
    setDirections([]);
  };

  // Use current location as start
  const useCurrentAsStart = () => {
    if (currentLocation) {
      setStartLocation(currentLocation);
      setStartSearchQuery('Your Current Location');
      setShowStartSearch(false);
      setRoute(null);
      setRouteInfo(null);
      setDirections([]);
    } else {
      getCurrentLocation();
    }
  };

  // Handle search form submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      searchPlaces(searchQuery.trim());
    }
  };

  // Calculate distance (Haversine)
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

  // Get directions to a place
  const getDirections = async (place) => {
    if (!startLocation) {
      alert('Please set your starting location first!');
      setShowStartSearch(true);
      return;
    }

    setSelectedPlace(place);
    setLoading(true);
    setRoute(null);
    setRouteInfo(null);
    setDirections([]);

    try {
      let profile = 'driving';
      if (travelMode === 'walk') {
        profile = 'foot';
      } else if (travelMode === 'bike') {
        profile = 'bike';
      }

      const coordinates = `${startLocation.lng},${startLocation.lat};${place.position.lng},${place.position.lat}`;
      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/${profile}/${coordinates}`,
        {
          params: {
            overview: 'full',
            geometries: 'geojson',
            steps: 'true'
          }
        }
      );

      if (response.data.routes && response.data.routes.length > 0) {
        const routeData = response.data.routes[0];
        const routeCoordinates = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoute(routeCoordinates);

        const distanceKm = (routeData.distance / 1000).toFixed(1);
        const durationMin = Math.round(routeData.duration / 60);

        setRouteInfo({ distance: distanceKm, duration: durationMin });

        if (routeData.legs && routeData.legs[0] && routeData.legs[0].steps) {
          const steps = routeData.legs[0].steps.map((step, index) => ({
            id: index,
            instruction: formatInstruction(step),
            distance: (step.distance / 1000).toFixed(2),
            duration: Math.round(step.duration / 60)
          }));
          setDirections(steps);
        }
      }
    } catch (error) {
      console.error('Routing error:', error);
      alert('Could not calculate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatInstruction = (step) => {
    const type = step.maneuver.type;
    const modifier = step.maneuver.modifier;
    const name = step.name || 'the road';

    if (type === 'arrive') return 'Arrive at destination';
    if (type === 'depart') return `Start on ${name}`;
    if (type === 'turn') return `Turn ${modifier || ''} onto ${name}`;
    if (type === 'continue') return `Continue on ${name}`;
    if (type === 'roundabout') return `Take the roundabout, exit to ${name}`;
    if (type === 'merge') return `Merge onto ${name}`;
    if (type === 'fork') return `Take the ${modifier || ''} fork onto ${name}`;

    return `${type} ${modifier || ''} - ${name}`;
  };

  // Clear route
  const clearRoute = () => {
    setSelectedPlace(null);
    setRoute(null);
    setRouteInfo(null);
    setDirections([]);
  };

  // Travel modes
  const travelModes = [
    { id: 'car', icon: '🚗', label: 'Car' },
    { id: 'bus', icon: '🚌', label: 'Bus' },
    { id: 'train', icon: '🚆', label: 'Train' },
    { id: 'walk', icon: '🚶', label: 'Walk' }
  ];

  return (
    <div className="search-results-container">
      {/* Sidebar - Dark Theme */}
      <div className="results-sidebar">
        {/* Search Header */}
        <div className="sidebar-header">
          <h2>🇱🇰 Search Sri Lanka</h2>
          <form onSubmit={handleSearch} className="sidebar-search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places in Sri Lanka..."
              className="sidebar-search-input"
            />
            <button type="submit" className="sidebar-search-btn" disabled={searchLoading}>
              {searchLoading ? '...' : '🔍'}
            </button>
          </form>
        </div>

        {/* Start Location Section */}
        <div className="start-location-section">
          <p className="section-label">📍 Your Starting Point</p>
          <div className="start-location-box">
            {startLocation ? (
              <div className="current-start">
                <span className="start-marker">A</span>
                <span className="start-name">{startLocation.name}</span>
                <button onClick={() => setShowStartSearch(!showStartSearch)} className="change-btn">
                  Change
                </button>
              </div>
            ) : (
              <div className="no-start">
                <span>Set your starting point</span>
              </div>
            )}

            {(showStartSearch || !startLocation) && (
              <div className="start-search-box">
                <input
                  type="text"
                  value={startSearchQuery}
                  onChange={(e) => {
                    setStartSearchQuery(e.target.value);
                    searchStartLocation(e.target.value);
                  }}
                  placeholder="Search location in Sri Lanka..."
                  className="start-search-input"
                />
                <button
                  onClick={useCurrentAsStart}
                  className="use-gps-btn"
                  disabled={gettingLocation}
                >
                  {gettingLocation ? 'Getting...' : '📍 Use My Location'}
                </button>

                {startSearchResults.length > 0 && (
                  <div className="start-results">
                    {startSearchResults.map((result) => (
                      <div
                        key={result.id}
                        className="start-result-item"
                        onClick={() => selectStartLocation(result)}
                      >
                        <strong>{result.name}</strong>
                        <small>{result.address}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Travel Mode Selector */}
        <div className="travel-mode-section">
          <p className="section-label">🚗 Travel Mode</p>
          <div className="travel-mode-buttons">
            {travelModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  setTravelMode(mode.id);
                  if (selectedPlace && startLocation) {
                    getDirections(selectedPlace);
                  }
                }}
                className={`travel-mode-btn ${travelMode === mode.id ? 'active' : ''}`}
              >
                <span className="mode-icon">{mode.icon}</span>
                <span className="mode-label">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Status */}
        {searchStatus && (
          <div className={`search-status-bar ${places.length > 0 ? 'success' : ''}`}>
            {searchStatus}
          </div>
        )}

        {/* Results List */}
        <div className="places-list-container">
          {places.length === 0 && !searchLoading && (
            <div className="empty-state">
              <p>🔍 Search for places in Sri Lanka</p>
              <p className="hint">Try: "Colombo Unity Plaza", "Sigiriya", "Galle Fort"</p>
            </div>
          )}

          {places.map((place, index) => {
            const distance = startLocation
              ? calculateDistance(startLocation.lat, startLocation.lng, place.position.lat, place.position.lng)
              : null;

            return (
              <div
                key={place.id}
                className={`place-result-card ${selectedPlace?.id === place.id ? 'selected' : ''}`}
                onClick={() => getDirections(place)}
              >
                <div className="place-number">{index + 1}</div>
                <div className="place-details">
                  <h4 className="place-name">{place.name}</h4>
                  <p className="place-address">{place.address}</p>
                  <div className="place-meta">
                    {place.type && <span className="place-type">{place.type}</span>}
                    {distance && <span className="place-distance">📍 {distance} km</span>}
                  </div>
                </div>
                <button
                  className="get-directions-btn"
                  disabled={loading && selectedPlace?.id === place.id}
                >
                  {loading && selectedPlace?.id === place.id ? '...' : '→'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Route Info Panel */}
        {routeInfo && (
          <div className="route-info-panel">
            <div className="route-header">
              <h3>🗺️ Route Details</h3>
              <button onClick={clearRoute} className="clear-route-btn">×</button>
            </div>

            <div className="route-endpoints">
              <div className="endpoint">
                <span className="endpoint-marker a">A</span>
                <span>{startLocation?.name}</span>
              </div>
              <div className="endpoint">
                <span className="endpoint-marker b">B</span>
                <span>{selectedPlace?.name}</span>
              </div>
            </div>

            <div className="route-stats">
              <div className="stat-item">
                <span className="stat-value">{routeInfo.distance}</span>
                <span className="stat-label">km</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{routeInfo.duration}</span>
                <span className="stat-label">min</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">{travelModes.find(m => m.id === travelMode)?.icon}</span>
                <span className="stat-label">{travelModes.find(m => m.id === travelMode)?.label}</span>
              </div>
            </div>

            {directions.length > 0 && (
              <div className="directions-list">
                <h4>📝 Turn-by-turn</h4>
                <ol className="directions-steps">
                  {directions.map((step) => (
                    <li key={step.id} className="direction-step">
                      <span className="step-instruction">{step.instruction}</span>
                      <span className="step-distance">{step.distance} km</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="map-area">
        <MapContainer
          center={mapCenter}
          zoom={8}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          {/* MapTiler Streets Tile Layer - High Quality */}
          <TileLayer
            attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`}
            maxZoom={20}
            tileSize={512}
            zoomOffset={-1}
          />

          {/* Fit bounds to search results */}
          {places.length > 0 && !route && (
            <FitBounds bounds={places.map(p => p.position)} />
          )}

          {/* Fit bounds to route */}
          {route && <FitRouteBounds route={route} />}

          {/* Start Location Marker (Green A) */}
          {startLocation && (
            <Marker position={[startLocation.lat, startLocation.lng]} icon={greenIcon}>
              <Popup><strong>Start: {startLocation.name}</strong></Popup>
            </Marker>
          )}

          {/* Search Results Markers */}
          {places.map((place, index) => (
            <Marker
              key={place.id}
              position={[place.position.lat, place.position.lng]}
              icon={selectedPlace?.id === place.id ? blueIcon : createMarkerIcon('#E53935', String(index + 1))}
            >
              <Popup>
                <div className="marker-popup">
                  <strong>{place.name}</strong><br />
                  <small>{place.address}</small><br />
                  <button onClick={() => getDirections(place)} className="popup-directions-btn">
                    Get Directions
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Route Polyline (Blue) */}
          {route && (
            <Polyline
              positions={route}
              pathOptions={{
                color: '#4285F4',
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default SearchResults;
