'use client';

import { useState } from 'react';
import Icon from './Icon';

interface Vehicle {
  id: string;
  stock_number: string;
  plate_number?: string;
  chassis_number?: string;
  engine_number?: string;
  make: string;
  vehicle_model?: string;
  model_family?: string;
  model_year: number;
  category?: string;
  body_style?: string;
  colour?: string;
  interior_colour?: string;
  engine_type?: string;
  transmission?: string;
  fuel_type?: string;
  current_mileage_km?: number;
  monthly_lease_rate?: number;
  security_deposit?: number;
  lease_term_months?: number;
  max_mileage_per_year?: number;
  condition?: string;
  condition_notes?: string;
  buyout_price?: number;
  current_market_value?: number;
  warranty_expiry_date?: string;
  registration_date?: string;
  photos?: Array<{
    id: string;
    url: string;
    filename: string;
    is_primary: boolean;
    sort_order: number;
    uploaded_at: string;
  }>;
  status: string;
  created_at: string;
}

interface Props {
  vehicle: Vehicle;
  onClose: () => void;
  onInquire: () => void;
}

export default function VehicleModal({ vehicle, onClose, onInquire }: Props) {
  const photoUrls = vehicle.photos?.map(photo => photo.url) || [];
  const images = photoUrls.length > 0 ? photoUrls : ['/MAIN LOGO.png'];
  const [currentImage, setCurrentImage] = useState(0);
  const [activePage, setActivePage] = useState<'page1' | 'page2' | 'gallery'>('page1');
  
  const vehicleName = `${vehicle.make} ${vehicle.vehicle_model || vehicle.model_family || ''}`.trim();
  const exteriorColor = vehicle.colour;
  const interiorColor = vehicle.interior_colour;
  const mileage = vehicle.current_mileage_km;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pdf-style-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header with Vehicle Title */}
        <div className="modal-header">
          <div>
            <h2>{vehicle.model_year} {vehicleName}</h2>
            <div style={{ fontSize: '13px', color: 'var(--silver)', marginTop: '5px' }}>
              Stock: {vehicle.stock_number} {vehicle.chassis_number && `• Chassis: ${vehicle.chassis_number}`}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Page Tabs */}
        <div className="modal-tabs">
          <button 
            className={`modal-tab ${activePage === 'page1' ? 'active' : ''}`}
            onClick={() => setActivePage('page1')}
          >
            Vehicle & Specs
          </button>
          <button 
            className={`modal-tab ${activePage === 'page2' ? 'active' : ''}`}
            onClick={() => setActivePage('page2')}
          >
            Pricing
          </button>
          <button 
            className={`modal-tab ${activePage === 'gallery' ? 'active' : ''}`}
            onClick={() => setActivePage('gallery')}
          >
            Gallery ({images.length})
          </button>
        </div>

        <div className="modal-body">
          {/* PAGE 1: Images + Specifications (like PDF page 1) */}
          {activePage === 'page1' && (
            <div className="pdf-content-wrapper">
              {/* Images Section */}
              <div className="pdf-full-section">
                <h4 className="pdf-card-title">Images</h4>
                <div className="modal-image-section">
                  <img 
                    src={images[currentImage]} 
                    alt={vehicleName}
                    className="modal-image"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImage(currentImage === 0 ? images.length - 1 : currentImage - 1)}
                        className="image-nav-arrow left"
                      >
                        <Icon name="directions" size={24} flip />
                      </button>
                      <button
                        onClick={() => setCurrentImage(currentImage === images.length - 1 ? 0 : currentImage + 1)}
                        className="image-nav-arrow right"
                      >
                        <Icon name="directions" size={24} />
                      </button>
                      <div className="image-dots">
                        {images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImage(idx)}
                            className={`image-dot ${idx === currentImage ? 'active' : ''}`}
                          />
                        ))}
                      </div>
                      <div className="image-counter">
                        {currentImage + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnail Grid */}
                {images.length > 1 && (
                  <div className="pdf-thumbnail-grid">
                    {images.slice(1, 5).map((img, idx) => (
                      <div key={idx} className="pdf-thumbnail" onClick={() => setCurrentImage(idx + 1)}>
                        <img src={img} alt={`Thumbnail ${idx + 2}`} />
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - images.slice(1).length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="pdf-thumbnail empty">
                        <div className="thumbnail-placeholder">Image {images.slice(1).length + i + 2}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Specifications Section */}
              <div className="pdf-full-section">
                <h4 className="pdf-card-title">Specifications</h4>
                <div className="pdf-specs-grid">
                  <div className="spec-item">
                    <span className="spec-label">Model Year</span>
                    <span className="spec-value">{vehicle.model_year || 'N/A'}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Make & Model</span>
                    <span className="spec-value">{vehicle.make} {vehicle.vehicle_model || vehicle.model_family || ''}</span>
                  </div>
                  {exteriorColor && (
                    <div className="spec-item">
                      <span className="spec-label">Exterior Color</span>
                      <span className="spec-value">{exteriorColor}</span>
                    </div>
                  )}
                  {interiorColor && (
                    <div className="spec-item">
                      <span className="spec-label">Interior Color</span>
                      <span className="spec-value">{interiorColor}</span>
                    </div>
                  )}
                  {(mileage !== null && mileage !== undefined && mileage > 0) && (
                    <div className="spec-item">
                      <span className="spec-label">Mileage</span>
                      <span className="spec-value">{mileage.toLocaleString()} km</span>
                    </div>
                  )}
                  {vehicle.engine_type && (
                    <div className="spec-item">
                      <span className="spec-label">Engine</span>
                      <span className="spec-value">{vehicle.engine_type}</span>
                    </div>
                  )}
                  {vehicle.transmission && (
                    <div className="spec-item">
                      <span className="spec-label">Transmission</span>
                      <span className="spec-value">{vehicle.transmission}</span>
                    </div>
                  )}
                  {vehicle.body_style && (
                    <div className="spec-item">
                      <span className="spec-label">Body Style</span>
                      <span className="spec-value">{vehicle.body_style}</span>
                    </div>
                  )}
                  {vehicle.chassis_number && (
                    <div className="spec-item">
                      <span className="spec-label">Chassis Number</span>
                      <span className="spec-value">{vehicle.chassis_number}</span>
                    </div>
                  )}
                  {vehicle.engine_number && (
                    <div className="spec-item">
                      <span className="spec-label">Engine Number</span>
                      <span className="spec-value">{vehicle.engine_number}</span>
                    </div>
                  )}
                  {vehicle.plate_number && (
                    <div className="spec-item">
                      <span className="spec-label">Plate Number</span>
                      <span className="spec-value">{vehicle.plate_number}</span>
                    </div>
                  )}
                  {vehicle.registration_date && (
                    <div className="spec-item">
                      <span className="spec-label">Registration Date</span>
                      <span className="spec-value">{new Date(vehicle.registration_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {vehicle.warranty_expiry_date && (
                    <div className="spec-item">
                      <span className="spec-label">Warranty Expiry</span>
                      <span className="spec-value">{new Date(vehicle.warranty_expiry_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PAGE 2: Pricing (like PDF page 2) */}
          {activePage === 'page2' && (
            <div className="pdf-content-wrapper">
              <div className="pdf-pricing-section">
                <h4 className="pricing-header">LEASE PRICING</h4>
                
                {/* Main Monthly Price */}
                <div className="main-price-box">
                  <div className="main-price-label">Monthly Lease Payment</div>
                  <div className="main-price-value">
                    AED {vehicle.monthly_lease_rate?.toLocaleString() || 'N/A'}
                  </div>
                  <div className="price-note">*Plus applicable taxes and fees</div>
                </div>

                {/* Payment Options Grid */}
                <div className="payment-options">
                  <div className="payment-option">
                    <div className="payment-option-label">Security Deposit</div>
                    <div className="payment-option-value">
                      AED {vehicle.security_deposit?.toLocaleString() || 'N/A'}
                    </div>
                  </div>
                  <div className="payment-option">
                    <div className="payment-option-label">Buyout Price</div>
                    <div className="payment-option-value">
                      AED {vehicle.buyout_price?.toLocaleString() || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Mileage Info */}
                {vehicle.max_mileage_per_year && (
                  <div className="mileage-info">
                    <div className="mileage-item">
                      <span className="mileage-label">Maximum Mileage per Year:</span>
                      <span className="mileage-value">{vehicle.max_mileage_per_year.toLocaleString()} km</span>
                    </div>
                    {vehicle.lease_term_months && (
                      <div className="mileage-item">
                        <span className="mileage-label">Lease Term:</span>
                        <span className="mileage-value">{vehicle.lease_term_months} months</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* What's Included Section */}
              <div className="pdf-full-section">
                <h4 className="pdf-card-title">What's Included</h4>
                <div className="benefits-grid">
                  <div className="benefit-card">
                    <div className="benefit-icon">💰</div>
                    <h5 className="benefit-title">Zero Down Payment</h5>
                    <p className="benefit-description">No upfront down payment required</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon">🏎️</div>
                    <h5 className="benefit-title">Quick Start</h5>
                    <p className="benefit-description">Pay security deposit + first month to drive home</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon">🛡️</div>
                    <h5 className="benefit-title">Insurance Included</h5>
                    <p className="benefit-description">Comprehensive insurance & registration included</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon">🔧</div>
                    <h5 className="benefit-title">Service Included</h5>
                    <p className="benefit-description">Routine service and maintenance covered</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon">📅</div>
                    <h5 className="benefit-title">12-Month Term</h5>
                    <p className="benefit-description">Standard 12 month lease period</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon">🔑</div>
                    <h5 className="benefit-title">Lease-to-Own</h5>
                    <p className="benefit-description">Option to purchase at end of lease term</p>
                  </div>
                </div>
              </div>

              {/* How to Get Started */}
              <div className="pdf-full-section">
                <h4 className="pdf-card-title">How to Get Started</h4>
                <div className="process-steps-grid">
                  <div className="process-step">
                    <div className="step-number">1</div>
                    <h5 className="step-title">Choose Your Vehicle</h5>
                    <p className="step-description">Select from our premium Mercedes-Benz fleet</p>
                  </div>
                  
                  <div className="process-step">
                    <div className="step-number">2</div>
                    <h5 className="step-title">Get Approved</h5>
                    <p className="step-description">Quick approval process within 24 hours</p>
                  </div>
                  
                  <div className="process-step">
                    <div className="step-number">3</div>
                    <h5 className="step-title">Pay & Drive</h5>
                    <p className="step-description">Pay security deposit + 1st month, drive home today</p>
                  </div>
                </div>
              </div>

              {/* Condition Notes */}
              {vehicle.condition_notes && (
                <div className="pdf-full-section">
                  <h4 className="pdf-card-title">Vehicle Condition Notes</h4>
                  <div className="condition-notes-content">
                    <p>{vehicle.condition_notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GALLERY: All Images (like additional PDF pages) */}
          {activePage === 'gallery' && (
            <div className="pdf-content-wrapper">
              {images.length > 0 ? (
                <div className="gallery-grid">
                  {images.map((image, idx) => (
                    <div 
                      key={idx} 
                      className="gallery-item"
                      onClick={() => {
                        setCurrentImage(idx);
                        setActivePage('page1');
                      }}
                    >
                      <img src={image} alt={`${vehicleName} - Image ${idx + 1}`} />
                      <div className="gallery-overlay">
                        <span>View</span>
                      </div>
                      <div className="gallery-number">{idx + 1}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>📷</div>
                  <p style={{ color: 'var(--silver)' }}>No images available for this vehicle</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA Button - Always Visible */}
        <div className="modal-cta-section">
          <button onClick={onInquire} className="modal-cta">
            ENQUIRE ABOUT THIS VEHICLE
          </button>
        </div>
      </div>
    </div>
  );
}

