import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const libraries = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 6.9271,
  lng: 79.8612
};

const Landing = ({ user }) => {
  const navigate = useNavigate();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: 'AIzaSyDKQmKH9sEMretHWkYag0FMg7VFCNRNC_8',
    libraries
  });

  const [map, setMap] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => console.log('Location access denied')
      );
    }
  }, []);

  const onMapLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    if (!isLoaded) {
      alert('Map is still loading, please wait...');
      return;
    }

    console.log('🔍 Landing page search:', searchQuery);
    setLoading(true);
    setShowMap(true);

    // Wait a bit for map to render if switching from hero to map view
    const performSearch = () => {
      if (map) {
        // First, geocode the search query to find the location
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
          }

          // Now search for places near this location
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
              const placesData = results.map(place => ({
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

              console.log('✅ Found', placesData.length, 'places');
              setPlaces(placesData);

              // Immediately center and fit map bounds to show all results
              const bounds = new window.google.maps.LatLngBounds();
              placesData.forEach(place => {
                bounds.extend(new window.google.maps.LatLng(place.position.lat, place.position.lng));
              });

              // Fit bounds with good padding so markers are clearly visible
              map.fitBounds(bounds, {
                padding: { top: 100, right: 100, bottom: 100, left: 100 }
              });

              // Adjust zoom if it's too close
              setTimeout(() => {
                const zoom = map.getZoom();
                if (zoom > 15) {
                  map.setZoom(15);
                } else if (zoom < 10) {
                  map.setZoom(10);
                }
              }, 500);
            } else {
              console.log('⚠️ No results');
              alert('No results found. Try different search terms.');
            }
            setLoading(false);
          });
        });
      } else {
        // If map not ready, try again
        setTimeout(performSearch, 300);
      }
    };

    // Wait for map to render if just switching to map view
    setTimeout(performSearch, 600);
  };

  const handlePlaceClick = (place) => {
    setSelectedPlace(place);
    // Route feature removed - just show info window
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (loadError) {
    return (
      <div className="landing-page">
        <div className="error-container">
          <h2>Error loading Google Maps</h2>
          <p>Please check your Google Maps API key in the .env file</p>
          <p>Make sure all required APIs are enabled in Google Cloud Console</p>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page">
      {!showMap ? (
        // Initial Search Screen
        <div className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">Discover Your Next Adventure</h1>
            <p className="hero-subtitle">
              Find hotels, restaurants, attractions and more with interactive maps
            </p>

            <div className="search-container">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search for hotels, restaurants, attractions... (e.g., 'Colombo hotels')"
                className="search-input-large"
              />
              <button
                onClick={handleSearch}
                className="search-button-large"
                disabled={loading || !isLoaded}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            <div className="search-examples">
              <p>Try searching:</p>
              <div className="example-buttons">
                <button onClick={() => { setSearchQuery('Colombo hotels'); handleSearch(); }}>
                  Colombo Hotels
                </button>
                <button onClick={() => { setSearchQuery('Galle restaurants'); handleSearch(); }}>
                  Galle Restaurants
                </button>
                <button onClick={() => { setSearchQuery('Kandy attractions'); handleSearch(); }}>
                  Kandy Attractions
                </button>
              </div>
            </div>

            {!user && (
              <div className="cta-section">
                <p>Get personalized recommendations</p>
                <div className="cta-buttons">
                  <button onClick={() => navigate('/register')} className="cta-button primary">
                    Sign Up Free
                  </button>
                  <button onClick={() => navigate('/login')} className="cta-button secondary">
                    Sign In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Map View with Results
        <div className="map-view">
          {/* Search Bar on Top */}
          <div className="map-search-bar">
            <button onClick={() => setShowMap(false)} className="back-button">
              ← Back to Search
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search places..."
              className="search-input-map"
            />
            <button
              onClick={handleSearch}
              className="search-button-map"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <div className="results-count">
              Found {places.length} places
            </div>
          </div>

          {/* Map Container */}
          <div className="map-container-full">
            {isLoaded && (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={userLocation || center}
                onLoad={onMapLoad}
                options={{
                  styles: [
                    {
                      featureType: 'all',
                      elementType: 'geometry',
                      stylers: [{ color: '#1a2942' }]
                    },
                    {
                      featureType: 'all',
                      elementType: 'labels.text.stroke',
                      stylers: [{ color: '#0a1929' }, { weight: 1 }]
                    },
                    {
                      featureType: 'all',
                      elementType: 'labels.text.fill',
                      stylers: [{ color: '#FFD700' }, { weight: 0.5 }]
                    },
                    {
                      featureType: 'all',
                      elementType: 'labels.text',
                      stylers: [{ weight: 0.5 }]
                    },
                    {
                      featureType: 'water',
                      elementType: 'geometry',
                      stylers: [{ color: '#0f1f35' }]
                    }
                  ]
                }}
              >
                {/* User Location Marker */}
                {userLocation && (
                  <Marker
                    position={userLocation}
                    icon={{
                      url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                      scaledSize: new window.google.maps.Size(40, 40)
                    }}
                    title="Your Location"
                  />
                )}

                {/* Place Markers */}
                {places.map((place) => (
                  <Marker
                    key={place.id}
                    position={place.position}
                    onClick={() => handlePlaceClick(place)}
                    icon={{
                      url: selectedPlace?.id === place.id
                        ? 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
                        : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                      scaledSize: new window.google.maps.Size(40, 40)
                    }}
                    title={place.name}
                  />
                ))}

                {/* Info Window */}
                {selectedPlace && (
                  <InfoWindow
                    position={selectedPlace.position}
                    onCloseClick={() => {
                      setSelectedPlace(null);
                    }}
                  >
                    <div className="info-window">
                      <h3>{selectedPlace.name}</h3>
                      <p>{selectedPlace.address}</p>
                      {selectedPlace.rating && (
                        <p className="rating">⭐ {selectedPlace.rating.toFixed(1)}</p>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>

          {/* Results Sidebar */}
          <div className="results-sidebar">
            <h3>Search Results ({places.length})</h3>
            <div className="places-list">
              {places.map((place) => (
                <div
                  key={place.id}
                  className={`place-card ${selectedPlace?.id === place.id ? 'selected' : ''}`}
                  onClick={() => handlePlaceClick(place)}
                >
                  <h4>{place.name}</h4>
                  <p className="address">{place.address}</p>
                  {place.rating && (
                    <div className="rating">⭐ {place.rating.toFixed(1)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
