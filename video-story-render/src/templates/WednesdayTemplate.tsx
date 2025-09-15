import React from 'react';
import { useCurrentFrame, interpolate, Easing, staticFile, Img } from 'remotion';

interface WednesdayTemplateProps {
  title?: string;
  subtitle?: string;
  description?: string;
  car_model?: string;
  current_mileage_km?: number;
  horsepower_hp?: number;
  badgeText?: string;
  imageUrl?: string;
  logoUrl?: string;
  templateType?: 'A' | 'B';
  titleFontSize?: number;
  imageFit?: string;
  imageAlignment?: string;
  imageZoom?: number;
  imageVerticalPosition?: number;
  year?: number;
  make?: string;
  model?: string;
  price?: number;
  exterior_color?: string;
  interior_color?: string;
  mileage?: number;
  engine?: string;
  transmission?: string;
  fuel_type?: string;
  features?: string[];
  monthly_0_down_aed?: number;
  monthly_20_down_aed?: number;
}

export const WednesdayTemplate: React.FC<WednesdayTemplateProps> = ({
  title = 'Sample Title',
  subtitle = '',
  description = '',
  car_model = '',
  current_mileage_km = 25000,
  horsepower_hp = 300,
  badgeText = 'SPOTLIGHT OF THE WEEK',
  imageUrl = '',
  logoUrl = 'https://database.silberarrows.com/storage/v1/object/public/media-files/8bc3b696-bcb6-469e-9993-030fdc903ee5/9740bc7d-d555-4c9b-b0e0-d756e0b4c50d.png',
  templateType = 'A',
  titleFontSize = 72,
  imageFit = 'cover',
  imageAlignment = 'center',
  imageZoom = 100,
  imageVerticalPosition = 0,
  year = 2023,
  make = 'Mercedes-Benz',
  model = '',
  price = 0,
  exterior_color = '',
  interior_color = '',
  mileage = 25000,
  engine = '',
  transmission = '',
  fuel_type = 'Petrol',
  features = [],
  monthly_0_down_aed = 0,
  monthly_20_down_aed = 0
}) => {
  const frame = useCurrentFrame();
  
  // Animation functions (same as Monday/Tuesday templates)
  const fadeIn = (startFrame: number, duration: number = 30) =>
    interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease)
    });

  const slideFromTop = (startFrame: number, distance: number = 50, duration: number = 30) =>
    interpolate(frame, [startFrame, startFrame + duration], [distance, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease)
    });

  const slideFromLeft = (startFrame: number, distance: number = 50, duration: number = 30) =>
    interpolate(frame, [startFrame, startFrame + duration], [-distance, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease)
    });

  const slideFromRight = (startFrame: number, distance: number = 50, duration: number = 30) =>
    interpolate(frame, [startFrame, startFrame + duration], [distance, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease)
    });

  // Image zoom effect over 7 seconds
  const imageScale = interpolate(frame, [0, 210], [(imageZoom + 8) / 100, imageZoom / 100], {
    easing: Easing.out(Easing.ease)
  });

  // Clean title like in HTML template
  const cleanTitle = (car_model || title || 'Your Title Here')
    .replace(/MERCEDES[-\s]*BENZ\s*/gi, '')
    .replace(/^AMG\s*/gi, 'AMG ');

  const fontsCSS = `
    @font-face {
      font-family: 'Resonate';
      src: url('${staticFile('fonts/Resonate-Black.woff2')}') format('woff2');
      font-weight: 900;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Resonate';
      src: url('${staticFile('fonts/Resonate-Bold.woff2')}') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Resonate';
      src: url('${staticFile('fonts/Resonate-Medium.woff2')}') format('woff2');
      font-weight: 500;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Resonate';
      src: url('${staticFile('fonts/Resonate-Regular.woff2')}') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Resonate';
      src: url('${staticFile('fonts/Resonate-Light.woff2')}') format('woff2');
      font-weight: 300;
      font-style: normal;
      font-display: swap;
    }
    * { font-family: 'Resonate', 'Inter', sans-serif; }
  `;

  // Star icon component for Wednesday badge
  const StarIcon = ({ size = 24, color = '#000000' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 6 }}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );

  const templateA = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '1080px',
      height: '1920px',
      fontFamily: 'Resonate, Inter, sans-serif',
      background: '#D5D5D5',
      color: '#555555',
      overflow: 'hidden'
    }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <style dangerouslySetInnerHTML={{ __html: fontsCSS }} />
      
      {/* Image Section - Full background */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}>
        <Img
          src={imageUrl || logoUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: imageFit as any,
            objectPosition: imageAlignment,
            transform: `scale(${imageScale}) translateY(${imageVerticalPosition}px)`
          }}
          alt="Car Spotlight"
        />
        
        {/* Content Overlay */}
        <div style={{
          position: 'absolute',
          top: '2%',
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          padding: '40px',
          textAlign: 'center'
        }}>
          {/* Badge and Logo Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            gap: '20px',
            transform: `translateY(${slideFromTop(9)}px)`,
            opacity: fadeIn(9)
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1)',
              color: '#000',
              padding: '16px 32px',
          borderRadius: '25px',
              fontWeight: 500,
              fontSize: '24px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 6px 20px rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.2)',
              fontFamily: 'Resonate, Inter, sans-serif'
            }}>
              <StarIcon size={20} color="#000" /> {badgeText}
            </div>
            <Img
              src={logoUrl}
              alt="SilberArrows Logo"
              style={{
                height: '96px',
                width: 'auto',
                filter: 'brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                marginTop: '4px',
                flexShrink: 0,
                transform: `translateX(${slideFromRight(15)}px)`,
                opacity: fadeIn(15)
              }}
            />
          </div>
          
          {/* Title */}
          <div style={{
            transform: `translateX(${slideFromLeft(24)}px)`,
            opacity: fadeIn(24)
          }}>
            <h1 style={{
              fontSize: `${titleFontSize}px`,
              fontWeight: 900,
              color: '#555555',
              lineHeight: 0.8,
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
              marginBottom: '2px',
              padding: '0 80px',
              fontFamily: 'Resonate, Inter, sans-serif'
            }}>{cleanTitle}</h1>
          </div>
          
          {/* Subtitle */}
          {subtitle && (
            <div style={{
              fontSize: '45px',
              color: '#555555',
              marginBottom: '8px',
              fontWeight: 700,
              fontFamily: 'Resonate, Inter, sans-serif',
              transform: `translateY(${slideFromTop(36, 30)}px)`,
              opacity: fadeIn(36)
            }}>{subtitle}</div>
          )}
        </div>
      </div>
      
      {/* Bottom Buttons Row */}
      <div style={{
        position: 'fixed',
        left: '40px',
        right: '40px',
        bottom: '20px',
        zIndex: 5,
        display: 'flex',
        gap: '16px',
        opacity: fadeIn(90)
      }}>
        {/* More Details Button */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          background: 'rgba(0,0,0,0.15)',
          border: '2px solid rgba(0,0,0,0.3)',
          padding: '20px 24px',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          fontWeight: 400,
          fontSize: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          color: '#555555',
          fontFamily: 'Resonate, Inter, sans-serif'
        }}>
          <i className="fas fa-arrow-right" style={{ marginRight: '8px' }}></i>
          <span style={{ fontWeight: 'bold' }}>More Details</span>
        </div>
        
        {/* Call or WhatsApp Button */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          background: 'rgba(0,0,0,0.15)',
          border: '2px solid rgba(0,0,0,0.3)',
          padding: '20px 24px',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          fontWeight: 400,
          fontSize: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          color: '#555555',
          fontFamily: 'Resonate, Inter, sans-serif'
        }}>
          <i className="fas fa-phone" style={{ marginRight: '4px' }}></i>
          <i className="fab fa-whatsapp" style={{ marginRight: '8px' }}></i>
          <span style={{ fontWeight: 'bold' }}>Call or WhatsApp us at +971 4 380 5515</span>
        </div>
      </div>
    </div>
  );

  const templateB = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '1080px',
      height: '1920px',
      fontFamily: 'Resonate, Inter, sans-serif',
      background: '#D5D5D5',
      color: '#555555',
      overflow: 'hidden'
    }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <style dangerouslySetInnerHTML={{ __html: fontsCSS }} />
      
      {/* Image Section - Full background */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}>
        <Img
          src={imageUrl || logoUrl}
            style={{
            width: '100%',
            height: '100%',
            objectFit: imageFit as any,
            objectPosition: imageAlignment,
            transform: `scale(${imageScale}) translateY(${imageVerticalPosition}px)`
          }}
          alt="Car Spotlight"
        />
        
        {/* Content Overlay */}
        <div style={{
          position: 'absolute',
          top: '2%',
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          padding: '40px',
          textAlign: 'center'
        }}>
          {/* Badge and Logo Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            gap: '20px',
            transform: `translateY(${slideFromTop(9)}px)`,
            opacity: fadeIn(9)
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1)',
              color: '#000',
              padding: '16px 32px',
              borderRadius: '25px',
              fontWeight: 500,
              fontSize: '24px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 6px 20px rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.2)',
              fontFamily: 'Resonate, Inter, sans-serif'
            }}>
              <StarIcon size={20} color="#000" /> {badgeText}
            </div>
            <Img
              src={logoUrl}
              alt="SilberArrows Logo"
              style={{
                height: '96px',
                width: 'auto',
                filter: 'brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                marginTop: '4px',
                flexShrink: 0,
                transform: `translateX(${slideFromRight(15)}px)`,
                opacity: fadeIn(15)
              }}
            />
          </div>
          
          {/* Title */}
          <div style={{
            transform: `translateX(${slideFromLeft(24)}px)`,
            opacity: fadeIn(24)
          }}>
            <h1 style={{
              fontSize: `${titleFontSize}px`,
              fontWeight: 900,
              color: '#555555',
              lineHeight: 0.8,
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
              marginBottom: '2px',
              padding: '0 80px',
              fontFamily: 'Resonate, Inter, sans-serif'
            }}>{cleanTitle}</h1>
          </div>
          
          {/* Subtitle */}
          {subtitle && (
            <div style={{
              fontSize: '45px',
              color: '#555555',
              marginBottom: '8px',
              fontWeight: 700,
              fontFamily: 'Resonate, Inter, sans-serif',
              transform: `translateY(${slideFromTop(36, 30)}px)`,
              opacity: fadeIn(36)
            }}>{subtitle}</div>
          )}

          {/* Car Specs Grid */}
          {(current_mileage_km || horsepower_hp || price) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: price ? '1fr 1fr 1fr' : '1fr 1fr',
              gap: '16px',
              margin: '16px 0',
              transform: `translateY(${slideFromTop(45, 30)}px)`,
              opacity: fadeIn(45)
            }}>
              {current_mileage_km && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  padding: '24px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  textAlign: 'center'
                }}>
                  <i className="fas fa-road" style={{
                    fontSize: '32px',
                    marginBottom: '12px',
                    color: '#e2e8f0'
                  }}></i>
                  <div style={{
                    fontSize: '20px',
                    color: '#333333',
                    marginBottom: '6px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontFamily: 'Resonate, Inter, sans-serif'
                  }}>Mileage</div>
                  <div style={{
                    fontSize: '28px',
                    color: '#555555',
                    fontWeight: 700,
                    fontFamily: 'Resonate, Inter, sans-serif'
                  }}>{current_mileage_km?.toLocaleString()} KM</div>
                </div>
              )}
              
          {horsepower_hp && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  padding: '24px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  textAlign: 'center'
                }}>
                  <i className="fas fa-bolt" style={{
                    fontSize: '32px',
                    marginBottom: '12px',
                    color: '#e2e8f0'
                  }}></i>
                  <div style={{
                    fontSize: '20px',
                    color: '#333333',
                    marginBottom: '6px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontFamily: 'Resonate, Inter, sans-serif'
                  }}>Power</div>
                  <div style={{
                    fontSize: '28px',
                    color: '#555555',
                    fontWeight: 700,
                    fontFamily: 'Resonate, Inter, sans-serif'
                  }}>{horsepower_hp} HP</div>
                </div>
              )}

              {price && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.15))',
                  border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: '16px',
                  padding: '24px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  textAlign: 'center'
                }}>
                  <i className="fas fa-tag" style={{
                    fontSize: '32px',
                    marginBottom: '12px',
                    color: '#d97706'
                  }}></i>
                  <div style={{
                    fontSize: '20px',
                    color: '#333333',
                    marginBottom: '6px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontFamily: 'Resonate, Inter, sans-serif'
                  }}>Price</div>
                  <div style={{
                    fontSize: '28px',
                    color: '#d97706',
                    fontWeight: 700,
                    fontFamily: 'Resonate, Inter, sans-serif'
                  }}>AED {price?.toLocaleString()}</div>
              </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Buttons Row */}
      <div style={{
        position: 'fixed',
        left: '40px',
        right: '40px',
        bottom: '20px',
        zIndex: 5,
        display: 'flex',
        gap: '16px',
        opacity: fadeIn(90)
      }}>
        {/* More Details Button */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          background: 'rgba(0,0,0,0.15)',
          border: '2px solid rgba(0,0,0,0.3)',
          padding: '20px 24px',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          fontWeight: 400,
          fontSize: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          color: '#555555',
          fontFamily: 'Resonate, Inter, sans-serif'
        }}>
          <i className="fas fa-arrow-right" style={{ marginRight: '8px' }}></i>
          <span style={{ fontWeight: 'bold' }}>More Details</span>
        </div>
        
        {/* Call or WhatsApp Button */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          background: 'rgba(0,0,0,0.15)',
          border: '2px solid rgba(0,0,0,0.3)',
          padding: '20px 24px',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          fontWeight: 400,
          fontSize: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          color: '#555555',
          fontFamily: 'Resonate, Inter, sans-serif'
        }}>
          <i className="fas fa-phone" style={{ marginRight: '4px' }}></i>
          <i className="fab fa-whatsapp" style={{ marginRight: '8px' }}></i>
          <span style={{ fontWeight: 'bold' }}>Call or WhatsApp us at +971 4 380 5515</span>
        </div>
      </div>
    </div>
  );

  return templateType === 'A' ? templateA : templateB;
};