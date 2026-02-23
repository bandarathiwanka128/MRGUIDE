import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import axios from 'axios';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config';
import './TripPlanner.css';

const libraries = ['places'];
const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 };
const mapContainerStyle = { width: '100%', height: '100%' };

// Travel mode options with SVG paths (no emoji)
const TRAVEL_MODES = [
  { id: 'car', label: 'Car', googleMode: 'DRIVING', svgPath: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z' },
  { id: 'bus', label: 'Bus', googleMode: 'TRANSIT', svgPath: 'M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z' },
  { id: 'train', label: 'Train', googleMode: 'TRANSIT', svgPath: 'M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H6V6h5v5zm2 0V6h5v5h-5zm3.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z' },
  { id: 'walk', label: 'Walk', googleMode: 'WALKING', svgPath: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7' }
];

// SVG icon component for travel modes
const TravelModeIcon = ({ path }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d={path} />
  </svg>
);

// Create a colored marker icon URL using Google Charts API
const createMarkerIconUrl = (color) => {
  // Use an inline SVG data URL for colored markers
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
    <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="${encodeURIComponent(color)}" stroke="white" stroke-width="2"/>
    <circle cx="15" cy="14" r="6" fill="white" opacity="0.9"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${svg}`;
};

const TripPlanner = ({ user }) => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries
  });

  // Trip info
  const [tripTitle, setTripTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelMode, setTravelMode] = useState('car');

  // Destinations
  const [destinations, setDestinations] = useState([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Route
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Weather (auto-fetched inside AI suggestions)
  const [weatherData, setWeatherData] = useState({});

  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Saved trips
  const [savedTrips, setSavedTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  // UI
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [placeDetails, setPlaceDetails] = useState({});

  // Resizer state
  const [sidebarWidth, setSidebarWidth] = useState(440);
  const [isResizing, setIsResizing] = useState(false);

  const mapRef = useRef(null);
  const nextIdRef = useRef(1);
  const sidebarRef = useRef(null);
  const containerRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // Generate a unique ID for each destination
  const generateId = () => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    return id;
  };

  // Show status message
  const showStatus = (message, type = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
    if (type !== 'error') {
      setTimeout(() => {
        setStatusMessage('');
        setStatusType('');
      }, 4000);
    }
  };

  // Store map reference on load
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Resizer drag handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = sidebarRef.current?.offsetWidth || sidebarWidth;

    const handleMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
      const newWidth = Math.max(280, Math.min(containerWidth * 0.7, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  // Fetch saved trips on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user) {
      fetchSavedTrips();
    }
  }, [user]);

  // renderAiContent: parse markdown-ish AI text into styled JSX
  const renderAiContent = (text) => {
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return null;
      if (line.startsWith('## ') || line.startsWith('# ')) {
        return (
          <div key={i} className="tp-ai-section-header">
            {line.replace(/^#+\s/, '')}
          </div>
        );
      }
      if (line.match(/^\*\*(.+)\*\*$/) || (line.startsWith('**') && line.endsWith('**'))) {
        return <p key={i} className="tp-ai-bold">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.replace(/^[-*]\s/, '').replace(/\*\*(.+?)\*\*/g, '$1');
        return (
          <div key={i} className="tp-ai-bullet-item">
            <span className="tp-ai-bullet-dot">▸</span>
            <span>{content}</span>
          </div>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return <p key={i} className="tp-ai-numbered">{line.replace(/\*\*(.+?)\*\*/g, '$1')}</p>;
      }
      return <p key={i} className="tp-ai-line">{line.replace(/\*\*(.+?)\*\*/g, '$1')}</p>;
    });
  };

  // Auto-calculate route when destinations or travel mode change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (destinations.length >= 2) {
      calculateRoute(destinations);
    } else {
      setDirectionsResponse(null);
      setRouteInfo(null);
    }
  }, [destinations, travelMode]);

  // Fit map bounds to destinations when they change (only when no route is shown)
  useEffect(() => {
    if (!mapRef.current || destinations.length === 0) return;
    if (directionsResponse) return; // Directions renderer handles its own bounds

    const bounds = new window.google.maps.LatLngBounds();
    destinations.forEach((d) => {
      bounds.extend({ lat: d.lat, lng: d.lng });
    });

    if (destinations.length === 1) {
      mapRef.current.setCenter({ lat: destinations[0].lat, lng: destinations[0].lng });
      mapRef.current.setZoom(12);
    } else {
      mapRef.current.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
      window.google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
        if (mapRef.current.getZoom() > 12) mapRef.current.setZoom(12);
      });
    }
  }, [destinations, directionsResponse]);

  // Fetch saved trips
  const fetchSavedTrips = async () => {
    if (!user) return;
    setTripsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/trips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedTrips(response.data.trips || response.data || []);
    } catch (error) {
      console.error('Failed to fetch trips:', error);
    } finally {
      setTripsLoading(false);
    }
  };

  // Search places using Google Places textSearch
  const searchPlaces = useCallback(async (query) => {
    if (!query.trim() || !mapRef.current) return;

    setSearchLoading(true);
    setSearchResults([]);

    try {
      const service = new window.google.maps.places.PlacesService(mapRef.current);

      const request = {
        query: query + ', Sri Lanka',
        location: SRI_LANKA_CENTER,
        radius: 200000 // 200km radius covering Sri Lanka
      };

      service.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          // Filter results to Sri Lanka approximate bounding box
          const sriLankaResults = results.filter((place) => {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            return lat >= 5.916 && lat <= 9.835 && lng >= 79.652 && lng <= 81.879;
          });

          const mapped = sriLankaResults.slice(0, 10).map((place, index) => ({
            id: place.place_id || `search-${index}`,
            placeId: place.place_id || null,
            name: place.name || 'Unknown',
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address || '',
            rating: place.rating || null,
            userRatingsTotal: place.user_ratings_total || 0,
            priceLevel: place.price_level ?? null,
            category: place.types?.[0]?.replace(/_/g, ' ') || 'place',
            openNow: place.opening_hours?.isOpen?.() ?? null
          }));

          if (mapped.length > 0) {
            setSearchResults(mapped);
          } else {
            showStatus(`No results found for "${query}" in Sri Lanka`, 'info');
          }
        } else {
          showStatus(`No results found for "${query}" in Sri Lanka`, 'info');
        }
        setSearchLoading(false);
      });
    } catch (error) {
      console.error('Google Places search error:', error);
      showStatus('Search failed. Please try again.', 'error');
      setSearchLoading(false);
    }
  }, []);

  // Handle search form submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchPlaces(searchQuery.trim());
    }
  };

  // Add destination from search results
  const addDestinationFromSearch = (result) => {
    if (destinations.length >= 20) {
      showStatus('Maximum 20 destinations allowed.', 'error');
      return;
    }
    const newDest = {
      id: generateId(),
      placeId: result.placeId || null,
      name: result.name,
      lat: result.lat,
      lng: result.lng,
      address: result.address || '',
      rating: result.rating || null,
      userRatingsTotal: result.userRatingsTotal || 0,
      priceLevel: result.priceLevel ?? null,
      category: result.category || 'place',
      openNow: result.openNow ?? null
    };
    setDestinations((prev) => [...prev, newDest]);
    setSearchResults([]);
    setSearchQuery('');
    showStatus(`Added: ${result.name}`, 'success');
  };

  // Add destination by clicking the map (reverse geocode with Google Geocoder)
  const handleMapClick = useCallback(
    async (e) => {
      if (destinations.length >= 20) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      // Check within Sri Lanka bounds
      if (lat < 5.916 || lat > 9.835 || lng < 79.652 || lng > 81.879) {
        return;
      }

      let name = `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

      try {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          // Try to find a meaningful name from address components
          const components = result.address_components || [];
          const locality = components.find((c) => c.types.includes('locality'));
          const sublocality = components.find((c) => c.types.includes('sublocality'));
          const pointOfInterest = components.find((c) => c.types.includes('point_of_interest'));
          const route = components.find((c) => c.types.includes('route'));

          name =
            (pointOfInterest && pointOfInterest.long_name) ||
            (locality && locality.long_name) ||
            (sublocality && sublocality.long_name) ||
            (route && route.long_name) ||
            result.formatted_address?.split(',')[0] ||
            name;
        }
      } catch (error) {
        console.error('Reverse geocode error:', error);
      }

      const newDest = {
        id: generateId(),
        name: name,
        lat: lat,
        lng: lng,
        address: ''
      };

      setDestinations((prev) => [...prev, newDest]);
      showStatus(`Added: ${name}`, 'success');
    },
    [destinations.length]
  );

  // Remove a destination
  const removeDestination = (destId) => {
    setDestinations((prev) => prev.filter((d) => d.id !== destId));
    if (selectedMarker && selectedMarker.id === destId) {
      setSelectedMarker(null);
    }
  };

  // Move a destination up
  const moveDestinationUp = (index) => {
    if (index <= 0) return;
    setDestinations((prev) => {
      const updated = [...prev];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index];
      updated[index] = temp;
      return updated;
    });
  };

  // Move a destination down
  const moveDestinationDown = (index) => {
    if (index >= destinations.length - 1) return;
    setDestinations((prev) => {
      const updated = [...prev];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index];
      updated[index] = temp;
      return updated;
    });
  };

  // Calculate route using Google Directions Service
  const calculateRoute = async (orderedDests) => {
    if (!orderedDests || orderedDests.length < 2) return;

    try {
      const directionsService = new window.google.maps.DirectionsService();

      const modeObj = TRAVEL_MODES.find((m) => m.id === travelMode);
      const googleTravelMode = modeObj ? modeObj.googleMode : 'DRIVING';

      const origin = { lat: orderedDests[0].lat, lng: orderedDests[0].lng };
      const destination = {
        lat: orderedDests[orderedDests.length - 1].lat,
        lng: orderedDests[orderedDests.length - 1].lng
      };

      // Build waypoints from intermediate destinations
      const waypoints = orderedDests.slice(1, -1).map((d) => ({
        location: { lat: d.lat, lng: d.lng },
        stopover: true
      }));

      const request = {
        origin,
        destination,
        waypoints,
        travelMode: window.google.maps.TravelMode[googleTravelMode],
        optimizeWaypoints: false
      };

      directionsService.route(request, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirectionsResponse(result);

          // Calculate total distance and duration from all legs
          let totalDistance = 0;
          let totalDuration = 0;
          result.routes[0].legs.forEach((leg) => {
            totalDistance += leg.distance.value;
            totalDuration += leg.duration.value;
          });

          const totalDistanceKm = (totalDistance / 1000).toFixed(1);
          const totalDurationMin = Math.round(totalDuration / 60);

          setRouteInfo({
            distance: totalDistanceKm,
            duration: totalDurationMin
          });
        } else {
          console.error('Google Directions error:', status);
          setDirectionsResponse(null);
          setRouteInfo(null);
          if (status === 'ZERO_RESULTS') {
            showStatus('No route found between these destinations.', 'error');
          }
        }
      });
    } catch (error) {
      console.error('Directions calculation error:', error);
      setDirectionsResponse(null);
      setRouteInfo(null);
    }
  };

  // Format duration
  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  };

  // Internal: fetch weather silently and return map
  const fetchWeatherSilent = async (dests) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/weather/multi`, {
        locations: dests.map((d) => ({ lat: d.lat, lng: d.lng, name: d.name }))
      });
      const list = Array.isArray(response.data)
        ? response.data
        : response.data?.weather || [];
      const map = {};
      list.forEach((w) => {
        if (w.status !== 'error') {
          map[w.name] = { temp: w.temp, description: w.description, icon: w.icon, humidity: w.humidity };
        }
      });
      setWeatherData(map);
      return map;
    } catch {
      return {};
    }
  };

  // Fetch AI suggestions (auto-fetches weather + hotel context)
  const fetchAiSuggestions = async () => {
    if (!user) {
      showStatus('Please log in to get AI suggestions.', 'error');
      return;
    }
    if (destinations.length === 0) {
      showStatus('Add destinations first to get AI suggestions.', 'error');
      return;
    }

    setAiLoading(true);
    setAiSuggestions('');
    showStatus('Fetching weather & generating AI plan...', 'info');

    // Step 1: silently get weather
    const weather = await fetchWeatherSilent(destinations);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/ai/trip-suggestions`,
        {
          destinations: destinations.map((d) => ({ lat: d.lat, lng: d.lng, name: d.name })),
          travel_mode: travelMode,
          start_date: startDate,
          end_date: endDate,
          weather_data: weather
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const text =
        response.data?.suggestions ||
        (typeof response.data === 'string' ? response.data : null) ||
        response.data?.message;

      if (text) {
        setAiSuggestions(text);
        showStatus('AI plan ready!', 'success');
      } else {
        showStatus('No suggestions received.', 'error');
      }
    } catch (error) {
      console.error('AI suggestions error:', error);
      const msg =
        error.response?.data?.error || error.response?.data?.message || 'Failed to get AI suggestions.';
      showStatus(msg, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // Save trip
  const saveTrip = async () => {
    if (!user) {
      showStatus('Please log in to save your trip.', 'error');
      return;
    }
    if (!tripTitle.trim()) {
      showStatus('Please enter a trip title.', 'error');
      return;
    }
    if (destinations.length === 0) {
      showStatus('Add at least one destination.', 'error');
      return;
    }

    setSaving(true);
    showStatus('Saving trip...', 'info');

    try {
      const token = localStorage.getItem('token');
      const tripData = {
        title: tripTitle.trim(),
        description: `Trip to ${destinations.map((d) => d.name).join(', ')}`,
        destinations: destinations.map((d) => ({
          name: d.name,
          lat: d.lat,
          lng: d.lng,
          address: d.address || ''
        })),
        travel_mode: travelMode,
        total_distance: routeInfo ? parseFloat(routeInfo.distance) : 0,
        total_duration: routeInfo ? routeInfo.duration : 0,
        weather_data: weatherData,
        ai_suggestions: aiSuggestions,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'planned'
      };

      await axios.post(`${API_BASE_URL}/trips`, tripData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showStatus('Trip saved successfully!', 'success');
      fetchSavedTrips();
    } catch (error) {
      console.error('Save trip error:', error);
      const msg =
        error.response?.data?.error || error.response?.data?.message || 'Failed to save trip.';
      showStatus(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Load a saved trip
  const loadTrip = (trip) => {
    setTripTitle(trip.title || '');
    setStartDate(trip.start_date ? trip.start_date.substring(0, 10) : '');
    setEndDate(trip.end_date ? trip.end_date.substring(0, 10) : '');
    setTravelMode(trip.travel_mode || 'car');

    if (trip.destinations && Array.isArray(trip.destinations)) {
      const loadedDests = trip.destinations.map((d) => ({
        id: generateId(),
        name: d.name,
        lat: d.lat,
        lng: d.lng,
        address: d.address || ''
      }));
      setDestinations(loadedDests);
    }

    if (trip.weather_data) {
      setWeatherData(
        typeof trip.weather_data === 'string' ? JSON.parse(trip.weather_data) : trip.weather_data
      );
    } else {
      setWeatherData({});
    }

    if (trip.ai_suggestions) {
      setAiSuggestions(trip.ai_suggestions);
    } else {
      setAiSuggestions('');
    }

    showStatus(`Loaded trip: ${trip.title}`, 'success');
  };

  // Delete a saved trip
  const deleteTrip = async (tripId, e) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showStatus('Trip deleted.', 'success');
      fetchSavedTrips();
    } catch (error) {
      console.error('Delete trip error:', error);
      showStatus('Failed to delete trip.', 'error');
    }
  };

  // Handle destination marker click - fetch Place Details
  const handleDestMarkerClick = (dest) => {
    setSelectedMarker(dest);

    if (!placeDetails[dest.id] && dest.placeId && mapRef.current) {
      const service = new window.google.maps.places.PlacesService(mapRef.current);
      service.getDetails(
        {
          placeId: dest.placeId,
          fields: ['formatted_phone_number', 'website', 'opening_hours', 'business_status', 'reviews']
        },
        (result, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
            setPlaceDetails(prev => ({
              ...prev,
              [dest.id]: {
                phone: result.formatted_phone_number || null,
                website: result.website || null,
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

  if (!isLoaded) {
    return (
      <div className="tp-container">
        <div className="tp-sidebar">
          <div className="tp-sidebar-header">
            <h2 className="tp-title">Trip Planner</h2>
            <p className="tp-subtitle">Loading Google Maps...</p>
          </div>
        </div>
        <div className="tp-map-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD700' }}>
          Loading map...
        </div>
      </div>
    );
  }

  return (
    <div className="tp-container" ref={containerRef}>
      {/* Sidebar */}
      <div className="tp-sidebar" ref={sidebarRef} style={{ width: sidebarWidth }}>
        {/* Header */}
        <div className="tp-sidebar-header">
          <h2 className="tp-title">Trip Planner</h2>
          <p className="tp-subtitle">Plan your perfect Sri Lanka adventure</p>

          {/* Trip title */}
          <input
            type="text"
            value={tripTitle}
            onChange={(e) => setTripTitle(e.target.value)}
            placeholder="Trip title..."
            className="tp-input"
          />

          {/* Date range */}
          <div className="tp-date-row">
            <div className="tp-date-group">
              <label className="tp-date-label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="tp-date-input"
              />
            </div>
            <div className="tp-date-group">
              <label className="tp-date-label">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="tp-date-input"
              />
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="tp-search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations in Sri Lanka..."
              className="tp-search-input"
            />
            <button type="submit" className="tp-search-btn" disabled={searchLoading}>
              {searchLoading ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="tp-spin">
                  <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              )}
            </button>
          </form>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="tp-search-results">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="tp-search-result-item"
                  onClick={() => addDestinationFromSearch(result)}
                >
                  <strong>{result.name}</strong>
                  <small>{result.address}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status bar */}
        {statusMessage && (
          <div
            className={`tp-status-bar ${statusType === 'success' ? 'success' : statusType === 'error' ? 'error' : ''}`}
          >
            {statusMessage}
          </div>
        )}

        {/* Map click hint */}
        <div className="tp-hint-bar">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="currentColor"
            style={{ marginRight: 6, flexShrink: 0 }}
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          Click on the map to add destinations, or use search above.
        </div>

        {/* Travel Mode Selector */}
        <div className="tp-travel-section">
          <p className="tp-section-label">Travel Mode</p>
          <div className="tp-travel-buttons">
            {TRAVEL_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setTravelMode(mode.id)}
                className={`tp-travel-btn ${travelMode === mode.id ? 'active' : ''}`}
              >
                <span className="tp-travel-icon">
                  <TravelModeIcon path={mode.svgPath} />
                </span>
                <span className="tp-travel-label">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="tp-scroll-area" ref={scrollAreaRef}>
          {/* Destinations list */}
          <div className="tp-destinations-list">
            {destinations.length === 0 && (
              <div className="tp-empty-state">
                <svg
                  viewBox="0 0 24 24"
                  width="40"
                  height="40"
                  fill="currentColor"
                  style={{ color: '#3a4a5e', marginBottom: 10 }}
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <p className="tp-empty-title">No destinations added yet</p>
                <p className="tp-empty-hint">Search for places or click on the map to add stops.</p>
              </div>
            )}

            {destinations.map((dest, index) => {
              const isFirst = index === 0;
              const isLast = index === destinations.length - 1;
              const markerColor = isFirst ? '#00C853' : '#2979FF';
              const weather = weatherData[dest.name];

              return (
                <div key={dest.id} className={`tp-dest-card ${isFirst ? 'start' : ''}`}>
                  <div className="tp-dest-number" style={{ background: markerColor }}>
                    {index + 1}
                  </div>
                  <div className="tp-dest-info">
                    <h4 className="tp-dest-name">{dest.name}</h4>
                    {dest.address && <p className="tp-dest-address">{dest.address}</p>}
                    {/* Weather info */}
                    {weather && (
                      <div className="tp-dest-weather">
                        <img
                          src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                          alt={weather.description}
                          className="tp-weather-icon"
                        />
                        <span className="tp-weather-temp">{Math.round(weather.temp)}C</span>
                        <span className="tp-weather-desc">{weather.description}</span>
                      </div>
                    )}
                  </div>
                  <div className="tp-dest-actions">
                    <button
                      className="tp-action-btn"
                      onClick={() => moveDestinationUp(index)}
                      disabled={isFirst}
                      title="Move up"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                      </svg>
                    </button>
                    <button
                      className="tp-action-btn"
                      onClick={() => moveDestinationDown(index)}
                      disabled={isLast}
                      title="Move down"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                      </svg>
                    </button>
                    <button
                      className="tp-remove-btn"
                      onClick={() => removeDestination(dest.id)}
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

          {/* Route info */}
          {routeInfo && (
            <div className="tp-route-info">
              <div className="tp-route-stats">
                <div className="tp-stat-item">
                  <span className="tp-stat-value">{routeInfo.distance}</span>
                  <span className="tp-stat-label">km</span>
                </div>
                <div className="tp-stat-item">
                  <span className="tp-stat-value">{formatDuration(routeInfo.duration)}</span>
                  <span className="tp-stat-label">travel time</span>
                </div>
                <div className="tp-stat-item">
                  <span className="tp-stat-value">{destinations.length}</span>
                  <span className="tp-stat-label">stops</span>
                </div>
              </div>
            </div>
          )}

          {/* My Trips section */}
          <div className="tp-trips-section">
            <h3 className="tp-trips-title">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
              My Trips
            </h3>

            {!user && (
              <div className="tp-login-prompt">
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                  style={{ color: '#FFD700' }}
                >
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
                <span>Log in to save and manage your trips.</span>
              </div>
            )}

            {user && tripsLoading && (
              <div className="tp-trips-loading">Loading trips...</div>
            )}

            {user && !tripsLoading && savedTrips.length === 0 && (
              <div className="tp-trips-empty">No saved trips yet. Plan and save your first trip!</div>
            )}

            {user && !tripsLoading && savedTrips.length > 0 && (
              <div className="tp-trips-list">
                {savedTrips.map((trip) => (
                  <div key={trip.id} className="tp-trip-item" onClick={() => loadTrip(trip)}>
                    <div className="tp-trip-item-info">
                      <h4 className="tp-trip-item-title">{trip.title}</h4>
                      <div className="tp-trip-item-meta">
                        {trip.start_date && (
                          <span className="tp-trip-item-date">
                            {new Date(trip.start_date).toLocaleDateString()}
                          </span>
                        )}
                        {trip.destinations && (
                          <span className="tp-trip-item-stops">
                            {Array.isArray(trip.destinations) ? trip.destinations.length : 0} stops
                          </span>
                        )}
                        {trip.total_distance > 0 && (
                          <span className="tp-trip-item-distance">{trip.total_distance} km</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="tp-trip-delete-btn"
                      onClick={(e) => deleteTrip(trip.id, e)}
                      title="Delete trip"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons - always visible at bottom of sidebar */}
        <div className="tp-actions-section">
          <button
            className="tp-ai-btn"
            onClick={fetchAiSuggestions}
            disabled={aiLoading || destinations.length === 0}
          >
            {aiLoading ? (
              <>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="tp-spin">
                  <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
                </svg>
                Analysing weather &amp; planning...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
                </svg>
                Get AI Suggestions
              </>
            )}
          </button>

          <button
            className="tp-save-btn"
            onClick={saveTrip}
            disabled={saving || destinations.length === 0}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
            </svg>
            {saving ? 'Saving...' : 'Save Trip'}
          </button>
        </div>
      </div>

      {/* Draggable Resizer */}
      <div
        className={`tp-resizer ${isResizing ? 'active' : ''}`}
        onMouseDown={handleResizeStart}
      />

      {/* Map */}
      <div className="tp-map-area">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={SRI_LANKA_CENTER}
          zoom={8}
          onLoad={onMapLoad}
          onClick={handleMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: true,
            zoomControl: true
          }}
        >
          {/* Directions route rendering */}
          {directionsResponse && (
            <DirectionsRenderer
              directions={directionsResponse}
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

          {/* Destination markers */}
          {destinations.map((dest, index) => {
            const isFirst = index === 0;
            const color = isFirst ? '#00C853' : '#2979FF';

            return (
              <Marker
                key={dest.id}
                position={{ lat: dest.lat, lng: dest.lng }}
                icon={{
                  url: createMarkerIconUrl(color),
                  scaledSize: new window.google.maps.Size(30, 42),
                  anchor: new window.google.maps.Point(15, 42),
                  labelOrigin: new window.google.maps.Point(15, 16)
                }}
                label={{
                  text: String(index + 1),
                  color: '#333',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
                onClick={() => handleDestMarkerClick(dest)}
              />
            );
          })}

          {/* InfoWindow for selected marker */}
          {selectedMarker && (() => {
            const stopIndex = destinations.findIndex((d) => d.id === selectedMarker.id) + 1;
            const details = placeDetails[selectedMarker.id];
            return (
            <InfoWindow
              position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="marker-popup" style={{ minWidth: '240px', maxWidth: '300px' }}>
                <strong style={{ fontSize: '1.05rem' }}>
                  Stop {stopIndex}: {selectedMarker.name}
                </strong>
                <br />
                {selectedMarker.address && (
                  <small style={{ color: '#666' }}>{selectedMarker.address}</small>
                )}

                {/* Rating & Reviews */}
                {selectedMarker.rating && (
                  <div style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#FFD700' }}>{'★'.repeat(Math.floor(selectedMarker.rating))}</span>
                    <span style={{ color: '#666', fontSize: '0.85rem' }}>
                      {selectedMarker.rating.toFixed(1)} {selectedMarker.userRatingsTotal ? `(${selectedMarker.userRatingsTotal} reviews)` : ''}
                    </span>
                  </div>
                )}

                {/* Price, Category, Open Status */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0', flexWrap: 'wrap' }}>
                  {selectedMarker.priceLevel !== null && selectedMarker.priceLevel !== undefined && (
                    <span style={{ color: '#4CAF50', fontWeight: 600 }}>{'$'.repeat(selectedMarker.priceLevel + 1)}</span>
                  )}
                  {selectedMarker.category && selectedMarker.category !== 'place' && (
                    <span style={{ color: '#888', fontSize: '0.8rem', background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                      {selectedMarker.category}
                    </span>
                  )}
                  {(details?.openNow ?? selectedMarker.openNow) !== null && (details?.openNow ?? selectedMarker.openNow) !== undefined && (
                    <span style={{ color: (details?.openNow ?? selectedMarker.openNow) ? '#4CAF50' : '#f44336', fontWeight: 600, fontSize: '0.85rem' }}>
                      {(details?.openNow ?? selectedMarker.openNow) ? 'Open Now' : 'Closed'}
                    </span>
                  )}
                </div>

                {/* Weather info */}
                {weatherData[selectedMarker.name] && (
                  <div style={{ margin: '4px 0', fontSize: '0.85rem', color: '#555', background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
                    {Math.round(weatherData[selectedMarker.name].temp)}&deg;C - {weatherData[selectedMarker.name].description}
                  </div>
                )}

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

                <button
                  onClick={() => {
                    removeDestination(selectedMarker.id);
                    setSelectedMarker(null);
                  }}
                  style={{ background: '#f44336', marginTop: '8px', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Remove Stop
                </button>
              </div>
            </InfoWindow>
            );
          })()}
        </GoogleMap>
      </div>

      {/* ── AI Suggestions Full Overlay ── */}
      {(aiLoading || aiSuggestions) && (
        <div
          className="tp-ai-overlay"
          onClick={(e) => { if (e.target === e.currentTarget && !aiLoading) setAiSuggestions(''); }}
        >
          <div className="tp-ai-panel">
            {/* Header */}
            <div className="tp-ai-panel-header">
              <div className="tp-ai-panel-title-row">
                <div className="tp-ai-panel-icon">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="#0a1929">
                    <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="tp-ai-panel-heading">AI Travel Plan</h2>
                  <p className="tp-ai-panel-route">
                    {destinations.map(d => d.name).join(' → ')}
                    {routeInfo ? ` • ${routeInfo.distance} km • ${formatDuration(routeInfo.duration)}` : ''}
                  </p>
                </div>
              </div>
              {!aiLoading && (
                <button className="tp-ai-panel-close" onClick={() => setAiSuggestions('')} title="Close">
                  ×
                </button>
              )}
            </div>

            {aiLoading ? (
              /* Loading state */
              <div className="tp-ai-loading-state">
                <div className="tp-ai-spinner" />
                <p className="tp-ai-loading-text">Analysing weather &amp; generating your travel plan...</p>
                <p className="tp-ai-loading-sub">Checking hotels, routes, and local conditions</p>
              </div>
            ) : (
              <>
                {/* Weather strip */}
                {Object.keys(weatherData).length > 0 && (
                  <div className="tp-ai-weather-strip">
                    {Object.entries(weatherData).map(([name, w]) => (
                      <div key={name} className="tp-ai-weather-item">
                        {w.icon && (
                          <img
                            src={`https://openweathermap.org/img/wn/${w.icon}@2x.png`}
                            alt={w.description}
                            className="tp-ai-weather-icon"
                          />
                        )}
                        <div className="tp-ai-weather-details">
                          <span className="tp-ai-weather-name">{name}</span>
                          <span className="tp-ai-weather-temp">{Math.round(w.temp)}°C</span>
                          <span className="tp-ai-weather-desc">{w.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Content Body */}
                <div className="tp-ai-panel-body">
                  {renderAiContent(aiSuggestions)}
                </div>

                {/* Footer */}
                <div className="tp-ai-panel-footer">
                  <button className="tp-ai-panel-close-btn" onClick={() => setAiSuggestions('')}>
                    Close
                  </button>
                  <button className="tp-ai-panel-save-btn" onClick={saveTrip} disabled={saving}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginRight: 6 }}>
                      <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                    </svg>
                    {saving ? 'Saving...' : 'Save This Trip'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPlanner;
