import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';
import { useUserRole } from '@/lib/useUserRole';

interface ModulePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AllModulePermissions {
  uv_crm: ModulePermissions;
  marketing: ModulePermissions;
  workshop: ModulePermissions;
  leasing: ModulePermissions;
  accounts: ModulePermissions;
  admin: ModulePermissions;
  service: ModulePermissions;
  isLoading: boolean;
  error: string | null;
}

interface UserWithRole {
  id: string;
  email: string;
  role: 'admin' | 'sales' | 'marketing' | 'service' | 'leasing';
  created_at: string;
  updated_at: string;
}

/**
 * Hook to get permissions for a specific module
 */
export function useModulePermissions(moduleName: string): ModulePermissions {
  const { user } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const [permissions, setPermissions] = useState<ModulePermissions>({
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchPermissions() {
      if (!user?.id) {
        setPermissions({
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          isLoading: false,
          error: 'No user found',
        });
        return;
      }

      // Wait for role to load
      if (roleLoading) {
        return;
      }

      try {
        setPermissions(prev => ({ ...prev, isLoading: true, error: null }));

        // Use proper RPC-based permissions system
        const { data, error } = await supabase.rpc('get_user_module_permissions', {
          check_user_id: user.id,
          module_name: moduleName,
        });

        if (error) {
          console.error(`Error fetching permissions for ${moduleName}:`, error);
          // Fallback to static role-based permissions if RPC fails
          const isAdmin = role === 'admin';
          const hasModuleAccess = isAdmin || (
            (role === 'marketing' && moduleName === 'marketing') ||
            (role === 'sales' && (moduleName === 'uv_crm' || moduleName === 'inventory')) ||
            (role === 'service' && moduleName === 'service') ||
            (role === 'leasing' && moduleName === 'leasing')
          );

          setPermissions({
            canView: hasModuleAccess,
            canCreate: hasModuleAccess,
            canEdit: hasModuleAccess,
            canDelete: isAdmin,
            isLoading: false,
            error: `RPC failed, using fallback: ${error.message}`,
          });
        } else if (data && data.length > 0) {
          // Use RPC permissions
          const perms = data[0];
          setPermissions({
            canView: perms.can_view || false,
            canCreate: perms.can_create || false,
            canEdit: perms.can_edit || false,
            canDelete: perms.can_delete || false,
            isLoading: false,
            error: null,
          });
        } else {
          // No permissions found in database - deny access
          setPermissions({
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            isLoading: false,
            error: null,
          });
        }
      } catch (err: any) {
        console.error('Error in useModulePermissions:', err);
        setPermissions({
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          isLoading: false,
          error: err.message || 'Failed to fetch permissions',
        });
      }
    }

    fetchPermissions();
  }, [user?.id, moduleName, role, roleLoading]);

  return permissions;
}

/**
 * Hook to get permissions for all modules at once
 */
export function useAllModulePermissions(): AllModulePermissions {
  const { user } = useAuth();
  const [allPermissions, setAllPermissions] = useState<AllModulePermissions>({
    uv_crm: { canView: false, canCreate: false, canEdit: false, canDelete: false, isLoading: true, error: null },
    marketing: { canView: false, canCreate: false, canEdit: false, canDelete: false, isLoading: true, error: null },
    workshop: { canView: false, canCreate: false, canEdit: false, canDelete: false, isLoading: true, error: null },
    leasing: { canView: false, canCreate: false, canEdit: false, canDelete: false, isLoading: true, error: null },
    accounts: { canView: false, canCreate: false, canEdit: false, canDelete: false, isLoading: true, error: null },
    admin: { canView: false, canCreate: false, canEdit: false, canDelete: false, isLoading: true, error: null },
    service: { canView: false, canCreate: false, canEdit: false, canDelete: false, isLoading: true, error: null },
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchAllPermissions() {
      if (!user?.id) {
        const emptyPerms = { canView: false, canCreate: false, canEdit: false, canDelete: false, isLoading: false, error: null };
        setAllPermissions({
          uv_crm: emptyPerms,
          marketing: emptyPerms,
          workshop: emptyPerms,
          leasing: emptyPerms,
          accounts: emptyPerms,
          admin: emptyPerms,
          service: emptyPerms,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        setAllPermissions(prev => ({ ...prev, isLoading: true, error: null }));

        const modules = ['uv_crm', 'marketing', 'workshop', 'leasing', 'accounts', 'admin', 'service'];
        const permissionPromises = modules.map(module =>
          supabase.rpc('get_user_module_permissions', {
            check_user_id: user.id,
            module_name: module,
          })
        );

        const results = await Promise.all(permissionPromises);
        const newPermissions: any = { isLoading: false, error: null };

        modules.forEach((module, index) => {
          const result = results[index];
          
          if (result.error) {
            console.error(`Error fetching permissions for ${module}:`, result.error);
            newPermissions[module] = {
              canView: false,
              canCreate: false,
              canEdit: false,
              canDelete: false,
              isLoading: false,
              error: result.error.message,
            };
          } else if (result.data && result.data.length > 0) {
            const perms = result.data[0];
            newPermissions[module] = {
              canView: perms.can_view || false,
              canCreate: perms.can_create || false,
              canEdit: perms.can_edit || false,
              canDelete: perms.can_delete || false,
              isLoading: false,
              error: null,
            };
          } else {
            // No permissions found - default to no access
            newPermissions[module] = {
              canView: false,
              canCreate: false,
              canEdit: false,
              canDelete: false,
              isLoading: false,
              error: null,
            };
          }

        });

        setAllPermissions(newPermissions);
      } catch (err: any) {
        console.error('Error in useAllModulePermissions:', err);
        const errorPerms = { canView: false, canCreate: false, canEdit: false, canDelete: false, isLoading: false, error: err.message };
        setAllPermissions({
          uv_crm: errorPerms,
          marketing: errorPerms,
          workshop: errorPerms,
          leasing: errorPerms,
          accounts: errorPerms,
          admin: errorPerms,
          service: errorPerms,
          isLoading: false,
          error: err.message || 'Failed to fetch permissions',
        });

      }
    }

    fetchAllPermissions();
  }, [user?.id]);

  return allPermissions;
}

/**
 * Helper hook for common permission checks
 */
export function usePermissionHelpers() {
  const { user } = useAuth();
  
  const checkModuleAccess = async (moduleName: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const { data, error } = await supabase.rpc('get_user_module_permissions', {
        check_user_id: user.id,
        module_name: moduleName,
      });
      
      if (error || !data || data.length === 0) return false;
      return data[0].can_view || false;
    } catch (err) {
      console.error('Error checking module access:', err);
      return false;
    }
  };

  const checkPermission = async (moduleName: string, permissionType: 'view' | 'create' | 'edit' | 'delete'): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const { data, error } = await supabase.rpc('get_user_module_permissions', {
        check_user_id: user.id,
        module_name: moduleName,
      });
      
      if (error || !data || data.length === 0) return false;
      
      const perms = data[0];
      switch (permissionType) {
        case 'view': return perms.can_view || false;
        case 'create': return perms.can_create || false;
        case 'edit': return perms.can_edit || false;
        case 'delete': return perms.can_delete || false;
        default: return false;
      }
    } catch (err) {
      console.error('Error checking permission:', err);
      return false;
    }
  };

  return {
    checkModuleAccess,
    checkPermission,
  };
} 