import { useCurrentFrame, useVideoConfig, interpolate, Sequence } from 'remotion';

export const WednesdayTemplate = (props) => {
  const { title, description, imageUrl, car_model, current_mileage_km, horsepower_hp, badgeText = 'WEDNESDAY' } = props;
  const frame = useCurrentFrame();
  
  // 7-second story breakdown for Car Spotlight Wednesday
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const badgeScale = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const imageScale = interpolate(frame, [30, 120], [0.8, 1.2], { extrapolateRight: 'clamp' });
  const specsOpacity = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: 'clamp' });
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
      
      {/* Badge */}
      <Sequence from={0} durationInFrames={210}>
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: `translateX(-50%) scale(${badgeScale})`,
          background: 'linear-gradient(45deg, #f59e0b, #d97706)',
          padding: '12px 24px',
          borderRadius: '25px',
          fontSize: '16px',
          fontWeight: 'bold',
          letterSpacing: '2px'
        }}>
          {badgeText}
        </div>
      </Sequence>

      {/* Title */}
      <Sequence from={0} durationInFrames={210}>
        <h1 style={{
          opacity: titleOpacity,
          fontSize: '48px',
          fontWeight: 'bold',
          textAlign: 'center',
          margin: '100px 40px 40px',
          background: 'linear-gradient(45deg, #f59e0b, #d97706)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent'
        }}>
          {car_model || title}
        </h1>
      </Sequence>

      {/* Car Image */}
      {imageUrl && (
        <Sequence from={30} durationInFrames={180}>
          <img 
            src={imageUrl}
            style={{
              transform: `scale(${imageScale})`,
              borderRadius: '20px',
              maxWidth: '80%',
              maxHeight: '500px',
              objectFit: 'cover',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}
          />
        </Sequence>
      )}

      {/* Car Specs */}
      <Sequence from={90} durationInFrames={120}>
        <div style={{
          opacity: specsOpacity,
          display: 'flex',
          gap: '40px',
          margin: '30px 0',
          padding: '20px 40px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '15px',
          border: '1px solid rgba(245, 158, 11, 0.3)'
        }}>
          {current_mileage_km && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {current_mileage_km.toLocaleString()}
              </div>
              <div style={{ fontSize: '14px', color: '#ccc' }}>KM</div>
            </div>
          )}
          {horsepower_hp && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {horsepower_hp}
              </div>
              <div style={{ fontSize: '14px', color: '#ccc' }}>HP</div>
            </div>
          )}
        </div>
      </Sequence>

      {/* Call to Action */}
      <Sequence from={150} durationInFrames={60}>
        <div style={{
          opacity: ctaOpacity,
          position: 'absolute',
          bottom: '80px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px' }}>SilberArrows</p>
          <p style={{ fontSize: '16px', color: '#999', margin: 0 }}>Premium Mercedes-Benz</p>
        </div>
      </Sequence>
    </div>
  );
};
