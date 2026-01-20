import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import './MapSearch.css';

const libraries = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const center = {
  lat: 6.9271,  // Colombo, Sri Lanka default
  lng: 79.8612
};

function MapSearch() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyDKQmKH9sEMretHWkYag0FMg7VFCNRNC_8",
    libraries
  });

  const [places, setPlaces] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [mapCenter, setMapCenter] = useState(center);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mapRef = useRef(null);
  const placesServiceRef = useRef(null);

  // Initialize places service when map is loaded
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    placesServiceRef.current = new window.google.maps.places.PlacesService(map);
  }, []);

  // Handle place search
  const handlePlaceSearch = useCallback((searchInput) => {
    if (!placesServiceRef.current) return;

    const request = {
      query: searchInput,
      location: mapRef.current.getCenter(),
      radius: '50000', // 50km radius
    };

    setLoading(true);
    setError(null);

    placesServiceRef.current.textSearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        const newPlaces = results.map(place => ({
          id: place.place_id,
          name: place.name,
          position: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          },
          address: place.formatted_address,
          rating: place.rating,
          types: place.types
        }));

        setPlaces(newPlaces);
        setMarkers(newPlaces);

        // Fit map bounds to show all markers
        const bounds = new window.google.maps.LatLngBounds();
        results.forEach(place => bounds.extend(place.geometry.location));
        mapRef.current.fitBounds(bounds);
      } else {
        setError('No places found');
        setPlaces([]);
        setMarkers([]);
      }
      setLoading(false);
    });
  }, []);

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMapCenter(userLocation);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  if (loadError) return <div className="error-message">Error loading maps</div>;
  if (!isLoaded) return <div className="loading">Loading maps...</div>;

  return (
    <div className="map-search-page">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search for places (e.g., 'Colombo hotels', 'Kandy temples')"
          className="search-input"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handlePlaceSearch(e.target.value);
            }
          }}
        />
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="map-container">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={12}
          center={mapCenter}
          onLoad={onMapLoad}
          options={{
            streetViewControl: false,
            mapTypeControlOptions: { position: window.google.maps.ControlPosition.TOP_RIGHT }
          }}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={marker.position}
              onClick={() => setSelectedPlace(marker)}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
              }}
            />
          ))}

          {selectedPlace && (
            <InfoWindow
              position={selectedPlace.position}
              onCloseClick={() => setSelectedPlace(null)}
            >
              <div className="info-window">
                <h3>{selectedPlace.name}</h3>
                <p>{selectedPlace.address}</p>
                {selectedPlace.rating && (
                  <p>Rating: {selectedPlace.rating} ⭐</p>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      <div className="results-container">
        {loading ? (
          <div className="loading">Searching places...</div>
        ) : (
          <div className="places-grid">
            {places.map((place) => (
              <div
                key={place.id}
                className="place-card"
                onClick={() => {
                  setSelectedPlace(place);
                  mapRef.current.panTo(place.position);
                  mapRef.current.setZoom(15);
                }}
              >
                <h3>{place.name}</h3>
                <p>{place.address}</p>
                {place.rating && <p>Rating: {place.rating} ⭐</p>}
                <div className="place-types">
                  {place.types?.slice(0, 3).map((type, index) => (
                    <span key={index} className="place-type">
                      {type.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MapSearch;