import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './MapSearch.css';

const libraries = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 6.9271,
  lng: 79.8612
};

const directionsOptions = {
  polylineOptions: {
    strokeColor: '#FFD700',
    strokeWeight: 6,
    strokeOpacity: 0.8
  },
  suppressMarkers: true
};

const MapSearch = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: 'AIzaSyDKQmKH9sEMretHWkYag0FMg7VFCNRNC_8',
    libraries
  });

  const [map, setMap] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [directions, setDirections] = useState(null);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchStatus, setSearchStatus] = useState('');

  const mapRef = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          console.log('Error getting location');
        }
      );
    }
  }, []);

  const onMapLoad = useCallback((map) => {
    setMap(map);
    mapRef.current = map;
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Please enter a search term');
      return;
    }

    if (!map) {
      setSearchError('Map is not loaded yet. Please wait and try again.');
      return;
    }

    console.log('🔍 Starting search:', searchQuery);

    setLoading(true);
    setSearchError(null);
    setSearchStatus('Searching...');
    setNearbyPlaces([]);

    try {
      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode({ address: searchQuery }, (geocodeResults, geocodeStatus) => {
        console.log('🌍 Geocode:', geocodeStatus);

        let searchCenter = center;

        if (geocodeStatus === 'OK' && geocodeResults && geocodeResults.length > 0) {
          searchCenter = {
            lat: geocodeResults[0].geometry.location.lat(),
            lng: geocodeResults[0].geometry.location.lng()
          };
          console.log('📍 Location found:', searchCenter);
          map.setCenter(searchCenter);
          map.setZoom(13);
        }

        const service = new window.google.maps.places.PlacesService(map);
        const request = {
          location: searchCenter,
          radius: 50000,
          keyword: searchQuery
        };

        console.log('📡 Searching places...');

        service.nearbySearch(request, (results, status) => {
          console.log('📥 Response:', status, 'Count:', results?.length);

          if (status === 'OK' && results && results.length > 0) {
            const places = results.map(place => ({
              id: place.place_id,
              name: place.name,
              position: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              },
              rating: place.rating,
              address: place.formatted_address || place.vicinity,
              types: place.types,
              photos: place.photos
            }));

            console.log('✅ Found', places.length, 'places');
            setNearbyPlaces(places);
            setSearchStatus(`Found ${places.length} places!`);
            setSearchError(null);

            const bounds = new window.google.maps.LatLngBounds();
            places.forEach(place => {
              bounds.extend(new window.google.maps.LatLng(place.position.lat, place.position.lng));
            });

            map.fitBounds(bounds, { padding: 80 });

            setTimeout(() => {
              const zoom = map.getZoom();
              if (zoom > 14) map.setZoom(14);
            }, 300);

          } else if (status === 'ZERO_RESULTS') {
            console.log('⚠️ No results');
            setSearchError(`No places found for "${searchQuery}"`);
            setSearchStatus('');
          } else {
            console.error('❌ Error:', status);
            setSearchError(`Search failed: ${status}`);
            setSearchStatus('');
          }

          setLoading(false);
        });
      });
    } catch (error) {
      console.error('❌ Error:', error);
      setSearchError('Search error. Please try again.');
      setLoading(false);
    }
  };

  const toggleLocationSelection = (place) => {
    const exists = selectedLocations.find(loc => loc.id === place.id);
    if (exists) {
      setSelectedLocations(selectedLocations.filter(loc => loc.id !== place.id));
    } else {
      setSelectedLocations([...selectedLocations, place]);
    }
  };

  const calculateRoute = async () => {
    if (selectedLocations.length < 2) {
      alert('Please select at least 2 locations');
      return;
    }

    const origin = currentLocation || selectedLocations[0].position;
    const destination = selectedLocations[selectedLocations.length - 1].position;
    const waypoints = selectedLocations.slice(0, -1).map(loc => ({
      location: loc.position,
      stopover: true
    }));

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result);
        } else {
          console.error('Directions error:', status);
        }
      }
    );
  };

  const optimizeRoute = async () => {
    if (selectedLocations.length < 2) {
      alert('Please select at least 2 locations');
      return;
    }

    setLoading(true);
    try {
      const locations = selectedLocations.map(loc => ({
        name: loc.name,
        lat: loc.position.lat,
        lng: loc.position.lng
      }));

      const response = await axios.post(`${API_BASE_URL}/places/optimize-route`, {
        locations,
        startLocation: currentLocation || locations[0]
      });

      setOptimizedRoute(response.data.optimizedRoute);

      const origin = currentLocation || response.data.optimizedRoute[0];
      const destination = response.data.optimizedRoute[response.data.optimizedRoute.length - 1];
      const waypoints = response.data.optimizedRoute.slice(1, -1).map(loc => ({
        location: { lat: loc.lat, lng: loc.lng },
        stopover: true
      }));

      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin,
          destination,
          waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === 'OK') {
            setDirections(result);
          }
        }
      );
    } catch (error) {
      console.error('Error:', error);
      alert('Error optimizing route');
    }
    setLoading(false);
  };

  const clearSelections = () => {
    setSelectedLocations([]);
    setDirections(null);
    setOptimizedRoute(null);
    setNearbyPlaces([]);
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div className="loading">Loading Maps...</div>;

  return (
    <div className="map-search-container">
      {/* Sidebar */}
      <div className="map-sidebar">
        <div className="sidebar-header">
          <h2>Explore Places</h2>
          <p>Search and plan your perfect journey</p>
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
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for any place (hotels, schools, hospitals, etc.)"
              className="search-input"
            />
            <button onClick={handleSearch} className="search-btn" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
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
              Searching near your current location
            </p>
          )}
        </div>

        {/* Results */}
        {nearbyPlaces.length > 0 && (
          <div className="results-section">
            <h3>Found {nearbyPlaces.length} places</h3>
            <div className="places-list">
              {nearbyPlaces.map((place) => (
                <div
                  key={place.id}
                  className={`place-card ${selectedLocations.find(loc => loc.id === place.id) ? 'selected' : ''}`}
                >
                  <div className="place-info">
                    <h4>{place.name}</h4>
                    <p className="place-address">{place.address}</p>
                    {place.rating && (
                      <div className="place-rating">
                        ⭐ {place.rating.toFixed(1)}
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
              ))}
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
              <button onClick={calculateRoute} className="route-btn">
                Show Route
              </button>
              <button onClick={optimizeRoute} className="optimize-btn">
                Optimize Route
              </button>
              <button onClick={clearSelections} className="clear-btn">
                Clear All
              </button>
            </div>

            {optimizedRoute && (
              <div className="route-info">
                Route optimized! Following the shortest path.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="map-wrapper">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={12}
          center={currentLocation || center}
          onLoad={onMapLoad}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true
          }}
        >
          {/* Current Location Marker */}
          {currentLocation && (
            <Marker
              position={currentLocation}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new window.google.maps.Size(40, 40)
              }}
              title="Your Location"
            />
          )}

          {/* Nearby Places Markers */}
          {console.log('🎯 Rendering', nearbyPlaces.length, 'markers')}
          {nearbyPlaces.map((place) => (
            <Marker
              key={place.id}
              position={place.position}
              icon={{
                url: selectedLocations.find(loc => loc.id === place.id)
                  ? 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
                  : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new window.google.maps.Size(50, 50),
                anchor: new window.google.maps.Point(25, 50)
              }}
              title={place.name}
              animation={window.google.maps.Animation.DROP}
            />
          ))}

          {/* Directions Renderer */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={directionsOptions}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  );
};

export default MapSearch;
