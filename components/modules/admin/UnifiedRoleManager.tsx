"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/useUserRole';
import { User, Shield, Users, Briefcase, Wrench, Key, Settings, ChevronRight, ChevronDown, Calculator } from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  role: 'admin' | 'sales' | 'sales_head' | 'marketing' | 'marketing_head' | 'service' | 'service_head' | 'leasing' | 'leasing_head' | 'accounts' | 'accounts_head';
  created_at: string;
}

interface Module {
  name: string;
  display_name: string;
  description: string;
  icon?: string;
}

interface RolePermission {
  role: string;
  module_name: string;
  module_display_name: string;
  module_description: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const ROLE_CONFIGS = [
  { 
    id: 'admin', 
    name: 'Admin', 
    description: 'System administrators - full access to everything', 
    color: 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700', 
    icon: Shield 
  },
  { 
    id: 'sales', 
    name: 'Sales', 
    description: 'Sales team - UV CRM + limited inventory access', 
    color: 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700', 
    icon: Users 
  },
  { 
    id: 'sales_head', 
    name: 'Sales Head', 
    description: 'Sales department head - permissions set by admin', 
    color: 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700', 
    icon: Users 
  },
  { 
    id: 'marketing', 
    name: 'Marketing', 
    description: 'Marketing team - UV CRM + inventory + marketing dashboard', 
    color: 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700', 
    icon: Briefcase 
  },
  { 
    id: 'marketing_head', 
    name: 'Marketing Head', 
    description: 'Marketing department head - permissions set by admin', 
    color: 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700', 
    icon: Briefcase 
  },
  { 
    id: 'service', 
    name: 'Service', 
    description: 'Workshop team - service department access only', 
    color: 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700', 
    icon: Wrench 
  },
  { 
    id: 'service_head', 
    name: 'Service Head', 
    description: 'Service department head - permissions set by admin', 
    color: 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700', 
    icon: Wrench 
  },
  { 
    id: 'leasing', 
    name: 'Leasing', 
    description: 'Leasing department - UV CRM + limited inventory access', 
    color: 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700', 
    icon: Key 
  },
  { 
    id: 'leasing_head', 
    name: 'Leasing Head', 
    description: 'Leasing department head - permissions set by admin', 
    color: 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700', 
    icon: Key 
  },
  { 
    id: 'accounts', 
    name: 'Accounts', 
    description: 'Accounts department - financial reporting and business analytics', 
    color: 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700', 
    icon: Calculator 
  },
  { 
    id: 'accounts_head', 
    name: 'Accounts Head', 
    description: 'Accounts department head - permissions set by admin', 
    color: 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700', 
    icon: Calculator 
  },
] as const;

export default function UnifiedRoleManager() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadData(); // Use real database data
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading real database data...');
      
      // Load users with their roles
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_all_users_with_roles');

      if (usersError) {
        throw new Error(`Failed to load users: ${usersError.message}`);
      }

      console.log('👥 Loaded users:', usersData);
      setUsers(usersData || []);

      // Load all role permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .rpc('get_all_role_permissions');

      if (permissionsError) {
        throw new Error(`Failed to load permissions: ${permissionsError.message}`);
      }

      console.log('🔐 Loaded permissions:', permissionsData);
      setPermissions(permissionsData || []);

      // Load modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('name, display_name, description')
        .order('display_name');

      if (modulesError) {
        throw new Error(`Failed to load modules: ${modulesError.message}`);
      }

      console.log('📦 Loaded modules:', modulesData);
      setModules(modulesData || []);

