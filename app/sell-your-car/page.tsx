'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/modules/leasing/Icon';
import './sell-your-car.css';

interface PriceEstimate {
  status: string;
  input: {
    model: string;
    trim: string | null;
    year: number;
    mileage_km: number;
  };
  pricing: {
    offer_price: number;
    offer_range: {
      low: number;
      high: number;
    };
    market_value: number;
    margin_percent: number;
    confidence: string;
    comparable_listings: number;
    mileage_adjustment: number;
    specs_used: string;
  };
  consignment: {
    customer_receives: number;
    sale_price: number;
    commission_percent: number;
  };
  market_data: {
    avg_market_price: number;
    min_price: number;
    max_price: number;
    sample_years: number[];
    sample_trims: string[];
    specs_breakdown?: Record<string, number>;
  };
}

export default function SellYourCarPage() {
  // Form step state
  const [formStep, setFormStep] = useState(1);
  
  // Step 1: Contact details
  const [customerName, setCustomerName] = useState('');
  const [countryCode, setCountryCode] = useState('+971');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Step 2: Car details
  const [models, setModels] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState({ min_year: 2016, max_year: 2025 });
  
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedTrim, setSelectedTrim] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [mileage, setMileage] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingTrims, setLoadingTrims] = useState(false);
  const [result, setResult] = useState<PriceEstimate | null>(null);
  const [error, setError] = useState('');
  const [step1Error, setStep1Error] = useState('');

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    if (selectedModel) {
      fetchTrims(selectedModel);
      setSelectedTrim('');
      setResult(null);
    } else {
      setTrims([]);
    }
  }, [selectedModel]);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/mercedes-pricing/models');
      const data = await res.json();
      setModels(data.models || []);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  const fetchTrims = async (model: string) => {
    setLoadingTrims(true);
    try {
      const res = await fetch(`/api/mercedes-pricing/trims/${encodeURIComponent(model)}`);
      const data = await res.json();
      setTrims(data.trims || []);
      if (data.year_range) {
        setYearRange(data.year_range);
      }
    } catch (err) {
      console.error('Failed to fetch trims:', err);
    } finally {
      setLoadingTrims(false);
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error('');
    
    if (!customerName.trim()) {
      setStep1Error('Please enter your name');
      return;
    }
    
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 9) {
      setStep1Error('Please enter a valid phone number');
      return;
    }
    
    setFormStep(2);
    
    // Scroll to form
    setTimeout(() => {
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    
    if (!selectedModel || !selectedTrim || !selectedYear || !mileage) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      // Get price estimate
      const res = await fetch('/api/mercedes-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          year: parseInt(selectedYear),
          mileage: parseInt(mileage.replace(/,/g, '')),
          trim: selectedTrim
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        // Save lead even if pricing fails
        await saveLead(null);
        throw new Error(data.error || 'Failed to get price estimate');
      }
      
      // Save lead with pricing data
      await saveLead(data);
      
      setResult(data);
      
      setTimeout(() => {
        document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const saveLead = async (priceData: PriceEstimate | null) => {
    try {
      await fetch('/api/sell-your-car/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerName,
          phone: getFullPhone(),
          model: selectedModel,
          trim: selectedTrim,
          year: selectedYear,
          mileage: mileage.replace(/,/g, ''),
          offer_price: priceData?.pricing?.offer_price || null,
          market_value: priceData?.pricing?.market_value || null,
          confidence: priceData?.pricing?.confidence || null,
          specs_used: priceData?.pricing?.specs_used || null,
          consignment_price: priceData?.consignment?.customer_receives || null,
          consignment_commission: priceData?.consignment?.commission_percent || null
        })
      });
    } catch (err) {
      console.error('Failed to save lead:', err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AE').format(Math.round(price));
  };

  const formatMileage = (value: string) => {
    const num = value.replace(/\D/g, '');
    return num ? parseInt(num).toLocaleString() : '';
  };

  const formatPhone = (value: string) => {
    // Only allow numbers
    return value.replace(/\D/g, '').slice(0, 12);
  };

  const getFullPhone = () => {
    return `${countryCode}${customerPhone}`;
  };

  const formatCountryCode = (value: string) => {
    // Ensure it starts with + and only contains numbers after
    let formatted = value.replace(/[^\d+]/g, '');
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted.replace(/\+/g, '');
    }
    return formatted.slice(0, 5);
  };

  const generateYears = () => {
    const years = [];
    for (let y = yearRange.max_year; y >= yearRange.min_year; y--) {
      years.push(y);
    }
    return years;
  };

  // Format model name for display (remove "-Class" suffix)
  const formatModelName = (model: string) => {
    return model.replace(/-Class$/i, '').replace(/ Class$/i, '');
  };

  return (
    <>
      {/* Header */}
      <div className="showroom-header">
        <header>
          <div className="header-inner">
            <div className="header-logo">
              <img 
                src="/assets/icons/logo.svg" 
                alt="SilberArrows" 
                width={160} 
                height={54}
              />
            </div>
            <div className="header-right">
              <nav className="header-nav">
                <a href="#calculator">GET OFFER</a>
                <a href="#why-us">WHY US</a>
                <a href="#contact">CONTACT</a>
              </nav>
              <div className="header-contact-info">
                <div className="phone-line">
                  <Icon name="phone" size={12} variant="gold" />
                  <a href="tel:+971507779163" style={{ color: 'inherit', textDecoration: 'none' }}>
                    +971 50 777 9163
                  </a>
                </div>
              </div>
            </div>
            
            {/* Mobile CTA */}
            <a 
              href="#calculator" 
              className="mobile-cta-btn"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              GET OFFER
            </a>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="showroom-main">
        {/* Hero Section */}
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
            <div className="hero-tagline">Instant Cash Offers</div>
            <h1 className="hero-title">
              SELL YOUR<br />
              <span>MERCEDES-BENZ</span><br />
              TODAY
            </h1>
            <p className="hero-subtitle">
              Get an instant market valuation and cash offer<br />
              for your Mercedes-Benz. No obligations, no hidden fees.
            </p>

            <div className="hero-highlights">
              <div className="highlight-item">
                <Icon name="zap" size={16} variant="silver" />
                <span>Instant Valuation</span>
              </div>
              <div className="highlight-item">
                <Icon name="dirham" size={16} variant="silver" />
                <span>Same Day Payment</span>
              </div>
              <div className="highlight-item">
                <Icon name="shield-alt" size={16} variant="silver" />
                <span>Free Inspection</span>
              </div>
            </div>

            <div className="hero-cta-container">
              <button
                className="hero-cta"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>GET YOUR OFFER</span>
              </button>
            </div>

            <div className="year-badge">
              <Icon name="medal" size={20} />
              Dubai&apos;s Trusted Mercedes-Benz Buyers Since 2012
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="vehicles-section" id="calculator">
          <div className="section-header">
            <h2>{result ? "YOUR OFFERS" : "GET YOUR INSTANT OFFER"}</h2>
            <p>{result 
              ? `${result.input.year} Mercedes-Benz ${result.input.model} ${result.input.trim || ''} • ${formatPrice(result.input.mileage_km)} km`
              : formStep === 1 
                ? "Let's start with your contact details" 
                : "Now tell us about your vehicle"
            }</p>
          </div>

          {/* Step Indicator - hide when results shown */}
          {!result && (
            <div className="step-indicator">
              <div className={`step ${formStep >= 1 ? 'active' : ''} ${formStep > 1 ? 'completed' : ''}`}>
                <div className="step-number">
                  {formStep > 1 ? <Icon name="check" size={16} variant="dark" /> : '1'}
                </div>
                <span className="step-label">Your Details</span>
              </div>
              <div className="step-line"></div>
              <div className={`step ${formStep >= 2 ? 'active' : ''}`}>
                <div className="step-number">2</div>
                <span className="step-label">Vehicle Info</span>
              </div>
            </div>
          )}

          <div className="calculator-container">
            {/* Form Card - hide when results shown */}
            {!result && (
            <Card className="calculator-card">
              <CardContent className="pt-6">
                {/* Step 1: Contact Details */}
                {formStep === 1 && (
                  <form onSubmit={handleStep1Submit} className="calculator-form">
                    <div className="form-group">
                      <Label className="form-label">Your Name</Label>
                      <Input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter your full name"
                        className="form-input"
                        autoComplete="name"
                      />
                    </div>

                    <div className="form-group">
                      <Label className="form-label">WhatsApp Number</Label>
                      <div className="phone-input-group">
                        <Input
                          type="tel"
                          value={countryCode}
                          onChange={(e) => setCountryCode(formatCountryCode(e.target.value))}
                          className="form-input country-code-input"
                        />
                        <Input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                          placeholder="50 123 4567"
                          className="form-input phone-number-input"
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    {step1Error && (
                      <div className="form-error">
                        <Icon name="info-circle" size={16} variant="gold" />
                        <span>{step1Error}</span>
                      </div>
                    )}

                    <button type="submit" className="submit-btn">
                      <span>CONTINUE</span>
                      <Icon name="directions" size={18} variant="dark" />
                    </button>

                    <p className="privacy-note">
                      <Icon name="shield-alt" size={14} variant="silver" />
                      Your information is secure and will not be shared
                    </p>
                  </form>
                )}

                {/* Step 2: Vehicle Details */}
                {formStep === 2 && (
                  <form onSubmit={handleSubmit} className="calculator-form">
                    {/* Back Button */}
                    <button 
                      type="button" 
                      className="back-btn"
                      onClick={() => setFormStep(1)}
                    >
                      <Icon name="undo" size={14} variant="silver" />
                      <span>Back to contact details</span>
                    </button>

                    {/* Customer Summary */}
                    <div className="customer-summary">
                      <Icon name="check-circle" size={18} variant="gold" />
                      <span>Welcome, {customerName.split(' ')[0]}!</span>
                    </div>

                    {/* Model */}
                    <div className="form-group">
                      <Label className="form-label">Model</Label>
                      <Select 
                        value={selectedModel} 
                        onValueChange={setSelectedModel}
                        disabled={loadingModels}
                      >
                        <SelectTrigger className="form-select">
                          <SelectValue placeholder={loadingModels ? "Loading..." : "Select Model"} />
                        </SelectTrigger>
                        <SelectContent className="select-content">
                          {models.map(model => (
                            <SelectItem key={model} value={model} className="select-item">
                              {formatModelName(model)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Trim */}
                    <div className="form-group">
                      <Label className="form-label">Trim</Label>
                      <Select 
                        value={selectedTrim} 
                        onValueChange={setSelectedTrim}
                        disabled={!selectedModel || loadingTrims}
                      >
                        <SelectTrigger className="form-select">
                          <SelectValue placeholder={
                            loadingTrims ? "Loading..." : 
                            selectedModel ? "Select Trim" : 
                            "Select model first"
                          } />
                        </SelectTrigger>
                        <SelectContent className="select-content">
                          {trims.map(trim => (
                            <SelectItem key={trim} value={trim} className="select-item">
                              {trim}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Year and Mileage Row */}
                    <div className="form-row">
                      <div className="form-group">
                        <Label className="form-label">Year</Label>
                        <Select 
                          value={selectedYear} 
                          onValueChange={setSelectedYear}
                          disabled={!selectedModel}
                        >
                          <SelectTrigger className="form-select">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent className="select-content">
                            {generateYears().map(year => (
                              <SelectItem key={year} value={year.toString()} className="select-item">
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="form-group">
                        <Label className="form-label">Mileage (km)</Label>
                        <Input
                          type="text"
                          value={mileage}
                          onChange={(e) => setMileage(formatMileage(e.target.value))}
                          placeholder="e.g. 50,000"
                          className="form-input"
                        />
                      </div>
                    </div>

                    {/* Error Message with Fallback */}
                    {error && (
                      <div className="error-card">
                        <div className="error-icon">
                          <Icon name="info-circle" size={20} variant="gold" />
                        </div>
                        <div className="error-content">
                          <p className="error-title">Limited Market Data</p>
                          <p className="error-text">
                            We&apos;ve saved your details. Our team will contact you shortly with a personalized quote.
                          </p>
                        </div>
                        <div className="error-actions">
                          <a href="tel:+971507779163" className="error-btn">
                            <Icon name="phone" size={14} variant="gold" />
                            Call Now
                          </a>
                          <a 
                            href={`https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20am%20${encodeURIComponent(customerName)}%20and%20I%20would%20like%20a%20quote%20for%20my%20${encodeURIComponent(selectedYear + ' Mercedes-Benz ' + selectedModel + ' ' + selectedTrim)}%20with%20${encodeURIComponent(mileage)}km.%20My%20number%20is%20${encodeURIComponent(getFullPhone())}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="error-btn whatsapp"
                          >
                            <Icon name="whatsapp" size={14} variant="white" />
                            WhatsApp
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading || !selectedModel || !selectedTrim || !selectedYear || !mileage}
                      className="submit-btn"
                    >
                      {loading ? (
                        <span>Calculating...</span>
                      ) : (
                        <span>GET MY OFFER</span>
                      )}
                    </button>
                  </form>
                )}
              </CardContent>
            </Card>
            )}

            {/* Result Section */}
            {result && (
              <div id="result" className="result-container">
                {/* Get Another Quote Button */}
                <button 
                  className="back-btn result-back"
                  onClick={() => setResult(null)}
                >
                  <Icon name="undo" size={14} variant="silver" />
                  <span>Get another quote</span>
                </button>

                {/* Both Options Side by Side */}
                <div className="options-grid">
                  {/* Cash Option */}
                  <Card className="result-card option-card">
                    <CardContent className="pt-6 pb-6">
                      <div className="option-header">
                        <Icon name="zap" size={20} variant="gold" />
                        <span>INSTANT CASH</span>
                      </div>

                      <div className="option-price">
                        <p className="option-price-label">We pay you today</p>
                        <p className="option-price-value">AED {formatPrice(result.pricing.offer_price)}</p>
                      </div>

                      <div className="option-benefits">
                        <div className="benefit-item">
                          <Icon name="check" size={14} variant="gold" />
                          <span>Same day payment</span>
                        </div>
                        <div className="benefit-item">
                          <Icon name="check" size={14} variant="gold" />
                          <span>We handle paperwork</span>
                        </div>
                        <div className="benefit-item">
                          <Icon name="check" size={14} variant="gold" />
                          <span>Free inspection</span>
                        </div>
                      </div>

                      <a
                        href={`https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20am%20${encodeURIComponent(customerName)}%20and%20I%20would%20like%20the%20CASH%20offer%20for%20my%20${encodeURIComponent(result.input.year + ' Mercedes-Benz ' + result.input.model + ' ' + (result.input.trim || ''))}%20with%20${encodeURIComponent(formatPrice(result.input.mileage_km))}km.%20Your%20offer%20was%20AED%20${encodeURIComponent(formatPrice(result.pricing.offer_price))}.%20My%20number%20is%20${encodeURIComponent(getFullPhone())}.%20Please%20arrange%20inspection.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="option-cta"
                      >
                        <Icon name="whatsapp" size={18} variant="dark" />
                        <span>Accept Cash Offer</span>
                      </a>
                    </CardContent>
                  </Card>

                  {/* Consignment Option */}
                  <Card className="result-card option-card">
                    <CardContent className="pt-6 pb-6">
                      <div className="option-header">
                        <Icon name="handshake" size={20} variant="gold" />
                        <span>CONSIGNMENT</span>
                      </div>

                      <div className="option-price">
                        <p className="option-price-label">You receive when sold</p>
                        <p className="option-price-value">AED {formatPrice(result.consignment.customer_receives)}</p>
                        <p className="option-price-extra">+AED {formatPrice(result.consignment.customer_receives - result.pricing.offer_price)} more</p>
                      </div>

                      <div className="option-benefits">
                        <div className="benefit-item">
                          <Icon name="check" size={14} variant="gold" />
                          <span>Higher payout</span>
                        </div>
                        <div className="benefit-item">
                          <Icon name="check" size={14} variant="gold" />
                          <span>We market & sell</span>
                        </div>
                        <div className="benefit-item">
                          <Icon name="check" size={14} variant="gold" />
                          <span>Showroom display</span>
                        </div>
                      </div>

                      <a
                        href={`https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20am%20${encodeURIComponent(customerName)}%20and%20I%20am%20interested%20in%20CONSIGNMENT%20for%20my%20${encodeURIComponent(result.input.year + ' Mercedes-Benz ' + result.input.model + ' ' + (result.input.trim || ''))}%20with%20${encodeURIComponent(formatPrice(result.input.mileage_km))}km.%20Expected%20payout%20AED%20${encodeURIComponent(formatPrice(result.consignment.customer_receives))}.%20My%20number%20is%20${encodeURIComponent(getFullPhone())}.%20Please%20contact%20me.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="option-cta"
                      >
                        <Icon name="whatsapp" size={18} variant="dark" />
                        <span>Discuss Consignment</span>
                      </a>
                    </CardContent>
                  </Card>
                </div>

                {/* Trust Stats */}
                <div className="result-stats">
                  <div className="result-stat">
                    <p className="result-stat-value">2,000+</p>
                    <p className="result-stat-label">Cars Sold</p>
                  </div>
                  <div className="result-stat-divider"></div>
                  <div className="result-stat">
                    <p className="result-stat-value">Since 2012</p>
                    <p className="result-stat-label">Trusted in Dubai</p>
                  </div>
                  <div className="result-stat-divider"></div>
                  <div className="result-stat">
                    <p className="result-stat-value">4.9★</p>
                    <p className="result-stat-label">Rating</p>
                  </div>
                </div>

                {/* Call CTA */}
                <a href="tel:+971507779163" className="result-cta-secondary standalone">
                  <Icon name="phone" size={18} variant="gold" />
                  <span>Questions? Call +971 50 777 9163</span>
                </a>

                {/* Fine Print */}
                <p className="result-disclaimer">
                  *Cash offer subject to vehicle inspection. Consignment payout depends on final sale price.
                  Both options available for vehicles in good condition with clear title.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Why Sell With Us */}
        <section className="why-choose-us-section" id="why-us">
          <div className="why-choose-us-content">
            <div className="section-header">
              <h2>WHY SELL WITH US?</h2>
              <p>Skip the hassle of private sales. Get a fair price with zero stress.</p>
            </div>
            <div className="features-columns">
              <div className="feature-column">
                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon name="chart-line" size={22} variant="dark" />
                  </div>
                  <div className="feature-content">
                    <h3>FAIR MARKET PRICE</h3>
                    <p>Our pricing is based on real market data from thousands of listings.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon name="zap" size={22} variant="dark" />
                  </div>
                  <div className="feature-content">
                    <h3>INSTANT PAYMENT</h3>
                    <p>Get paid the same day. No waiting, no financing delays.</p>
                  </div>
                </div>
              </div>
              <div className="feature-column">
                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon name="shield-alt" size={22} variant="dark" />
                  </div>
                  <div className="feature-content">
                    <h3>FREE INSPECTION</h3>
                    <p>Our experts inspect your car at your location. No hidden fees.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon name="handshake" size={22} variant="dark" />
                  </div>
                  <div className="feature-content">
                    <h3>NO HAGGLING</h3>
                    <p>Our offer is our best price. No back-and-forth negotiation.</p>
                  </div>
                </div>
              </div>
              <div className="feature-column">
                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon name="car" size={22} variant="dark" />
                  </div>
                  <div className="feature-content">
                    <h3>WE HANDLE EVERYTHING</h3>
                    <p>Transfer, paperwork, and registration - we take care of it all.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon name="clock" size={22} variant="dark" />
                  </div>
                  <div className="feature-content">
                    <h3>24-HOUR PROCESS</h3>
                    <p>From valuation to payment, the entire process takes less than a day.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="contact-section" id="contact">
          <div className="section-header">
            <h2>CONTACT US</h2>
            <p>Get in touch with Dubai&apos;s trusted Mercedes-Benz buyers</p>
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
                  <a href="tel:+971507779163" className="action-link">
                    <Icon name="phone-alt" size={16} variant="gold" />
                    +971 50 777 9163
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
                  <a 
                    href="https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20would%20like%20to%20sell%20my%20Mercedes-Benz" 
                    className="action-link" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
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
                  <span>sales@silberarrows.com</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Fixed Footer */}
      <footer className="fixed-footer">
        <div className="fixed-footer-content">
          <a href="tel:+971507779163" className="footer-action-btn">
            <Icon name="phone" size={20} variant="gold" />
            <span>Call Us</span>
          </a>
          <a 
            href="https://wa.me/97143805515?text=Hi%20Team%20SilberArrows%2C%20I%20would%20like%20to%20sell%20my%20Mercedes-Benz" 
            className="footer-action-btn" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Icon name="whatsapp" size={20} variant="gold" />
            <span>WhatsApp</span>
          </a>
        </div>
      </footer>
    </>
  );
}
