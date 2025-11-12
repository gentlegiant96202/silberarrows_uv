'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import PulsatingLogo from '@/components/shared/PulsatingLogo';

interface MarketingLoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

const MarketingLoadingContext = createContext<MarketingLoadingContextType | undefined>(undefined);

export function useMarketingLoading() {
  const context = useContext(MarketingLoadingContext);
  if (!context) {
    throw new Error('useMarketingLoading must be used within MarketingLoadingProvider');
  }
  return context;
}

interface MarketingLoadingProviderProps {
  children: ReactNode;
}

export function MarketingLoadingProvider({ children }: MarketingLoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const loadingStartTime = useRef<number>(Date.now());

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
    if (!loading) {
      // Signal that module content is ACTUALLY loaded
      window.dispatchEvent(new Event('module-transition-complete'));
      
      // Ensure minimum display time of 500ms to prevent flashing
      const elapsed = Date.now() - loadingStartTime.current;
      const minDisplayTime = 500;
      const delay = Math.max(minDisplayTime - elapsed, 0);
      
      // Start fade-out animation
      setTimeout(() => {
        setFadeOut(true);
        // Remove from DOM after fade completes
        setTimeout(() => setShowLoader(false), 500);
      }, delay);
    } else {
      loadingStartTime.current = Date.now();
      setFadeOut(false);
      setShowLoader(true);
    }
  };

  return (
    <MarketingLoadingContext.Provider value={{ isLoading, setLoading }}>
      <div className="relative h-full">
        {/* Global loading overlay - Lottie floats above skeleton loaders */}
        {showLoader && (
          <div 
            className={`fixed inset-0 top-[72px] z-[100] flex items-center justify-center pointer-events-none transition-opacity duration-500 ${
              fadeOut ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <PulsatingLogo size={120} showText={false} />
          </div>
        )}
        
        {/* Content - always visible, skeleton loaders show while loading */}
        <div className="h-full">
          {children}
        </div>
      </div>
    </MarketingLoadingContext.Provider>
  );
}

