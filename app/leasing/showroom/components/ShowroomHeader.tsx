'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/modules/leasing/Icon';

interface ShowroomHeaderProps {
  showBackButton?: boolean;
}

export default function ShowroomHeader({ showBackButton = false }: ShowroomHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handlePhoneClick = () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'leasing_phone_click',
      page: showBackButton ? 'vehicle_detail' : 'showroom_landing',
      location: 'header'
    });
  };

  return (
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
          <div className="header-right">
            <nav className="header-nav">
              {showBackButton ? (
                <a onClick={() => router.push('/leasing/showroom')} style={{ cursor: 'pointer' }}>← Back to Showroom</a>
              ) : (
                <>
                  <a href="/leasing/showroom">HOME</a>
                  <a href="#vehicles">VEHICLES</a>
                  <a href="#contact">CONTACT</a>
                </>
              )}
            </nav>
            <div className="header-contact-info">
              <div className="address-line">
                <Icon name="location-dot" size={12} variant="gold" />
                <span>Al Manara St, Al Quoz, Dubai</span>
              </div>
              <div className="phone-line">
                <Icon name="phone" size={12} variant="gold" />
                <a 
                  href="tel:+971561742746" 
                  style={{ color: 'inherit', textDecoration: 'none' }}
                  onClick={handlePhoneClick}
                >
                  +971 56 174 2746
                </a>
              </div>
            </div>
          </div>
          
          {/* Mobile Hamburger Menu */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button 
              className="mobile-menu-close"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <Icon name="times" size={24} variant="gold" />
            </button>
            
            <nav className="mobile-nav">
              {showBackButton ? (
                <a onClick={() => { setMobileMenuOpen(false); router.push('/leasing/showroom'); }} style={{ cursor: 'pointer' }}>
                  ← Back to Showroom
                </a>
              ) : (
                <>
                  <a href="/leasing/showroom" onClick={() => setMobileMenuOpen(false)}>HOME</a>
                  <a href="#vehicles" onClick={() => setMobileMenuOpen(false)}>VEHICLES</a>
                  <a href="#contact" onClick={() => setMobileMenuOpen(false)}>CONTACT</a>
                </>
              )}
            </nav>
            <div className="mobile-menu-contact">
              <div className="mobile-contact-item">
                <Icon name="location-dot" size={16} variant="gold" />
                <span>Al Manara St, Al Quoz, Dubai</span>
              </div>
              <div className="mobile-contact-item">
                <Icon name="phone" size={16} variant="gold" />
                <a 
                  href="tel:+971561742746"
                  onClick={handlePhoneClick}
                >
                  +971 56 174 2746
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

