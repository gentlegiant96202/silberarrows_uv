import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

interface MondayTemplateProps {
  title?: string;
  subtitle?: string;
  description?: string;
  myth?: string;
  fact?: string;
  badgeText?: string;
  imageUrl?: string;
  logoUrl?: string;
  templateType?: 'A' | 'B';
}

export const MondayTemplate: React.FC<MondayTemplateProps> = ({
  title = 'Sample Title',
  subtitle = '',
  description = '',
  myth = '',
  fact = '',
  badgeText = 'MONDAY',
  imageUrl = '',
  logoUrl = 'https://database.silberarrows.com/storage/v1/object/public/media-files/8bc3b696-bcb6-469e-9993-030fdc903ee5/9740bc7d-d555-4c9b-b0e0-d756e0b4c50d.png',
  templateType = 'A'
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation timings (in frames)
  const badgeStart = 9; // 0.3s
  const logoStart = 15; // 0.5s
  const titleStart = 24; // 0.8s
  const subtitleStart = 30; // 1.0s
  const descStart = 36; // 1.2s
  const mythStart = 45; // 1.5s
  const factStart = 60; // 2.0s

  // Animation functions
  const slideFromTop = (startFrame: number) => 
    interpolate(frame, [startFrame, startFrame + 30], [-50, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease)
    });

  const slideFromLeft = (startFrame: number) => 
    interpolate(frame, [startFrame, startFrame + 30], [-50, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease)
    });

  const slideFromRight = (startFrame: number) => 
    interpolate(frame, [startFrame, startFrame + 30], [50, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease)
    });

  const fadeIn = (startFrame: number) => 
    interpolate(frame, [startFrame, startFrame + 30], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease)
    });

  const scaleIn = (startFrame: number) => 
    interpolate(frame, [startFrame, startFrame + 30], [0.8, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease)
    });

  // Image zoom effect
  const imageScale = interpolate(frame, [0, 210], [1.08, 1.0], {
    easing: Easing.out(Easing.ease)
  });

  if (templateType === 'A') {
    return (
      <div style={{
        width: '1080px',
        height: '1920px',
        background: '#000000',
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden'
      }}>
        {/* Background Image */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '69.5%',
          overflow: 'hidden'
        }}>
          <img
            src={imageUrl || logoUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              transform: `scale(${imageScale})`
            }}
            alt="Background"
          />
        </div>

        {/* Content Section */}
        <div style={{
          padding: '20px 40px 40px 40px',
          height: '30.5%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '12px'
        }}>
          {/* Badge Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            marginTop: '20px',
            transform: `translateY(${slideFromTop(badgeStart)}px)`,
            opacity: fadeIn(badgeStart)
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1)',
              color: '#000',
              padding: '16px 32px',
              borderRadius: '25px',
              fontWeight: 900,
              fontSize: '24px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 6px 20px rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.2)'
            }}>
              📅 {badgeText}
            </div>
            <img
              src={logoUrl}
              alt="Logo"
              style={{
                height: '96px',
                width: 'auto',
                filter: 'brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                marginTop: '4px',
                transform: `translateX(${slideFromRight(logoStart)}px)`,
                opacity: fadeIn(logoStart)
              }}
            />
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '72px',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: '0.9',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            marginBottom: '12px',
            transform: `translateX(${slideFromLeft(titleStart)}px)`,
            opacity: fadeIn(titleStart)
          }}>
            {title}
          </h1>

          {/* Content Container */}
          <div style={{
            marginBottom: '24px',
            transform: `scale(${scaleIn(descStart)})`,
            opacity: fadeIn(descStart)
          }}>
            {subtitle && (
              <h2 style={{
                fontSize: '42px',
                color: '#f1f5f9',
                marginBottom: '16px',
                fontWeight: 600,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {subtitle}
              </h2>
            )}
            
            {description && (
              <p style={{
                fontSize: '32px',
                color: '#f1f5f9',
                lineHeight: '2.5',
                textAlign: 'left',
                margin: '16px 0',
                maxWidth: '96%',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                fontWeight: 500
              }}>
                {description}
              </p>
            )}
          </div>

          {/* Call to Action */}
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
            fontWeight: 800,
            fontSize: '32px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            opacity: fadeIn(90) // 3s
          }}>
            ➡️ <span>More Details</span>
          </div>
        </div>
      </div>
    );
  }

  // Template B with Myth/Fact sections
  return (
    <div style={{
      width: '1080px',
      height: '1920px',
      background: '#000000',
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Background with overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '69.5%',
        zIndex: 0
      }}>
        <img
          src={imageUrl || logoUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(8px)',
            opacity: 0.3,
            transform: `scale(${imageScale})`
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

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: '20px 40px 40px 40px',
        height: '30.5%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: '12px'
      }}>
        {/* Badge Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          marginTop: '60px',
          transform: `translateY(${slideFromTop(badgeStart)}px)`,
          opacity: fadeIn(badgeStart)
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1)',
            color: '#000',
            padding: '16px 32px',
            borderRadius: '25px',
            fontWeight: 900,
            fontSize: '24px',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            boxShadow: '0 6px 20px rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.2)'
          }}>
            ⚠️ {badgeText}
          </div>
          <img
            src={logoUrl}
            alt="Logo"
            style={{
              height: '96px',
              width: 'auto',
              filter: 'brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              marginTop: '4px',
              transform: `translateX(${slideFromRight(logoStart)}px)`,
              opacity: fadeIn(logoStart)
            }}
          />
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '72px',
          fontWeight: 900,
          color: '#ffffff',
          lineHeight: '0.9',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          marginBottom: '12px',
          transform: `translateX(${slideFromLeft(titleStart)}px)`,
          opacity: fadeIn(titleStart)
        }}>
          {title}
        </h1>

        {/* Myth Section */}
        {myth && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            transform: `translateY(${slideFromTop(mythStart)}px)`,
            opacity: fadeIn(mythStart)
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '41px', color: '#ef4444' }}>❌</span>
              <span style={{
                fontSize: '41px',
                fontWeight: 700,
                color: '#ef4444',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                The Myth
              </span>
            </div>
            <div style={{
              fontSize: '37px',
              color: '#e2e8f0',
              lineHeight: '1.4'
            }}>
              {myth}
            </div>
          </div>
        )}

        {/* Fact Section */}
        {fact && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            transform: `translateY(${slideFromTop(factStart)}px)`,
            opacity: fadeIn(factStart)
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '41px', color: '#22c55e' }}>✅</span>
              <span style={{
                fontSize: '41px',
                fontWeight: 700,
                color: '#22c55e',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                The Fact
              </span>
            </div>
            <div style={{
              fontSize: '37px',
              color: '#e2e8f0',
              lineHeight: '1.4'
            }}>
              {fact}
            </div>
          </div>
        )}

        {/* Contact Info */}
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
          fontWeight: 800,
          fontSize: '32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          opacity: fadeIn(90) // 3s
        }}>
          📞 📱 Call or WhatsApp us at +971 4 380 5515
        </div>
      </div>
    );
  }
};