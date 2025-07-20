import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

/**
 * Simple hook to check if user is admin
 * Less complex than useUserRole, designed to avoid hook order issues
 */
export function useIsAdminSimple(): { isAdmin: boolean; isLoading: boolean } {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user?.id) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Try database first
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData && !roleError) {
          setIsAdmin(roleData.role === 'admin');
          setIsLoading(false);
          return;
        }

        // Fallback to metadata (legacy system)
        const meta: any = user?.user_metadata || {};
        const appMeta: any = (user as any)?.app_metadata || {};
        
        const hasAdmin = (val: any) => typeof val === 'string' && val.toLowerCase() === 'admin';
        const arrayHasAdmin = (arr: any) => Array.isArray(arr) && arr.map((r: any) => String(r).toLowerCase()).includes('admin');
        
        const isAdminLegacy = hasAdmin(meta.role) || hasAdmin(appMeta.role) || arrayHasAdmin(meta.roles) || arrayHasAdmin(appMeta.roles);
        
        setIsAdmin(isAdminLegacy);
        setIsLoading(false);

      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setIsLoading(false);
      }
    }

    checkAdminStatus();
  }, [user?.id, user?.user_metadata, user?.app_metadata]); // More specific dependencies

  return { isAdmin, isLoading };
} 