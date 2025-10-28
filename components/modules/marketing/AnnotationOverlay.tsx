import React, { useRef, useState, useEffect } from 'react';

interface AnnotationOverlayProps {
  width: number | string;
  height: number | string;
  isActive: boolean;
  onSave: (data: { path: string; comment: string; svgWidth: number; svgHeight: number; lastPointerEvent?: React.PointerEvent }) => void;
  onCancel?: () => void;
  existingPaths?: Array<{ d: string; color?: string; svgWidth?: number; svgHeight?: number }>;
  viewBoxWidth?: number;
  viewBoxHeight?: number;
}

const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
  width,
  height,
  isActive,
  onSave,
  onCancel,
  existingPaths = [],
  viewBoxWidth,
  viewBoxHeight,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [lastPointer, setLastPointer] = useState<React.PointerEvent | undefined>(undefined);
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Observe size changes to keep scaling accurate
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const update = () => setSvgSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Local helper to scale simple M/L paths
  const scaleSvgPath = (d: string, scaleX: number, scaleY: number): string => {
    return d.replace(/([ML])\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)/g, (_m, cmd, x, y) => {
      const nx = Number(x) * scaleX;
      const ny = Number(y) * scaleY;
      return `${cmd} ${nx} ${ny}`;
    });
  };

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
    setLastPointer(e); // Store the last pointer event
    setShowComment(true);
    e.preventDefault();
  };

  const getRelativeCoords = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();

    // If a viewBox is provided, convert screen px to viewBox coordinates
    const vbW = viewBoxWidth ?? rect.width;
    const vbH = viewBoxHeight ?? rect.height;
    const scaleX = vbW / rect.width;
    const scaleY = vbH / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Save annotation
  const handleSave = () => {
    if (currentPath && comment.trim()) {
      const rect = svgRef.current?.getBoundingClientRect();
      const payload = {
        path: currentPath,
        comment: comment.trim(),
        svgWidth: (viewBoxWidth ?? rect?.width ?? 0),
        svgHeight: (viewBoxHeight ?? rect?.height ?? 0),
        lastPointerEvent: lastPointer,
      };
      onSave(payload);
      // Clear everything immediately to prevent glitches
      setCurrentPath('');
      setComment('');
      setShowComment(false);
      setIsDrawing(false);
      setLastPointer(undefined);
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
        viewBox={viewBoxWidth && viewBoxHeight ? `0 0 ${viewBoxWidth} ${viewBoxHeight}` : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Existing annotations */}
        {existingPaths.map((p, i) => {
          let d = p.d;
          if (p.svgWidth && p.svgHeight && svgSize.width > 0 && svgSize.height > 0) {
            const scaleX = svgSize.width / p.svgWidth;
            const scaleY = svgSize.height / p.svgHeight;
            d = scaleSvgPath(d, scaleX, scaleY);
          }
          return (
            <path
              key={i}
              d={d}
              stroke={p.color || '#FFD700'}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
              style={{ pointerEvents: 'none' }}
            />
          );
        })}
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