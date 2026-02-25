import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './AddAuthenticDataModal.css';

const AddAuthenticDataModal = ({ place, type, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    business_name: '',
    organization: '',
    job_title: '',
    expertise: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    maps_link: '',
    packages: []
  });

  const [userProfile, setUserProfile] = useState(null); // fetched from /api/auth/me
  const [profileLoading, setProfileLoading] = useState(true);

  const [newPackage, setNewPackage] = useState({ name: '', price: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Image URL links (optional, up to 5)
  const [imageLinks, setImageLinks] = useState(['']);

  // Business location picker state
  const [businessLocation, setBusinessLocation] = useState({
    lat: place.lat || null,
    lng: place.lng || null,
    address: place.address || ''
  });
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const mapPickerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const profile = res.data;
        setUserProfile(profile);

        // Pre-fill form with profile data
        if (type === 'user') {
          setFormData(prev => ({
            ...prev,
            title: profile.AuthenticProfile?.title || '',
            job_title: profile.AuthenticProfile?.job_title || '',
            phone: profile.mobile_number || '',
            email: profile.email || ''
          }));
        } else {
          // Business: pre-fill contact info as defaults
          setFormData(prev => ({
            ...prev,
            phone: prev.phone || profile.mobile_number || '',
            email: prev.email || profile.email || ''
          }));
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize map picker for business type
  useEffect(() => {
    if (type !== 'business') return;
    if (!mapPickerRef.current) return;
    if (!window.google || !window.google.maps) return;

    const initLat = businessLocation.lat || 7.8731;
    const initLng = businessLocation.lng || 80.7718;

    const map = new window.google.maps.Map(mapPickerRef.current, {
      center: { lat: initLat, lng: initLng },
      zoom: businessLocation.lat ? 14 : 8,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: 'greedy',
      styles: [
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#193341' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1a2942' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3e50' }] },
        { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1a2942' }] },
        { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#8a929d' }] },
        { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ color: '#0a1929' }] }
      ]
    });

    mapInstanceRef.current = map;

    if (businessLocation.lat) {
      const marker = new window.google.maps.Marker({
        position: { lat: initLat, lng: initLng },
        map,
        draggable: true,
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png', scaledSize: new window.google.maps.Size(40, 40) }
      });
      markerRef.current = marker;
      marker.addListener('dragend', (e) => reverseGeocodeLocation(e.latLng.lat(), e.latLng.lng()));
    }

    map.addListener('click', (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      if (!markerRef.current) {
        markerRef.current = new window.google.maps.Marker({
          position: { lat, lng }, map, draggable: true,
          icon: { url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png', scaledSize: new window.google.maps.Size(40, 40) }
        });
        markerRef.current.addListener('dragend', (ev) => reverseGeocodeLocation(ev.latLng.lat(), ev.latLng.lng()));
      } else {
        markerRef.current.setPosition({ lat, lng });
      }
      reverseGeocodeLocation(lat, lng);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, profileLoading]);

  const reverseGeocodeLocation = async (lat, lng) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      const address = response.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setBusinessLocation({ lat, lng, address });
    } catch {
      setBusinessLocation({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    }
  };

  const handleLocationSearch = async () => {
    if (!locationSearch.trim() || !mapInstanceRef.current) return;
    setLocationSearchLoading(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ address: locationSearch + ', Sri Lanka' });
      if (response.results?.length > 0) {
        const result = response.results[0];
        const lat = result.geometry.location.lat();
        const lng = result.geometry.location.lng();
        const address = result.formatted_address;
        mapInstanceRef.current.panTo({ lat, lng });
        mapInstanceRef.current.setZoom(16);
        if (!markerRef.current) {
          markerRef.current = new window.google.maps.Marker({
            position: { lat, lng }, map: mapInstanceRef.current, draggable: true,
            icon: { url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png', scaledSize: new window.google.maps.Size(40, 40) }
          });
          markerRef.current.addListener('dragend', (ev) => reverseGeocodeLocation(ev.latLng.lat(), ev.latLng.lng()));
        } else {
          markerRef.current.setPosition({ lat, lng });
        }
        setBusinessLocation({ lat, lng, address });
      }
    } catch (err) {
      console.error('Location search error:', err);
    } finally {
      setLocationSearchLoading(false);
    }
  };

  // Image link management
  const updateImageLink = (index, value) => {
    setImageLinks(prev => prev.map((v, i) => i === index ? value : v));
  };

  const addImageLink = () => {
    if (imageLinks.length < 5) setImageLinks(prev => [...prev, '']);
  };

  const removeImageLink = (index) => {
    if (imageLinks.length === 1) {
      setImageLinks(['']);
    } else {
      setImageLinks(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPackage = () => {
    if (newPackage.name && newPackage.price) {
      setFormData(prev => ({ ...prev, packages: [...prev.packages, { ...newPackage }] }));
      setNewPackage({ name: '', price: '', description: '' });
    }
  };

  const handleRemovePackage = (index) => {
    setFormData(prev => ({ ...prev, packages: prev.packages.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Please login to add authentic data'); setLoading(false); return; }

      const finalLat = (type === 'business' && businessLocation.lat) ? businessLocation.lat : (place.lat || place.position?.lat);
      const finalLng = (type === 'business' && businessLocation.lng) ? businessLocation.lng : (place.lng || place.position?.lng);
      const finalAddress = (type === 'business' && businessLocation.address) ? businessLocation.address : place.address;

      const validPhotos = imageLinks.filter(url => url.trim() !== '');

      const payload = {
        google_place_id: place.id || place.placeId,
        place_name: type === 'business' ? (formData.business_name || place.name) : place.name,
        place_address: finalAddress,
        place_lat: finalLat,
        place_lng: finalLng,
        place_category: type === 'business' ? (formData.title || 'business') : (place.category || 'place'),
        detail_type: type,
        ...formData,
        packages: formData.packages.length > 0 ? formData.packages : null,
        photos: validPhotos
      };

      await axios.post(`${API_BASE_URL}/places/authentic-details`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Authentic data added successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adding authentic data:', err);
      setError(err.response?.data?.error || 'Failed to add authentic data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>Loading your profile...</div>
        </div>
      </div>
    );
  }

  const profile = userProfile?.AuthenticProfile;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{type === 'business' ? '🏢 Register Business' : '👤 Add Authentic Data'}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="authentic-form">

          {/* Place reference */}
          <div className="form-section">
            <h3>Place Information</h3>
            <div className="place-info-display">
              <strong>{place.name}</strong>
              <p>{place.address}</p>
            </div>
          </div>

          {/* For USER type: show profile info card (no re-entry needed) */}
          {type === 'user' && (
            <div className="form-section">
              <h3>Your Profile</h3>
              <div className="profile-info-card">
                <div className="profile-info-row">
                  <span className="profile-info-label">Name</span>
                  <span className="profile-info-value">{userProfile?.username || '—'}</span>
                </div>
                {(profile?.title || formData.title) && (
                  <div className="profile-info-row">
                    <span className="profile-info-label">Title</span>
                    <span className="profile-info-value">{profile?.title || formData.title}</span>
                  </div>
                )}
                {(profile?.job_title || formData.job_title) && (
                  <div className="profile-info-row">
                    <span className="profile-info-label">Job Title</span>
                    <span className="profile-info-value">{profile?.job_title || formData.job_title}</span>
                  </div>
                )}
                {formData.phone && (
                  <div className="profile-info-row">
                    <span className="profile-info-label">Contact</span>
                    <span className="profile-info-value">{formData.phone}</span>
                  </div>
                )}
                {formData.email && (
                  <div className="profile-info-row">
                    <span className="profile-info-label">Email</span>
                    <span className="profile-info-value">{formData.email}</span>
                  </div>
                )}
                <p className="profile-info-note">This info is from your registration and will be shown to travelers.</p>
              </div>

              {/* Only place-specific fields */}
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Expertise at this place</label>
                <textarea name="expertise" value={formData.expertise}
                  onChange={handleInputChange} rows="3"
                  placeholder="Your expertise or specialization about this specific place" />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea name="description" value={formData.description}
                  onChange={handleInputChange} required rows="4"
                  placeholder="Share authentic information about this place" />
              </div>
              <div className="form-group">
                <label>Website <span className="label-optional">(optional)</span></label>
                <input type="url" name="website" value={formData.website}
                  onChange={handleInputChange} placeholder="https://yourwebsite.com" />
              </div>
            </div>
          )}

          {/* For BUSINESS type: keep full form */}
          {type === 'business' && (
            <>
              <div className="form-section">
                <h3>Business Details</h3>
                <div className="form-group">
                  <label>Business Name *</label>
                  <input type="text" name="business_name" value={formData.business_name}
                    onChange={handleInputChange} required placeholder="Enter your business name" />
                </div>
                <div className="form-group">
                  <label>Business Type</label>
                  <input type="text" name="title" value={formData.title}
                    onChange={handleInputChange} placeholder="e.g., Hotel, Restaurant, Tour Guide" />
                </div>
                <div className="form-group">
                  <label>Organization</label>
                  <input type="text" name="organization" value={formData.organization}
                    onChange={handleInputChange} placeholder="Parent company or organization" />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea name="description" value={formData.description}
                    onChange={handleInputChange} required rows="4"
                    placeholder="Describe your business and what you offer at this location" />
                </div>
              </div>

              {/* Business Location Picker */}
              <div className="form-section">
                <h3>📍 Business Location on Map</h3>
                <p className="section-description">
                  Search your address or click/drag the pin on the map to set your exact location.
                </p>
                <div className="map-picker-search-row">
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={e => setLocationSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleLocationSearch(); } }}
                    placeholder="Search your business address..."
                    className="map-picker-search-input"
                  />
                  <button type="button" className="map-picker-search-btn"
                    onClick={handleLocationSearch} disabled={locationSearchLoading}>
                    {locationSearchLoading ? <span className="mp-spinner" /> : '🔍'}
                  </button>
                </div>
                <div ref={mapPickerRef} className="map-picker-container" />
                {businessLocation.lat ? (
                  <div className="map-picker-selected">
                    <span className="map-picker-pin-icon">📍</span>
                    <div>
                      <div className="map-picker-address">{businessLocation.address}</div>
                      <div className="map-picker-coords">{businessLocation.lat.toFixed(5)}, {businessLocation.lng.toFixed(5)}</div>
                    </div>
                  </div>
                ) : (
                  <p className="map-picker-hint">Click on the map to set your exact business location</p>
                )}
              </div>

              {/* Business Contact Info */}
              <div className="form-section">
                <h3>Contact Information</h3>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" name="phone" value={formData.phone}
                    onChange={handleInputChange} placeholder="+94 XX XXX XXXX" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={formData.email}
                    onChange={handleInputChange} placeholder="your@email.com" />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input type="url" name="website" value={formData.website}
                    onChange={handleInputChange} placeholder="https://yourwebsite.com" />
                </div>
                <div className="form-group">
                  <label>
                    <span className="maps-link-label-icon">🗺️</span> Google Maps Link
                    <span className="label-optional"> (optional)</span>
                  </label>
                  <input type="url" name="maps_link" value={formData.maps_link}
                    onChange={handleInputChange}
                    placeholder="https://maps.google.com/... or https://goo.gl/maps/..." />
                  <p className="input-hint">Paste the Google Maps link to your business location</p>
                </div>
              </div>

              {/* Packages */}
              <div className="form-section">
                <h3>Packages &amp; Services</h3>
                <p className="section-description">Add packages or services you offer at this location</p>
                <div className="packages-input">
                  <div className="package-input-row">
                    <input type="text" placeholder="Package name" value={newPackage.name}
                      onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })} />
                    <input type="text" placeholder="Price (e.g. LKR 2500)" value={newPackage.price}
                      onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })} />
                  </div>
                  <textarea placeholder="Package description (optional)" value={newPackage.description}
                    onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })} rows="2" />
                  <button type="button" onClick={handleAddPackage} className="add-package-btn"
                    disabled={!newPackage.name || !newPackage.price}>
                    + Add Package
                  </button>
                </div>
                {formData.packages.length > 0 && (
                  <div className="packages-list">
                    <h4>Added Packages:</h4>
                    {formData.packages.map((pkg, index) => (
                      <div key={index} className="package-preview">
                        <div className="package-preview-header">
                          <span className="package-preview-name">{pkg.name}</span>
                          <span className="package-preview-price">{pkg.price}</span>
                          <button type="button" onClick={() => handleRemovePackage(index)} className="remove-package-btn">×</button>
                        </div>
                        {pkg.description && <p className="package-preview-desc">{pkg.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Photos — both types */}
          <div className="form-section">
            <h3>📷 {type === 'business' ? 'Business' : 'Place'} Photos</h3>
            <p className="section-description">
              Paste image URLs to showcase {type === 'business' ? 'your business' : 'this place'} (optional, up to 5)
            </p>
            <div className="image-links-list">
              {imageLinks.map((link, index) => (
                <div key={index} className="image-link-row">
                  <input
                    type="url"
                    value={link}
                    onChange={e => updateImageLink(index, e.target.value)}
                    placeholder={`Image URL ${index + 1} (e.g., https://example.com/photo.jpg)`}
                    className="image-link-input"
                  />
                  {link.trim() !== '' && (
                    <a href={link} target="_blank" rel="noopener noreferrer"
                      className="image-link-preview-btn" title="Preview image">
                      👁
                    </a>
                  )}
                  <button type="button" className="image-link-remove-btn"
                    onClick={() => removeImageLink(index)} title="Remove">
                    ×
                  </button>
                </div>
              ))}
            </div>
            {imageLinks.length < 5 && (
              <button type="button" className="add-image-link-btn" onClick={addImageLink}>
                + Add another image URL
              </button>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn" disabled={loading}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Authentic Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAuthenticDataModal;
