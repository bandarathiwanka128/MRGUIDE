import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import axios from 'axios';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config';
import AddAuthenticDataModal from '../components/AddAuthenticDataModal';
import PlaceDetailsPanel from '../components/PlaceDetailsPanel';
import './AuthenticSection.css';

const libraries = ['places'];
const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 };
const SRI_LANKA_BOUNDS = { south: 5.916, north: 9.835, west: 79.652, east: 81.879 };
const mapContainerStyle = { width: '100%', height: '100%' };

// Marker icon URLs
const PURPLE_MARKER_URL = 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png';
const ORANGE_MARKER_URL = 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png';
const BLUE_MARKER_URL   = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';

const mapOptions = {
  restriction: {
    latLngBounds: SRI_LANKA_BOUNDS,
    strictBounds: false,
  },
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: false,
  zoomControl: true,
  styles: [
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#193341' }],
    },
    {
      featureType: 'landscape',
      elementType: 'geometry',
      stylers: [{ color: '#1a2942' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#2c3e50' }],
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ color: '#1a2942' }],
    },
    {
      featureType: 'all',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#8a929d' }],
    },
    {
      featureType: 'all',
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#0a1929' }],
    },
  ],
};

// SVG Icon Components
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

const AddIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const BusinessIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
  </svg>
);

const VerifiedIcon = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
);

const LoginIcon = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
    <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
  </svg>
);

