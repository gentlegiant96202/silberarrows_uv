'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Icon from '@/components/modules/leasing/Icon';
import ShowroomHeader from './components/ShowroomHeader';
import './showroom.css';

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
  body_style: string | null;
  key_equipment: string | null;
  description: string | null;
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


export default function UVShowroomPage() {
  const router = useRouter();
  const [cars, setCars] = useState<Car[]>([]);
  const [carMedia, setCarMedia] = useState<Record<string, MediaItem[]>>({});
  const [loading, setLoading] = useState(true);

  // Fetch cars
  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    try {
      // Fetch available cars from inventory
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('*')
        .eq('status', 'inventory')
        .eq('sale_status', 'available')
        .order('created_at', { ascending: false });

      if (carsError) {
        throw carsError;
      }

      setCars(carsData || []);

      // Fetch media for all cars
      if (carsData && carsData.length > 0) {
        const carIds = carsData.map(car => car.id);
        const { data: mediaData, error: mediaError } = await supabase
          .from('car_media')
          .select('*')
          .in('car_id', carIds)
          .eq('kind', 'image')
          .order('sort_order', { ascending: true });

        if (!mediaError && mediaData) {
          // Group media by car_id
          const mediaByCarId: Record<string, MediaItem[]> = {};
          mediaData.forEach((item: any) => {
            if (!mediaByCarId[item.car_id]) {
              mediaByCarId[item.car_id] = [];
            }
            mediaByCarId[item.car_id].push(item);
          });
          setCarMedia(mediaByCarId);
        }
      }
    } catch (error) {
      console.error('Error fetching cars:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get primary image for a car
  const getCarImage = (carId: string): string => {
    const media = carMedia[carId];
    if (!media || media.length === 0) return '/MAIN LOGO.png';
    const primaryImage = media.find(m => m.is_primary);
    return primaryImage?.url || media[0]?.url || '/MAIN LOGO.png';
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
          cars={cars}
          loading={loading}
          getCarImage={getCarImage}
          onCarClick={(car: Car) => router.push(`/uv/showroom/${car.id}`)}
        />

        {/* Why Buy With Us */}
        <WhyBuySection />

        {/* Contact Section */}
        <ContactSection />
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}

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
        <div className="hero-tagline">Premium Pre-Owned Mercedes-Benz</div>
        <h1 className="hero-title">
          MERCEDES-BENZ<br />
          <span>USED CARS</span><br />
          IN DUBAI
        </h1>
        <p className="hero-subtitle">
          Discover our handpicked selection of certified pre-owned<br />
          Mercedes-Benz vehicles. Every car inspected, serviced,<br />
          and ready for the road.
        </p>

        <div className="hero-highlights">
          <div className="highlight-item">
            <Icon name="shield-alt" size={16} variant="silver" />
            <span>Multi-Point Inspection</span>
          </div>
          <div className="highlight-item">
            <Icon name="check-circle" size={16} variant="silver" />
            <span>Full Service History</span>
        </div>
          <div className="highlight-item">
            <Icon name="card" size={16} variant="silver" />
            <span>Finance Available</span>
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
            <span>VIEW OUR INVENTORY</span>
          </button>
        </div>

        <div className="year-badge">
          <Icon name="medal" size={20} />
          Dubai&apos;s Trusted Pre-Owned Specialists Since 2020
        </div>
      </div>
    </section>
  );
}

// Why Buy Section
function WhyBuySection() {
  const features = [
    {
      icon: 'shield-alt',
      title: 'MULTI-POINT INSPECTION',
      description: 'Every vehicle undergoes a comprehensive 150-point inspection before sale.'
    },
    {
      icon: 'cogs',
      title: 'FULLY SERVICED',
      description: 'All cars are fully serviced with genuine Mercedes-Benz parts.'
    },
    {
      icon: 'file-contract',
      title: 'COMPLETE HISTORY',
      description: 'Full service history and vehicle documentation provided.'
    },
    {
      icon: 'card',
      title: 'FINANCE OPTIONS',
      description: 'Flexible bank finance available with competitive rates.'
    },
    {
      icon: 'handshake',
      title: 'TRADE-IN WELCOME',
      description: 'We accept trade-ins and offer fair market valuations.'
    },
    {
      icon: 'star',
      title: 'WARRANTY AVAILABLE',
      description: 'Extended warranty options for added peace of mind.'
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
          <h2>WHY BUY WITH US?</h2>
          <p>
            Experience premium pre-owned Mercedes-Benz with complete transparency,
            comprehensive inspections, and exceptional after-sales service.
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
function VehiclesSection({ cars, loading, getCarImage, onCarClick }: any) {
  return (
    <section className="vehicles-section" id="vehicles">
      <div className="section-header">
        <h2>
          AVAILABLE VEHICLES<span className="mobile-break"><br /></span>
          <span className="desktop-dash"> - </span>FOR SALE
          </h2>
        <p>Discover our curated collection of premium pre-owned Mercedes-Benz vehicles</p>
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
      ) : cars.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚗</div>
          <h3 style={{ fontSize: '24px', color: 'var(--silver)', marginBottom: '10px' }}>No Vehicles Available</h3>
          <p style={{ color: 'var(--silver)' }}>Check back soon for new inventory</p>
          </div>
      ) : (
        <div className="vehicles-grid">
          {cars.map((car: Car) => (
            <div 
              key={car.id} 
              className="vehicle-card"
              onClick={() => onCarClick(car)}
            >
              <img 
                src={getCarImage(car.id)} 
                alt={`${car.model_year} Mercedes-Benz ${car.vehicle_model}`}
                className="vehicle-image"
              />
              <div className="vehicle-content">
                <h3>{car.model_year} {car.vehicle_model}</h3>
                <div className="vehicle-meta">
                  {car.colour && (
                    <span className="vehicle-badge">{car.colour}</span>
                  )}
                  {car.current_mileage_km && (
                    <span style={{ color: 'var(--silver)', fontSize: '12px' }}>
                      {car.current_mileage_km.toLocaleString()} km
                    </span>
                  )}
          </div>
                <div className="vehicle-price">
                  AED {car.advertised_price_aed?.toLocaleString() || 'N/A'}
          </div>
                <div className="vehicle-price-label">Cash Price</div>
                {car.monthly_0_down_aed && (
                  <div className="vehicle-finance">
                    From AED {car.monthly_0_down_aed.toLocaleString()}/mo
                  </div>
                )}
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
      event: 'uv_phone_click',
      page: 'showroom_landing'
    });
  };

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'uv_whatsapp_click',
      page: 'showroom_landing'
    });
  };

  return (
    <section className="contact-section" id="contact">
      <div className="section-header">
        <h2>CONTACT US</h2>
        <p>Get in touch with Dubai&apos;s trusted pre-owned specialists</p>
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
            <p>Quick enquiries</p>
            <div className="card-action">
              <a href="https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20am%20interested%20in%20your%20used%20cars%21" className="action-link" target="_blank" rel="noopener noreferrer" onClick={handleWhatsAppClick}>
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
            <h4>VISIT OUR SHOWROOM</h4>
            <p>
              Al Manara Street, Al Quoz<br />
              Dubai, United Arab Emirates
            </p>
            <p className="email-line">
              <Icon name="mail" size={14} variant="gold" />
              <span>sales@silberarrows.com</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Fixed Footer Component
function Footer() {
  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'uv_phone_click',
      page: 'showroom_landing',
      location: 'footer'
    });
  };

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'uv_whatsapp_click',
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
        <a href="https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20am%20interested%20in%20your%20used%20cars%21" className="footer-action-btn" target="_blank" rel="noopener noreferrer" onClick={handleWhatsAppClick}>
          <Icon name="whatsapp" size={20} variant="gold" />
          <span>WhatsApp</span>
        </a>
      </div>
    </footer>
  );
}

