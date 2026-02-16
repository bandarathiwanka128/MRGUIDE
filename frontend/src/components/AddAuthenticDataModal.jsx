import React, { useState } from 'react';
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
    packages: []
  });

  const [newPackage, setNewPackage] = useState({ name: '', price: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPackage = () => {
    if (newPackage.name && newPackage.price) {
      setFormData(prev => ({
        ...prev,
        packages: [...prev.packages, { ...newPackage }]
      }));
      setNewPackage({ name: '', price: '', description: '' });
    }
  };

  const handleRemovePackage = (index) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to add authentic data');
        setLoading(false);
        return;
      }

      const payload = {
        google_place_id: place.id || place.placeId,
        place_name: place.name,
        place_address: place.address,
        place_lat: place.lat || place.position?.lat,
        place_lng: place.lng || place.position?.lng,
        place_category: place.category || place.type || 'place',
        detail_type: type,
        ...formData,
        packages: formData.packages.length > 0 ? formData.packages : null
      };

      await axios.post(
        `${API_BASE_URL}/places/authentic-details`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert('Authentic data added successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding authentic data:', error);
      setError(
        error.response?.data?.error ||
        'Failed to add authentic data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {type === 'business' ? 'Add Business Information' : 'Add Authentic User Data'}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="authentic-form">
          <div className="form-section">
            <h3>Place Information</h3>
            <div className="place-info-display">
              <strong>{place.name}</strong>
              <p>{place.address}</p>
            </div>
          </div>

          <div className="form-section">
            <h3>Your {type === 'business' ? 'Business' : 'Personal'} Details</h3>

            {type === 'business' ? (
              <>
                <div className="form-group">
                  <label>Business Name *</label>
                  <input
                    type="text"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your business name"
                  />
                </div>

                <div className="form-group">
                  <label>Business Type</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Hotel, Restaurant, Tour Guide"
                  />
                </div>

                <div className="form-group">
                  <label>Organization</label>
                  <input
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleInputChange}
                    placeholder="Parent company or organization"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Your Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Tourism Manager, Local Guide"
                  />
                </div>

                <div className="form-group">
                  <label>Organization</label>
                  <input
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleInputChange}
                    placeholder="Your organization or company"
                  />
                </div>

                <div className="form-group">
                  <label>Job Title</label>
                  <input
                    type="text"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleInputChange}
                    placeholder="Your job title"
                  />
                </div>

                <div className="form-group">
                  <label>Expertise</label>
                  <textarea
                    name="expertise"
                    value={formData.expertise}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Your expertise or specialization about this place"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows="4"
                placeholder={
                  type === 'business'
                    ? 'Describe your business and what you offer at this location'
                    : 'Share authentic information about this place'
                }
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Contact Information</h3>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+94 XX XXX XXXX"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          {type === 'business' && (
            <div className="form-section">
              <h3>Packages & Services</h3>
              <p className="section-description">
                Add packages or services you offer at this location
              </p>

              <div className="packages-input">
                <div className="package-input-row">
                  <input
                    type="text"
                    placeholder="Package name"
                    value={newPackage.name}
                    onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Price"
                    value={newPackage.price}
                    onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
                  />
                </div>
                <textarea
                  placeholder="Package description (optional)"
                  value={newPackage.description}
                  onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                  rows="2"
                />
                <button
                  type="button"
                  onClick={handleAddPackage}
                  className="add-package-btn"
                  disabled={!newPackage.name || !newPackage.price}
                >
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
                        <button
                          type="button"
                          onClick={() => handleRemovePackage(index)}
                          className="remove-package-btn"
                        >
                          ×
                        </button>
                      </div>
                      {pkg.description && (
                        <p className="package-preview-desc">{pkg.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Authentic Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAuthenticDataModal;