      console.log('✅ All data loaded successfully!');

    } catch (err: any) {
      console.error('❌ Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserWithRole['role']) => {
    try {
      setUpdating(userId);
      setError(null);

      console.log(`🔄 Updating user ${userId} to role ${newRole}...`);

      // Update in database
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: newRole
      });

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: newRole }
            : user
        )
      );

      console.log(`✅ Successfully updated user ${userId} to role ${newRole}`);
      
    } catch (err: any) {
      console.error('❌ Error updating user role:', err);
      setError(err.message || 'Failed to update user role');
    } finally {
      setUpdating(null);
    }
  };

  const saveRolePermissions = async (role: string) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      console.log(`🔄 Saving permissions for role: ${role}...`);
      const rolePermissions = permissions.filter(p => p.role === role);
      console.log(`📋 Found ${rolePermissions.length} permissions to save:`, rolePermissions);
      
      let updateCount = 0;
      // Update each permission in the database
      for (const perm of rolePermissions) {
        console.log(`🔧 Updating ${perm.module_display_name}:`, {
          target_role: role,
          target_module_name: perm.module_name,
          new_can_view: perm.can_view,
          new_can_create: perm.can_create,
          new_can_edit: perm.can_edit,
          new_can_delete: perm.can_delete
        });

        const { data, error } = await supabase.rpc('update_role_permission', {
          target_role: role,
          target_module_name: perm.module_name,
          new_can_view: perm.can_view,
          new_can_create: perm.can_create,
          new_can_edit: perm.can_edit,
          new_can_delete: perm.can_delete
        });

        if (error) {
          console.error(`❌ Failed to update ${perm.module_display_name}:`, error);
          throw new Error(`Failed to update ${perm.module_display_name}: ${error.message}`);
        }

        console.log(`✅ Successfully updated ${perm.module_display_name}:`, data);
        updateCount++;
      }

      console.log(`✅ Successfully saved ${updateCount} permissions for role: ${role}`);
      setSuccess(`${role} permissions updated successfully! (${updateCount} modules)`);
      
      // Reload data to show updated permissions
      loadData();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('❌ Error saving permissions:', err);
      setError(err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const updatePermission = (role: string, moduleName: string, permissionType: keyof Pick<RolePermission, 'can_view' | 'can_create' | 'can_edit' | 'can_delete'>, value: boolean) => {
    setPermissions(prevPermissions => {
      // Check if permission entry exists
      const existingIndex = prevPermissions.findIndex(p => p.role === role && p.module_name === moduleName);
      
      if (existingIndex >= 0) {
        // Update existing permission
        return prevPermissions.map((p, index) =>
          index === existingIndex
            ? { ...p, [permissionType]: value }
            : p
        );
      } else {
        // Create new permission entry
        const module = modules.find(m => m.name === moduleName);
        if (!module) {
          console.error(`Module ${moduleName} not found!`);
          return prevPermissions;
        }
        
        const newPermission = {
          role,
          module_name: module.name,
          module_display_name: module.display_name,
          module_description: module.description,
          can_view: permissionType === 'can_view' ? value : false,
          can_create: permissionType === 'can_create' ? value : false,
          can_edit: permissionType === 'can_edit' ? value : false,
          can_delete: permissionType === 'can_delete' ? value : false
        };
        
        return [...prevPermissions, newPermission];
      }
    });
  };

  const getUsersForRole = (role: string) => {
    return users.filter(user => user.role === role);
  };

  const getPermissionsForRole = (role: string) => {
    // Get existing permissions for this role
    const rolePermissions = permissions.filter(p => p.role === role);
    
    // Ensure all modules are represented, even if they don't have permission entries
    const allModulePermissions = modules.map(module => {
      // Find existing permission for this module, or create a default one
      const existingPermission = rolePermissions.find(p => p.module_name === module.name);
      
      if (existingPermission) {
        return existingPermission;
      } else {
        // Create default permission entry for modules not in database
        return {
          role,
          module_name: module.name,
          module_display_name: module.display_name,
          module_description: module.description,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false
        };
      }
    });
    
    return allModulePermissions;
  };

  const getRoleStats = (role: string) => {
    const roleUsers = getUsersForRole(role);
    const rolePermissions = getPermissionsForRole(role);
    const activePermissions = rolePermissions.filter(p => p.can_view || p.can_create || p.can_edit || p.can_delete);
    
    return {
      userCount: roleUsers.length,
      permissionCount: activePermissions.length,
      totalModules: modules.length
    };
  };

  // Loading state
  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
          <p className="text-white/70">Loading role management...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2 text-white">Access Denied</h1>
          <p className="text-white/70 mb-6">Administrator privileges required to access role management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Role & User Management</h2>
          <p className="text-white/70">Manage user roles and configure permissions for each role</p>
        </div>
        <div className="text-sm text-white/60">
          <span>{users.length} users • {ROLE_CONFIGS.length} roles</span>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center space-x-3">
          <Shield className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-100">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center space-x-3">
          <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span className="text-green-100">{success}</span>
        </div>
      )}

      {/* Role Cards */}
      <div className="space-y-4">
        {ROLE_CONFIGS.map((roleConfig) => {
          const stats = getRoleStats(roleConfig.id);
          const isExpanded = expandedRole === roleConfig.id;
          const IconComponent = roleConfig.icon;

          return (
            <div key={roleConfig.id} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              {/* Role Header */}
              <button
                onClick={() => setExpandedRole(isExpanded ? null : roleConfig.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg ${roleConfig.color} flex items-center justify-center`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-white">{roleConfig.name}</h3>
                    <p className="text-white/70 text-sm">{roleConfig.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right text-sm text-white/60">
                    <div>{stats.userCount} users</div>
                    <div>{stats.permissionCount}/{stats.totalModules} modules</div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-white/50" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-white/50" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-white/10 bg-black/20">
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Users Section */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                        <Users className="w-5 h-5" />
                        <span>Users ({stats.userCount})</span>
                      </h4>
                      
                      <div className="space-y-3">
                        {getUsersForRole(roleConfig.id).map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <User className="w-5 h-5 text-white/50" />
                              <div>
                                <div className="text-white font-medium">{user.email}</div>
                                <div className="text-white/50 text-sm">
                                  Added {new Date(user.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.id, e.target.value as UserWithRole['role'])}
                              disabled={updating === user.id}
                              className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                            >
                              {ROLE_CONFIGS.map((role) => (
                                <option key={role.id} value={role.id} className="bg-black">
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                        
                        {stats.userCount === 0 && (
                          <div className="text-center py-8 text-white/50">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No users assigned to this role</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Permissions Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                          <Settings className="w-5 h-5" />
                          <span>Permissions</span>
                        </h4>
                        <button
                          onClick={() => saveRolePermissions(roleConfig.id)}
                          disabled={saving}
                          className="bg-white/10 hover:bg-white/20 border border-white/20 rounded px-4 py-2 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4" />
                              <span>Save Permissions</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="space-y-3">
                        {getPermissionsForRole(roleConfig.id).map((permission) => (
                          <div key={permission.module_name} className="p-4 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h5 className="text-white font-medium">{permission.module_display_name}</h5>
                                <p className="text-white/50 text-sm">{permission.module_description}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-3">
                              {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map((permType) => (
                                <label key={permType} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={permission[permType]}
                                    onChange={(e) => updatePermission(roleConfig.id, permission.module_name, permType, e.target.checked)}
                                    className="rounded bg-white/10 border-white/20 text-white focus:ring-white/30"
                                  />
                                  <span className="text-white/70 text-sm capitalize">
                                    {permType.replace('can_', '')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 