const AuthenticSection = ({ user }) => {
  const { placeName: urlPlaceName } = useParams();

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Map ref for Google Maps instance
  const mapRef = useRef(null);
  const urlPlaceLoaded = useRef(false);

  // Clicked location state
  const [clickedLocation, setClickedLocation] = useState(null);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Side panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState('add'); // 'add' or 'details'
  const [addType, setAddType] = useState('user'); // 'user' or 'business'

  // Existing authentic data markers
  const [authenticPlaces, setAuthenticPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  // Registered business markers
  const [businesses, setBusinesses] = useState([]);
  const [nearbyBusinesses, setNearbyBusinesses] = useState([]);

  // Selected place for details panel
  const [selectedPlace, setSelectedPlace] = useState(null);

  // InfoWindow state for authentic place markers
  const [activeInfoWindow, setActiveInfoWindow] = useState(null);
  const [markerDetails, setMarkerDetails] = useState({});

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalPlace, setModalPlace] = useState(null);
  const [modalType, setModalType] = useState('user');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Load existing authentic places and businesses on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAuthenticPlaces();
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/places/businesses`);
      if (response.data && Array.isArray(response.data)) {
        setBusinesses(response.data);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const fetchNearbyBusinesses = async (lat, lng) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/places/businesses`, {
        params: { lat, lng, radius: 5 }
      });
      setNearbyBusinesses(response.data || []);
    } catch (error) {
      console.error('Error fetching nearby businesses:', error);
      setNearbyBusinesses([]);
    }
  };

  const fetchAuthenticPlaces = async () => {
    setLoadingPlaces(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/places`);
      if (response.data && Array.isArray(response.data)) {
        // Filter places that have valid coordinates
        const placesWithCoords = response.data.filter(
          (p) => p.latitude && p.longitude
        );
        setAuthenticPlaces(placesWithCoords);
        return placesWithCoords;
      }
    } catch (error) {
      console.error('Error fetching authentic places:', error);
    } finally {
      setLoadingPlaces(false);
    }
    return [];
  };

  // Auto-select place from URL param (e.g. /authentic/galle-fort)
  useEffect(() => {
    if (!urlPlaceName || urlPlaceLoaded.current || !isLoaded) return;

    const loadUrlPlace = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/places/by-name/${encodeURIComponent(urlPlaceName)}`
        );
        const place = response.data;
        if (place) {
          urlPlaceLoaded.current = true;
          const placeObj = {
            id: place.google_place_id || place.id,
            name: place.name,
            address: place.address || '',
            lat: parseFloat(place.latitude),
            lng: parseFloat(place.longitude),
          };
          setSelectedPlace(placeObj);
          setPanelMode('details');
          setPanelOpen(true);

          // Pan map to this place
          if (mapRef.current) {
            mapRef.current.panTo({ lat: placeObj.lat, lng: placeObj.lng });
            mapRef.current.setZoom(13);
          }
        }
      } catch (error) {
        console.error('Error loading place from URL:', error);
      }
    };

    loadUrlPlace();
  }, [urlPlaceName, isLoaded]);

  // Store the map instance when it loads
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Reverse geocode a clicked point using Google Geocoder
  const reverseGeocode = useCallback(async (lat, lng) => {
    setReverseGeocoding(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({
        location: { lat, lng },
      });

      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        const name =
          result.address_components?.find((c) =>
            c.types.includes('point_of_interest') ||
            c.types.includes('establishment') ||
            c.types.includes('premise')
          )?.long_name ||
          result.address_components?.find((c) =>
            c.types.includes('route') || c.types.includes('neighborhood')
          )?.long_name ||
          result.address_components?.find((c) =>
            c.types.includes('locality') || c.types.includes('sublocality')
          )?.long_name ||
          'Selected Location';

        const address = result.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        setReverseGeocoding(false);
        return {
          id: 'clicked-' + Date.now(),
          name,
          address,
          lat,
          lng,
        };
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
    setReverseGeocoding(false);

    // Fallback if geocoding fails
    return {
      id: 'clicked-' + Date.now(),
      name: 'Selected Location',
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat,
      lng,
    };
  }, []);

  // Handle map click
  const handleMapClick = useCallback(
    async (e) => {
      if (showModal) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      // Check if click is within Sri Lanka bounds
      if (
        lat >= SRI_LANKA_BOUNDS.south &&
        lat <= SRI_LANKA_BOUNDS.north &&
        lng >= SRI_LANKA_BOUNDS.west &&
        lng <= SRI_LANKA_BOUNDS.east
      ) {
        setActiveInfoWindow(null);
        const location = await reverseGeocode(lat, lng);
        setClickedLocation(location);
        setSelectedPlace(null);
        setPanelMode('add');
        setPanelOpen(true);
        fetchNearbyBusinesses(lat, lng);
      }
    },
    [reverseGeocode, showModal]
  );

  // Handle clicking on an existing authentic place marker
  const handleAuthenticMarkerClick = (place) => {
    const placeKey = place.id || place.google_place_id;
    const placeObj = {
      id: place.google_place_id || place.id,
      name: place.name,
      address: place.address || place.formatted_address || '',
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
      rating: place.rating || null,
      types: place.types || [],
      photos: place.photos || [],
    };
    setActiveInfoWindow(placeKey);
    setSelectedPlace(placeObj);
    setClickedLocation(null);
    setPanelMode('details');
    setPanelOpen(true);

    // Fetch Google Place Details if we have a google_place_id
    if (!markerDetails[placeKey] && place.google_place_id && mapRef.current) {
      const service = new window.google.maps.places.PlacesService(mapRef.current);
      service.getDetails(
        {
          placeId: place.google_place_id,
          fields: ['formatted_phone_number', 'website', 'opening_hours', 'rating', 'user_ratings_total', 'price_level', 'business_status', 'reviews']
        },
        (result, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
            setMarkerDetails(prev => ({
              ...prev,
              [placeKey]: {
                phone: result.formatted_phone_number || null,
                website: result.website || null,
                rating: result.rating || null,
                userRatingsTotal: result.user_ratings_total || 0,
                priceLevel: result.price_level ?? null,
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

  // Handle "Add Authentic Data" from the PlaceDetailsPanel
  const handleAddAuthenticData = (place, type) => {
    if (!user) {
      // Not logged in - panel will show login message
      return;
    }
    if (user.role !== 'authentic_user') {
      // Not an authentic user - panel will show register message
      return;
    }
    setModalPlace(place);
    setModalType(type);
    setShowModal(true);
  };

  // Handle opening the modal from the side panel add form
  const handleOpenModal = () => {
    if (!clickedLocation) return;

    const place = {
      id: clickedLocation.id,
      name: clickedLocation.name,
      address: clickedLocation.address,
    };

    setModalPlace(place);
    setModalType(addType);
    setShowModal(true);
  };

  // Handle modal success
  const handleModalSuccess = () => {
    setShowModal(false);
    setModalPlace(null);
    setClickedLocation(null);
    setPanelOpen(false);
    // Refresh markers
    fetchAuthenticPlaces();
    fetchBusinesses();
  };

  // Handle closing the side panel
  const handleClosePanel = () => {
    setPanelOpen(false);
    setClickedLocation(null);
    setSelectedPlace(null);
    setActiveInfoWindow(null);
    setSearchResults([]);
    setSearchQuery('');
    setNearbyBusinesses([]);
  };

  // Search places using Google Places API (textSearch)
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;

    setSearchLoading(true);
    setSearchResults([]);

    try {
      const service = new window.google.maps.places.PlacesService(mapRef.current);
      const request = {
        query: searchQuery + ', Sri Lanka',
        location: SRI_LANKA_CENTER,
        radius: 200000, // 200km to cover all of Sri Lanka
      };

      service.textSearch(request, (results, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results
        ) {
          const filtered = results
            .filter((r) => {
              const lat = r.geometry.location.lat();
              const lng = r.geometry.location.lng();
              return (
                lat >= SRI_LANKA_BOUNDS.south &&
                lat <= SRI_LANKA_BOUNDS.north &&
                lng >= SRI_LANKA_BOUNDS.west &&
                lng <= SRI_LANKA_BOUNDS.east
              );
            })
            .slice(0, 8)
            .map((r, index) => ({
              id: r.place_id || `search-${index}`,
              name: r.name || 'Unknown',
              lat: r.geometry.location.lat(),
              lng: r.geometry.location.lng(),
              address: r.formatted_address || '',
            }));

          setSearchResults(filtered);
        }
        setSearchLoading(false);
      });
    } catch (error) {
      console.error('Search error:', error);
      setSearchLoading(false);
    }
  };

  // Handle selecting a search result
  const handleSelectSearchResult = (result) => {
    const location = {
      id: 'search-' + Date.now(),
      name: result.name,
      address: result.address,
      lat: result.lat,
      lng: result.lng,
    };
    setClickedLocation(location);
    setSelectedPlace(null);
    setPanelMode('add');
    setPanelOpen(true);
    setSearchResults([]);
    setSearchQuery('');

    // Fetch registered businesses near this location
    fetchNearbyBusinesses(result.lat, result.lng);

    // Pan the map to the selected result
    if (mapRef.current) {
      mapRef.current.panTo({ lat: result.lat, lng: result.lng });
      mapRef.current.setZoom(14);
    }
  };

  // Render the side panel content based on state
  // Note: PlaceDetailsPanel is rendered separately in the root JSX (outside the
  // transformed .as-side-panel) so that position:fixed works correctly.
  const renderPanelContent = () => {
    // Add mode: different content based on user role
    return (
      <div className="as-panel-inner">
        {/* Panel Header */}
        <div className="as-panel-header">
          <h2 className="as-panel-title">Authentic Section</h2>
          <button className="as-panel-close" onClick={handleClosePanel}>
            <CloseIcon />
          </button>
        </div>

        {/* Search Bar inside panel */}
        <div className="as-panel-search">
          <form onSubmit={handleSearch} className="as-search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places in Sri Lanka..."
              className="as-search-input"
            />
            <button type="submit" className="as-search-btn" disabled={searchLoading}>
              {searchLoading ? (
                <span className="as-spinner" />
              ) : (
                <SearchIcon />
              )}
            </button>
          </form>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="as-search-results">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="as-search-result-item"
                  onClick={() => handleSelectSearchResult(result)}
                >
                  <strong>{result.name}</strong>
                  <small>{result.address}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Location info from clicked point */}
        {clickedLocation && (
          <div className="as-location-info">
            <div className="as-location-icon">
              <LocationIcon />
            </div>
            <div className="as-location-details">
              <h3 className="as-location-name">{clickedLocation.name}</h3>
              <p className="as-location-address">{clickedLocation.address}</p>
              <p className="as-location-coords">
                {clickedLocation.lat.toFixed(5)}, {clickedLocation.lng.toFixed(5)}
              </p>
            </div>
          </div>
        )}

        {reverseGeocoding && (
          <div className="as-geocoding-status">
            <span className="as-spinner" />
            <span>Getting location details...</span>
          </div>
        )}

        {/* Nearby registered businesses */}
        {nearbyBusinesses.length > 0 && (
          <div className="as-nearby-businesses">
            <h3 className="as-nearby-biz-title">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#34699A" style={{ flexShrink: 0 }}>
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
              </svg>
              Registered Businesses Nearby
            </h3>
            {nearbyBusinesses.map(biz => (
              <div
                key={biz.id}
                className="as-nearby-biz-card"
                onClick={() => {
                  if (!biz.Place) return;
                  const lat = parseFloat(biz.Place.latitude);
                  const lng = parseFloat(biz.Place.longitude);
                  const placeObj = {
                    id: biz.Place.google_place_id || String(biz.Place.id),
                    name: biz.business_name || biz.Place.name,
                    address: biz.Place.address || '',
                    lat,
                    lng,
                  };
                  setSelectedPlace(placeObj);
                  setClickedLocation(null);
                  setPanelMode('details');
                  if (mapRef.current) {
                    mapRef.current.panTo({ lat, lng });
                    mapRef.current.setZoom(16);
                  }
                }}
              >
                <div className="as-nearby-biz-header">
                  <span className="as-nearby-biz-name">{biz.business_name || biz.Place?.name}</span>
                  <span className="as-nearby-biz-badge">Registered</span>
                </div>
                {biz.title && <div className="as-nearby-biz-type">{biz.title}</div>}
                {biz.description && (
                  <div className="as-nearby-biz-desc">
                    {biz.description.length > 80 ? biz.description.substring(0, 80) + '...' : biz.description}
                  </div>
                )}
                {biz.phone && <div className="as-nearby-biz-phone">📞 {biz.phone}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Content based on user role */}
        {renderRoleContent()}
      </div>
    );
  };

  // Render content based on user authentication and role
  const renderRoleContent = () => {
    // Not logged in
    if (!user) {
      return (
        <div className="as-role-message">
          <div className="as-role-icon">
            <LoginIcon />
          </div>
          <h3 className="as-role-title">Login Required</h3>
          <p className="as-role-description">
            Please login to add authentic data about places in Sri Lanka. Your local knowledge helps travelers discover hidden gems.
          </p>
          <a href="/login" className="as-role-action-btn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
            </svg>
            Go to Login
          </a>
        </div>
      );
    }

    // Logged in but not authentic_user
    if (user.role !== 'authentic_user') {
      return (
        <div className="as-role-message">
          <div className="as-role-icon as-role-icon-verify">
            <VerifiedIcon />
          </div>
          <h3 className="as-role-title">Become an Authentic User</h3>
          <p className="as-role-description">
            Register as an Authentic User to add verified data about places in Sri Lanka. Help travelers get trustworthy, first-hand information.
          </p>
          <a href="/register" className="as-role-action-btn as-role-action-btn-register">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
            </svg>
            Register as Authentic User
          </a>
        </div>
      );
    }

    // Authentic user - show add form
    return (
      <div className="as-add-section">
        <h3 className="as-add-title">Add Authentic Data</h3>
        <p className="as-add-description">
          Share your local knowledge about this place. Choose how you would like to contribute:
        </p>

        {/* Radio selection: User or Business */}
        <div className="as-type-selector">
          <label
            className={`as-type-option ${addType === 'user' ? 'active' : ''}`}
            onClick={() => setAddType('user')}
          >
            <input
              type="radio"
              name="addType"
              value="user"
              checked={addType === 'user'}
              onChange={() => setAddType('user')}
              className="as-type-radio"
            />
            <div className="as-type-icon">
              <PersonIcon />
            </div>
            <div className="as-type-label">
              <span className="as-type-name">I'm adding as a User</span>
              <span className="as-type-desc">Share personal knowledge and tips</span>
            </div>
          </label>

          <label
            className={`as-type-option ${addType === 'business' ? 'active' : ''}`}
            onClick={() => setAddType('business')}
          >
            <input
              type="radio"
              name="addType"
              value="business"
              checked={addType === 'business'}
              onChange={() => setAddType('business')}
              className="as-type-radio"
            />
            <div className="as-type-icon">
              <BusinessIcon />
            </div>
            <div className="as-type-label">
              <span className="as-type-name">I'm adding as a Business</span>
              <span className="as-type-desc">Register your business information</span>
            </div>
          </label>
        </div>

        {/* Location summary before adding */}
        {clickedLocation && (
          <div className="as-add-location-summary">
            <div className="as-summary-header">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#FFD700">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span>Selected Location</span>
            </div>
            <p className="as-summary-name">{clickedLocation.name}</p>
            <p className="as-summary-address">{clickedLocation.address}</p>
          </div>
        )}

        {/* Add Data button */}
        <button
          className="as-add-data-btn"
          onClick={handleOpenModal}
          disabled={!clickedLocation}
        >
          <AddIcon />
          {clickedLocation ? 'Add Authentic Data' : 'Click on the map to select a location'}
        </button>

        {!clickedLocation && (
          <p className="as-add-hint">
            Click anywhere on the map or search for a place to get started.
          </p>
        )}
      </div>
    );
  };

  // Loading state while Google Maps script loads
  if (!isLoaded) {
    return (
      <div className="as-container">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#FFD700',
            gap: '12px',
          }}
        >
          <span className="as-spinner as-spinner-lg" />
          <span>Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`as-container${panelOpen && panelMode === 'details' ? ' detail-panel-open' : ''}`}>
      {/* Map - full screen behind everything */}
      <div className="as-map-area">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={SRI_LANKA_CENTER}
          zoom={8}
          options={mapOptions}
          onLoad={onMapLoad}
          onClick={handleMapClick}
        >
          {/* Clicked location marker (orange) */}
          {clickedLocation && (
            <Marker
              position={{ lat: clickedLocation.lat, lng: clickedLocation.lng }}
              icon={{
                url: ORANGE_MARKER_URL,
                scaledSize: new window.google.maps.Size(38, 38),
              }}
            />
          )}

          {/* Registered business markers (blue) */}
          {businesses.map((biz) => {
            if (!biz.Place) return null;
            const lat = parseFloat(biz.Place.latitude);
            const lng = parseFloat(biz.Place.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            const bizKey = 'biz-' + biz.id;
            return (
              <Marker
                key={bizKey}
                position={{ lat, lng }}
                icon={{
                  url: BLUE_MARKER_URL,
                  scaledSize: new window.google.maps.Size(38, 38),
                }}
                onClick={() => {
                  const placeObj = {
                    id: biz.Place.google_place_id || String(biz.Place.id),
                    name: biz.business_name || biz.Place.name,
                    address: biz.Place.address || '',
                    lat,
                    lng,
                  };
                  setSelectedPlace(placeObj);
                  setClickedLocation(null);
                  setPanelMode('details');
                  setPanelOpen(true);
                  setActiveInfoWindow(bizKey);
                  if (mapRef.current) {
                    mapRef.current.panTo({ lat, lng });
                  }
                }}
              >
                {activeInfoWindow === bizKey && (
                  <InfoWindow
                    position={{ lat, lng }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div style={{ minWidth: '200px' }}>
                      <strong style={{ fontSize: '1rem', color: '#1565C0' }}>
                        🏢 {biz.business_name || biz.Place.name}
                      </strong>
                      <br />
                      {biz.title && (
                        <em style={{ color: '#555', fontSize: '0.85rem' }}>{biz.title}</em>
                      )}
                      <br />
                      <small style={{ color: '#666' }}>{biz.Place.address || ''}</small>
                      {biz.phone && (
                        <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>
                          📞 {biz.phone}
                        </div>
                      )}
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ background: '#1565C0', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                          Registered Business
                        </span>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            );
          })}

          {/* Existing authentic places markers (purple) */}
          {authenticPlaces.map((place) => {
            const placeKey = place.id || place.google_place_id;
            const lat = parseFloat(place.latitude);
            const lng = parseFloat(place.longitude);

            return (
              <Marker
                key={placeKey}
                position={{ lat, lng }}
                icon={{
                  url: PURPLE_MARKER_URL,
                  scaledSize: new window.google.maps.Size(38, 38),
                }}
                onClick={() => handleAuthenticMarkerClick(place)}
              >
                {activeInfoWindow === placeKey && (() => {
                  const details = markerDetails[placeKey];
                  return (
                  <InfoWindow
                    position={{ lat, lng }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div className="as-popup" style={{ minWidth: '240px', maxWidth: '300px' }}>
                      <strong style={{ fontSize: '1.05rem' }}>{place.name}</strong>
                      <br />
                      <small style={{ color: '#666' }}>{place.address || place.formatted_address || ''}</small>

                      {/* Rating */}
                      {(details?.rating || place.rating) && (
                        <div style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#FFD700' }}>{'★'.repeat(Math.floor(details?.rating || place.rating))}</span>
                          <span style={{ color: '#666', fontSize: '0.85rem' }}>
                            {Number(details?.rating || place.rating).toFixed(1)}
                            {details?.userRatingsTotal ? ` (${details.userRatingsTotal} reviews)` : ''}
                          </span>
                        </div>
                      )}

                      {/* Price, Open Status */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0', flexWrap: 'wrap' }}>
                        {details?.priceLevel !== null && details?.priceLevel !== undefined && (
                          <span style={{ color: '#4CAF50', fontWeight: 600 }}>{'$'.repeat(details.priceLevel + 1)}</span>
                        )}
                        {details?.openNow !== null && details?.openNow !== undefined && (
                          <span style={{ color: details.openNow ? '#4CAF50' : '#f44336', fontWeight: 600, fontSize: '0.85rem' }}>
                            {details.openNow ? 'Open Now' : 'Closed'}
                          </span>
                        )}
                        <em style={{ fontSize: '11px', color: '#9C27B0', background: '#f3e5f5', padding: '2px 6px', borderRadius: '4px' }}>
                          Authentic Data
                        </em>
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

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAuthenticMarkerClick(place);
                        }}
                        style={{ marginTop: '8px', background: '#9C27B0', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        View Full Details
                      </button>
                    </div>
                  </InfoWindow>
                  );
                })()}
              </Marker>
            );
          })}
        </GoogleMap>

        {/* Loading overlay for places */}
        {loadingPlaces && (
          <div className="as-map-loading">
            <span className="as-spinner as-spinner-lg" />
            <span>Loading authentic places...</span>
          </div>
        )}
      </div>

      {/* Side panel - slides in from left (only for add/search mode) */}
      <div className={`as-side-panel ${panelOpen && panelMode !== 'details' ? 'open' : ''}`}>
        {panelOpen && panelMode !== 'details' && renderPanelContent()}
      </div>

      {/* Detail panel — rendered outside as-side-panel so position:fixed works
          correctly (CSS transforms on parent break fixed positioning) */}
      {panelOpen && panelMode === 'details' && selectedPlace && (
        <PlaceDetailsPanel
          place={selectedPlace}
          user={user}
          onClose={handleClosePanel}
          onAddAuthenticData={handleAddAuthenticData}
        />
      )}

      {/* Floating button to open panel when closed */}
      {!panelOpen && (
        <button
          className="as-open-panel-btn"
          onClick={() => {
            setPanelMode('add');
            setPanelOpen(true);
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span>Authentic Section</span>
        </button>
      )}

      {/* Hint overlay on map */}
      {!panelOpen && !showModal && (
        <div className="as-map-hint">
          Click on the map to add authentic data for a location
        </div>
      )}

      {/* AddAuthenticDataModal */}
      {showModal && modalPlace && (
        <AddAuthenticDataModal
          place={modalPlace}
          type={modalType}
          onClose={() => {
            setShowModal(false);
            setModalPlace(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default AuthenticSection;
