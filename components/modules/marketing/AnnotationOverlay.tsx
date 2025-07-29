import React, { useRef, useState } from 'react';

interface AnnotationOverlayProps {
  width: number | string;
  height: number | string;
  isActive: boolean;
  onSave: (path: string, comment: string) => void;
  onCancel?: () => void;
  existingPaths?: Array<{ d: string; color?: string }>;
}

const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
  width,
  height,
  isActive,
  onSave,
  onCancel,
  existingPaths = [],
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  // Mouse events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isActive) return;
    const { x, y } = getRelativeCoords(e);
    setCurrentPath(`M ${x} ${y}`);
    setIsDrawing(true);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isActive || !isDrawing) return;
    const { x, y } = getRelativeCoords(e);
    setCurrentPath((prev) => `${prev} L ${x} ${y}`);
    e.preventDefault();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isActive || !isDrawing) return;
    setIsDrawing(false);
    setShowComment(true);
    e.preventDefault();
  };

  const getRelativeCoords = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Save annotation
  const handleSave = () => {
    if (currentPath && comment.trim()) {
      onSave(currentPath, comment.trim());
      // Clear everything immediately to prevent glitches
      setCurrentPath('');
      setComment('');
      setShowComment(false);
      setIsDrawing(false);
    }
  };

  // Cancel annotation
  const handleCancel = () => {
    setCurrentPath('');
    setComment('');
    setShowComment(false);
    setIsDrawing(false);
    onCancel?.();
  };

  return (
    <>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 20,
          pointerEvents: isActive ? 'auto' : 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Existing annotations */}
        {existingPaths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            stroke={p.color || '#FFD700'}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
            style={{ pointerEvents: 'none' }}
          />
        ))}
        {/* Current drawing path */}
        {currentPath && (
          <path
            d={currentPath}
            stroke="#FFD700"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>
      {/* Comment popup - centered in viewport */}
      {showComment && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            background: 'rgba(0,0,0,0.95)',
            border: '2px solid #FFD700',
            borderRadius: 12,
            padding: 20,
            minWidth: 320,
            maxWidth: 400,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ color: '#FFD700', marginBottom: 12, fontSize: '16px', fontWeight: 'bold' }}>Add Comment</div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            style={{ 
              width: '100%', 
              minHeight: 80, 
              marginBottom: 16, 
              background: '#1a1a1a', 
              color: '#FFD700', 
              border: '1px solid #FFD700', 
              borderRadius: 6,
              padding: 12,
              fontSize: '14px',
              resize: 'vertical'
            }}
            placeholder="Enter your comment..."
            autoFocus
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button 
              onClick={handleCancel} 
              style={{ 
                background: 'transparent', 
                color: '#FFD700', 
                border: '2px solid #FFD700', 
                borderRadius: 6, 
                padding: '8px 20px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              style={{ 
                background: '#FFD700', 
                color: '#000', 
                border: 'none', 
                borderRadius: 6, 
                padding: '8px 20px', 
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: comment.trim() ? 'pointer' : 'not-allowed',
                opacity: comment.trim() ? 1 : 0.5,
                transition: 'all 0.2s'
              }} 
              disabled={!comment.trim()}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AnnotationOverlay; 