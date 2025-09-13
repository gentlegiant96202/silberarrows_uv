"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useModulePermissions } from '@/lib/useModulePermissions';
import PulsatingLogo from '@/components/shared/PulsatingLogo';
import { Shield, Wrench, LayoutDashboard } from 'lucide-react';
import RouteProtector from '@/components/shared/RouteProtector';

export default function WorkshopDashboard() {
  const router = useRouter();
  const { canView, isLoading, error } = useModulePermissions('workshop');

  useEffect(() => {
    if (!isLoading && !canView) {
      router.push('/');
    }
  }, [canView, isLoading, router]);

  // Show loading while checking permissions
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <PulsatingLogo size={48} text="Checking access permissions..." />
      </div>
    );
  }

  // Show access denied if no permission
  if (!canView) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2 text-white">Access Denied</h1>
          <p className="text-white/70 mb-6">
            You don't have permission to access the workshop module.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <RouteProtector moduleName="workshop">
      <div className="h-screen bg-black flex flex-col overflow-hidden">

        
        {/* Full-height container */}
        <div className="flex-1 flex flex-col w-full px-2 py-4 overflow-hidden">
          
          {/* Page Header with Glass Morphism */}
          <div className="mb-4 bg-gradient-to-r from-black/40 via-gray-900/30 to-black/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-4 mx-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-gray-800 to-black rounded-lg border border-gray-600/50">
                  <LayoutDashboard className="h-8 w-8 text-silver-300" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Workshop Dashboard
                  </h1>
                  <p className="text-gray-400">Analytics and Management Overview</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Content - Empty with Coming Soon */}
          <div className="flex-1 flex flex-col mx-4 overflow-hidden">
            <div className="flex-1 w-full bg-gradient-to-br from-black/40 via-gray-900/30 to-black/60 backdrop-blur-md border border-gray-700/50 rounded-xl overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent flex items-center space-x-2">
                  <LayoutDashboard className="h-6 w-6 text-silver-300" />
                  <span>Dashboard Overview</span>
                </h2>
              </div>
              
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-8 bg-white/5 backdrop-blur border border-white/10 rounded-full flex items-center justify-center">
                    <LayoutDashboard className="w-16 h-16 text-white/20" />
                  </div>
                  <div className="text-6xl mb-4">🚧</div>
                  <h3 className="text-2xl font-semibold text-white mb-2">Coming Soon</h3>
                  <p className="text-white/70 max-w-md mx-auto">
                    The <span className="text-white font-semibold">WORKSHOP DASHBOARD</span> analytics and management tools are under development.
                  </p>
                  <div className="mt-6 text-sm text-white/50">
                    Use the <span className="text-white font-medium">Service & Warranty</span> tab above to access service contracts.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RouteProtector>
  );
} 