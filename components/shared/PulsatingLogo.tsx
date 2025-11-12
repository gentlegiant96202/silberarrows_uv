'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// Global cache for Lottie animation data to prevent multiple fetches
let globalLottieCache: any = null;
let globalLottieFetchPromise: Promise<any> | null = null;
let globalLottieError = false;

// Utility function to clear the Lottie cache (useful when updating the Lottie file)
export function clearLottieCache() {
  globalLottieCache = null;
  globalLottieFetchPromise = null;
  globalLottieError = false;
}

interface PulsatingLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  text?: string;
  useLottie?: boolean; // Option to use Lottie or fallback to image
  lottieData?: any; // JSON animation data
}

export default function PulsatingLogo({ 
  size = 48, 
  className = "", 
  showText = true, 
  text = "Loading...",
  useLottie = true,
  lottieData = null
}: PulsatingLogoProps) {
  const [animationData, setAnimationData] = useState<any>(globalLottieCache);
  const [loadError, setLoadError] = useState(globalLottieError);

  useEffect(() => {
    // If lottieData is provided directly, use it
    if (lottieData) {
      setAnimationData(lottieData);
      return;
    }

    // If we already have cached data, use it immediately
    if (globalLottieCache) {
      setAnimationData(globalLottieCache);
      return;
    }

    // If there was a previous error, use it
    if (globalLottieError) {
      setLoadError(true);
      return;
    }

    // Try to load the Lottie JSON file from public folder
    if (useLottie) {
      // If a fetch is already in progress, reuse it
      if (!globalLottieFetchPromise) {
        // Add cache-busting timestamp to ensure fresh data when file changes
        const cacheBuster = Date.now();
        globalLottieFetchPromise = fetch(`/animations/loader.json?v=${cacheBuster}`)
          .then(res => {
            if (!res.ok) throw new Error('Failed to load animation');
            return res.json();
          })
          .then(data => {
            globalLottieCache = data;
            return data;
          })
          .catch(err => {
            globalLottieError = true;
            throw err;
          });
      }

      globalLottieFetchPromise
        .then(data => setAnimationData(data))
        .catch(() => setLoadError(true));
    }
  }, [useLottie, lottieData]);

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Loader - Lottie or Image fallback */}
      <div className="relative" style={{ width: size, height: size }}>
        {useLottie && animationData && !loadError ? (
          <Lottie 
            animationData={animationData}
            loop={true}
            autoplay={true}
            style={{ width: size, height: size }}
          />
        ) : useLottie && !loadError ? (
          // Loading Lottie - show nothing while animation data is being fetched
          <div style={{ width: size, height: size }} />
        ) : (
          // Lottie failed to load or not using Lottie - show static image fallback
          <Image
            src="/MAIN LOGO.png"
            alt="SilberArrows Logo"
            width={size}
            height={size}
            className="object-contain animate-pulse"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(209, 213, 219, 0.4))',
              animation: 'logoGlow 2s ease-in-out infinite'
            }}
          />
        )}
      </div>
      
      {/* Optional Loading Text */}
      {showText && (
        <p className="text-white/70 text-sm animate-pulse">{text}</p>
      )}
    </div>
  );
}
