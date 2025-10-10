"use client";
import React from 'react';

interface LEDDisplayProps {
  value: string | number;
  label: string;
  color?: 'cyan' | 'green' | 'amber' | 'red' | 'white';
  size?: 'small' | 'medium' | 'large';
  prefix?: string;
  suffix?: string;
}

export default function LEDDisplay({
  value,
  label,
  color = 'cyan',
  size = 'medium',
  prefix = '',
  suffix = ''
}: LEDDisplayProps) {
  
  const colorMap = {
    cyan: {
      text: '#00d9ff',
      glow: 'rgba(0, 217, 255, 0.8)',
      bg: 'rgba(0, 217, 255, 0.1)'
    },
    green: {
      text: '#00ff88',
      glow: 'rgba(0, 255, 136, 0.8)',
      bg: 'rgba(0, 255, 136, 0.1)'
    },
    amber: {
      text: '#ffaa00',
      glow: 'rgba(255, 170, 0, 0.8)',
      bg: 'rgba(255, 170, 0, 0.1)'
    },
    red: {
      text: '#ff0055',
      glow: 'rgba(255, 0, 85, 0.8)',
      bg: 'rgba(255, 0, 85, 0.1)'
    },
    white: {
      text: '#ffffff',
      glow: 'rgba(255, 255, 255, 0.8)',
      bg: 'rgba(255, 255, 255, 0.1)'
    }
  };

  const sizeMap = {
    small: { fontSize: 'text-lg', padding: 'px-3 py-1', labelSize: 'text-[10px]' },
    medium: { fontSize: 'text-2xl', padding: 'px-4 py-2', labelSize: 'text-xs' },
    large: { fontSize: 'text-4xl', padding: 'px-6 py-3', labelSize: 'text-sm' }
  };

  const colorTheme = colorMap[color];
  const sizeTheme = sizeMap[size];

  return (
    <div className="relative">
      {/* LED Display Container */}
      <div 
        className={`relative ${sizeTheme.padding} bg-black/80 backdrop-blur-sm 
          border-2 rounded-lg overflow-hidden`}
        style={{
          borderColor: colorTheme.text,
          backgroundColor: colorTheme.bg,
          boxShadow: `
            inset 0 2px 4px rgba(0, 0, 0, 0.5),
            0 0 20px ${colorTheme.glow},
            0 0 40px ${colorTheme.glow}
          `
        }}
      >
        {/* Scan Line Effect */}
        <div 
          className="absolute inset-0 opacity-20 animate-scan"
          style={{
            background: `linear-gradient(
              to bottom,
              transparent 0%,
              ${colorTheme.glow} 50%,
              transparent 100%
            )`,
            animation: 'scan 3s linear infinite'
          }}
        />

        {/* Value Display */}
        <div className="relative flex items-baseline justify-center gap-1">
          {prefix && (
            <span 
              className="text-sm font-mono opacity-60"
              style={{ color: colorTheme.text }}
            >
              {prefix}
            </span>
          )}
          
          <span 
            className={`${sizeTheme.fontSize} font-mono font-bold tracking-wider tabular-nums`}
            style={{
              color: colorTheme.text,
              textShadow: `
                0 0 10px ${colorTheme.glow},
                0 0 20px ${colorTheme.glow},
                0 0 30px ${colorTheme.glow}
              `
            }}
          >
            {value}
          </span>

          {suffix && (
            <span 
              className="text-sm font-mono opacity-60"
              style={{ color: colorTheme.text }}
            >
              {suffix}
            </span>
          )}
        </div>

        {/* Corner Details */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: colorTheme.text, opacity: 0.3 }} />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: colorTheme.text, opacity: 0.3 }} />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: colorTheme.text, opacity: 0.3 }} />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: colorTheme.text, opacity: 0.3 }} />
      </div>

      {/* Label */}
      <div 
        className={`${sizeTheme.labelSize} text-center mt-1 font-semibold uppercase tracking-widest`}
        style={{ color: colorTheme.text, opacity: 0.7 }}
      >
        {label}
      </div>

      {/* Add scan animation */}
      <style jsx>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}

