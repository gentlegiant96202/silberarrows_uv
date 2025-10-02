import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Sequence } from 'remotion';

export const SundayTemplate = (props) => {
  // 4K scaling factor (2160x3840 vs 1080x1920)
  const SCALE = 2;
  const { title, description, imageUrl, badgeText = 'SUNDAY' } = props;
  
  // Convert <br> tags to React line breaks
  const renderTitleWithLineBreaks = (text: string) => {
    if (!text) return text;
    return text.split(/<br\s*\/?>/gi).map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };
  const frame = useCurrentFrame();
  
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const badgeScale = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const imageScale = interpolate(frame, [30, 90], [0.8, 1.1], { extrapolateRight: 'clamp' });
  const descOpacity = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: 'clamp' });
  const ctaOpacity = interpolate(frame, [150, 180], [0, 1], { extrapolateRight: 'clamp' });
  
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
      position: 'relative'
    }}>
      
      <Sequence from={0} durationInFrames={210}>
        <div style={{
          position: 'absolute',
          top: `${60 * SCALE}px`,
          left: '50%',
          transform: `translateX(-50%) scale(${badgeScale})`,
          background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
          padding: `${12 * SCALE}px ${24 * SCALE}px`,
          borderRadius: `${25 * SCALE}px`,
          fontSize: `${16 * SCALE}px`,
          fontWeight: 'bold',
          letterSpacing: `${2 * SCALE}px`
        }}>
          {badgeText}
        </div>
      </Sequence>

      <Sequence from={0} durationInFrames={210}>
        <h1 style={{
          opacity: titleOpacity,
          fontSize: `${48 * SCALE}px`,
          fontWeight: 'bold',
          textAlign: 'center',
          margin: `${100 * SCALE}px ${40 * SCALE}px ${40 * SCALE}px`,
          background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent'
        }}>
          {renderTitleWithLineBreaks(title)}
        </h1>
      </Sequence>

      {imageUrl && (
        <Sequence from={30} durationInFrames={180}>
          <img 
            src={imageUrl}
            style={{
              transform: `scale(${imageScale})`,
              borderRadius: `${20 * SCALE}px`,
              maxWidth: '70%',
              maxHeight: `${400 * SCALE}px`,
              objectFit: 'cover'
            }}
          />
        </Sequence>
      )}

      {description && (
        <Sequence from={90} durationInFrames={120}>
          <p style={{
            opacity: descOpacity,
            fontSize: `${20 * SCALE}px`,
            textAlign: 'center',
            margin: `${20 * SCALE}px ${40 * SCALE}px`,
            maxWidth: '80%'
          }}>
            {description}
          </p>
        </Sequence>
      )}

      <Sequence from={150} durationInFrames={60}>
        <div style={{
          opacity: ctaOpacity,
          position: 'absolute',
          bottom: `${80 * SCALE}px`,
          textAlign: 'center'
        }}>
          <p style={{ fontSize: `${24 * SCALE}px`, fontWeight: 'bold', margin: 0 }}>SilberArrows</p>
        </div>
      </Sequence>
    </div>
  );
};
