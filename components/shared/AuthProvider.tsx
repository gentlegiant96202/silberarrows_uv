"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouteTracker } from "@/lib/useRouteTracker";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track route changes to store last visited module
  useRouteTracker();

  useEffect(() => {
    // Enhanced session restoration for PWA
    (async () => {
      try {
        // Force session refresh for PWA context
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          setSession(null);
          setUser(null);
        } else {
          setSession(data.session ?? null);
          setUser(data.session?.user ?? null);
          
          // Log for PWA debugging
          if (data.session) {
          } else {
          }
        }
      } catch (error) {
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();

    // Listen for auth state changes with PWA-specific handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      setSession(updatedSession);
      setUser(updatedSession?.user ?? null);
      
      // Store session info for PWA debugging
      if (typeof window !== 'undefined') {
        if (updatedSession) {
          localStorage.setItem('pwa_last_auth', new Date().toISOString());
        } else {
          localStorage.removeItem('pwa_last_auth');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setLoading(false);
        return { error: error.message };
      }
      
      // Manually update state to ensure immediate auth
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      
      // Give a tiny bit of time for cookie to be set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setLoading(false);
      return { error: null };
    } catch (err) {
      setLoading(false);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    setLoading(true);
    
    try {
      // Clear Supabase session
    await supabase.auth.signOut();
      
      // Clear any cached auth data from storage
      if (typeof window !== 'undefined') {
        // Clear localStorage items that might contain auth data
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase')) {
            localStorage.removeItem(key);
          }
        });
        
        // Clear the last visited module to ensure users go to module selection on next login
        localStorage.removeItem('lastVisitedModule');
        
        // Clear sessionStorage items
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('supabase')) {
            sessionStorage.removeItem(key);
          }
        });
      }
      
      // Force state update
      setSession(null);
      setUser(null);
    } catch (error) {
    } finally {
    setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    
    // Determine the correct redirect domain
    const getRedirectDomain = () => {
      if (typeof window === 'undefined') return 'https://portal.silberarrows.com';
      
      const hostname = window.location.hostname;
      
      // If on localhost, use localhost
      if (hostname === 'localhost') {
        return `${window.location.protocol}//${window.location.host}`;
      }
      
      // Always redirect to portal domain for production
      return 'https://portal.silberarrows.com';
    };
    
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${getRedirectDomain()}/login?confirmed=true`
      }
    });
    setLoading(false);
    return { error: error?.message ?? null };
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    
    // Determine the correct redirect domain
    const getRedirectDomain = () => {
      if (typeof window === 'undefined') return 'https://portal.silberarrows.com';
      
      const hostname = window.location.hostname;
      
      // If on localhost, use localhost
      if (hostname === 'localhost') {
        return `${window.location.protocol}//${window.location.host}`;
      }
      
      // Always redirect to portal domain for production
      return 'https://portal.silberarrows.com';
    };
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getRedirectDomain()}/update-password`,
    });
    setLoading(false);
    return { error: error?.message ?? null };
  };

  const refreshUser = async () => {
    try {
      // Force refresh the user session to get updated metadata
      const { data: { user: refreshedUser }, error } = await supabase.auth.getUser();
      if (error) {
        return;
      }
      
      // Update the user state with fresh data
      setUser(refreshedUser);
    } catch (error) {
    }
  };

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signIn,
    signUp,
    resetPassword,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
} 