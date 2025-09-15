import React from 'react';
import { useCurrentFrame, interpolate, Easing, staticFile, Img } from 'remotion';

// Icon components
const StarIcon = ({ size = 24, color = "#fff", marginRight = '8px' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ marginRight }}>
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill={color} />
  </svg>
);

const AEDSymbol = ({ color = "#555555" }) => (
  <svg height="0.7em" viewBox="0 0 344.84 299.91" style={{ display: 'inline-block', verticalAlign: 'baseline', marginRight: '6px', marginBottom: '-0.02em' }} xmlns="http://www.w3.org/2000/svg">
    <path fill={color} d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/>
  </svg>
);

interface WednesdayTemplateProps {
  title?: string;
  subtitle?: string;
  description?: string;
  car_model?: string;
  badgeText?: string;
  imageUrl?: string;
  logoUrl?: string;
  templateType?: 'A' | 'B';
  titleFontSize?: number;
  imageFit?: string;
  imageAlignment?: string;
  imageZoom?: number;
  imageVerticalPosition?: number;
  monthly_20_down_aed?: number;
  monthly_0_down_aed?: number;
  // Template B specific props
  current_mileage_km?: number;
  horsepower?: number;
  exterior_color?: string;
  interior_color?: string;
  engine?: string;
  transmission?: string;
  features?: string[] | string;
}

