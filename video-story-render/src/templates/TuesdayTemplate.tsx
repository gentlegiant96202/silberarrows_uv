import React from 'react';
import { useCurrentFrame, interpolate, Easing, staticFile, Img } from 'remotion';

interface TuesdayTemplateProps {
  title?: string;
  subtitle?: string;
  description?: string;
  problem?: string;
  solution?: string;
  difficulty?: string;
  tools_needed?: string;
  warning?: string;
  badgeText?: string;
  imageUrl?: string;
  logoUrl?: string;
  templateType?: 'A' | 'B';
  titleFontSize?: number;
  imageFit?: string;
  imageAlignment?: string;
  imageZoom?: number;
  imageVerticalPosition?: number;
}

export const TuesdayTemplate: React.FC<TuesdayTemplateProps> = ({
  title = 'Sample Title',
  subtitle = '',
  description = '',
  problem = '',
  solution = '',
  difficulty = '',
  tools_needed = '',
  warning = '',
  badgeText = 'TECH TIPS TUESDAY',
  imageUrl = '',
  logoUrl = 'https://database.silberarrows.com/storage/v1/object/public/media-files/8bc3b696-bcb6-469e-9993-030fdc903ee5/9740bc7d-d555-4c9b-b0e0-d756e0b4c50d.png',
  templateType = 'A',
  titleFontSize = 72,
  imageFit = 'cover',
  imageAlignment = 'center',
  imageZoom = 100,
  imageVerticalPosition = 0
}) => {
  const frame = useCurrentFrame();
  
  // Animation functions (same as Monday template)
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
  const cleanTitle = (title || 'Your Title Here')
    .replace(/MERCEDES[-\s]*BENZ\s*/gi, '')
    .replace(/^AMG\s*/gi, 'AMG ');

  // Convert <br> tags to React line breaks
  const renderTitleWithLineBreaks = (text: string) => {
    return text.split(/<br\s*\/?>/gi).map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };

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

  // Lightbulb icon component for Tuesday badge
  const LightbulbIcon = ({ size = 24, color = '#000000' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 6 }}>
      <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/>
    </svg>
  );

  const templateA = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '1080px',
      height: '1920px',
      fontFamily: 'Resonate, Inter, sans-serif',
      background: '#000000',
      color: '#ffffff',
      overflow: 'hidden'
    }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <style dangerouslySetInnerHTML={{ __html: fontsCSS }} />
      {/* Image Section */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '69.5%'
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
            transform: `translateZ(0) scale(${imageScale}) translateY(${imageVerticalPosition}px)`,
            filter: 'brightness(1.1) contrast(1.05)'
          }}
          alt="Background"
        />
      </div>

      {/* Content Section */}
      <div style={{
        padding: '20px 40px 40px 40px',
        height: '586px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: '12px',
        overflow: 'visible'
      }}>
        {/* Badge Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          marginTop: '20px'
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
            transform: `translateY(${slideFromTop(9)}px)`,
            opacity: fadeIn(9)
          }}>
            <LightbulbIcon size={20} color="#000" /> {renderTitleWithLineBreaks(badgeText)}
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
        
          <div style={{
          marginBottom: '24px',
          transform: `scale(${interpolate(frame, [30, 60], [0.8, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.ease) })})`,
          opacity: fadeIn(36)
        }}>
          <div>
            <h1 style={{
              fontSize: `${titleFontSize}px`,
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 0.8,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              marginBottom: '12px',
              transform: `translateX(${slideFromLeft(24)}px)`,
              opacity: fadeIn(24),
              fontFamily: 'Resonate, Inter, sans-serif'
            }}>{renderTitleWithLineBreaks(cleanTitle)}</h1>
          </div>
        </div>
      </div>
          
      {/* More Details Arrow indicator */}
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
        fontFamily: 'Resonate, Inter, sans-serif',
        opacity: fadeIn(90)
      }}>
        <i className="fas fa-arrow-right" style={{ marginRight: '12px' }}></i>
        <span style={{ fontWeight: 'bold' }}>More Details</span>
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
      background: '#000000',
      color: '#ffffff',
      overflow: 'hidden'
    }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <style dangerouslySetInnerHTML={{ __html: fontsCSS }} />
      {/* Background image with blur overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '69.5%',
        zIndex: 0
      }}>
        <Img
          src={imageUrl || logoUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(8px)',
            opacity: 0.3
          }}
          alt="Background"
        />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))'
        }} />
      </div>

      {/* Content Section */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: 'calc(20px + 3vh) 40px 40px 40px',
        height: '586px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: '12px',
        overflow: 'visible'
      }}>
        {/* Badge Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          marginTop: '60px'
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
            transform: `translateY(${slideFromTop(9)}px)`,
            opacity: fadeIn(9)
          }}>
            <LightbulbIcon size={20} color="#000" /> {renderTitleWithLineBreaks(badgeText)}
          </div>
          <Img
            src={logoUrl}
            alt="SilberArrows Logo"
            style={{
              height: '96px',
              width: 'auto',
              marginTop: '4px',
              flexShrink: 0,
              display: 'block',
              visibility: 'visible',
              opacity: 1,
              zIndex: 999,
              filter: 'brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              transform: `translateX(${slideFromRight(15)}px)`,
              opacity: fadeIn(15)
            }}
          />
        </div>
        
        
        <div style={{
          marginBottom: '24px'
        }}>
          {/* Problem Section */}
          {problem && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              transform: `translateY(${slideFromTop(45, 30)}px)`,
              opacity: fadeIn(45)
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <i className="fas fa-exclamation-circle" style={{
                  fontSize: '41px',
                  color: '#ef4444'
                }}></i>
                <span style={{
                  fontSize: '41px',
                  fontWeight: 700,
                  color: '#ef4444',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>The Problem</span>
              </div>
              <div style={{
                fontSize: '37px',
                color: '#e2e8f0',
                lineHeight: 1.4,
                fontFamily: 'Resonate, Inter, sans-serif'
              }}>{renderTitleWithLineBreaks(problem)}</div>
            </div>
          )}

          {/* Solution Section */}
          {solution && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              transform: `translateY(${slideFromTop(60, 30)}px)`,
              opacity: fadeIn(60)
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <i className="fas fa-tools" style={{
                  fontSize: '41px',
                  color: '#22c55e'
                }}></i>
                <span style={{
                  fontSize: '41px',
                  fontWeight: 700,
                  color: '#22c55e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>The Solution</span>
              </div>
              <div style={{
                fontSize: '37px',
                color: '#e2e8f0',
                lineHeight: 1.4,
                fontFamily: 'Resonate, Inter, sans-serif'
              }}>{renderTitleWithLineBreaks(solution)}</div>
            </div>
          )}

          {/* Difficulty and Tools Grid */}
          {(difficulty && tools_needed) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              margin: '24px 0',
              transform: `translateY(${slideFromTop(75, 30)}px)`,
              opacity: fadeIn(75)
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '32px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                textAlign: 'center'
              }}>
                <i className="fas fa-gauge-high" style={{
                  fontSize: '37px',
                  marginBottom: '8px',
                  color: '#cbd5e1'
                }}></i>
                <div style={{
                  fontSize: '23px',
                  color: '#cbd5e1',
                  marginBottom: '6px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>
                  Difficulty
                </div>
                <div style={{
                  fontSize: '32px',
                  color: '#f8fafc',
                  fontWeight: 700,
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>
                  {renderTitleWithLineBreaks(difficulty)}
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '32px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                textAlign: 'center'
              }}>
                <i className="fas fa-clock" style={{
                  fontSize: '37px',
                  marginBottom: '8px',
                  color: '#cbd5e1'
                }}></i>
                <div style={{
                  fontSize: '23px',
                  color: '#cbd5e1',
                  marginBottom: '6px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>
                  Tools Needed
                </div>
                <div style={{
                  fontSize: '32px',
                  color: '#f8fafc',
                  fontWeight: 700,
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>
                  {renderTitleWithLineBreaks(tools_needed)}
                </div>
              </div>
            </div>
          )}

          {/* Warning Section */}
          {warning && (
            <div style={{
              background: 'rgba(255, 100, 100, 0.1)',
              border: '1px solid rgba(255, 150, 150, 0.3)',
              borderRadius: '16px',
              padding: '32px',
              margin: '24px 0',
              backdropFilter: 'blur(10px)',
              transform: `translateY(${slideFromTop(90, 30)}px)`,
              opacity: fadeIn(90)
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <i className="fas fa-exclamation-triangle" style={{
                  fontSize: '32px',
                  color: '#ff6b6b'
                }}></i>
                <span style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#ff6b6b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>
                  Important Warning
                </span>
              </div>
              <div style={{
                fontSize: '32px',
                color: '#ffebeb',
                lineHeight: 1.4,
                fontFamily: 'Resonate, Inter, sans-serif'
              }}>{renderTitleWithLineBreaks(warning)}</div>
            </div>
          )}
        </div>
        
        {/* Call or WhatsApp contact */}
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
          fontFamily: 'Resonate, Inter, sans-serif',
          opacity: fadeIn(105)
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