'use client';

import { supabase } from './supabaseClient';

/**
 * Enhanced authentication utilities for PWA/Mobile context
 * Handles iOS Safari and standalone PWA session persistence issues
 */

// Check if we're running in PWA standalone mode
export const isPWAStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for PWA standalone mode
  // Cast navigator to any to access iOS-specific standalone property
  const isStandalone = (window.navigator as any).standalone || 
                      window.matchMedia('(display-mode: standalone)').matches ||
                      window.matchMedia('(display-mode: fullscreen)').matches;
  
  return isStandalone;
};

// Enhanced session restoration for PWA
export const restorePWASession = async () => {
  try {
    // Force session refresh with retry logic for PWA
    let retries = 3;
    let session = null;
    
    while (retries > 0 && !session) {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn(`PWA Auth: Session restoration attempt ${4 - retries} failed:`, error);
        retries--;
        
        if (retries > 0) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        continue;
      }
      
      session = data.session;
      break;
    }
    
    if (session) {
      console.log('✅ PWA Auth: Session restored after', 4 - retries, 'attempts');
      
      // Store successful restoration timestamp
      localStorage.setItem('pwa_session_restored', new Date().toISOString());
      
      return { session, user: session.user, error: null };
    } else {
      console.log('ℹ️ PWA Auth: No session found after all attempts');
      return { session: null, user: null, error: null };
    }
    
  } catch (error) {
    console.error('PWA Auth: Critical session restoration failure:', error);
    return { session: null, user: null, error };
  }
};

// PWA-specific sign in with enhanced persistence
export const signInPWA = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      return { error: error.message };
    }
    
    // Additional PWA session validation
    if (data.session) {
      // Store PWA-specific auth markers
      localStorage.setItem('pwa_auth_success', new Date().toISOString());
      localStorage.setItem('pwa_user_email', email);
      
      console.log('✅ PWA Auth: Sign in successful, session stored');
    }
    
    return { error: null };
  } catch (error) {
    console.error('PWA Auth: Sign in failed:', error);
    return { error: 'Authentication failed' };
  }
};

// Check PWA session health
export const checkPWASessionHealth = () => {
  if (typeof window === 'undefined') return false;
  
  const lastAuth = localStorage.getItem('pwa_last_auth');
  const sessionRestored = localStorage.getItem('pwa_session_restored');
  
  if (!lastAuth || !sessionRestored) {
    console.log('ℹ️ PWA Auth: No session markers found');
    return false;
  }
  
  const lastAuthTime = new Date(lastAuth).getTime();
  const now = Date.now();
  const hoursSinceAuth = (now - lastAuthTime) / (1000 * 60 * 60);
  
  // Session should be valid for 24 hours
  if (hoursSinceAuth > 24) {
    console.log('⚠️ PWA Auth: Session expired (>24h)');
    return false;
  }
  
  console.log(`✅ PWA Auth: Session healthy (${hoursSinceAuth.toFixed(1)}h old)`);
  return true;
};
