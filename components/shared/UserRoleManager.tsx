"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/useUserRole';

interface UserWithRole {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

export default function UserRoleManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Always call hooks - never conditionally
  const { isAdmin } = useUserRole();

  useEffect(() => {
    // Only load users if user is admin
    if (isAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Use the admin RPC function to get all users with roles
      const { data, error } = await supabase
        .rpc('get_all_users_with_roles');
        
      if (error) {
        console.error('Error loading users:', error);
        if (error.message.includes('Access denied')) {
          alert('Access denied. Admin privileges required.');
        } else {
          alert('Failed to load users: ' + error.message);
        }
        return;
      }

      setUsers(data.map((u: any) => ({
        id: u.id,
        email: u.email,
        role: u.role as 'admin' | 'user'
      })));
      
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      setUpdating(userId);

      // Use the admin RPC function to update user role
      const { data, error } = await supabase
        .rpc('update_user_role_admin', {
          target_user_id: userId,
          new_role: newRole
        });

      if (error) {
        console.error('Error updating role:', error);
        if (error.message.includes('Access denied')) {
          alert('Access denied. Admin privileges required.');
        } else {
          alert('Failed to update user role: ' + error.message);
        }
        return;
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update user role');
    } finally {
      setUpdating(null);
    }
  };

  // Only admins can see this component
  if (!isAdmin) {
    return (
      <div className="p-4 text-center text-gray-500">
        Access denied. Admin privileges required.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse text-gray-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4 text-gray-800">User Role Management</h2>
      
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
            <div>
              <div className="font-medium text-gray-800">{user.email}</div>
              <div className="text-sm text-gray-500">
                Current role: <span className={`font-medium ${user.role === 'admin' ? 'text-red-600' : 'text-blue-600'}`}>
                  {user.role}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => updateUserRole(user.id, 'admin')}
                disabled={user.role === 'admin' || updating === user.id}
                className={`px-3 py-1 text-xs rounded ${
                  user.role === 'admin' 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                } ${updating === user.id ? 'opacity-50' : ''}`}
              >
                {updating === user.id ? 'Updating...' : 'Make Admin'}
              </button>
              
              <button
                onClick={() => updateUserRole(user.id, 'user')}
                disabled={user.role === 'user' || updating === user.id}
                className={`px-3 py-1 text-xs rounded ${
                  user.role === 'user'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                } ${updating === user.id ? 'opacity-50' : ''}`}
              >
                {updating === user.id ? 'Updating...' : 'Make User'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 