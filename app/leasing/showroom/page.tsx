'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Icon from '@/components/modules/leasing/Icon';
import ShowroomHeader from './components/ShowroomHeader';
import './showroom.css';

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
  vehicle_photos?: string[];
  specifications?: any;
  status: string;
  created_at: string;
  // Compatibility with old field names
  model?: string;
  exterior_colour?: string;
  mileage?: number;
}


export default function ShowroomPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch vehicles
  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    console.log('🚗 Fetching inventory vehicles from leasing_inventory...');
    try {
      const { data, error } = await supabase
        .from('leasing_inventory')
        .select('*')
        .eq('status', 'inventory')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching vehicles:', error);
        throw error;
      }
      
      console.log('✅ Vehicles fetched:', data?.length || 0, 'inventory vehicles');
      console.log('📊 Vehicle data:', data);
      setVehicles(data || []);
    } catch (error) {
      console.error('❌ Exception fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      {/* Header */}
      <ShowroomHeader />

      {/* Main Content */}
      <main className="showroom-main">
      {/* Hero Section */}
        <HeroSection />

        {/* Available Vehicles */}
        <VehiclesSection 
          vehicles={vehicles}
          loading={loading}
          onVehicleClick={(vehicle: Vehicle) => router.push(`/leasing/showroom/${vehicle.id}`)}
        />

        {/* Why Lease With Us */}
        <WhyLeaseSection />

        {/* Contact Section */}
        <ContactSection />
      </main>

      {/* Footer */}
      <Footer />


    </>
  );
}

// Header Component is now imported from components/ShowroomHeader.tsx

// Hero Section Component
function HeroSection() {
  return (
    <section className="hero hero-loaded">
      <div className="hero-content">
        <div className="hero-logo">
          <img 
            src="/assets/icons/silberarrows-logo.png" 
            alt="SilberArrows Logo" 
            className="hero-logo-img" 
            width={300} 
            height={90} 
        />
      </div>
        <div className="hero-tagline">Drive Now, Own Later</div>
        <h1 className="hero-title">
          MERCEDES-BENZ<br />
          <span>LEASE-TO-OWN</span><br />
          IN DUBAI
        </h1>
        <p className="hero-subtitle">
          Flexible leasing solutions for Mercedes-Benz vehicles.<br />
          Experience the freedom of driving your dream car<br />
          with transparent pricing and exceptional service.
        </p>

        <div className="hero-highlights">
          <div className="highlight-item">
            <Icon name="x-circle" size={16} variant="white" />
            <span style={{ color: 'white' }}>No Downpayment Required</span>
          </div>
          <div className="highlight-item">
            <Icon name="check-circle" size={16} variant="silver" />
            <span>No Credit Checks</span>
        </div>
          <div className="highlight-item">
            <Icon name="card" size={16} variant="silver" />
            <span>Passport & Emirates ID Only</span>
          </div>
        </div>

        <div className="hero-cta-container">
          <button
            className="hero-cta"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('vehicles')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span>VIEW OUR VEHICLES</span>
          </button>
        </div>

        <div className="year-badge">
          <Icon name="medal" size={20} />
          Dubai&apos;s Premier Leasing Partner Since 2020
        </div>
      </div>
    </section>
  );
}

