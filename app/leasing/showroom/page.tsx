'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Icon from '@/components/modules/leasing/Icon';
import VehicleModal from '@/components/modules/leasing/VehicleModal';
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

interface InquiryFormData {
  name: string;
  email: string;
  countryCode: string;
  phone: string;
  interested_vehicle_id?: string;
  notes?: string;
}

export default function ShowroomPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

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

  const handleInquiry = async (formData: InquiryFormData) => {
    try {
      const { error } = await supabase
        .from('leasing_customers')
        .insert([{
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          selected_vehicle_id: formData.interested_vehicle_id,
          lease_term_months: 12,
          notes: formData.notes || `Inquiry from public showroom${selectedVehicle ? ` - Interested in ${selectedVehicle.model_year} ${selectedVehicle.make} ${selectedVehicle.model_family || selectedVehicle.vehicle_model || ''}` : ''}`,
          lease_status: 'prospects',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;

      setFormSubmitted(true);
      setTimeout(() => {
        setShowInquiryForm(false);
        setSelectedVehicle(null);
        setFormSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      alert('Failed to submit inquiry. Please try again or contact us directly.');
    }
  };

  return (
    <>
      {/* Header */}
      <ShowroomHeader />

      {/* Main Content */}
      <main style={{ paddingTop: '80px' }}>
      {/* Hero Section */}
        <HeroSection />

        {/* Available Vehicles */}
        <VehiclesSection 
          vehicles={vehicles}
          loading={loading}
          onVehicleClick={setSelectedVehicle}
        />

        {/* Why Lease With Us */}
        <WhyLeaseSection />

        {/* Contact Section */}
        <ContactSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <VehicleModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onInquire={() => {
            setShowInquiryForm(true);
          }}
        />
      )}

      {/* Inquiry Form Modal */}
      {showInquiryForm && (
        <InquiryFormModal
          vehicle={selectedVehicle}
          onClose={() => {
            setShowInquiryForm(false);
            setSelectedVehicle(null);
          }}
          onSubmit={handleInquiry}
          submitted={formSubmitted}
        />
      )}
    </>
  );
}

// Header Component
function ShowroomHeader() {
  return (
    <div className="showroom-header">
      <header>
        <div className="header-inner">
          <div className="header-logo">
            <img src="/assets/icons/logo.svg" alt="SilberArrows" width={160} height={54} />
          </div>
          <div className="header-right">
            <nav className="header-nav">
              <a href="/">HOME</a>
              <a href="#vehicles">VEHICLES</a>
              <a href="#contact">CONTACT</a>
            </nav>
            <div className="header-contact-info">
              <div className="address-line">
                <Icon name="location-dot" size={12} variant="gold" />
                <span>Al Manara St, Al Quoz, Dubai</span>
              </div>
            <div className="phone-line">
              <Icon name="phone" size={12} variant="gold" />
              <a href="tel:+971561742746" style={{ color: 'inherit', textDecoration: 'none' }}>
                +971 56 174 2746
              </a>
      </div>
        </div>
          </div>
        </div>
      </header>
    </div>
  );
}

// Hero Section Component
function HeroSection() {
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    // Preload the hero image
    const img = new Image();
    img.onload = () => {
      setHeroLoaded(true);
    };
    img.src = '/assets/images/hero-bg-silver-optimized.avif';
  }, []);

  return (
    <section className={`hero${heroLoaded ? ' hero-loaded' : ''}`}>
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
        <div className="hero-tagline">Exclusive Automotive Excellence</div>
        <h1 className="hero-title">
          PREMIUM<br />
          <span>VEHICLE LEASING</span><br />
          IN DUBAI
        </h1>
        <p className="hero-subtitle">
          Flexible leasing solutions for Mercedes-Benz vehicles.<br />
          Experience the freedom of driving your dream car<br />
          with transparent pricing and exceptional service.
        </p>

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
        <h2>AVAILABLE VEHICLES - LEASE-TO-OWN</h2>
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

// Footer Component
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-grid">
          {/* Logo & Description */}
          <div className="footer-section">
            <div className="footer-logo">
              <img src="/assets/icons/logo.svg" alt="SilberArrows" />
            </div>
            <h3>SILBERARROWS LEASING</h3>
            <p>Premium car leasing solutions tailored to your lifestyle</p>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h4>QUICK LINKS</h4>
            <div className="footer-links">
              <a href="#vehicles">Available Vehicles</a>
              <a href="#contact">Contact Us</a>
            </div>
          </div>

          {/* Contact */}
          <div className="footer-section">
            <h4>CONTACT</h4>
            <div className="footer-contact">
              <a href="tel:+971561742746">
                <Icon name="phone" size={14} variant="gold" />
                +971 56 174 2746
              </a>
              <a href="mailto:lease@silberarrows.com">
                <Icon name="mail" size={14} variant="gold" />
                lease@silberarrows.com
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} SilberArrows Leasing. All rights reserved.</p>
      </div>
    </div>
    </footer>
  );
}

// Inquiry Form Modal
function InquiryFormModal({ vehicle, onClose, onSubmit, submitted }: { vehicle: Vehicle | null; onClose: () => void; onSubmit: (data: InquiryFormData) => void; submitted: boolean }) {
  const [formData, setFormData] = useState<InquiryFormData>({
    name: '',
    email: '',
    countryCode: '+971',
    phone: '',
    interested_vehicle_id: vehicle?.id,
    notes: ''
  });
  
  const vehicleName = vehicle ? `${vehicle.model_year} ${vehicle.make} ${vehicle.vehicle_model || vehicle.model_family || ''}`.trim() : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Combine country code and phone number
    const fullPhoneNumber = `${formData.countryCode}${formData.phone}`;
    onSubmit({
      ...formData,
      phone: fullPhoneNumber
    });
  };

  if (submitted) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content success-modal" onClick={(e) => e.stopPropagation()}>
          <div className="success-content">
            <div className="success-icon">
              <Icon name="check" size={40} variant="dark" />
          </div>
            <h2>THANK YOU!</h2>
            <p>We&apos;ve received your inquiry and will contact you within 24 hours.</p>
            <button onClick={onClose} className="modal-cta">
            Close
          </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>GET A QUOTE</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
        {vehicle && (
            <div className="selected-vehicle">
              <div className="vehicle-label">Interested in:</div>
              <div className="vehicle-name">{vehicleName}</div>
          </div>
        )}

          <form onSubmit={handleSubmit} className="inquiry-form">
            <div className="form-group">
              <label>Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your full name"
            />
          </div>

            <div className="form-group">
              <label>Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
            />
          </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={formData.countryCode}
                  onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                  style={{ width: '120px' }}
                >
                  <option value="+971">+971 (UAE)</option>
                  <option value="+1">+1 (USA)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+91">+91 (India)</option>
                  <option value="+92">+92 (Pakistan)</option>
                  <option value="+20">+20 (Egypt)</option>
                  <option value="+966">+966 (KSA)</option>
                  <option value="+974">+974 (Qatar)</option>
                  <option value="+973">+973 (Bahrain)</option>
                  <option value="+968">+968 (Oman)</option>
                  <option value="+965">+965 (Kuwait)</option>
                </select>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="XX XXX XXXX"
                  style={{ flex: 1 }}
            />
          </div>
          </div>

            <div className="form-group">
              <label>Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Tell us about your specific requirements..."
            />
          </div>

            <button type="submit" className="modal-cta">
            SUBMIT ENQUIRY
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
