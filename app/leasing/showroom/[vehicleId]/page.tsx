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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
      <div className="vehicle-detail-loading">
        <div style={{ color: 'var(--silver)' }}>Loading vehicle details...</div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="vehicle-detail-loading">
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

  // Calculate monthly payment (if needed)
  const monthlyPayment = vehicle.monthly_lease_rate 
    ? `Or AED ${Math.round(vehicle.monthly_lease_rate / 30)} p/m`
    : '';

  return (
    <div className="vehicle-detail-page">
      {/* Split Layout Container */}
      <div className="vehicle-detail-container">
        
        {/* LEFT: Image Gallery */}
        <div className="vehicle-gallery-side">
          {/* Main Image */}
          <div className="main-vehicle-image">
            <img 
              src={images[currentImage]} 
              alt={vehicleName}
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImage(currentImage === 0 ? images.length - 1 : currentImage - 1)}
                  className="gallery-nav-arrow left"
                >
                  ‹
                </button>
                <button
                  onClick={() => setCurrentImage(currentImage === images.length - 1 ? 0 : currentImage + 1)}
                  className="gallery-nav-arrow right"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Grid */}
          {images.length > 1 && (
            <div className="thumbnail-gallery-grid">
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  className={`thumbnail-gallery-item ${idx === currentImage ? 'active' : ''}`}
                  onClick={() => setCurrentImage(idx)}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Info Panel */}
        <div className="vehicle-info-side">
          {/* Back Button */}
          <button 
            className="back-button"
            onClick={() => router.push('/leasing/showroom')}
          >
            ← SHOWROOM
          </button>

          {/* Vehicle Title */}
          <h1 className="vehicle-detail-title">
            {vehicle.model_year} {vehicleName}
          </h1>

          {/* Price */}
          <div className="vehicle-price-section">
            <div className="vehicle-main-price">
              AED {vehicle.monthly_lease_rate?.toLocaleString() || 'N/A'}
            </div>
            {monthlyPayment && (
              <div className="vehicle-monthly-price">{monthlyPayment}</div>
            )}
          </div>

          {/* Quick Specs Grid */}
          <div className="quick-specs-grid">
            <div className="quick-spec-item">
              <Icon name="calendar" size={20} variant="gold" />
              <div>
                <div className="spec-label-small">Year</div>
                <div className="spec-value-small">{vehicle.model_year}</div>
              </div>
            </div>

            {(mileage !== null && mileage !== undefined && mileage > 0) && (
              <div className="quick-spec-item">
                <Icon name="car" size={20} variant="gold" />
                <div>
                  <div className="spec-label-small">Mileage</div>
                  <div className="spec-value-small">{mileage.toLocaleString()} km</div>
                </div>
              </div>
            )}

            {vehicle.transmission && (
              <div className="quick-spec-item">
                <Icon name="cogs" size={20} variant="gold" />
                <div>
                  <div className="spec-label-small">Transmission</div>
                  <div className="spec-value-small">{vehicle.transmission}</div>
                </div>
              </div>
            )}

            {exteriorColor && (
              <div className="quick-spec-item">
                <Icon name="star" size={20} variant="gold" />
                <div>
                  <div className="spec-label-small">Exterior Color</div>
                  <div className="spec-value-small">{exteriorColor}</div>
                </div>
              </div>
            )}

            {vehicle.body_style && (
              <div className="quick-spec-item">
                <Icon name="car" size={20} variant="gold" />
                <div>
                  <div className="spec-label-small">Body Style</div>
                  <div className="spec-value-small">{vehicle.body_style}</div>
                </div>
              </div>
            )}

            {interiorColor && (
              <div className="quick-spec-item">
                <Icon name="star" size={20} variant="gold" />
                <div>
                  <div className="spec-label-small">Interior Color</div>
                  <div className="spec-value-small">{interiorColor}</div>
                </div>
              </div>
            )}

            {vehicle.warranty_expiry_date && (
              <div className="quick-spec-item">
                <Icon name="shield-alt" size={20} variant="gold" />
                <div>
                  <div className="spec-label-small">Warranty</div>
                  <div className="spec-value-small">{new Date(vehicle.warranty_expiry_date).toLocaleDateString()}</div>
                </div>
              </div>
            )}

            {vehicle.registration_date && (
              <div className="quick-spec-item">
                <Icon name="file-contract" size={20} variant="gold" />
                <div>
                  <div className="spec-label-small">Registration</div>
                  <div className="spec-value-small">{new Date(vehicle.registration_date).toLocaleDateString()}</div>
                </div>
              </div>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="cta-buttons-grid">
            <a 
              href="https://wa.me/97143805515" 
              target="_blank" 
              rel="noopener noreferrer"
              className="cta-button whatsapp"
            >
              <Icon name="whatsapp" size={18} />
              WHATSAPP US
            </a>
            <a 
              href="tel:+971561742746"
              className="cta-button phone"
            >
              <Icon name="phone" size={18} />
              CALL US
            </a>
          </div>

          {/* Accordion Sections */}
          <div className="accordion-sections">
            
            {/* Pricing */}
            <div className="accordion-section">
              <button 
                className={`accordion-header ${expandedSection === 'pricing' ? 'expanded' : ''}`}
                onClick={() => toggleSection('pricing')}
              >
                <h3>PRICING</h3>
                <span className="accordion-icon">{expandedSection === 'pricing' ? '∧' : '∨'}</span>
              </button>
              {expandedSection === 'pricing' && (
                <div className="accordion-content">
                  <div className="accordion-spec-grid">
                    <div className="accordion-spec-item">
                      <span>Monthly Lease</span>
                      <span>AED {vehicle.monthly_lease_rate?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="accordion-spec-item">
                      <span>Security Deposit</span>
                      <span>AED {vehicle.security_deposit?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="accordion-spec-item">
                      <span>Buyout Price</span>
                      <span>AED {vehicle.buyout_price?.toLocaleString() || 'N/A'}</span>
                    </div>
                    {vehicle.lease_term_months && (
                      <div className="accordion-spec-item">
                        <span>Lease Term</span>
                        <span>{vehicle.lease_term_months} months</span>
                      </div>
                    )}
                    {vehicle.max_mileage_per_year && (
                      <div className="accordion-spec-item">
                        <span>Max Mileage/Year</span>
                        <span>{vehicle.max_mileage_per_year.toLocaleString()} km</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Technical Data */}
            <div className="accordion-section">
              <button 
                className={`accordion-header ${expandedSection === 'technical' ? 'expanded' : ''}`}
                onClick={() => toggleSection('technical')}
              >
                <h3>TECHNICAL DATA</h3>
                <span className="accordion-icon">{expandedSection === 'technical' ? '∧' : '∨'}</span>
              </button>
              {expandedSection === 'technical' && (
                <div className="accordion-content">
                  <div className="accordion-spec-grid">
                    {vehicle.engine_type && (
                      <div className="accordion-spec-item">
                        <span>Engine</span>
                        <span>{vehicle.engine_type}</span>
                      </div>
                    )}
                    {vehicle.transmission && (
                      <div className="accordion-spec-item">
                        <span>Transmission</span>
                        <span>{vehicle.transmission}</span>
                      </div>
                    )}
                    {vehicle.body_style && (
                      <div className="accordion-spec-item">
                        <span>Body Style</span>
                        <span>{vehicle.body_style}</span>
                      </div>
                    )}
                    {vehicle.chassis_number && (
                      <div className="accordion-spec-item">
                        <span>Chassis Number</span>
                        <span>{vehicle.chassis_number}</span>
                      </div>
                    )}
                    {vehicle.engine_number && (
                      <div className="accordion-spec-item">
                        <span>Engine Number</span>
                        <span>{vehicle.engine_number}</span>
                      </div>
                    )}
                    {vehicle.plate_number && (
                      <div className="accordion-spec-item">
                        <span>Plate Number</span>
                        <span>{vehicle.plate_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Key Equipment / What's Included */}
            <div className="accordion-section">
              <button 
                className={`accordion-header ${expandedSection === 'included' ? 'expanded' : ''}`}
                onClick={() => toggleSection('included')}
              >
                <h3>WHAT'S INCLUDED</h3>
                <span className="accordion-icon">{expandedSection === 'included' ? '∧' : '∨'}</span>
              </button>
              {expandedSection === 'included' && (
                <div className="accordion-content">
                  <ul className="equipment-list">
                    <li>Zero down payment required</li>
                    <li>Pay security deposit + first month to drive home</li>
                    <li>Comprehensive insurance included</li>
                    <li>Registration included</li>
                    <li>Routine servicing and maintenance covered</li>
                    <li>12-month lease term</li>
                    <li>Lease-to-own option available</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
