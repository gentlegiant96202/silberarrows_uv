'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Icon from '@/components/modules/leasing/Icon';
import ShowroomHeader from '../components/ShowroomHeader';
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
  key_equipment?: string;
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
      
      // Push ViewContent event to dataLayer for Facebook Pixel (via GTM)
      if (data) {
        const vehicleName = `${data.model_year} ${data.make} ${data.vehicle_model || data.model_family || ''}`.trim();
        
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'view_content',
          ecommerce: {
            items: [{
              item_id: data.stock_number || data.id, // Use stock_number (must match FB catalog)
              item_name: vehicleName,
              item_brand: data.make,
              item_category: 'Vehicles',
              item_category2: data.model_family || data.vehicle_model,
              price: data.monthly_lease_rate || 0,
              quantity: 1
            }]
          },
          // Facebook Pixel specific parameters
          content_ids: [data.stock_number || data.id],
          content_type: 'product',
          content_name: vehicleName,
          content_category: 'vehicles',
          value: data.monthly_lease_rate || 0,
          currency: 'AED'
        });
      }
    } catch (error) {
      console.error('Error fetching vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newSection = expandedSection === section ? null : section;
    setExpandedSection(newSection);
    
    // Scroll accordion into view when opened
    if (newSection) {
      setTimeout(() => {
        const element = document.querySelector(`[data-section="${section}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
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
    <div className="vehicle-detail-page">
      {/* Fixed Header with Hamburger Menu */}
      <ShowroomHeader showBackButton={true} />

      {/* Back to Showroom Breadcrumb (Mobile) */}
      <div className="mobile-breadcrumb">
        <button onClick={() => router.push('/leasing/showroom')} className="breadcrumb-link">
          ← AVAILABLE VEHICLES
        </button>
      </div>

      {/* Two Column Layout (Responsive) */}
      <section className="vehicle-detail-content">
        
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
                  <div className="image-counter">
                    {currentImage + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Slider - Single Row (Mobile & Desktop) */}
            {images.length > 1 && (
              <div className="thumbnail-slider-container">
                <button
                  onClick={() => document.querySelector('.thumbnail-slider')?.scrollBy({ left: -300, behavior: 'smooth' })}
                  className="thumbnail-nav-arrow left"
                  aria-label="Scroll left"
                >
                  <Icon name="directions" size={20} flip />
                </button>
                
                <div className="thumbnail-slider">
                {images.map((img, idx) => (
                  <div 
                    key={idx} 
                      className={`thumbnail-item ${idx === currentImage ? 'active' : ''}`}
                    onClick={() => setCurrentImage(idx)}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} />
                  </div>
                ))}
              </div>

                <button
                  onClick={() => document.querySelector('.thumbnail-slider')?.scrollBy({ left: 300, behavior: 'smooth' })}
                  className="thumbnail-nav-arrow right"
                  aria-label="Scroll right"
                >
                  <Icon name="directions" size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Vehicle Title + Accordion Tabs */}
        <div className="info-column">
          {/* Vehicle Title & Key Info - Mobile First Layout */}
          <div className="vehicle-header-section">
            <h1 className="vehicle-title">
              {vehicle.model_year} {vehicleName.toUpperCase()}
            </h1>
            
            {/* Availability & Trust Badges - Refactored */}
            <div className="availability-badges">
              <div className="badge-item primary pulse-badge">
                <span>Zero Down Payment</span>
              </div>
              <div className="badge-item">
                <Icon name="shield-alt" size={14} variant="gold" />
                <span>Insurance Included</span>
              </div>
              <div className="badge-item">
                <Icon name="ban" size={14} variant="gold" />
                <span>No Bank Finance</span>
              </div>
            </div>
            
            <div className="vehicle-price-section">
              <div className="price-main">
                <Icon name="dirham" size={24} variant="gold" />
                {vehicle.monthly_lease_rate?.toLocaleString() || 'N/A'}
              </div>
              <div className="price-label">per month</div>
              <div className="price-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">Refundable Security Deposit:</span>
                  <span className="breakdown-value">
                    <Icon name="dirham" size={16} variant="gold" />
                    {vehicle.security_deposit?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">First Payment:</span>
                  <span className="breakdown-value">
                    <Icon name="dirham" size={16} variant="gold" />
                    {vehicle.monthly_lease_rate?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div className="breakdown-item total">
                  <span className="breakdown-label">Drive Home Today:</span>
                  <span className="breakdown-value">
                    <Icon name="dirham" size={18} variant="gold" />
                    {((vehicle.security_deposit || 0) + (vehicle.monthly_lease_rate || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Approval Note */}
            <div className="quick-approval-note">
              <Icon name="zap" size={16} variant="white" />
              <span>30-Minute Approval • No Credit Check Required</span>
            </div>

            {/* Call & WhatsApp Buttons */}
            <div className="cta-buttons-grid">
              <a 
                href="tel:+971561742746" 
                className="cta-button call-button"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.stopPropagation();
                  window.dataLayer = window.dataLayer || [];
                  window.dataLayer.push({
                    event: 'add_to_cart', // Facebook AddToCart event
                    ecommerce: {
                      items: [{
                        item_id: vehicle.stock_number || vehicle.id,
                        item_name: vehicleName,
                        item_brand: vehicle.make,
                        item_category: 'Vehicles',
                        item_category2: vehicle.model_family || vehicle.vehicle_model,
                        price: vehicle.monthly_lease_rate || 0,
                        quantity: 1
                      }]
                    },
                    // Facebook Pixel specific parameters
                    content_ids: [vehicle.stock_number || vehicle.id],
                    content_type: 'product',
                    content_name: vehicleName,
                    content_category: 'vehicles',
                    value: vehicle.monthly_lease_rate || 0,
                    currency: 'AED',
                    // Custom tracking parameters
                    interaction_type: 'phone_call',
                    page: 'vehicle_detail'
                  });
                  
                  // Also push legacy tracking event
                  window.dataLayer.push({
                    event: 'leasing_phone_click',
                    page: 'vehicle_detail',
                    vehicle_id: vehicle.id,
                    vehicle_name: vehicleName
                  });
                }}
              >
                <Icon name="phone-alt" size={18} variant="dark" />
                <span>Call Us</span>
              </a>
              <a 
                href="https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20am%20interested%20in%20your%20Lease-to-Own%20Offers%21" 
                className="cta-button whatsapp-button" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.stopPropagation();
                  window.dataLayer = window.dataLayer || [];
                  window.dataLayer.push({
                    event: 'add_to_cart', // Facebook AddToCart event
                    ecommerce: {
                      items: [{
                        item_id: vehicle.stock_number || vehicle.id,
                        item_name: vehicleName,
                        item_brand: vehicle.make,
                        item_category: 'Vehicles',
                        item_category2: vehicle.model_family || vehicle.vehicle_model,
                        price: vehicle.monthly_lease_rate || 0,
                        quantity: 1
                      }]
                    },
                    // Facebook Pixel specific parameters
                    content_ids: [vehicle.stock_number || vehicle.id],
                    content_type: 'product',
                    content_name: vehicleName,
                    content_category: 'vehicles',
                    value: vehicle.monthly_lease_rate || 0,
                    currency: 'AED',
                    // Custom tracking parameters
                    interaction_type: 'whatsapp',
                    page: 'vehicle_detail'
                  });
                  
                  // Also push legacy tracking event
                  window.dataLayer.push({
                    event: 'leasing_whatsapp_click',
                    page: 'vehicle_detail',
                    vehicle_id: vehicle.id,
                    vehicle_name: vehicleName
                  });
                }}
              >
                <Icon name="whatsapp" size={18} variant="dark" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Accordion Sections */}
          <div>
            {/* Specifications Section */}
            <div className="accordion-section" data-section="specs">
          <button 
            className={`accordion-header ${expandedSection === 'specs' ? 'expanded' : ''}`}
            onClick={() => toggleSection('specs')}
          >
            <h3>SPECIFICATIONS</h3>
            <span className="accordion-icon">{expandedSection === 'specs' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'specs' && (
            <div className="accordion-content">
              <div className="specs-styled-section">
                <div className="specs-grid-styled">
                  {exteriorColor && (
                    <div className="spec-item-styled">
                      <div className="spec-content">
                        <span className="spec-label-styled">Exterior Color</span>
                        <span className="spec-value-styled">{exteriorColor}</span>
                      </div>
                    </div>
                  )}
                  {interiorColor && (
                    <div className="spec-item-styled">
                      <div className="spec-content">
                        <span className="spec-label-styled">Interior Color</span>
                        <span className="spec-value-styled">{interiorColor}</span>
                    </div>
                    </div>
                  )}
                  {(mileage !== null && mileage !== undefined) && (
                    <div className="spec-item-styled">
                      <div className="spec-content">
                        <span className="spec-label-styled">Mileage</span>
                        <span className="spec-value-styled">{mileage.toLocaleString()} km</span>
                    </div>
                    </div>
                  )}
                  {vehicle.body_style && (
                    <div className="spec-item-styled">
                      <div className="spec-content">
                        <span className="spec-label-styled">Body Style</span>
                        <span className="spec-value-styled">{vehicle.body_style}</span>
                    </div>
                    </div>
                  )}
                    </div>
                
                {vehicle.key_equipment && (
                  <div className="key-equipment-section">
                    <h4 className="key-equipment-title">KEY EQUIPMENT</h4>
                    <div className="key-equipment-content">
                      {vehicle.key_equipment}
                    </div>
                    </div>
                  )}
              </div>
            </div>
            )}
            </div>

            {/* HOW IT WORKS */}
            <div className="accordion-section" data-section="pricing">
          <button 
            className={`accordion-header ${expandedSection === 'pricing' ? 'expanded' : ''}`}
            onClick={() => toggleSection('pricing')}
          >
            <h3>HOW IT WORKS</h3>
            <span className="accordion-icon">{expandedSection === 'pricing' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'pricing' && (
            <div className="accordion-content">
              <div className="how-it-works-section">
                <h4 className="hiw-header">LEASE-TO-OWN YOUR MERCEDES-BENZ</h4>
                
                {/* Storyline Timeline */}
                <div className="storyline-timeline">
                  <div className="story-step step-1">
                    <div className="story-number">1</div>
                    <div className="story-content">
                      <h5 className="story-title">Start Your Journey Today</h5>
                      <div className="story-detail">
                        <span className="detail-label">Refundable Security Deposit:</span>
                        <span className="detail-value">AED {vehicle.security_deposit?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="story-detail">
                        <span className="detail-label">Monthly Payment:</span>
                        <span className="detail-value">AED {vehicle.monthly_lease_rate?.toLocaleString() || 'N/A'}</span>
                  </div>
                      <div className="story-detail">
                        <span className="detail-label">Lease Duration:</span>
                        <span className="detail-value">{vehicle.lease_term_months || 12} months</span>
                </div>
                      <p className="story-note">Security deposit returned at lease end</p>
                    </div>
                  </div>

                  <div className="story-divider">
                    <div className="divider-line"></div>
                    <div className="divider-icon">↓</div>
                  </div>

                  <div className="story-step step-2">
                    <div className="story-number">2</div>
                    <div className="story-content">
                      <h5 className="story-title">After {vehicle.lease_term_months || 12} Months - Your Choice</h5>
                      <div className="options-grid">
                        <div className="option-box purchase">
                          <div className="option-header">
                            <Icon name="key" size={20} variant="white" />
                            <span className="option-title">Option A: Own It</span>
                          </div>
                          <div className="option-price">AED {vehicle.buyout_price?.toLocaleString() || 'N/A'}</div>
                          <p className="option-note">Bank Finance or Cash Payment</p>
                        </div>
                        <div className="option-box return">
                          <div className="option-header">
                            <Icon name="undo" size={20} variant="white" />
                            <span className="option-title">Option B: Return</span>
                          </div>
                          <div className="option-price">Commitment-Free</div>
                          <p className="option-note">Simply return the vehicle - no obligation</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Savings Highlight */}
                {vehicle.current_market_value && vehicle.buyout_price && vehicle.current_market_value > vehicle.buyout_price && (
                  <div className="savings-highlight">
                    <Icon name="check-circle" size={20} variant="gold" />
                    <span>Save AED {(vehicle.current_market_value - vehicle.buyout_price).toLocaleString()} when you buy after lease term</span>
                  </div>
                )}
              </div>
            </div>
            )}
            </div>

            {/* What's Included Section */}
            <div className="accordion-section" data-section="included">
          <button 
            className={`accordion-header ${expandedSection === 'included' ? 'expanded' : ''}`}
            onClick={() => toggleSection('included')}
          >
            <h3>WHAT'S INCLUDED</h3>
            <span className="accordion-icon">{expandedSection === 'included' ? '−' : '+'}</span>
          </button>
          {expandedSection === 'included' && (
            <div className="accordion-content">
              <div className="benefits-container">
                <div className="benefits-grid-two-col">
                  <div className="benefit-card">
                    <div className="benefit-icon-wrapper-white">
                      <Icon name="dirham" size={28} />
                    </div>
                    <h5 className="benefit-title">Zero Down Payment</h5>
                    <p className="benefit-description">No upfront down payment required</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon-wrapper-white">
                      <Icon name="car" size={28} />
                    </div>
                    <h5 className="benefit-title">Quick Start</h5>
                    <p className="benefit-description">Pay security deposit + first month to drive home</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon-wrapper-white">
                      <Icon name="shield-alt" size={28} />
                    </div>
                    <h5 className="benefit-title">Insurance Included</h5>
                    <p className="benefit-description">Comprehensive insurance & registration included</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon-wrapper-white">
                      <Icon name="cogs" size={28} />
                    </div>
                    <h5 className="benefit-title">Service Included</h5>
                    <p className="benefit-description">Routine service and maintenance covered</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon-wrapper-white">
                      <Icon name="calendar" size={28} />
                    </div>
                    <h5 className="benefit-title">12-Month Term</h5>
                    <p className="benefit-description">Standard 12 month lease period</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon-wrapper-white">
                      <Icon name="key" size={28} />
                    </div>
                    <h5 className="benefit-title">Lease-to-Own</h5>
                    <p className="benefit-description">Option to purchase at end of lease term</p>
                  </div>
                </div>
              </div>
            </div>
            )}
            </div>

            {/* How to Get Started Section */}
            <div className="accordion-section" data-section="getstarted">
          <button 
              className={`accordion-header ${expandedSection === 'getstarted' ? 'expanded' : ''}`}
              onClick={() => toggleSection('getstarted')}
          >
              <h3>HOW TO GET STARTED</h3>
              <span className="accordion-icon">{expandedSection === 'getstarted' ? '−' : '+'}</span>
          </button>
            {expandedSection === 'getstarted' && (
            <div className="accordion-content">
                <div className="getting-started-timeline">
                  <div className="gs-step">
                    <div className="gs-number">1</div>
                    <div className="gs-content">
                      <h5 className="gs-title">Choose Your Vehicle</h5>
                      <p className="gs-description">Select from our premium Mercedes-Benz fleet</p>
                    </div>
                  </div>
                  
                  <div className="gs-connector">
                    <div className="gs-line"></div>
                    <div className="gs-arrow">→</div>
                  </div>
                  
                  <div className="gs-step">
                    <div className="gs-number">2</div>
                    <div className="gs-content">
                      <h5 className="gs-title">Get Approved</h5>
                      <p className="gs-description">30-minute approval process</p>
                  </div>
                </div>

                  <div className="gs-connector">
                    <div className="gs-line"></div>
                    <div className="gs-arrow">→</div>
                  </div>
                  
                  <div className="gs-step">
                    <div className="gs-number">3</div>
                    <div className="gs-content">
                      <h5 className="gs-title">Pay & Drive</h5>
                      <p className="gs-description">Pay security deposit + 1st month, drive home today</p>
                  </div>
                </div>
              </div>
            </div>
            )}
            </div>
          </div>
        </div>
      </section>

      {/* Fixed Footer */}
      <footer className="fixed-footer">
        <div className="fixed-footer-content">
          <a 
            href="tel:+971561742746" 
            className="footer-action-btn"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.stopPropagation();
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                event: 'add_to_cart',
                ecommerce: {
                  items: [{
                    item_id: vehicle.stock_number || vehicle.id,
                    item_name: vehicleName,
                    item_brand: vehicle.make,
                    item_category: 'Vehicles',
                    item_category2: vehicle.model_family || vehicle.vehicle_model,
                    price: vehicle.monthly_lease_rate || 0,
                    quantity: 1
                  }]
                },
                content_ids: [vehicle.stock_number || vehicle.id],
                content_type: 'product',
                content_name: vehicleName,
                content_category: 'vehicles',
                value: vehicle.monthly_lease_rate || 0,
                currency: 'AED',
                interaction_type: 'phone_call',
                page: 'vehicle_detail',
                location: 'footer'
              });
              
              window.dataLayer.push({
                event: 'leasing_phone_click',
                page: 'vehicle_detail',
                location: 'footer',
                vehicle_id: vehicle.id,
                vehicle_name: vehicleName
              });
            }}
          >
            <Icon name="phone" size={20} variant="gold" />
            <span>Call Us</span>
          </a>
          <a 
            href="https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20am%20interested%20in%20your%20Lease-to-Own%20Offers%21" 
            className="footer-action-btn" 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.stopPropagation();
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                event: 'add_to_cart',
                ecommerce: {
                  items: [{
                    item_id: vehicle.stock_number || vehicle.id,
                    item_name: vehicleName,
                    item_brand: vehicle.make,
                    item_category: 'Vehicles',
                    item_category2: vehicle.model_family || vehicle.vehicle_model,
                    price: vehicle.monthly_lease_rate || 0,
                    quantity: 1
                  }]
                },
                content_ids: [vehicle.stock_number || vehicle.id],
                content_type: 'product',
                content_name: vehicleName,
                content_category: 'vehicles',
                value: vehicle.monthly_lease_rate || 0,
                currency: 'AED',
                interaction_type: 'whatsapp',
                page: 'vehicle_detail',
                location: 'footer'
              });
              
              window.dataLayer.push({
                event: 'leasing_whatsapp_click',
                page: 'vehicle_detail',
                location: 'footer',
                vehicle_id: vehicle.id,
                vehicle_name: vehicleName
              });
            }}
          >
            <Icon name="whatsapp" size={20} variant="gold" />
            <span>WhatsApp</span>
          </a>
        </div>
      </footer>
    </div>
  );
}