export const WednesdayTemplate: React.FC<WednesdayTemplateProps> = ({
  title = 'Sample Title',
  subtitle = '',
  description = '',
  car_model = '',
  badgeText = 'SPOTLIGHT OF THE WEEK',
  imageUrl = '',
  logoUrl = 'https://database.silberarrows.com/storage/v1/object/public/media-files/8bc3b696-bcb6-469e-9993-030fdc903ee5/9740bc7d-d555-4c9b-b0e0-d756e0b4c50d.png',
  templateType = 'A',
  titleFontSize = 72,
  imageFit = 'cover',
  imageAlignment = 'center',
  imageZoom = 100,
  imageVerticalPosition = 0,
  monthly_20_down_aed = 0,
  monthly_0_down_aed = 0,
  // Template B specific props
  current_mileage_km = 25000,
  horsepower = 300,
  exterior_color = 'Black',
  interior_color = 'Black',
  engine = '3.0L V6 Turbo',
  transmission = '9G-TRONIC Automatic',
  features = []
}) => {
  const frame = useCurrentFrame();
  
  // Animation functions
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

  // Image zoom effect
  const imageScale = interpolate(frame, [0, 210], [(imageZoom + 8) / 100, imageZoom / 100], {
    easing: Easing.out(Easing.ease)
  });

  // Clean title like in HTML template - prioritize manual title input
  const cleanTitle = (title || car_model || 'Your Title Here')
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 8 }}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );

  // AED Currency Symbol Component (exact match from HTML)
  const AEDSymbol = ({ color = '#555555' }: { color?: string }) => (
    <svg height="0.7em" viewBox="0 0 344.84 299.91" style={{ display: 'inline-block', verticalAlign: 'baseline', marginRight: 6, marginBottom: '-0.02em' }} xmlns="http://www.w3.org/2000/svg">
      <path fill={color} d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/>
    </svg>
  );

  // TEMPLATE A - Simple car spotlight (NO bottom buttons)
  const templateA = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '1080px',
      height: '1920px',
      fontFamily: 'Resonate, Inter, sans-serif',
      background: '#D5D5D5',
      color: '#ffffff',
      overflow: 'hidden'
    }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <style dangerouslySetInnerHTML={{ __html: fontsCSS }} />
      
      {/* Full Image Background */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}>
        <Img
          src={(() => {
            // Filter out video files - only use image files for background
            if (imageUrl && imageUrl.includes('.mp4')) {
              return logoUrl; // Fallback to logo if imageUrl is a video
            }
            return imageUrl || logoUrl;
          })()}
          style={{
            width: '100%',
            height: '100%',
            objectFit: imageFit as any,
            objectPosition: imageAlignment,
            transform: `scale(${imageScale}) translateY(${imageVerticalPosition}px)`
          }}
          alt="Car Spotlight"
        />
        
        {/* Spotlight Badge - positioned on image (top-right) */}
        <div style={{
          position: 'absolute',
          top: '100px',
          right: '30px',
          background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
          color: '#000',
          padding: '16px 32px',
          borderRadius: '25px',
          fontFamily: 'Resonate, Inter, sans-serif',
          fontWeight: 300,
          fontSize: '28px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
          border: '2px solid rgba(255,255,255,0.3)',
          zIndex: 10,
          transform: `translateY(${slideFromTop(9)}px)`,
          opacity: fadeIn(9)
        }}>
          <StarIcon size={24} color="#000" /> CAR OF THE DAY
        </div>
        
        {/* Content Overlay - centered like HTML template */}
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
          textAlign: 'center',
          height: '100%'
        }}>
          {/* Title */}
          <div style={{
            transform: `translateX(${slideFromLeft(15)}px)`,
            opacity: fadeIn(15)
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
          
          {/* Subtitle with Monthly Payment or Cash Payment */}
          <div style={{
            fontSize: '45px',
            color: '#555555',
            marginBottom: '8px',
            fontWeight: 700,
            fontFamily: 'Resonate, Inter, sans-serif',
            transform: `translateY(${slideFromTop(20, 30)}px)`,
            opacity: fadeIn(20),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {monthly_20_down_aed && monthly_20_down_aed > 0 ? (
              <>
                <AEDSymbol color="#555555" />
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, color: '#555555' }}>
                  {monthly_20_down_aed.toLocaleString()}
                </span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, color: '#555555' }}>
                  {' '}PER MONTH
                </span>
              </>
            ) : (
              <span style={{ fontFamily: 'Resonate, Inter, sans-serif', fontWeight: 300, color: '#555555' }}>
                CASH PAYMENT
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* NO BOTTOM BUTTONS FOR TEMPLATE A - matches HTML exactly */}
    </div>
  );

  // TEMPLATE B - Logo background with detailed car specs (EXACT match to HTML)
  const templateB = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '1080px',
      height: '1920px',
      fontFamily: 'Resonate, Inter, sans-serif',
      background: '#D5D5D5',
      color: '#ffffff',
      overflow: 'hidden'
    }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <style dangerouslySetInnerHTML={{ __html: fontsCSS }} />
      
      {/* SilberArrows Logo Background (NOT car image) */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1
      }}>
        <Img
          src={logoUrl}
            style={{
            width: '100%',
            height: '100%',
              objectFit: 'cover',
            opacity: 0.3,
            transform: 'scale(1.1)',
            filter: 'brightness(1.3) contrast(0.8)'
          }}
          alt="SilberArrows"
        />
      </div>
      
      {/* Content Section */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        padding: '32px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: '20px',
        overflow: 'visible'
      }}>
        {/* Badge positioned exactly like Template A */}
        <div style={{
          position: 'absolute',
          top: '100px',
          left: '30px',
          background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
          color: '#000',
          padding: '16px 32px',
          borderRadius: '25px',
          fontFamily: 'Resonate, Inter, sans-serif',
          fontWeight: 300,
          fontSize: '28px',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          boxShadow: '0 6px 20px rgba(255,255,255,0.1)',
          border: '2px solid rgba(255,255,255,0.2)',
          zIndex: 10,
          transform: `translateY(${slideFromTop(6)}px)`,
          opacity: fadeIn(6)
        }}>
          <StarIcon size={20} color="#000" marginRight="8px" /> CAR OF THE DAY
        </div>
        
        {/* Logo positioned exactly like Template A */}
        <Img
          src={logoUrl}
          alt="SilberArrows Logo"
          style={{
            position: 'absolute',
            top: '100px',
            right: '30px',
            height: '96px',
            width: 'auto',
            filter: 'brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            flexShrink: 0,
            zIndex: 10,
            transform: `translateX(${slideFromRight(15)}px)`,
            opacity: fadeIn(15)
          }}
        />
        
        {/* Content Container - push below badge level */}
        <div style={{ marginTop: '200px' }}>
          {/* Title Section */}
          <div style={{ marginBottom: '10px' }}>
            <h1 style={{
              fontSize: '41px',
              fontWeight: 900,
              color: '#555555',
              lineHeight: 1.1,
              textShadow: 'none',
              marginBottom: '12px',
              fontFamily: 'Resonate, Inter, sans-serif',
              transform: `translateX(${slideFromLeft(24)}px)`,
              opacity: fadeIn(24)
            }}>{cleanTitle}</h1>
          </div>
          
          {/* Car Specifications Grid - 6 cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap: '12px',
            margin: '12px 0',
            transform: `translateY(${slideFromTop(20, 30)}px)`,
            opacity: fadeIn(20)
          }}>
            {/* Mileage Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                minHeight: '40px'
              }}>
                <i className="fas fa-tachometer-alt" style={{
                  fontSize: '28px',
                  color: '#555555',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}></i>
                <span style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#555555',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>Mileage</span>
              </div>
              <div style={{
                fontSize: '26px',
                color: '#333333',
                lineHeight: 1.4,
                marginLeft: '44px',
                fontFamily: 'Resonate, Inter, sans-serif'
              }}>{(current_mileage_km || 25000).toLocaleString()} km</div>
            </div>
            
            {/* Power Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                minHeight: '40px'
              }}>
                <i className="fas fa-bolt" style={{
                  fontSize: '28px',
                  color: '#555555',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}></i>
                <span style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#555555',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>Horsepower</span>
              </div>
              <div style={{
                fontSize: '26px',
                color: '#333333',
                lineHeight: 1.4,
                marginLeft: '44px',
                fontFamily: 'Resonate, Inter, sans-serif'
              }}>{(horsepower || 300)} HP</div>
            </div>
            
            {/* Exterior Color Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                minHeight: '40px'
              }}>
                <i className="fas fa-paint-brush" style={{
                  fontSize: '28px',
                  color: '#555555',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}></i>
                <span style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#555555',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>Exterior Color</span>
              </div>
              <div style={{
                fontSize: '26px',
                color: '#333333',
                lineHeight: 1.4,
                marginLeft: '44px',
                fontFamily: 'Resonate, Inter, sans-serif'
              }}>{exterior_color || 'Black'}</div>
            </div>
            
            {/* Interior Color Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                minHeight: '40px'
              }}>
                <i className="fas fa-car-side" style={{
                  fontSize: '28px',
                  color: '#555555',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}></i>
                <span style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#555555',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>Interior Color</span>
              </div>
              <div style={{
                fontSize: '26px',
                color: '#333333',
                lineHeight: 1.4,
                marginLeft: '44px',
                fontFamily: 'Resonate, Inter, sans-serif'
              }}>{interior_color || 'Black'}</div>
            </div>
            
            {/* Engine Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                minHeight: '40px'
              }}>
                <i className="fas fa-cogs" style={{
                  fontSize: '28px',
                  color: '#555555',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}></i>
                <span style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#555555',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>Engine</span>
              </div>
              <div style={{
                fontSize: '26px',
                color: '#333333',
                lineHeight: 1.4,
                marginLeft: '44px',
                fontFamily: 'Resonate, Inter, sans-serif'
              }}>{engine || '3.0L V6 Turbo'}</div>
            </div>
            
            {/* Transmission Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                minHeight: '40px'
              }}>
                <i className="fas fa-cog" style={{
                  fontSize: '28px',
                  color: '#555555',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}></i>
                <span style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#555555',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>Transmission</span>
              </div>
              <div style={{
                fontSize: '26px',
                color: '#333333',
                lineHeight: 1.4,
                marginLeft: '44px',
                fontFamily: 'Resonate, Inter, sans-serif'
              }}>{transmission || '9G-TRONIC Automatic'}</div>
            </div>
          </div>

          {/* Key Equipment Features Section */}
          {features && features.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '20px',
              backdropFilter: 'blur(8px)',
              margin: '12px 0',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              transform: `translateY(${slideFromTop(25, 30)}px)`,
              opacity: fadeIn(25)
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                minHeight: '40px'
              }}>
                <i className="fas fa-list-check" style={{
                  fontSize: '28px',
                  color: '#555555',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}></i>
                <span style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#555555',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>Key Equipment (highlights)</span>
              </div>
              <div style={{
                fontSize: '26px',
                color: '#333333',
                lineHeight: 1.4,
                marginLeft: '44px',
                fontFamily: 'Resonate, Inter, sans-serif',
                listStyle: 'none',
                padding: 0
              }}>
                {(() => {
                  if (Array.isArray(features)) {
                    // Process features like HTML template
                    let equipmentText = features.join(', ');
                    let allEquipment = [];
                    
                    // Handle different formats like HTML
                    if (equipmentText.includes('\n') || equipmentText.includes('↵')) {
                      allEquipment = equipmentText
                        .replace(/↵/g, '\n')
                        .split(/\n/)
                        .map(item => item.trim());
                    } else if (equipmentText.includes(',')) {
                      allEquipment = equipmentText.split(',').map(item => item.trim());
                    } else {
                      allEquipment = equipmentText
                        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
                        .split(/\s{2,}|;|\.|(?=[A-Z][A-Z\s]*[A-Z](?=[a-z]))|(?<=[a-z])(?=[A-Z])/)
                        .map(item => item.trim());
                    }
                    
                    // Filter and clean like HTML
                    allEquipment = allEquipment
                      .filter(item => item.length > 2 && item.length < 120)
                      .filter(item => item !== '')
                      .filter(item => item.match(/[A-Za-z]/))
                      .filter(item => !item.match(/^[A-Z]{1,2}$/));
                    
                    // Take first 10 items and display as vertical list
                    const selectedEquipment = allEquipment.slice(0, 10);
                    
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedEquipment.map((item, index) => (
                          <div key={index} style={{ marginBottom: '12px' }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return features.toString().slice(0, 300) + '...';
                })()}
              </div>
            </div>
          )}

          {/* Monthly Payment Cards */}
          {(monthly_0_down_aed || monthly_20_down_aed) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: (monthly_0_down_aed && monthly_20_down_aed) ? '1fr 1fr' : '1fr',
              gap: '20px',
              margin: '16px 0',
              transform: `translateY(${slideFromTop(30, 30)}px)`,
              opacity: fadeIn(30)
            }}>
              {monthly_0_down_aed && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'center',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <i className="fas fa-calendar-alt" style={{ color: '#555555', fontSize: '20px' }}></i>
                    <span style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#555555',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: 'Resonate, Inter, sans-serif'
                    }}>0% Down</span>
                  </div>
                  <div style={{
                    fontSize: '46px',
                    color: '#555555',
                    fontWeight: 900,
                    marginBottom: '4px',
                    fontFamily: 'Resonate, Inter, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AEDSymbol color="#555555" />
                    {monthly_0_down_aed.toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    color: '#666666',
                    fontFamily: 'Resonate, Inter, sans-serif'
                  }}>per month</div>
                </div>
              )}
              
              {monthly_20_down_aed && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'center',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <i className="fas fa-calendar-alt" style={{ color: '#555555', fontSize: '20px' }}></i>
                    <span style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#555555',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: 'Resonate, Inter, sans-serif'
                    }}>20% Down</span>
                  </div>
                  <div style={{
                    fontSize: '46px',
                    color: '#555555',
                    fontWeight: 900,
                    marginBottom: '4px',
                    fontFamily: 'Resonate, Inter, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AEDSymbol color="#555555" />
                    {monthly_20_down_aed.toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    color: '#666666',
                    fontFamily: 'Resonate, Inter, sans-serif'
                  }}>per month</div>
              </div>
              )}
            </div>
          )}
        </div>

        </div>
    </div>
  );

  return templateType === 'A' ? templateA : templateB;
};