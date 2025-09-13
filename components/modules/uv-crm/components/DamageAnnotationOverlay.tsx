import React, { useRef, useState, useEffect } from 'react';

interface DamageMarker {
  id: string;
  x: number;
  y: number;
  damageType: 'B' | 'BR' | 'C' | 'CR' | 'D' | 'F' | 'FI' | 'L' | 'M' | 'P' | 'PA' | 'PC' | 'R' | 'RU' | 'S' | 'ST';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
}

interface DamageAnnotationOverlayProps {
  width: number | string;
  height: number | string;
  isActive: boolean;
  onDamageClick: (x: number, y: number) => void;
  onCancel?: () => void;
  existingMarkers?: DamageMarker[];
  viewBoxWidth?: number;
  viewBoxHeight?: number;
}

const DamageAnnotationOverlay: React.FC<DamageAnnotationOverlayProps> = ({
  width,
  height,
  isActive,
  onDamageClick,
  onCancel,
  existingMarkers = [],
  viewBoxWidth,
  viewBoxHeight,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
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

  const getSeverityColor = (severity: DamageMarker['severity']) => {
    switch (severity) {
      case 'minor': return '#FFA500'; // Orange
      case 'moderate': return '#FF6B35'; // Red-orange  
      case 'major': return '#FF0000'; // Red
      default: return '#FFD700'; // Gold
    }
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
    
    // Get the coordinates and immediately call our damage handler
    const { x, y } = getRelativeCoords(e);
    onDamageClick(x, y);
    
    // Clear the path
    setCurrentPath('');
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

  return (
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
        cursor: isActive ? 'crosshair' : 'default',
      }}
      viewBox={viewBoxWidth && viewBoxHeight ? `0 0 ${viewBoxWidth} ${viewBoxHeight}` : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Existing damage markers */}
      {existingMarkers.map((marker, i) => (
        <g key={marker.id || i}>
          {/* Marker circle background */}
          <circle
            cx={marker.x}
            cy={marker.y}
            r="32"
            fill={getSeverityColor(marker.severity)}
            stroke="white"
            strokeWidth="4"
            opacity={0.9}
            style={{ pointerEvents: 'none' }}
          />
          {/* Damage type text */}
          <text
            x={marker.x}
            y={marker.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize="20"
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            {marker.damageType}
          </text>
        </g>
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
  );
};

export default DamageAnnotationOverlay;
