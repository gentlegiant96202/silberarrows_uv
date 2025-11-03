'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Icon from '@/components/modules/leasing/Icon';
import '../showroom.css';

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

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.vehicleId as string;
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>('images');

  useEffect(() => {
    fetchVehicle();
  }, [vehicleId]);

  const fetchVehicle = async () => {
    try {
      const { data, error } = await supabase
        .from('leasing_inventory')
        .select('*')
        .eq('id', vehicleId)
        .single();

      if (error) throw error;
      setVehicle(data);
    } catch (error) {
      console.error('Error fetching vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--silver)' }}>Loading vehicle details...</div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <div style={{ color: 'var(--silver)', fontSize: '24px' }}>Vehicle not found</div>
        <button 
          onClick={() => router.push('/leasing/showroom')}
          className="hero-cta"
        >
          Back to Showroom
        </button>
      </div>
    );
  }

  const photoUrls = vehicle.photos?.map(photo => photo.url) || [];
  const images = photoUrls.length > 0 ? photoUrls : ['/MAIN LOGO.png'];
  const vehicleName = `${vehicle.make} ${vehicle.vehicle_model || vehicle.model_family || ''}`.trim();
  const exteriorColor = vehicle.colour;
  const interiorColor = vehicle.interior_colour;
  const mileage = vehicle.current_mileage_km;

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingTop: '80px' }}>
      {/* Fixed Header */}
      <div className="showroom-header">
        <header>
          <div className="header-inner">
            <div className="header-logo">
              <img 
                src="/assets/icons/logo.svg" 
                alt="SilberArrows" 
                width={160} 
                height={54}
                style={{ cursor: 'pointer' }}
                onClick={() => router.push('/leasing/showroom')}
              />
            </div>
            <nav className="header-nav">
              <a onClick={() => router.push('/leasing/showroom')}>← Back to Showroom</a>
            </nav>
            <div className="header-contact-info">
              <div className="phone-line">
                <Icon name="phone" size={12} variant="gold" />
                <a href="tel:+971561742746" style={{ color: 'inherit', textDecoration: 'none' }}>
                  +971 56 174 2746
                </a>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Two Column Layout */}
      <section style={{ width: '92%', margin: '20px auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Image Gallery */}
        <div className="gallery-column">
          <div className="pdf-full-section">
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

          {/* All Gallery Images - if more than 5 */}
          {images.length > 5 && (
            <div className="gallery-grid" style={{ marginTop: '20px' }}>
              {images.map((image, idx) => (
                <div 
                  key={idx} 
                  className="gallery-item"
                  onClick={() => setCurrentImage(idx)}
                >
                  <img src={image} alt={`${vehicleName} - Image ${idx + 1}`} />
                  <div className="gallery-number">{idx + 1}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Vehicle Title + Accordion Tabs */}
        <div className="info-column">
          {/* Vehicle Title */}
          <div style={{ marginBottom: '30px' }}>
            <h1 className="hero-title" style={{ fontSize: '38px', marginBottom: '10px', textAlign: 'left' }}>
              {vehicle.model_year} {vehicleName}
            </h1>
            <p style={{ color: 'var(--silver)', fontSize: '13px', textAlign: 'left' }}>
              Stock: {vehicle.stock_number} {vehicle.chassis_number && `• Chassis: ${vehicle.chassis_number}`}
            </p>
          </div>

          {/* Accordion Sections */}
          <div>
            {/* Specifications Section */}
            <div className="accordion-section">
          <button 
            className={`accordion-header ${expandedSection === 'specs' ? 'expanded' : ''}`}
            onClick={() => toggleSection('specs')}
          >
            <h3>SPECIFICATIONS</h3>
            <span className="accordion-icon">{expandedSection === 'specs' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'specs' && (
            <div className="accordion-content">
              <div className="pdf-full-section">
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
            </div>

            {/* Pricing Section */}
            <div className="accordion-section">
          <button 
            className={`accordion-header ${expandedSection === 'pricing' ? 'expanded' : ''}`}
            onClick={() => toggleSection('pricing')}
          >
            <h3>PRICING</h3>
            <span className="accordion-icon">{expandedSection === 'pricing' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'pricing' && (
            <div className="accordion-content">
              <div className="pdf-pricing-section">
                <h4 className="pricing-header">LEASE PRICING</h4>
                
                <div className="main-price-box">
                  <div className="main-price-label">Monthly Lease Payment</div>
                  <div className="main-price-value">
                    AED {vehicle.monthly_lease_rate?.toLocaleString() || 'N/A'}
                  </div>
                  <div className="price-note">*Plus applicable taxes and fees</div>
                </div>

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
            </div>
            )}
            </div>

            {/* What's Included Section */}
            <div className="accordion-section">
          <button 
            className={`accordion-header ${expandedSection === 'included' ? 'expanded' : ''}`}
            onClick={() => toggleSection('included')}
          >
            <h3>WHAT'S INCLUDED</h3>
            <span className="accordion-icon">{expandedSection === 'included' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'included' && (
            <div className="accordion-content">
              <div className="pdf-full-section">
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

              <div className="pdf-full-section" style={{ marginTop: '20px' }}>
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
            </div>
            )}
            </div>

            {/* Contact/Enquire Section */}
            <div className="accordion-section">
          <button 
            className={`accordion-header ${expandedSection === 'contact' ? 'expanded' : ''}`}
            onClick={() => toggleSection('contact')}
          >
            <h3>ENQUIRE ABOUT THIS VEHICLE</h3>
            <span className="accordion-icon">{expandedSection === 'contact' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'contact' && (
            <div className="accordion-content">
              <div className="contact-grid">
                <div className="contact-card phone-card">
                  <div className="card-icon">
                    <Icon name="phone-alt" size={24} variant="gold" />
                  </div>
                  <h3>Call Us Today</h3>
                  <p>For immediate assistance</p>
                  <div className="card-action">
                    <a href="tel:+971561742746" className="action-link">
                      <Icon name="phone-alt" size={16} variant="gold" />
                      +971 56 174 2746
                    </a>
                  </div>
                </div>

                <div className="contact-card whatsapp-card">
                  <div className="card-icon">
                    <Icon name="whatsapp" size={24} variant="gold" />
                  </div>
                  <h3>WhatsApp</h3>
                  <p>Quick leasing enquiries</p>
                  <div className="card-action">
                    <a href="https://wa.me/97143805515" className="action-link" target="_blank" rel="noopener noreferrer">
                      <Icon name="whatsapp" size={16} variant="gold" />
                      Start Chat
                    </a>
                  </div>
                </div>
              </div>
            </div>
            )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" style={{ marginTop: '60px' }}>
        <div className="footer-content">
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} SilberArrows Leasing. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

