import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GoogleMap, useLoadScript, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import axios from 'axios';
import './SearchResults.css';
import PlaceDetailsPanel from '../components/PlaceDetailsPanel';
import AddAuthenticDataModal from '../components/AddAuthenticDataModal';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config';

const libraries = ['places'];

const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 };
const SRI_LANKA_BOUNDS = {
  south: 5.916, north: 9.835, west: 79.652, east: 81.879
};

const mapContainerStyle = { width: '100%', height: '100%' };

const mapOptions = {
  restriction: {
    latLngBounds: SRI_LANKA_BOUNDS,
    strictBounds: false,
  },
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  zoomControl: true,
};

// Marker icon URLs using Google Charts API
const greenMarkerIcon = {
  url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
  scaledSize: { width: 38, height: 38 },
};

const blueMarkerIcon = {
  url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  scaledSize: { width: 38, height: 38 },
};

const createRedMarkerIcon = (label) => ({
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
  fillColor: '#E53935',
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 2,
  scale: 1.8,
  anchor: { x: 12, y: 22 },
  labelOrigin: { x: 12, y: 10 },
});

const SearchResults = ({ user }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [travelMode, setTravelMode] = useState('DRIVING');
  const [mapCenter, setMapCenter] = useState(SRI_LANKA_CENTER);
  const [mapZoom, setMapZoom] = useState(8);

  // Sort state
  const [sortBy, setSortBy] = useState('relevance');

  // InfoWindow state
  const [activeInfoWindow, setActiveInfoWindow] = useState(null);
  const [infoWindowDetails, setInfoWindowDetails] = useState({});

  // Start location state
  const [startLocation, setStartLocation] = useState(null);
  const [startSearchQuery, setStartSearchQuery] = useState('');
  const [startSearchResults, setStartSearchResults] = useState([]);
  const [showStartSearch, setShowStartSearch] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Details panel & modal state
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [detailsPanelPlace, setDetailsPanelPlace] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalPlace, setAuthModalPlace] = useState(null);
  const [authModalType, setAuthModalType] = useState('user');
  const [authSnackbar, setAuthSnackbar] = useState('');

  const mapRef = useRef(null);
  const placesServiceRef = useRef(null);
  const startAutocompleteRef = useRef(null);
  const geocoderRef = useRef(null);
  const directionsServiceRef = useRef(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Initialize services when map loads
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    placesServiceRef.current = new window.google.maps.places.PlacesService(map);
    geocoderRef.current = new window.google.maps.Geocoder();
    directionsServiceRef.current = new window.google.maps.DirectionsService();
  }, []);

  // Get user's current location on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          setMapCenter({ lat: userLoc.lat, lng: userLoc.lng });
          setGettingLocation(false);
        },
        (error) => {
          console.log('Location access denied:', error.message);
          const defaultLoc = { lat: 6.9271, lng: 79.8612, name: 'Colombo (Default)' };
          setStartLocation(defaultLoc);
          setMapCenter({ lat: defaultLoc.lat, lng: defaultLoc.lng });
          setSearchStatus('Location denied. Using Colombo as default start.');
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGettingLocation(false);
    }
  };

  // Reverse geocode a lat/lng to get address name
  const reverseGeocode = useCallback((lat, lng, callback) => {
    if (!geocoderRef.current) return;
    geocoderRef.current.geocode(
      { location: { lat, lng } },
      (results, status) => {
        if (status === 'OK' && results[0]) {
          callback(results[0].formatted_address);
        } else {
          callback(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      }
    );
  }, []);

  // Search places using Google Places textSearch
  const searchPlaces = useCallback((query) => {
    if (!query.trim() || !placesServiceRef.current) return;

    setSearchLoading(true);
    setSearchStatus('Searching in Sri Lanka...');
    setPlaces([]);
    setSelectedPlace(null);
    setDirectionsResponse(null);
    setRouteInfo(null);
    setDirections([]);
    setActiveInfoWindow(null);

    const request = {
      query: query + ' Sri Lanka',
      bounds: new window.google.maps.LatLngBounds(
        { lat: SRI_LANKA_BOUNDS.south, lng: SRI_LANKA_BOUNDS.west },
        { lat: SRI_LANKA_BOUNDS.north, lng: SRI_LANKA_BOUNDS.east }
      ),
    };

    placesServiceRef.current.textSearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        // Filter results strictly within Sri Lanka bounds
        const sriLankaResults = results.filter((place) => {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          return (
            lat >= SRI_LANKA_BOUNDS.south &&
            lat <= SRI_LANKA_BOUNDS.north &&
            lng >= SRI_LANKA_BOUNDS.west &&
            lng <= SRI_LANKA_BOUNDS.east
          );
        });

        if (sriLankaResults.length > 0) {
          const mappedResults = sriLankaResults.map((place, index) => ({
            id: place.place_id || `place-${index}`,
            placeId: place.place_id,
            name: place.name || 'Unknown',
            position: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            },
            address: place.formatted_address || '',
            type: place.types ? place.types[0] : 'place',
            types: place.types || [],
            rating: place.rating || null,
            userRatingsTotal: place.user_ratings_total || 0,
            priceLevel: place.price_level !== undefined ? place.price_level : null,
            photos: place.photos || [],
            openNow: place.opening_hours ? place.opening_hours.isOpen() : null,
          }));

          setPlaces(mappedResults);
          setSearchStatus(`Found ${mappedResults.length} place${mappedResults.length !== 1 ? 's' : ''} in Sri Lanka`);

          // Fit map bounds to results (max zoom 12 = district level)
          if (mapRef.current) {
            const bounds = new window.google.maps.LatLngBounds();
            mappedResults.forEach((p) => bounds.extend(p.position));
            mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
            window.google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
              if (mapRef.current.getZoom() > 12) mapRef.current.setZoom(12);
            });
          }
        } else {
          setSearchStatus(`No places found for "${query}" in Sri Lanka`);
        }
      } else {
        setSearchStatus(`No places found for "${query}" in Sri Lanka`);
      }
      setSearchLoading(false);
    });
  }, []);

  // Search on initial load (when map is ready)
  const initialSearchDone = useRef(false);
  useEffect(() => {
    if (isLoaded && initialQuery && placesServiceRef.current && !initialSearchDone.current) {
      initialSearchDone.current = true;
      searchPlaces(initialQuery);
    }
  }, [isLoaded, initialQuery, searchPlaces]);

  // Search for start location using Google Places Autocomplete Service
  const searchStartLocation = useCallback((query) => {
    if (!query.trim() || !isLoaded) {
      setStartSearchResults([]);
      return;
    }

    const autocompleteService = new window.google.maps.places.AutocompleteService();
    autocompleteService.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: 'lk' },
        bounds: new window.google.maps.LatLngBounds(
          { lat: SRI_LANKA_BOUNDS.south, lng: SRI_LANKA_BOUNDS.west },
          { lat: SRI_LANKA_BOUNDS.north, lng: SRI_LANKA_BOUNDS.east }
        ),
      },
      (predictions, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          predictions
        ) {
          const results = predictions.map((prediction) => ({
            id: prediction.place_id,
            placeId: prediction.place_id,
            name: prediction.structured_formatting?.main_text || prediction.description.split(',')[0],
            address: prediction.description,
          }));
          setStartSearchResults(results);
        } else {
          setStartSearchResults([]);
        }
      }
    );
  }, [isLoaded]);

  // Select start location - geocode the place_id to get lat/lng
  const selectStartLocation = useCallback((location) => {
    if (!geocoderRef.current) return;

    geocoderRef.current.geocode(
      { placeId: location.placeId || location.id },
      (results, status) => {
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          setStartLocation({
            lat: loc.lat(),
            lng: loc.lng(),
            name: location.name,
          });
          setStartSearchQuery(location.name);
          setStartSearchResults([]);
          setShowStartSearch(false);
          setDirectionsResponse(null);
          setRouteInfo(null);
          setDirections([]);
        }
      }
    );
  }, []);

  // Use current location as start
  const useCurrentAsStart = () => {
    if (currentLocation) {
      setStartLocation(currentLocation);
      setStartSearchQuery('Your Current Location');
      setShowStartSearch(false);
      setDirectionsResponse(null);
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

  // Calculate distance (Haversine) for display in list
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  // Get directions to a place using Google Directions Service
  const getDirections = useCallback(
    (place) => {
      if (!startLocation) {
        alert('Please set your starting location first!');
        setShowStartSearch(true);
        return;
      }

      if (!directionsServiceRef.current) return;

      setSelectedPlace(place);
      setLoading(true);
      setDirectionsResponse(null);
      setRouteInfo(null);
      setDirections([]);
      setActiveInfoWindow(null);

      const request = {
        origin: { lat: startLocation.lat, lng: startLocation.lng },
        destination: { lat: place.position.lat, lng: place.position.lng },
        travelMode: window.google.maps.TravelMode[travelMode],
      };

      directionsServiceRef.current.route(request, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirectionsResponse(result);

          const route = result.routes[0];
          const leg = route.legs[0];

          setRouteInfo({
            distance: (leg.distance.value / 1000).toFixed(1),
            duration: Math.round(leg.duration.value / 60),
          });

          if (leg.steps) {
            const steps = leg.steps.map((step, index) => ({
              id: index,
              instruction: step.instructions
                ? step.instructions.replace(/<[^>]*>/g, '')
                : 'Continue',
              distance: (step.distance.value / 1000).toFixed(2),
              duration: Math.round(step.duration.value / 60),
            }));
            setDirections(steps);
          }
        } else {
          console.error('Directions request failed:', status);
          alert('Could not calculate route. Please try a different travel mode or destination.');
        }
        setLoading(false);
      });
    },
    [startLocation, travelMode]
  );

  // Clear route
  const clearRoute = () => {
    setSelectedPlace(null);
    setDirectionsResponse(null);
    setRouteInfo(null);
    setDirections([]);
    setActiveInfoWindow(null);
  };

  // Handle marker click - fetch Place Details and show InfoWindow
  const handleMarkerClick = (place) => {
    setActiveInfoWindow(place.id);

    // Fetch detailed info if not already cached
    if (!infoWindowDetails[place.id] && place.placeId && placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        {
          placeId: place.placeId,
          fields: ['formatted_phone_number', 'international_phone_number', 'website', 'opening_hours', 'url', 'business_status', 'reviews']
        },
        (result, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
            setInfoWindowDetails(prev => ({
              ...prev,
              [place.id]: {
                phone: result.formatted_phone_number || null,
                internationalPhone: result.international_phone_number || null,
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

  // Handle marker details panel
  const handleMarkerDetails = (place) => {
    setDetailsPanelPlace(place);
    setShowDetailsPanel(true);
    setActiveInfoWindow(null);
  };

  // Handle add authentic data from panel
  const handleAddAuthenticData = (place, type) => {
    if (!user) {
      setAuthSnackbar('Please login first to add authentic data');
      setTimeout(() => setAuthSnackbar(''), 4000);
      return;
    }
    if (user.role !== 'authentic_user') {
      setAuthSnackbar('Register as an Authentic User to add verified information');
      setTimeout(() => setAuthSnackbar(''), 4000);
      return;
    }
    setAuthModalPlace(place);
    setAuthModalType(type);
    setShowAuthModal(true);
    setActiveInfoWindow(null);
  };

  // Sort places
  const getSortedPlaces = useCallback(() => {
    if (!places.length) return [];

    const sorted = [...places];

    switch (sortBy) {
      case 'rating':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'price':
        sorted.sort((a, b) => {
          const aPrice = a.priceLevel !== null ? a.priceLevel : 999;
          const bPrice = b.priceLevel !== null ? b.priceLevel : 999;
          return aPrice - bPrice;
        });
        break;
      case 'distance':
        if (startLocation) {
          sorted.sort((a, b) => {
            const distA = parseFloat(
              calculateDistance(startLocation.lat, startLocation.lng, a.position.lat, a.position.lng)
            );
            const distB = parseFloat(
              calculateDistance(startLocation.lat, startLocation.lng, b.position.lat, b.position.lng)
            );
            return distA - distB;
          });
        }
        break;
      case 'relevance':
      default:
        break;
    }

    return sorted;
  }, [places, sortBy, startLocation]);

  const sortedPlaces = getSortedPlaces();

  // Render star rating
  const renderStars = (rating) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    const stars = [];
    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={`full-${i}`} style={{ color: '#FFD700' }}>&#9733;</span>);
    }
    if (hasHalf) {
      stars.push(<span key="half" style={{ color: '#FFD700' }}>&#9734;</span>);
    }
    return (
      <span className="place-rating-stars">
        {stars} <span style={{ color: '#b0b8c4', fontSize: '0.85rem' }}>{rating.toFixed(1)}</span>
      </span>
    );
  };

  // Render price level
  const renderPriceLevel = (priceLevel) => {
    if (priceLevel === null || priceLevel === undefined) return null;
    const dollars = '$'.repeat(priceLevel + 1);
    return <span className="place-price-level" style={{ color: '#69F0AE', fontSize: '0.85rem' }}>{dollars}</span>;
  };

  // Travel modes
  const travelModes = [
    { id: 'DRIVING', icon: '\uD83D\uDE97', label: 'Car' },
    { id: 'TRANSIT', icon: '\uD83D\uDE8C', label: 'Transit' },
    { id: 'WALKING', icon: '\uD83D\uDEB6', label: 'Walk' },
    { id: 'BICYCLING', icon: '\uD83D\uDEB2', label: 'Bike' },
  ];

  if (loadError) {
    return (
      <div className="search-results-container">
        <div style={{ padding: '40px', color: '#f44336', textAlign: 'center' }}>
          Error loading Google Maps. Please check your API key and try again.
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="search-results-container">
        <div style={{ padding: '40px', color: '#FFD700', textAlign: 'center' }}>
          Loading Maps...
        </div>
      </div>
    );
  }

  return (
    <div className="search-results-container">
      {/* Sidebar - Dark Theme */}
      <div className="results-sidebar">
        {/* Search Header */}
        <div className="sidebar-header">
          <h2>{'\uD83C\uDDF1\uD83C\uDDF0'} Search Sri Lanka</h2>
          <form onSubmit={handleSearch} className="sidebar-search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places in Sri Lanka..."
              className="sidebar-search-input"
            />
            <button type="submit" className="sidebar-search-btn" disabled={searchLoading}>
              {searchLoading ? '...' : '\uD83D\uDD0D'}
            </button>
          </form>
        </div>

        {/* Start Location Section */}
        <div className="start-location-section">
          <p className="section-label">{'\uD83D\uDCCD'} Your Starting Point</p>
          <div className="start-location-box">
            {startLocation ? (
              <div className="current-start">
                <span className="start-marker">A</span>
                <span className="start-name">{startLocation.name}</span>
                <button
                  onClick={() => setShowStartSearch(!showStartSearch)}
                  className="change-btn"
                >
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
                  {gettingLocation ? 'Getting...' : '\uD83D\uDCCD Use My Location'}
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
          <p className="section-label">{'\uD83D\uDE97'} Travel Mode</p>
          <div className="travel-mode-buttons">
            {travelModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  setTravelMode(mode.id);
                  if (selectedPlace && startLocation) {
                    // Re-fetch directions with new travel mode
                    setTimeout(() => {
                      if (!directionsServiceRef.current) return;
                      setLoading(true);
                      setDirectionsResponse(null);
                      setRouteInfo(null);
                      setDirections([]);

                      const request = {
                        origin: { lat: startLocation.lat, lng: startLocation.lng },
                        destination: {
                          lat: selectedPlace.position.lat,
                          lng: selectedPlace.position.lng,
                        },
                        travelMode: window.google.maps.TravelMode[mode.id],
                      };

                      directionsServiceRef.current.route(request, (result, status) => {
                        if (status === window.google.maps.DirectionsStatus.OK) {
                          setDirectionsResponse(result);
                          const route = result.routes[0];
                          const leg = route.legs[0];
                          setRouteInfo({
                            distance: (leg.distance.value / 1000).toFixed(1),
                            duration: Math.round(leg.duration.value / 60),
                          });
                          if (leg.steps) {
                            const steps = leg.steps.map((step, index) => ({
                              id: index,
                              instruction: step.instructions
                                ? step.instructions.replace(/<[^>]*>/g, '')
                                : 'Continue',
                              distance: (step.distance.value / 1000).toFixed(2),
                              duration: Math.round(step.duration.value / 60),
                            }));
                            setDirections(steps);
                          }
                        } else {
                          alert(
                            'Could not calculate route with this travel mode. Please try another.'
                          );
                        }
                        setLoading(false);
                      });
                    }, 0);
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

        {/* Sort Controls */}
        {places.length > 0 && (
          <div className="sort-section" style={{
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255, 215, 0, 0.15)',
          }}>
            <p className="section-label">{'\u2195\uFE0F'} Sort Results</p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="relevance" style={{ background: '#0d2137' }}>
                Relevance (Default)
              </option>
              <option value="rating" style={{ background: '#0d2137' }}>
                Rating (Highest First)
              </option>
              <option value="price" style={{ background: '#0d2137' }}>
                Price Level (Lowest First)
              </option>
              <option value="distance" style={{ background: '#0d2137' }}>
                Distance (Nearest First)
              </option>
            </select>
          </div>
        )}

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
              <p>{'\uD83D\uDD0D'} Search for places in Sri Lanka</p>
              <p className="hint">Try: "Colombo Unity Plaza", "Sigiriya", "Galle Fort"</p>
            </div>
          )}

          {sortedPlaces.map((place, index) => {
            const distance = startLocation
              ? calculateDistance(
                  startLocation.lat,
                  startLocation.lng,
                  place.position.lat,
                  place.position.lng
                )
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
                    {place.rating && renderStars(place.rating)}
                    {place.priceLevel !== null && renderPriceLevel(place.priceLevel)}
                    {place.type && (
                      <span className="place-type">
                        {place.type.replace(/_/g, ' ')}
                      </span>
                    )}
                    {distance && (
                      <span className="place-distance">{'\uD83D\uDCCD'} {distance} km</span>
                    )}
                    {place.openNow !== null && (
                      <span
                        style={{
                          color: place.openNow ? '#69F0AE' : '#f44336',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        {place.openNow ? 'Open Now' : 'Closed'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="get-directions-btn"
                  disabled={loading && selectedPlace?.id === place.id}
                >
                  {loading && selectedPlace?.id === place.id ? '...' : '\u2192'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Route Info Panel */}
        {routeInfo && (
          <div className="route-info-panel">
            <div className="route-header">
              <h3>{'\uD83D\uDDFA\uFE0F'} Route Details</h3>
              <button onClick={clearRoute} className="clear-route-btn">
                {'\u00D7'}
              </button>
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
                <span className="stat-icon">
                  {travelModes.find((m) => m.id === travelMode)?.icon}
                </span>
                <span className="stat-label">
                  {travelModes.find((m) => m.id === travelMode)?.label}
                </span>
              </div>
            </div>

            {directions.length > 0 && (
              <div className="directions-list">
                <h4>{'\uD83D\uDCDD'} Turn-by-turn</h4>
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
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={mapZoom}
          options={mapOptions}
          onLoad={onMapLoad}
          onClick={() => setActiveInfoWindow(null)}
        >
          {/* Start Location Marker (Green) */}
          {startLocation && !directionsResponse && (
            <Marker
              position={{ lat: startLocation.lat, lng: startLocation.lng }}
              icon={greenMarkerIcon}
              label={{
                text: 'A',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '12px',
              }}
              title={`Start: ${startLocation.name}`}
            />
          )}

          {/* Search Results Markers (Red with numbers) */}
          {!directionsResponse &&
            sortedPlaces.map((place, index) => (
              <Marker
                key={place.id}
                position={place.position}
                icon={
                  selectedPlace?.id === place.id
                    ? blueMarkerIcon
                    : createRedMarkerIcon(String(index + 1))
                }
                label={
                  selectedPlace?.id === place.id
                    ? {
                        text: 'B',
                        color: '#ffffff',
                        fontWeight: 'bold',
                        fontSize: '11px',
                      }
                    : {
                        text: String(index + 1),
                        color: '#ffffff',
                        fontWeight: 'bold',
                        fontSize: '11px',
                      }
                }
                onClick={() => handleMarkerClick(place)}
                title={place.name}
              >
                {/* InfoWindow on marker click */}
                {activeInfoWindow === place.id && (
                  <InfoWindow
                    position={place.position}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div className="marker-popup" style={{ minWidth: '260px', maxWidth: '320px' }}>
                      <strong style={{ fontSize: '1.05rem' }}>{place.name}</strong>
                      <br />
                      <small style={{ color: '#666' }}>{place.address}</small>

                      {/* Rating & Reviews */}
                      {place.rating && (
                        <div style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#FFD700', fontSize: '1rem' }}>
                            {'★'.repeat(Math.floor(place.rating))}
                            {place.rating % 1 >= 0.5 ? '½' : ''}
                          </span>
                          <span style={{ color: '#666', fontSize: '0.85rem' }}>
                            {place.rating.toFixed(1)} ({place.userRatingsTotal} reviews)
                          </span>
                        </div>
                      )}

                      {/* Price Level & Open Status */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '4px 0' }}>
                        {place.priceLevel !== null && place.priceLevel !== undefined && (
                          <span style={{ color: '#4CAF50', fontWeight: 600 }}>
                            {'$'.repeat(place.priceLevel + 1)}
                          </span>
                        )}
                        {place.type && (
                          <span style={{ color: '#888', fontSize: '0.8rem', background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                            {place.type.replace(/_/g, ' ')}
                          </span>
                        )}
                        {(infoWindowDetails[place.id]?.openNow ?? place.openNow) !== null && (
                          <span style={{ color: (infoWindowDetails[place.id]?.openNow ?? place.openNow) ? '#4CAF50' : '#f44336', fontWeight: 600, fontSize: '0.85rem' }}>
                            {(infoWindowDetails[place.id]?.openNow ?? place.openNow) ? 'Open Now' : 'Closed'}
                          </span>
                        )}
                      </div>

                      {/* Google Place Details: Phone, Website, Hours */}
                      {infoWindowDetails[place.id] && (
                        <div style={{ borderTop: '1px solid #eee', marginTop: '6px', paddingTop: '6px' }}>
                          {infoWindowDetails[place.id].phone && (
                            <div style={{ margin: '3px 0', fontSize: '0.85rem' }}>
                              <a href={`tel:${infoWindowDetails[place.id].phone}`} style={{ color: '#1976D2', textDecoration: 'none' }}>
                                &#128222; {infoWindowDetails[place.id].phone}
                              </a>
                            </div>
                          )}
                          {infoWindowDetails[place.id].website && (
                            <div style={{ margin: '3px 0', fontSize: '0.85rem' }}>
                              <a href={infoWindowDetails[place.id].website} target="_blank" rel="noopener noreferrer" style={{ color: '#1976D2', textDecoration: 'none' }}>
                                &#127760; Website
                              </a>
                            </div>
                          )}
                          {infoWindowDetails[place.id].businessStatus && (
                            <div style={{ margin: '3px 0', fontSize: '0.8rem', color: '#888' }}>
                              Status: {infoWindowDetails[place.id].businessStatus.replace(/_/g, ' ').toLowerCase()}
                            </div>
                          )}
                          {infoWindowDetails[place.id].weekdayText.length > 0 && (
                            <details style={{ margin: '4px 0', fontSize: '0.8rem' }}>
                              <summary style={{ cursor: 'pointer', color: '#1976D2' }}>Opening Hours</summary>
                              <div style={{ marginTop: '4px', lineHeight: 1.6, color: '#555' }}>
                                {infoWindowDetails[place.id].weekdayText.map((line, i) => (
                                  <div key={i}>{line}</div>
                                ))}
                              </div>
                            </details>
                          )}
                          {infoWindowDetails[place.id].reviews.length > 0 && (
                            <details style={{ margin: '4px 0', fontSize: '0.8rem' }}>
                              <summary style={{ cursor: 'pointer', color: '#1976D2' }}>Top Reviews</summary>
                              <div style={{ marginTop: '4px' }}>
                                {infoWindowDetails[place.id].reviews.map((review, i) => (
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

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            getDirections(place);
                          }}
                          className="popup-directions-btn"
                        >
                          Get Directions
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkerDetails(place);
                          }}
                          className="popup-details-btn"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const slug = place.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
                            navigate(`/authentic/${slug}`);
                          }}
                          className="popup-add-data-btn"
                          style={{ background: '#9C27B0' }}
                        >
                          Authentic Data
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}

          {/* Directions Renderer */}
          {directionsResponse && (
            <DirectionsRenderer
              directions={directionsResponse}
              options={{
                polylineOptions: {
                  strokeColor: '#4285F4',
                  strokeWeight: 6,
                  strokeOpacity: 0.9,
                },
                suppressMarkers: false,
                markerOptions: {
                  zIndex: 999,
                },
              }}
            />
          )}
        </GoogleMap>
      </div>

      {/* Place Details Panel */}
      {showDetailsPanel && detailsPanelPlace && (
        <div className="details-panel-overlay">
          <PlaceDetailsPanel
            place={detailsPanelPlace}
            onClose={() => {
              setShowDetailsPanel(false);
              setDetailsPanelPlace(null);
            }}
            onAddAuthenticData={handleAddAuthenticData}
          />
        </div>
      )}

      {/* Add Authentic Data Modal */}
      {showAuthModal && authModalPlace && (
        <AddAuthenticDataModal
          place={authModalPlace}
          type={authModalType}
          onClose={() => {
            setShowAuthModal(false);
            setAuthModalPlace(null);
          }}
          onSuccess={() => {
            setShowAuthModal(false);
            setAuthModalPlace(null);
          }}
        />
      )}

      {/* Auth Snackbar */}
      {authSnackbar && (
        <div className="auth-snackbar">
          {authSnackbar}
          {!user && (
            <a href="/login" className="snackbar-link">
              Login
            </a>
          )}
          {user && user.role !== 'authentic_user' && (
            <a href="/register" className="snackbar-link">
              Register
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
