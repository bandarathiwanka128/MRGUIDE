import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './MapSearch.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  });
};

const blueIcon = createCustomIcon('#2196F3');
const redIcon = createCustomIcon('#f44336');
const yellowIcon = createCustomIcon('#FFD700');

// Component to update map view
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

// Component to fit bounds
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      const latLngs = bounds.map(b => [b.lat, b.lng]);
      map.fitBounds(latLngs, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

// Component to handle map clicks for reverse geocoding
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

const MapSearchLeaflet = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchStatus, setSearchStatus] = useState('');
  const [mapCenter, setMapCenter] = useState([6.9271, 79.8612]); // Colombo, Sri Lanka
  const [mapZoom, setMapZoom] = useState(12);
  const [travelMode, setTravelMode] = useState('car'); // car, bike, foot
  const [clickedLocation, setClickedLocation] = useState(null);

  const mapRef = useRef(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(userLoc);
          setMapCenter([userLoc.lat, userLoc.lng]);
        },
        (error) => {
          console.log('Location access denied or unavailable');
        }
      );
    }
  }, []);

  // PHOTON GEOCODING - Forward geocoding (place name to coordinates)
  const searchPlacePhoton = async (query) => {
    if (!query.trim()) {
      setSearchError('Please enter a search term');
      return;
    }

    setLoading(true);
    setSearchError(null);
    setSearchStatus('Searching...');
    setNearbyPlaces([]);

    try {
      // PHOTON geocoding API - Free, no API key required
      const response = await axios.get('https://photon.komoot.io/api/', {
        params: {
          q: query,
          limit: 10,
          lat: currentLocation?.lat || mapCenter[0],
          lon: currentLocation?.lng || mapCenter[1]
        }
      });

      if (response.data.features && response.data.features.length > 0) {
        const places = response.data.features.map((feature, index) => ({
          id: feature.properties.osm_id || index,
          name: feature.properties.name || feature.properties.street || 'Unknown',
          position: {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0]
          },
          address: [
            feature.properties.street,
            feature.properties.city,
            feature.properties.state,
            feature.properties.country
          ].filter(Boolean).join(', '),
          type: feature.properties.type || feature.properties.osm_value,
          country: feature.properties.country,
          city: feature.properties.city
        }));

        setNearbyPlaces(places);
        setSearchStatus(`Found ${places.length} places!`);
        setSearchError(null);

        // Set map center to first result
        if (places.length > 0) {
          setMapCenter([places[0].position.lat, places[0].position.lng]);
          setMapZoom(13);
        }
      } else {
        setSearchError(`No places found for "${query}"`);
        setSearchStatus('');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // PHOTON GEOCODING - Reverse geocoding (coordinates to address)
  const reverseGeocode = async (latlng) => {
    try {
      const response = await axios.get('https://photon.komoot.io/reverse', {
        params: {
          lat: latlng.lat,
          lon: latlng.lng
        }
      });

      if (response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        const clickedPlace = {
          id: 'clicked-' + Date.now(),
          name: feature.properties.name || 'Selected Location',
          position: {
            lat: latlng.lat,
            lng: latlng.lng
          },
          address: [
            feature.properties.street,
            feature.properties.city,
            feature.properties.state,
            feature.properties.country
          ].filter(Boolean).join(', '),
          type: 'clicked-location'
        };

        setClickedLocation(clickedPlace);
        setSearchStatus(`Location: ${clickedPlace.address || 'Unknown'}`);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  // Handle map click for reverse geocoding
  const handleMapClick = (latlng) => {
    reverseGeocode(latlng);
  };

  // Toggle location selection
  const toggleLocationSelection = (place) => {
    const exists = selectedLocations.find(loc => loc.id === place.id);
    if (exists) {
      setSelectedLocations(selectedLocations.filter(loc => loc.id !== place.id));
    } else {
      setSelectedLocations([...selectedLocations, place]);
    }
    setRoute(null);
    setRouteInfo(null);
  };

  // Add clicked location to route
  const addClickedToRoute = () => {
    if (clickedLocation) {
      toggleLocationSelection(clickedLocation);
      setClickedLocation(null);
    }
  };

  // OSRM ROUTING - Calculate route between multiple points
  const calculateRoute = async () => {
    if (selectedLocations.length < 2) {
      alert('Please select at least 2 locations');
      return;
    }

    setLoading(true);
    try {
      // Build coordinates string for OSRM
      const coordinates = selectedLocations
        .map(loc => `${loc.position.lng},${loc.position.lat}`)
        .join(';');

      // OSRM routing API - Free, no API key required
      // Travel modes: car, bike, foot
      const profile = travelMode === 'car' ? 'car' : travelMode === 'bike' ? 'bike' : 'foot';
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

        // Decode route geometry to Leaflet-compatible format
        const routeCoordinates = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);

        setRoute(routeCoordinates);

        // Calculate route info
        const distanceKm = (routeData.distance / 1000).toFixed(2);
        const durationMin = Math.round(routeData.duration / 60);

        setRouteInfo({
          distance: distanceKm,
          duration: durationMin,
          steps: routeData.legs[0]?.steps || []
        });

        setSearchStatus(`Route: ${distanceKm}km, ${durationMin} minutes`);
      }
    } catch (error) {
      console.error('Routing error:', error);
      alert('Error calculating route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Clear all selections and route
  const clearSelections = () => {
    setSelectedLocations([]);
    setRoute(null);
    setRouteInfo(null);
    setNearbyPlaces([]);
    setClickedLocation(null);
    setSearchStatus('');
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(2);
  };

  return (
    <div className="map-search-container">
      {/* Sidebar */}
      <div className="map-sidebar">
        <div className="sidebar-header">
          <h2>Explore Places</h2>
          <p>Search locations using OpenStreetMap</p>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <div className="search-input-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchError(null);
              }}
              onKeyPress={(e) => e.key === 'Enter' && searchPlacePhoton(searchQuery)}
              placeholder="Search for places (e.g., Colombo, hotels, restaurants)"
              className="search-input"
            />
            <button onClick={() => searchPlacePhoton(searchQuery)} className="search-btn" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Travel Mode Selection */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setTravelMode('car')}
              className={`search-btn ${travelMode === 'car' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '8px',
                background: travelMode === 'car' ? '#FFD700' : 'rgba(255,255,255,0.1)',
                fontSize: '0.85rem'
              }}
            >
              🚗 Car
            </button>
            <button
              onClick={() => setTravelMode('bike')}
              className={`search-btn ${travelMode === 'bike' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '8px',
                background: travelMode === 'bike' ? '#FFD700' : 'rgba(255,255,255,0.1)',
                fontSize: '0.85rem'
              }}
            >
              🚴 Bike
            </button>
            <button
              onClick={() => setTravelMode('foot')}
              className={`search-btn ${travelMode === 'foot' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '8px',
                background: travelMode === 'foot' ? '#FFD700' : 'rgba(255,255,255,0.1)',
                fontSize: '0.85rem'
              }}
            >
              🚶 Walk
            </button>
          </div>

          {searchStatus && (
            <div className="search-status success">
              {searchStatus}
            </div>
          )}

          {searchError && (
            <div className="search-status error">
              {searchError}
            </div>
          )}

          {currentLocation && (
            <p className="location-info">
              📍 Using your current location
            </p>
          )}

          {clickedLocation && (
            <div className="search-status success">
              Clicked: {clickedLocation.name}
              <button
                onClick={addClickedToRoute}
                className="select-btn"
                style={{ marginTop: '8px' }}
              >
                Add to Route
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {nearbyPlaces.length > 0 && (
          <div className="results-section">
            <h3>Found {nearbyPlaces.length} places</h3>
            <div className="places-list">
              {nearbyPlaces.map((place) => {
                const distance = currentLocation
                  ? calculateDistance(currentLocation.lat, currentLocation.lng, place.position.lat, place.position.lng)
                  : null;

                return (
                  <div
                    key={place.id}
                    className={`place-card ${selectedLocations.find(loc => loc.id === place.id) ? 'selected' : ''}`}
                  >
                    <div className="place-info">
                      <h4>{place.name}</h4>
                      <p className="place-address">{place.address}</p>
                      {place.type && (
                        <div className="place-rating">
                          📍 {place.type}
                        </div>
                      )}
                      {distance && (
                        <div className="place-rating">
                          📏 {distance} km away
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleLocationSelection(place)}
                      className="select-btn"
                    >
                      {selectedLocations.find(loc => loc.id === place.id) ? '✓ Selected' : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Locations */}
        {selectedLocations.length > 0 && (
          <div className="selected-section">
            <h3>Selected Locations ({selectedLocations.length})</h3>
            <div className="selected-list">
              {selectedLocations.map((place, index) => (
                <div key={place.id} className="selected-item">
                  <span className="item-number">{index + 1}</span>
                  <span className="item-name">{place.name}</span>
                  <button
                    onClick={() => toggleLocationSelection(place)}
                    className="remove-btn"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="action-buttons">
              <button onClick={calculateRoute} className="route-btn" disabled={loading}>
                {loading ? 'Calculating...' : '🗺️ Show Route'}
              </button>
              <button onClick={clearSelections} className="clear-btn">
                Clear All
              </button>
            </div>

            {routeInfo && (
              <div className="route-info">
                <strong>Route Details:</strong><br />
                📏 Distance: {routeInfo.distance} km<br />
                ⏱️ Duration: {routeInfo.duration} min<br />
                🚗 Mode: {travelMode}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="map-wrapper">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          {/* CARTO Tile Layer - Free, no API key required */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          {/* Map click handler for reverse geocoding */}
          <MapClickHandler onMapClick={handleMapClick} />

          {/* Change view when center/zoom changes */}
          <ChangeView center={mapCenter} zoom={mapZoom} />

          {/* Fit bounds when places are found */}
          {nearbyPlaces.length > 0 && (
            <FitBounds bounds={nearbyPlaces.map(p => p.position)} />
          )}

          {/* Current Location Marker */}
          {currentLocation && (
            <Marker position={[currentLocation.lat, currentLocation.lng]} icon={blueIcon}>
              <Popup>
                <strong>Your Location</strong><br />
                Lat: {currentLocation.lat.toFixed(4)}<br />
                Lng: {currentLocation.lng.toFixed(4)}
              </Popup>
            </Marker>
          )}

          {/* Clicked Location Marker */}
          {clickedLocation && (
            <Marker position={[clickedLocation.position.lat, clickedLocation.position.lng]} icon={yellowIcon}>
              <Popup>
                <strong>{clickedLocation.name}</strong><br />
                {clickedLocation.address}<br />
                <button onClick={addClickedToRoute} style={{ marginTop: '8px', padding: '4px 8px' }}>
                  Add to Route
                </button>
              </Popup>
            </Marker>
          )}

          {/* Nearby Places Markers */}
          {nearbyPlaces.map((place) => {
            const isSelected = selectedLocations.find(loc => loc.id === place.id);
            return (
              <Marker
                key={place.id}
                position={[place.position.lat, place.position.lng]}
                icon={isSelected ? yellowIcon : redIcon}
              >
                <Popup>
                  <strong>{place.name}</strong><br />
                  {place.address}<br />
                  {place.type && `Type: ${place.type}`}<br />
                  <button
                    onClick={() => toggleLocationSelection(place)}
                    style={{ marginTop: '8px', padding: '4px 8px' }}
                  >
                    {isSelected ? 'Remove' : 'Add to Route'}
                  </button>
                </Popup>
              </Marker>
            );
          })}

          {/* Route Polyline */}
          {route && (
            <Polyline
              positions={route}
              pathOptions={{
                color: '#FFD700',
                weight: 6,
                opacity: 0.8
              }}
            />
          )}

          {/* Route waypoint markers */}
          {selectedLocations.length > 0 && selectedLocations.map((loc, index) => (
            <Marker
              key={`waypoint-${loc.id}`}
              position={[loc.position.lat, loc.position.lng]}
              icon={L.divIcon({
                className: 'waypoint-marker',
                html: `<div style="background-color: #FFD700; color: #0a1929; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${index + 1}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
              })}
            >
              <Popup>
                <strong>Stop {index + 1}: {loc.name}</strong><br />
                {loc.address}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapSearchLeaflet;
