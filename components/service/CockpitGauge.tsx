"use client";
import React from 'react';

interface CockpitGaugeProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  size?: 'small' | 'medium' | 'large';
  showPercentage?: boolean;
  zones?: {
    red: number;  // 0-red threshold
    amber: number; // red-amber threshold
    green: number; // amber-green threshold (to 100)
  };
}

export default function CockpitGauge({
  value,
  max,
  label,
  unit = 'AED',
  size = 'medium',
  showPercentage = true,
  zones = { red: 60, amber: 80, green: 100 }
}: CockpitGaugeProps) {
  
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  
  // Determine color based on zones
  const getZoneColor = () => {
    if (clampedPercentage < zones.red) return {
      primary: '#ff0055',
      glow: 'rgba(255, 0, 85, 0.5)',
      text: '#ff4477'
    };
    if (clampedPercentage < zones.amber) return {
      primary: '#ffaa00',
      glow: 'rgba(255, 170, 0, 0.5)',
      text: '#ffcc44'
    };
    return {
      primary: '#00ff88',
      glow: 'rgba(0, 255, 136, 0.5)',
      text: '#44ffaa'
    };
  };

  const zoneColor = getZoneColor();
  
  // Size configurations
  const sizeConfig = {
    small: { diameter: 120, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-xs' },
    medium: { diameter: 160, strokeWidth: 10, fontSize: 'text-3xl', labelSize: 'text-sm' },
    large: { diameter: 200, strokeWidth: 12, fontSize: 'text-4xl', labelSize: 'text-base' }
  };

  const config = sizeConfig[size];
  const radius = (config.diameter - config.strokeWidth) / 2;
  const circumference = radius * Math.PI; // Semi-circle
  const offset = circumference - (clampedPercentage / 100) * circumference;

  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return val.toFixed(0);
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Gauge Container */}
      <div 
        className="relative flex items-center justify-center"
        style={{ width: config.diameter, height: config.diameter * 0.7 }}
      >
        {/* SVG Gauge */}
        <svg
          width={config.diameter}
          height={config.diameter * 0.7}
          className="transform rotate-180"
        >
          <defs>
            <linearGradient id={`gaugeGradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={zoneColor.primary} stopOpacity="0.3" />
              <stop offset="100%" stopColor={zoneColor.primary} stopOpacity="1" />
            </linearGradient>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background Arc - Red Zone */}
          <path
            d={`M ${config.strokeWidth/2},${config.diameter * 0.7 - config.strokeWidth/2} 
                A ${radius},${radius} 0 0 1 ${(zones.red/100) * config.diameter},${config.diameter * 0.7 - config.strokeWidth/2}`}
            fill="none"
            stroke="rgba(255, 0, 85, 0.2)"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Background Arc - Amber Zone */}
          <path
            d={`M ${(zones.red/100) * config.diameter},${config.diameter * 0.7 - config.strokeWidth/2}
                A ${radius},${radius} 0 0 1 ${(zones.amber/100) * config.diameter},${config.diameter * 0.7 - config.strokeWidth/2}`}
            fill="none"
            stroke="rgba(255, 170, 0, 0.2)"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Background Arc - Green Zone */}
          <path
            d={`M ${(zones.amber/100) * config.diameter},${config.diameter * 0.7 - config.strokeWidth/2}
                A ${radius},${radius} 0 0 1 ${config.diameter - config.strokeWidth/2},${config.diameter * 0.7 - config.strokeWidth/2}`}
            fill="none"
            stroke="rgba(0, 255, 136, 0.2)"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Progress Arc */}
          <path
            d={`M ${config.strokeWidth/2},${config.diameter * 0.7 - config.strokeWidth/2}
                A ${radius},${radius} 0 0 1 ${config.diameter - config.strokeWidth/2},${config.diameter * 0.7 - config.strokeWidth/2}`}
            fill="none"
            stroke={`url(#gaugeGradient-${label})`}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter={`url(#glow-${label})`}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${zoneColor.glow})`
            }}
          />
          
          {/* Zone Markers */}
          {[zones.red, zones.amber].map((zone, idx) => (
            <circle
              key={idx}
              cx={(zone/100) * config.diameter}
              cy={config.diameter * 0.7 - config.strokeWidth/2}
              r={3}
              fill="#ffffff"
              opacity={0.5}
            />
          ))}
        </svg>

        {/* Center Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Percentage */}
          {showPercentage && (
            <div 
              className={`${config.fontSize} font-bold font-mono tracking-tight`}
              style={{ 
                color: zoneColor.text,
                textShadow: `0 0 20px ${zoneColor.glow}, 0 0 40px ${zoneColor.glow}`
              }}
            >
              {clampedPercentage.toFixed(1)}%
            </div>
          )}
          
          {/* Value */}
          <div className="text-white/90 font-mono text-sm font-medium mt-1">
            {unit} {formatValue(value)}
          </div>
        </div>
      </div>

      {/* Label */}
      <div className={`${config.labelSize} text-white/60 font-semibold uppercase tracking-widest mt-2 text-center`}>
        {label}
      </div>

      {/* Status LED */}
      <div className="flex items-center gap-2 mt-2">
        <div 
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ 
            backgroundColor: zoneColor.primary,
            boxShadow: `0 0 10px ${zoneColor.glow}, 0 0 20px ${zoneColor.glow}`
          }}
        />
        <span className="text-xs text-white/40 font-mono">LIVE</span>
      </div>
    </div>
  );
}

