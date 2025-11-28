'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Icon from '@/components/modules/leasing/Icon';
import ShowroomHeader from '../components/ShowroomHeader';
import '../showroom.css';

interface Car {
  id: string;
  stock_number: string;
  model_year: number;
  vehicle_model: string;
  model_family: string | null;
  colour: string;
  interior_colour: string | null;
  advertised_price_aed: number;
  monthly_0_down_aed: number | null;
  monthly_20_down_aed: number | null;
  current_mileage_km: number | null;
  regional_specification: string | null;
  engine: string | null;
  transmission: string | null;
  horsepower_hp: number | null;
  torque_nm: number | null;
  body_style: string | null;
  key_equipment: string | null;
  description: string | null;
  current_warranty: string | null;
  current_service: string | null;
  status: string;
  sale_status: string;
  website_url: string | null;
}

interface MediaItem {
  id: string;
  url: string;
  kind: string;
  is_primary: boolean;
  sort_order: number;
}

export default function CarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.carId as string;
  
  const [car, setCar] = useState<Car | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>('specs');

  useEffect(() => {
    fetchCar();
  }, [carId]);

  const fetchCar = async () => {
    try {
      // Fetch car details
      const { data: carData, error: carError } = await supabase
        .from('cars')
        .select('*')
        .eq('id', carId)
        .single();

      if (carError) throw carError;
      
      // Check if car is still available
      if (carData && (carData.status !== 'inventory' || carData.sale_status !== 'available')) {
        // Car no longer available - redirect to inventory
        router.push('/uv/showroom');
        return;
      }
      
      setCar(carData);

      // Fetch car media - order by sort_order to match inventory system
      const { data: mediaData, error: mediaError } = await supabase
        .from('car_media')
        .select('*')
        .eq('car_id', carId)
        .eq('kind', 'photo')
        .order('sort_order', { ascending: true });

      if (!mediaError && mediaData) {
        setMedia(mediaData);
      }
      
      // Track ViewContent event for Facebook Pixel
      if (carData && typeof window !== 'undefined' && window.fbq) {
        // Clean vehicle name for tracking
        const rawModelName = carData.vehicle_model || '';
        const isAMGModel = rawModelName.toLowerCase().startsWith('mercedes-amg');
        const cleanModelName = rawModelName.replace(/^Mercedes-Benz\s*/i, '').replace(/^Mercedes-AMG\s*/i, '').trim();
        const trackingBrand = isAMGModel ? 'Mercedes-AMG' : 'Mercedes-Benz';
        const vehicleName = `${carData.model_year} ${trackingBrand} ${cleanModelName}`.trim();
        const contentId = carData.stock_number || carData.id;
        const pixelData = {
          content_ids: [contentId],
          content_type: 'product',
          content_name: vehicleName,
          content_category: 'vehicles',
          value: carData.advertised_price_aed || 0,
          currency: 'AED',
          contents: [{
            id: contentId,
            quantity: 1,
            item_price: carData.advertised_price_aed || 0
          }]
        };
        
        window.fbq('track', 'ViewContent', pixelData);
      }
    } catch (error) {
      console.error('Error fetching car:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newSection = expandedSection === section ? null : section;
    setExpandedSection(newSection);
    
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

  if (!car) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <div style={{ color: 'var(--silver)', fontSize: '24px' }}>Vehicle not found</div>
        <button 
          onClick={() => router.push('/uv/showroom')}
          className="hero-cta"
        >
          Back to Inventory
        </button>
      </div>
    );
  }

  const images = media.length > 0 ? media.map(m => m.url) : ['/MAIN LOGO.png'];
  
  // Smart vehicle naming - avoid "Mercedes-Benz Mercedes-AMG" duplication
  // If model already starts with Mercedes-AMG, just use that
  // Otherwise, clean any Mercedes prefix and we'll add the brand in display
  const rawModel = car.vehicle_model || '';
  const isAMG = rawModel.toLowerCase().startsWith('mercedes-amg');
  const cleanModel = rawModel
    .replace(/^Mercedes-Benz\s*/i, '')
    .replace(/^Mercedes-AMG\s*/i, '')
    .trim();
  // vehicleName will be just the model (e.g., "G63") - brand is added in title
  const vehicleName = isAMG ? `AMG ${cleanModel}` : cleanModel;
  const brandName = isAMG ? 'MERCEDES-AMG' : 'MERCEDES-BENZ';
  
  const exteriorColor = car.colour;
  const interiorColor = car.interior_colour;
  const mileage = car.current_mileage_km;

  return (
    <div className="vehicle-detail-page">
      {/* Fixed Header with Hamburger Menu */}
      <ShowroomHeader showBackButton={true} />

      {/* Back to Inventory Breadcrumb (Mobile) */}
      <div className="mobile-breadcrumb">
        <button onClick={() => router.push('/uv/showroom')} className="breadcrumb-link">
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

            {/* Thumbnail Slider */}
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
          {/* Vehicle Title & Key Info */}
          <div className="vehicle-header-section">
            <h1 className="vehicle-title">
              {car.model_year} {brandName} {cleanModel.toUpperCase()}
            </h1>
            
            {/* Availability Badges */}
            <div className="availability-badges">
              <div className="badge-item primary">
                <span>Available Now</span>
              </div>
              <div className="badge-item">
                <Icon name="shield-alt" size={14} variant="gold" />
                <span>Inspected</span>
              </div>
              <div className="badge-item">
                <Icon name="cogs" size={14} variant="gold" />
                <span>Fully Serviced</span>
              </div>
            </div>
            
            <div className="vehicle-price-section">
              <div className="price-main">
                <Icon name="dirham" size={24} variant="gold" />
                {car.advertised_price_aed?.toLocaleString() || 'N/A'}
              </div>
              <div className="price-label">Cash Price</div>
              
              {(car.monthly_0_down_aed || car.monthly_20_down_aed) && (
                <div className="price-breakdown">
                  {car.monthly_0_down_aed && (
                    <div className="breakdown-item">
                      <span className="breakdown-label">Finance (0% Down):</span>
                      <span className="breakdown-value">
                        <Icon name="dirham" size={16} variant="gold" />
                        {car.monthly_0_down_aed.toLocaleString()}/mo
                      </span>
                    </div>
                  )}
                  {car.monthly_20_down_aed && (
                    <div className="breakdown-item">
                      <span className="breakdown-label">Finance (20% Down):</span>
                      <span className="breakdown-value">
                        <Icon name="dirham" size={16} variant="gold" />
                        {car.monthly_20_down_aed.toLocaleString()}/mo
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Finance Info */}
            <div className="finance-info">
              <Icon name="card" size={16} variant="white" />
              <span>Bank Finance Available • Trade-In Welcome</span>
            </div>

            {/* Call & WhatsApp Buttons */}
            <div className="cta-buttons-grid">
              <a 
                href="tel:+971561742746" 
                className="cta-button call-button"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.stopPropagation();
                  
                  // Track Lead event for Facebook Pixel
                  if (typeof window !== 'undefined' && window.fbq) {
                    const contentId = car.stock_number || car.id;
                    window.fbq('track', 'Lead', {
                      content_ids: [contentId],
                      content_type: 'product',
                      content_name: vehicleName,
                      content_category: 'vehicles',
                      value: car.advertised_price_aed || 0,
                      currency: 'AED'
                    });
                  }
                  
                  window.dataLayer = window.dataLayer || [];
                  window.dataLayer.push({
                    event: 'uv_phone_click',
                    page: 'vehicle_detail',
                    vehicle_id: car.id,
                    vehicle_name: vehicleName
                  });
                }}
              >
                <Icon name="phone-alt" size={18} variant="dark" />
                <span>Call Us</span>
              </a>
              <a 
                href={`https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20am%20interested%20in%20the%20${encodeURIComponent(car.model_year + ' ' + car.vehicle_model)}%20(Stock%20%23${encodeURIComponent(car.stock_number || '')})`}
                className="cta-button whatsapp-button" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.stopPropagation();
                  
                  // Track Lead event for Facebook Pixel
                  if (typeof window !== 'undefined' && window.fbq) {
                    const contentId = car.stock_number || car.id;
                    window.fbq('track', 'Lead', {
                      content_ids: [contentId],
                      content_type: 'product',
                      content_name: vehicleName,
                      content_category: 'vehicles',
                      value: car.advertised_price_aed || 0,
                      currency: 'AED'
                    });
                  }
                  
                  window.dataLayer = window.dataLayer || [];
                  window.dataLayer.push({
                    event: 'uv_whatsapp_click',
                    page: 'vehicle_detail',
                    vehicle_id: car.id,
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
                  {car.body_style && (
                    <div className="spec-item-styled">
                      <div className="spec-content">
                        <span className="spec-label-styled">Body Style</span>
                        <span className="spec-value-styled">{car.body_style}</span>
                    </div>
                    </div>
                  )}
                  {car.engine && (
                    <div className="spec-item-styled">
                      <div className="spec-content">
                        <span className="spec-label-styled">Engine</span>
                        <span className="spec-value-styled">{car.engine}</span>
                      </div>
                    </div>
                  )}
                  {car.transmission && (
                    <div className="spec-item-styled">
                      <div className="spec-content">
                        <span className="spec-label-styled">Transmission</span>
                        <span className="spec-value-styled">{car.transmission}</span>
                      </div>
                    </div>
                  )}
                  {car.regional_specification && (
                    <div className="spec-item-styled">
                      <div className="spec-content">
                        <span className="spec-label-styled">Specification</span>
                        <span className="spec-value-styled">{car.regional_specification}</span>
                      </div>
                    </div>
                  )}
                  {car.horsepower_hp && (
                    <div className="spec-item-styled">
                      <div className="spec-content">
                        <span className="spec-label-styled">Horsepower</span>
                        <span className="spec-value-styled">{car.horsepower_hp} HP</span>
                      </div>
                    </div>
                  )}
                    </div>
                
                {car.key_equipment && (
                  <div className="key-equipment-section">
                    <h4 className="key-equipment-title">KEY EQUIPMENT</h4>
                    <div className="key-equipment-content">
                      {car.key_equipment}
                    </div>
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
                      <Icon name="shield-alt" size={28} />
                    </div>
                    <h5 className="benefit-title">150-Point Inspection</h5>
                    <p className="benefit-description">Comprehensive quality check</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon-wrapper-white">
                      <Icon name="cogs" size={28} />
                    </div>
                    <h5 className="benefit-title">Fully Serviced</h5>
                    <p className="benefit-description">Ready for the road</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon-wrapper-white">
                      <Icon name="file-contract" size={28} />
                    </div>
                    <h5 className="benefit-title">Complete History</h5>
                    <p className="benefit-description">Full service records provided</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon-wrapper-white">
                      <Icon name="car" size={28} />
                    </div>
                    <h5 className="benefit-title">Test Drive</h5>
                    <p className="benefit-description">Schedule your test drive today</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon-wrapper-white">
                      <Icon name="card" size={28} />
                    </div>
                    <h5 className="benefit-title">Finance Available</h5>
                    <p className="benefit-description">Competitive bank finance rates</p>
                  </div>
                  
                  <div className="benefit-card">
                    <div className="benefit-icon-wrapper-white">
                      <Icon name="handshake" size={28} />
                    </div>
                    <h5 className="benefit-title">Trade-In Welcome</h5>
                    <p className="benefit-description">Fair market valuations</p>
                  </div>
                </div>
              </div>
            </div>
            )}
            </div>

            {/* How to Buy Section */}
            <div className="accordion-section" data-section="getstarted">
          <button 
              className={`accordion-header ${expandedSection === 'getstarted' ? 'expanded' : ''}`}
              onClick={() => toggleSection('getstarted')}
          >
              <h3>HOW TO BUY</h3>
              <span className="accordion-icon">{expandedSection === 'getstarted' ? '−' : '+'}</span>
          </button>
            {expandedSection === 'getstarted' && (
            <div className="accordion-content">
                <div className="getting-started-timeline">
                  <div className="gs-step">
                    <div className="gs-number">1</div>
                    <div className="gs-content">
                      <h5 className="gs-title">View & Test Drive</h5>
                      <p className="gs-description">Visit our showroom and take a test drive</p>
                    </div>
                  </div>
                  
                  <div className="gs-connector">
                    <div className="gs-line"></div>
                    <div className="gs-arrow">→</div>
                  </div>
                  
                  <div className="gs-step">
                    <div className="gs-number">2</div>
                    <div className="gs-content">
                      <h5 className="gs-title">Choose Payment</h5>
                      <p className="gs-description">Cash, bank finance, or trade-in</p>
                  </div>
                </div>

                  <div className="gs-connector">
                    <div className="gs-line"></div>
                    <div className="gs-arrow">→</div>
                  </div>
                  
                  <div className="gs-step">
                    <div className="gs-number">3</div>
                    <div className="gs-content">
                      <h5 className="gs-title">Drive Home</h5>
                      <p className="gs-description">Complete paperwork and collect your car</p>
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
              
              // Track Lead event for Facebook Pixel
              if (typeof window !== 'undefined' && window.fbq) {
                const contentId = car.stock_number || car.id;
                window.fbq('track', 'Lead', {
                  content_ids: [contentId],
                  content_type: 'product',
                  content_name: vehicleName,
                  content_category: 'vehicles',
                  value: car.advertised_price_aed || 0,
                  currency: 'AED'
                });
              }
              
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                event: 'uv_phone_click',
                page: 'vehicle_detail',
                location: 'footer',
                vehicle_id: car.id,
                vehicle_name: vehicleName
              });
            }}
          >
            <Icon name="phone" size={20} variant="gold" />
            <span>Call Us</span>
          </a>
          <a 
            href={`https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20am%20interested%20in%20the%20${encodeURIComponent(car.model_year + ' ' + car.vehicle_model)}%20(Stock%20%23${encodeURIComponent(car.stock_number || '')})`}
            className="footer-action-btn" 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.stopPropagation();
              
              // Track Lead event for Facebook Pixel
              if (typeof window !== 'undefined' && window.fbq) {
                const contentId = car.stock_number || car.id;
                window.fbq('track', 'Lead', {
                  content_ids: [contentId],
                  content_type: 'product',
                  content_name: vehicleName,
                  content_category: 'vehicles',
                  value: car.advertised_price_aed || 0,
                  currency: 'AED'
                });
              }
              
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                event: 'uv_whatsapp_click',
                page: 'vehicle_detail',
                location: 'footer',
                vehicle_id: car.id,
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

