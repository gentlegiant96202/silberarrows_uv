'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface TransitionState {
  isActive: boolean;
  cardRect: DOMRect | null;
  gradient: string;
  lottieData: any;
}

export default function ModuleTransitionOverlay() {
  const [transition, setTransition] = useState<TransitionState>({
    isActive: false,
    cardRect: null,
    gradient: '',
    lottieData: null
  });
  const [animationPhase, setAnimationPhase] = useState<'card' | 'center'>('card');
  const isTransitioning = useRef(false);

  useEffect(() => {
    // Listen for module transition events
    const handleTransition = (e: CustomEvent) => {
      // Prevent multiple simultaneous transitions
      if (isTransitioning.current) {
        return;
      }
      
      isTransitioning.current = true;

      const { cardRect, gradient, lottieData } = e.detail;
      setTransition({
        isActive: true,
        cardRect,
        gradient,
        lottieData
      });
      setAnimationPhase('card');

      // Move to center quickly
      setTimeout(() => {
        setAnimationPhase('center');
      }, 150);

      // Fallback: If module doesn't signal completion within 5 seconds, hide anyway
      const fallbackTimer = setTimeout(() => {
        // Hide immediately on timeout
        setTransition({
          isActive: false,
          cardRect: null,
          gradient: '',
          lottieData: null
        });
        setAnimationPhase('card');
        isTransitioning.current = false; // Reset the lock on timeout too
      }, 5000); // Increased from 3s to 5s

      // Store the timer so we can clear it if the event fires
      (window as any).__transitionFallbackTimer = fallbackTimer;
    };

    const handleModuleLoaded = () => {
      // Clear fallback timer if it exists
      if ((window as any).__transitionFallbackTimer) {
        clearTimeout((window as any).__transitionFallbackTimer);
        delete (window as any).__transitionFallbackTimer;
      }
      
      // Hide immediately when module is visible
      setTransition({
        isActive: false,
        cardRect: null,
        gradient: '',
        lottieData: null
      });
      setAnimationPhase('card');
      isTransitioning.current = false; // Reset the lock
    };

    window.addEventListener('module-transition-start' as any, handleTransition);
    window.addEventListener('module-transition-complete' as any, handleModuleLoaded);
    
    return () => {
      window.removeEventListener('module-transition-start' as any, handleTransition);
      window.removeEventListener('module-transition-complete' as any, handleModuleLoaded);
      
      // Clean up fallback timer on unmount
      if ((window as any).__transitionFallbackTimer) {
        clearTimeout((window as any).__transitionFallbackTimer);
        delete (window as any).__transitionFallbackTimer;
      }
    };
  }, []);

  if (!transition.isActive) return null;

  const { cardRect, lottieData } = transition;

  // Calculate lottie position to match module loader exactly
  const getLottiePosition = () => {
    if (!cardRect) return { left: '50%', top: '50%' };

    if (animationPhase === 'card') {
      // Start at card center
      return {
        left: `${cardRect.left + cardRect.width / 2}px`,
        top: `${cardRect.top + cardRect.height / 2}px`,
      };
    } else {
      // Center position - calculate to match flexbox centering
      // MarketingLoadingContext uses: fixed inset-0 top-[72px] + flex center
      // This centers in the viewport area from 72px down
      const viewportHeight = window.innerHeight;
      const contentHeight = viewportHeight - 72;
      const centerY = 72 + (contentHeight / 2);
      
      return {
        left: '50%',
        top: `${centerY}px`,
      };
    }
  };

  const position = getLottiePosition();

  return (
    <>
      {/* Semi-transparent overlay - module content visible underneath */}
      <div
        className={`fixed inset-0 transition-all duration-600 ${
          animationPhase === 'center' 
            ? 'bg-black/80 backdrop-blur-sm' 
            : 'bg-black/0'
        }`}
        style={{ zIndex: 10000 }}
      />

      {/* Card placeholder that fades as lottie leaves */}
      {cardRect && animationPhase === 'card' && (
        <div
          className="fixed rounded-3xl bg-white/5 backdrop-blur-xl border border-white/20 transition-opacity duration-300"
          style={{
            left: `${cardRect.left}px`,
            top: `${cardRect.top}px`,
            width: `${cardRect.width}px`,
            height: `${cardRect.height}px`,
            zIndex: 10000,
            opacity: 0.5,
          }}
        />
      )}

      {/* Lottie Animation - 120px matching PulsatingLogo exactly */}
      {lottieData && (
        <div
          style={{
            position: 'fixed',
            left: position.left,
            top: position.top,
            transform: 'translate(-50%, -50%)',
            width: '120px',
            height: '120px',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            zIndex: 10001,
          }}
        >
          <Lottie
            animationData={lottieData}
            loop={true}
            autoplay={true}
            style={{
              width: '100%',
              height: '100%',
              filter: 'drop-shadow(0 0 30px rgba(255, 255, 255, 0.5))'
            }}
          />
        </div>
      )}
    </>
  );
}

