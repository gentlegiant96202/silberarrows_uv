import React from 'react';
import { useCurrentFrame, interpolate, Easing, staticFile, Img } from 'remotion';

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
  monthly_0_down_aed = 0
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

  // Image zoom effect
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
          <StarIcon size={24} color="#000" /> HIGHLIGHT OF THE DAY
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
          
          {/* Subtitle with Monthly Payment or Cash Payment */}
          <div style={{
            fontSize: '45px',
            color: '#555555',
            marginBottom: '8px',
            fontWeight: 700,
            fontFamily: 'Resonate, Inter, sans-serif',
            transform: `translateY(${slideFromTop(36, 30)}px)`,
            opacity: fadeIn(36),
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

  // TEMPLATE B - Complex with monthly payment cards and contact section
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
          <StarIcon size={24} color="#000" /> HIGHLIGHT OF THE DAY
        </div>
        
        {/* Content Overlay - like HTML template */}
        <div style={{
          position: 'absolute',
          top: '120px',
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: '16px',
          padding: '40px',
          textAlign: 'center'
        }}>
          {/* Title */}
          <div style={{
            transform: `translateX(${slideFromLeft(24)}px)`,
            opacity: fadeIn(24)
          }}>
            <h1 style={{
              fontSize: '41px', // Template B uses smaller font
              fontWeight: 900,
              color: '#555555',
              lineHeight: 1.1,
              textShadow: 'none',
              marginBottom: '12px',
              fontFamily: 'Resonate, Inter, sans-serif'
            }}>{cleanTitle}</h1>
          </div>
          
          {/* Subtitle */}
          <div style={{
            fontSize: '32px',
            color: '#333333',
            marginBottom: '16px',
            fontWeight: 600,
            fontFamily: 'Resonate, Inter, sans-serif',
            transform: `translateY(${slideFromTop(36, 30)}px)`,
            opacity: fadeIn(36)
          }}>{subtitle}</div>

          {/* Monthly Payment Cards (if available) */}
          {(monthly_0_down_aed || monthly_20_down_aed) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: (monthly_0_down_aed && monthly_20_down_aed) ? '1fr 1fr' : '1fr',
              gap: '20px',
              margin: '32px 0',
              width: '100%',
              maxWidth: '600px',
              transform: `translateY(${slideFromTop(45, 30)}px)`,
              opacity: fadeIn(45)
            }}>
              {monthly_0_down_aed && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.15))',
                  border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: '20px',
                  padding: '32px 24px',
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
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
                      fontSize: '20px',
                      fontWeight: 600,
                      color: '#555555',
                      textTransform: 'uppercase',
                      fontFamily: 'Resonate, Inter, sans-serif'
                    }}>0% Down</span>
                  </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#555555',
                    marginBottom: '8px',
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
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.15))',
                  border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: '20px',
                  padding: '32px 24px',
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
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
                      fontSize: '20px',
                      fontWeight: 600,
                      color: '#555555',
                      textTransform: 'uppercase',
                      fontFamily: 'Resonate, Inter, sans-serif'
                    }}>20% Down</span>
                  </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#555555',
                    marginBottom: '8px',
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
        
        {/* Contact Section - ONLY for Template B */}
        <div style={{
          position: 'fixed',
          left: '40px',
          right: '40px',
          bottom: '120px',
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          background: 'rgba(255,255,255,0.15)',
          border: '2px solid rgba(255,255,255,0.3)',
          padding: '24px 32px',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          fontWeight: 400,
          fontSize: '32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          color: '#555555',
          fontFamily: 'Resonate, Inter, sans-serif',
          opacity: fadeIn(90)
        }}>
          <i className="fas fa-phone" style={{ marginRight: '8px' }}></i>
          <i className="fab fa-whatsapp" style={{ marginRight: '8px' }}></i>
          <span style={{ fontWeight: 'bold' }}>Call or WhatsApp us at +971 4 380 5515</span>
        </div>
      </div>
    </div>
  );

  return templateType === 'A' ? templateA : templateB;
};