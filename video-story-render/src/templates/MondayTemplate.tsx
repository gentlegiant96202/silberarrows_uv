import { useCurrentFrame, useVideoConfig, interpolate, Sequence } from 'remotion';

export const MondayTemplate = (props) => {
  const { title, description, imageUrl, myth, fact, badgeText = 'MONDAY' } = props;
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // 7-second story breakdown:
  // 0-1s (0-30 frames): Title and badge fade in
  // 1-3s (30-90 frames): Image zoom and myth reveal
  // 3-5s (90-150 frames): Fact reveal with transition
  // 5-7s (150-210 frames): Call to action and outro
  
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const badgeScale = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const imageScale = interpolate(frame, [30, 90], [0.8, 1.1], { extrapolateRight: 'clamp' });
  const mythY = interpolate(frame, [60, 90], [100, 0], { extrapolateRight: 'clamp' });
  const mythOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: 'clamp' });
  const factOpacity = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: 'clamp' });
  const factScale = interpolate(frame, [90, 120], [0.9, 1], { extrapolateRight: 'clamp' });
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
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%)',
        zIndex: 0
      }} />

      {/* Badge */}
      <Sequence from={0} durationInFrames={210}>
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: `translateX(-50%) scale(${badgeScale})`,
          background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
          padding: '12px 24px',
          borderRadius: '25px',
          fontSize: '16px',
          fontWeight: 'bold',
          letterSpacing: '2px',
          zIndex: 10
        }}>
          {badgeText}
        </div>
      </Sequence>

      {/* Title Sequence */}
      <Sequence from={0} durationInFrames={210}>
        <h1 style={{
          opacity: titleOpacity,
          fontSize: '52px',
          fontWeight: 'bold',
          textAlign: 'center',
          margin: '100px 40px 40px',
          background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          lineHeight: '1.2',
          zIndex: 5
        }}>
          {title}
        </h1>
      </Sequence>

      {/* Image Sequence */}
      {imageUrl && (
        <Sequence from={30} durationInFrames={180}>
          <img 
            src={imageUrl}
            style={{
              transform: `scale(${imageScale})`,
              borderRadius: '20px',
              maxWidth: '70%',
              maxHeight: '400px',
              objectFit: 'cover',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              zIndex: 5
            }}
          />
        </Sequence>
      )}

      {/* Myth Sequence */}
      {myth && (
        <Sequence from={60} durationInFrames={150}>
          <div style={{
            transform: `translateY(${mythY}px)`,
            opacity: mythOpacity,
            background: 'rgba(255, 107, 107, 0.2)',
            padding: '20px 30px',
            borderRadius: '15px',
            margin: '20px 40px',
            border: '2px solid #ff6b6b',
            backdropFilter: 'blur(10px)',
            maxWidth: '80%',
            zIndex: 5
          }}>
            <h3 style={{ 
              color: '#ff6b6b', 
              margin: '0 0 10px',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              MYTH:
            </h3>
            <p style={{ 
              fontSize: '18px', 
              margin: 0,
              lineHeight: '1.4'
            }}>
              {myth}
            </p>
          </div>
        </Sequence>
      )}

      {/* Fact Sequence */}
      {fact && (
        <Sequence from={90} durationInFrames={120}>
          <div style={{
            opacity: factOpacity,
            transform: `scale(${factScale})`,
            background: 'rgba(78, 205, 196, 0.2)',
            padding: '20px 30px',
            borderRadius: '15px',
            margin: '20px 40px',
            border: '2px solid #4ecdc4',
            backdropFilter: 'blur(10px)',
            maxWidth: '80%',
            zIndex: 5
          }}>
            <h3 style={{ 
              color: '#4ecdc4', 
              margin: '0 0 10px',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              FACT:
            </h3>
            <p style={{ 
              fontSize: '18px', 
              margin: 0,
              lineHeight: '1.4'
            }}>
              {fact}
            </p>
          </div>
        </Sequence>
      )}

      {/* Call to Action */}
      <Sequence from={150} durationInFrames={60}>
        <div style={{
          opacity: ctaOpacity,
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          zIndex: 10
        }}>
          <p style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 10px',
            background: 'linear-gradient(45deg, #fff, #ccc)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent'
          }}>
            SilberArrows
          </p>
          <p style={{
            fontSize: '16px',
            color: '#999',
            margin: 0
          }}>
            Premium Mercedes-Benz Service
          </p>
        </div>
      </Sequence>
    </div>
  );
};
