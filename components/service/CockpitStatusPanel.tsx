"use client";
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatusItem {
  label: string;
  value: string;
  status: 'normal' | 'warning' | 'critical' | 'success';
  icon?: LucideIcon;
}

interface CockpitStatusPanelProps {
  title: string;
  items: StatusItem[];
}

export default function CockpitStatusPanel({ title, items }: CockpitStatusPanelProps) {
  
  const statusColors = {
    normal: {
      led: '#00d9ff',
      text: '#00d9ff',
      glow: 'rgba(0, 217, 255, 0.5)'
    },
    success: {
      led: '#00ff88',
      text: '#00ff88',
      glow: 'rgba(0, 255, 136, 0.5)'
    },
    warning: {
      led: '#ffaa00',
      text: '#ffaa00',
      glow: 'rgba(255, 170, 0, 0.5)'
    },
    critical: {
      led: '#ff0055',
      text: '#ff0055',
      glow: 'rgba(255, 0, 85, 0.5)'
    }
  };

  return (
    <div className="relative bg-black/90 backdrop-blur-xl border border-cyan-500/30 rounded-lg overflow-hidden">
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50" />

      {/* Header */}
      <div className="relative border-b border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-transparent p-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-cyan-400" style={{ boxShadow: '0 0 10px rgba(0, 217, 255, 0.8)' }} />
          <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-400">
            {title}
          </h3>
        </div>
      </div>

      {/* Status Items */}
      <div className="p-4 space-y-3">
        {items.map((item, index) => {
          const colorTheme = statusColors[item.status];
          const Icon = item.icon;

          return (
            <div 
              key={index}
              className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10 hover:border-cyan-500/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                {/* Status LED */}
                <div className="relative">
                  <div 
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{
                      backgroundColor: colorTheme.led,
                      boxShadow: `0 0 10px ${colorTheme.glow}, 0 0 20px ${colorTheme.glow}`
                    }}
                  />
                  {/* Pulse ring */}
                  <div 
                    className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
                    style={{
                      backgroundColor: colorTheme.led,
                      opacity: 0.4
                    }}
                  />
                </div>

                {/* Icon */}
                {Icon && (
                  <Icon 
                    className="w-4 h-4"
                    style={{ color: colorTheme.text }}
                  />
                )}

                {/* Label */}
                <span className="text-xs text-white/70 font-medium uppercase tracking-wide">
                  {item.label}
                </span>
              </div>

              {/* Value */}
              <span 
                className="text-sm font-mono font-bold"
                style={{
                  color: colorTheme.text,
                  textShadow: `0 0 10px ${colorTheme.glow}`
                }}
              >
                {item.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Grid Overlay Effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 217, 255, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 217, 255, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
    </div>
  );
}