// Why Lease Section
function WhyLeaseSection() {
  const features = [
    {
      icon: 'star',
      title: 'PREMIUM FLEET',
      description: 'Access to luxury Mercedes-Benz vehicles maintained to the highest standards.'
    },
    {
      icon: 'dirham',
      title: 'ZERO DOWN PAYMENT',
      description: 'No upfront down payment required. Just pay security deposit and first month.'
    },
    {
      icon: 'shield-alt',
      title: 'INSURANCE & REGISTRATION',
      description: 'Comprehensive insurance and registration included in your lease.'
    },
    {
      icon: 'cogs',
      title: 'ROUTINE SERVICING',
      description: 'Regular maintenance and servicing included for peace of mind.'
    },
    {
      icon: 'file-contract',
      title: 'LEASE-TO-OWN OPTION',
      description: 'Option to purchase your vehicle at the end of the 12-month lease term.'
    },
    {
      icon: 'zap',
      title: 'QUICK APPROVAL',
      description: 'Fast processing and hassle-free approval within 24 hours.'
    }
  ];

  const featureColumns = [
    features.slice(0, 2),
    features.slice(2, 4),
    features.slice(4, 6)
  ];

    return (
    <section className="why-choose-us-section">
      <div className="why-choose-us-content">
        <div className="section-header">
          <h2>WHY LEASE WITH US?</h2>
          <p>
            Experience premium Mercedes-Benz leasing with zero down payment, all-inclusive packages,
            and exceptional service tailored to your lifestyle.
          </p>
        </div>
        <div className="features-columns">
          {featureColumns.map((column, columnIndex) => (
            <div key={columnIndex} className="feature-column">
              {column.map((feature, featureIndex) => (
                <div key={featureIndex} className="feature-card">
                  <div className="feature-icon">
                    <Icon name={feature.icon} size={22} variant="dark" />
                  </div>
                  <div className="feature-content">
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
    );
  }

// Vehicles Section
function VehiclesSection({ vehicles, loading, onVehicleClick }: any) {
  return (
    <section className="vehicles-section" id="vehicles">
      <div className="section-header">
        <h2>
          AVAILABLE VEHICLES<span className="mobile-break"><br /></span>
          <span className="desktop-dash"> - </span>LEASE-TO-OWN
          </h2>
        <p>Discover our curated collection of premium vehicles available for lease</p>
        </div>

      {loading ? (
        <div className="vehicles-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="vehicle-card" style={{ minHeight: '400px' }}>
              <div style={{ width: '100%', aspectRatio: '4/3', background: 'rgba(255,255,255,0.05)' }}></div>
              <div style={{ padding: '20px' }}>
                <div style={{ height: '20px', background: 'rgba(255,255,255,0.05)', marginBottom: '10px', borderRadius: '4px' }}></div>
                <div style={{ height: '16px', background: 'rgba(255,255,255,0.05)', marginBottom: '10px', borderRadius: '4px', width: '60%' }}></div>
          </div>
          </div>
          ))}
          </div>
      ) : vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚗</div>
          <h3 style={{ fontSize: '24px', color: 'var(--silver)', marginBottom: '10px' }}>No Vehicles Available</h3>
          <p style={{ color: 'var(--silver)' }}>Check back soon for new inventory</p>
          </div>
      ) : (
        <div className="vehicles-grid">
          {vehicles.map((vehicle: Vehicle) => (
            <div 
              key={vehicle.id} 
              className="vehicle-card"
              onClick={() => onVehicleClick(vehicle)}
            >
              <img 
                src={vehicle.photos?.[0]?.url || vehicle.vehicle_photos?.[0] || '/MAIN LOGO.png'} 
                alt={`${vehicle.model_year} ${vehicle.make}`}
                className="vehicle-image"
              />
              <div className="vehicle-content">
                <h3>{vehicle.model_year} {vehicle.make} {vehicle.vehicle_model || vehicle.model_family || ''}</h3>
                <div className="vehicle-meta">
                  {(vehicle.colour || vehicle.exterior_colour) && (
                    <span className="vehicle-badge">{vehicle.colour || vehicle.exterior_colour}</span>
                  )}
                  {(vehicle.current_mileage_km || vehicle.mileage) && (
                    <span style={{ color: 'var(--silver)', fontSize: '12px' }}>
                      {(vehicle.current_mileage_km || vehicle.mileage)?.toLocaleString()} km
                    </span>
                  )}
          </div>
                <div className="vehicle-price">
                  AED {vehicle.monthly_lease_rate?.toLocaleString() || 'N/A'}
          </div>
                <div className="vehicle-price-label">per month</div>
                <button className="vehicle-cta">View Details</button>
      </div>
    </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Contact Section
function ContactSection() {
  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'leasing_phone_click',
      page: 'showroom_landing'
    });
  };

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'leasing_whatsapp_click',
      page: 'showroom_landing'
    });
  };

  return (
    <section className="contact-section" id="contact">
      <div className="section-header">
        <h2>CONTACT US</h2>
        <p>Get in touch with Dubai&apos;s trusted leasing specialists</p>
        </div>

      <div className="contact-grid">
        <div className="contact-cards-grid">
          <div className="contact-card phone-card">
            <div className="card-icon">
              <Icon name="phone-alt" size={24} variant="gold" />
            </div>
            <h3>Call Us Today</h3>
            <p>For immediate assistance</p>
            <div className="card-action">
              <a href="tel:+971561742746" className="action-link" onClick={handlePhoneClick}>
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
              <a href="https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20am%20interested%20in%20your%20Lease-to-Own%20Offers%21" className="action-link" target="_blank" rel="noopener noreferrer" onClick={handleWhatsAppClick}>
                <Icon name="whatsapp" size={16} variant="gold" />
                Start Chat
              </a>
            </div>
          </div>
          </div>

        <div className="hours-card">
          <div className="hours-header">
            <Icon name="clock" size={20} variant="gold" />
            <h3>Working Hours</h3>
              </div>
          <div className="hours-grid">
            <div className="hours-item">
              <span className="day">Monday - Saturday</span>
              <span className="time">8:00 AM - 6:00 PM</span>
                </div>
            <div className="hours-item weekend">
              <span className="day">Sunday</span>
              <span className="time">Closed</span>
            </div>
          </div>

          <div className="visit-info">
            <h4>VISIT US</h4>
            <p>
              Al Manara Street, Al Quoz<br />
              Dubai, United Arab Emirates
            </p>
            <p className="email-line">
              <Icon name="mail" size={14} variant="gold" />
              <span>lease@silberarrows.com</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Fixed Footer Component (UK Style)
function Footer() {
  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'leasing_phone_click',
      page: 'showroom_landing',
      location: 'footer'
    });
  };

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'leasing_whatsapp_click',
      page: 'showroom_landing',
      location: 'footer'
    });
  };

  return (
    <footer className="fixed-footer">
      <div className="fixed-footer-content">
        <a href="tel:+971561742746" className="footer-action-btn" onClick={handlePhoneClick}>
          <Icon name="phone" size={20} variant="gold" />
          <span>Call Us</span>
        </a>
        <a href="https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20am%20interested%20in%20your%20Lease-to-Own%20Offers%21" className="footer-action-btn" target="_blank" rel="noopener noreferrer" onClick={handleWhatsAppClick}>
          <Icon name="whatsapp" size={20} variant="gold" />
          <span>WhatsApp</span>
        </a>
      </div>
    </footer>
  );
}