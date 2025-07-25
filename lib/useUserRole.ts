import { useState, useEffect } from 'react';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

interface UserRole {
  role: 'admin' | 'user';
  isAdmin: boolean;
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
  const [role, setRole] = useState<'admin' | 'user'>('user');
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
        setRole('user'); // Set default role
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Method 1: Try database first (new system) - TEMPORARILY DISABLED TO FIX 500 ERRORS
        // let roleData = null;
        // let roleError = { message: 'Temporarily disabled' };
        
        // Uncomment when database issues are fixed:
        // const { data: roleData, error: roleError } = await supabase
        //   .from('user_roles')
        //   .select('role')
        //   .eq('user_id', user.id)
        //   .single();

        // if (roleData && !roleError) {
        //   // Found in database - use new system
        //   setRole(roleData.role);
        //   console.log('🆕 Using database role:', roleData.role);
        //   return;
        // }

        // Method 2: Use helper function (checks both database and metadata)
        const { data: helperResult, error: helperError } = await supabase
          .rpc('get_user_role', { check_user_id: user.id });

        if (helperResult && !helperError) {
          setRole(helperResult);
          console.log('🔄 Using helper function role:', helperResult);
          return;
        }

        // Method 3: Fallback to legacy metadata logic
        const legacyRole = isAdminLegacy ? 'admin' : 'user';
        setRole(legacyRole);
        console.log('📜 Using legacy metadata role:', legacyRole);

        // Auto-migrate user if using legacy
        if (roleError || helperError) {
          console.log('🔄 Auto-migrating user to database...');
          try {
            await supabase.rpc('migrate_user_role', { migrate_user_id: user.id });
          } catch (migrationError) {
            console.warn('Migration failed:', migrationError);
          }
        }

      } catch (err: any) {
        console.error('Error fetching user role:', err);
        setError(err.message);
        
        // Ultimate fallback to legacy logic
        const legacyRole = isAdminLegacy ? 'admin' : 'user';
        setRole(legacyRole);
        console.log('⚠️ Error fallback to legacy role:', legacyRole);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserRole();
  }, [userId]); // Use stable userId reference

  return {
    role,
    isAdmin: role === 'admin',
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