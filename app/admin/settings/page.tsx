"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole } from '@/lib/useUserRole';
import UserRoleManager from '@/components/UserRoleManager';
import { ArrowLeft, Users, Settings, Shield } from 'lucide-react';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { isAdmin, isLoading, error } = useUserRole();

  // Redirect non-admins
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, isLoading, router]);

  // Show loading while checking permissions
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
          <p className="text-white/70">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2 text-white">Access Denied</h1>
          <p className="text-white/70 mb-6">You need administrator privileges to access this page.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-white" />
                <h1 className="text-2xl font-bold text-white">Admin Settings</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-white/60">
              <Shield className="w-4 h-4" />
              <span>Administrator Access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Description */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-2">System Administration</h2>
            <p className="text-white/70">
              Manage user roles, permissions, and system settings. Only administrators can access these features.
            </p>
          </div>

          {/* Settings Sections */}
          <div className="grid gap-8">
            {/* User Role Management Section */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Users className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">User Role Management</h3>
              </div>
              
              <div className="text-white/70 mb-6">
                <p>Manage user roles and permissions. You can promote users to administrators or demote administrators to regular users.</p>
              </div>

              {/* User Role Manager Component */}
              <div className="bg-white rounded-lg">
                <UserRoleManager />
              </div>
            </div>

            {/* Future Settings Sections */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Settings className="w-6 h-6 text-gray-400" />
                <h3 className="text-xl font-semibold text-white">System Settings</h3>
              </div>
              
              <div className="text-white/50 italic">
                <p>Additional system settings will be added here in future updates.</p>
                <ul className="mt-3 space-y-1 text-sm">
                  <li>• Database backup settings</li>
                  <li>• Email notification preferences</li>
                  <li>• System maintenance windows</li>
                  <li>• API configuration</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 