import { useCurrentFrame, useVideoConfig, interpolate, Sequence } from 'remotion';

export const TuesdayTemplate = (props) => {
  const { title, description, imageUrl, problem, solution, badgeText = 'TUESDAY' } = props;
  const frame = useCurrentFrame();
  
  // 7-second story breakdown for Tech Tips Tuesday
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const badgeScale = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const imageScale = interpolate(frame, [30, 90], [0.8, 1.1], { extrapolateRight: 'clamp' });
  const problemOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: 'clamp' });
  const solutionOpacity = interpolate(frame, [120, 150], [0, 1], { extrapolateRight: 'clamp' });
  const ctaOpacity = interpolate(frame, [180, 210], [0, 1], { extrapolateRight: 'clamp' });
  
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
          background: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
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
          background: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent'
        }}>
          {title}
        </h1>
      </Sequence>

      {/* Image */}
      {imageUrl && (
        <Sequence from={30} durationInFrames={180}>
          <img 
            src={imageUrl}
            style={{
              transform: `scale(${imageScale})`,
              borderRadius: '20px',
              maxWidth: '70%',
              maxHeight: '400px',
              objectFit: 'cover'
            }}
          />
        </Sequence>
      )}

      {/* Problem */}
      {problem && (
        <Sequence from={60} durationInFrames={150}>
          <div style={{
            opacity: problemOpacity,
            background: 'rgba(239, 68, 68, 0.2)',
            padding: '20px 30px',
            borderRadius: '15px',
            margin: '20px 40px',
            border: '2px solid #ef4444',
            maxWidth: '80%'
          }}>
            <h3 style={{ color: '#ef4444', margin: '0 0 10px', fontSize: '20px', fontWeight: 'bold' }}>PROBLEM:</h3>
            <p style={{ fontSize: '18px', margin: 0 }}>{problem}</p>
          </div>
        </Sequence>
      )}

      {/* Solution */}
      {solution && (
        <Sequence from={120} durationInFrames={90}>
          <div style={{
            opacity: solutionOpacity,
            background: 'rgba(34, 197, 94, 0.2)',
            padding: '20px 30px',
            borderRadius: '15px',
            margin: '20px 40px',
            border: '2px solid #22c55e',
            maxWidth: '80%'
          }}>
            <h3 style={{ color: '#22c55e', margin: '0 0 10px', fontSize: '20px', fontWeight: 'bold' }}>SOLUTION:</h3>
            <p style={{ fontSize: '18px', margin: 0 }}>{solution}</p>
          </div>
        </Sequence>
      )}

      {/* Call to Action */}
      <Sequence from={180} durationInFrames={30}>
        <div style={{
          opacity: ctaOpacity,
          position: 'absolute',
          bottom: '80px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>SilberArrows</p>
        </div>
      </Sequence>
    </div>
  );
};
