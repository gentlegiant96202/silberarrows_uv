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
          console.warn('PWA Auth: Session restoration error:', error);
          setSession(null);
          setUser(null);
        } else {
          setSession(data.session ?? null);
          setUser(data.session?.user ?? null);
          
          // Log for PWA debugging
          if (data.session) {
            console.log('✅ PWA Auth: Session restored successfully');
          } else {
            console.log('ℹ️ PWA Auth: No existing session found');
          }
        }
      } catch (error) {
        console.error('PWA Auth: Session restoration failed:', error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();

    // Listen for auth state changes with PWA-specific handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      console.log('PWA Auth: State change event:', _event, !!updatedSession);
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    return { error: error?.message ?? null };
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
      console.error('Error during logout:', error);
    } finally {
    setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/login?confirmed=true`
      }
    });
    setLoading(false);
    return { error: error?.message ?? null };
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setLoading(false);
    return { error: error?.message ?? null };
  };

  const refreshUser = async () => {
    try {
      // Force refresh the user session to get updated metadata
      const { data: { user: refreshedUser }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error refreshing user:', error);
        return;
      }
      
      // Update the user state with fresh data
      setUser(refreshedUser);
      console.log('✅ User data refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh user data:', error);
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