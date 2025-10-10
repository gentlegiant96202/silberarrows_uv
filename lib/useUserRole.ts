import { useState, useEffect } from 'react';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

interface UserRole {
  role: 'admin' | 'sales' | 'marketing' | 'service' | 'leasing' | 'accounts' | null;
  isAdmin: boolean;
  isSales: boolean;
  isMarketing: boolean;
  isService: boolean;
  isLeasing: boolean;
  isAccounts: boolean;
  hasRole: boolean; // New flag to check if user has any assigned role
  isLoading: boolean;
  error: string | null;
  
  // Legacy compatibility
  meta: any;
  appMeta: any;
  hasAdmin: (val: any) => boolean;
  arrayHasAdmin: (arr: any) => boolean;
  isAdminLegacy: boolean; // Your existing logic for comparison
}

/**
 * Hook for user role management during migration from metadata to database
 * Provides both new database-based roles and legacy metadata compatibility
 */
export function useUserRole(): UserRole {
  const { user } = useAuth();
  const [role, setRole] = useState<'admin' | 'sales' | 'marketing' | 'service' | 'leasing' | 'accounts' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stable reference to avoid infinite re-renders
  const userId = user?.id;

  // Legacy metadata (for backward compatibility during migration)
  // Always calculate these to avoid hook order issues
  const meta: any = user?.user_metadata || {};
  const appMeta: any = (user as any)?.app_metadata || {};
  
  // Legacy helper functions (exactly like your existing code)
  const hasAdmin = (val: any) => typeof val === 'string' && val.toLowerCase() === 'admin';
  const arrayHasAdmin = (arr: any) => Array.isArray(arr) && arr.map((r: any) => String(r).toLowerCase()).includes('admin');
  
  // Your existing admin check logic (for comparison/fallback)
  // Always calculate this regardless of user state to maintain hook order
  const isAdminLegacy = user ? (hasAdmin(meta.role) || hasAdmin(appMeta.role) || arrayHasAdmin(meta.roles) || arrayHasAdmin(appMeta.roles)) : false;

  useEffect(() => {
    async function fetchUserRole() {
      if (!user?.id) {
        setIsLoading(false);
        setRole(null); // No user = no role
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Method 1: Try database first (new system)
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData && !roleError) {
          // Found in database - use new system
          setRole(roleData.role);
          console.log('🆕 Using database role:', roleData.role);
          return;
        }

        if (roleError && roleError.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" - that's expected for new users
          console.warn('Database role lookup failed:', roleError.message);
        }

        // Check for legacy admin users only (not regular users)
        if (isAdminLegacy) {
          setRole('admin');
          console.log('📜 Using legacy admin role (fallback)');
          return;
        }

        // No role found - user needs admin to assign one
        setRole(null);
        console.log('ℹ️ User has no assigned role - awaiting admin assignment');

      } catch (err: any) {
        console.error('Error fetching user role:', err);
        setError(err.message);
        
        // On error, check legacy admin status only
        if (isAdminLegacy) {
          setRole('admin');
          console.log('⚠️ Error fallback to legacy admin role');
        } else {
          setRole(null);
          console.log('⚠️ Error - no role assigned');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserRole();
  }, [userId, isAdminLegacy]); // Use stable userId reference and include isAdminLegacy

  return {
    role,
    isAdmin: role === 'admin',
    isSales: role === 'sales',
    isMarketing: role === 'marketing',
    isService: role === 'service',
    isLeasing: role === 'leasing',
    isAccounts: role === 'accounts',
    hasRole: role !== null, // User has an assigned role
    isLoading,
    error,
    
    // Legacy compatibility for gradual migration
    meta,
    appMeta,
    hasAdmin,
    arrayHasAdmin,
    isAdminLegacy
  };
}

/**
 * Simple hook that just checks if current user is admin
 * Can be used as a drop-in replacement for your existing isAdmin logic
 */
export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { isAdmin, isLoading } = useUserRole();
  return { isAdmin, isLoading };
}

/**
 * Hook for admin-only components
 * Returns null if user is not admin or still loading
 */
export function useAdminOnly() {
  const { isAdmin, isLoading } = useUserRole();
  
  if (isLoading || !isAdmin) {
    return null;
  }
  
  return true;
}

// Export types for TypeScript
export type { UserRole }; 