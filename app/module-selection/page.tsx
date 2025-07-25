"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/shared/AuthProvider';
import { useAllModulePermissions } from '@/lib/useModulePermissions';
import Header from '@/components/shared/header/Header';
import { Building2, Car, TrendingUp, Wrench, Users, AlertCircle } from 'lucide-react';

interface ModuleCard {
  id: string;
  name: string;
  description: string;
  basePath: string;
  icon: React.ComponentType<any>;
}

const moduleCards: ModuleCard[] = [
  {
    id: 'uv_crm',
    name: 'UV CRM & Inventory',
    description: 'Customer relationship management and car inventory',
    basePath: '/dashboard',
    icon: Car
  },
  {
    id: 'marketing',
    name: 'Marketing Dashboard',
    description: 'Campaigns, leads, social media analytics',
    basePath: '/marketing/dashboard',
    icon: TrendingUp
  },
  {
    id: 'workshop',
    name: 'Workshop & Service',
    description: 'Service department management and repairs',
    basePath: '/workshop/dashboard',
    icon: Wrench
  },
  {
    id: 'leasing',
    name: 'Leasing Department',
    description: 'Vehicle leasing and financing management',
    basePath: '/leasing/dashboard',
    icon: Users
  }
];

export default function ModuleSelectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const allPermissions = useAllModulePermissions();
  const { isLoading: permissionsLoading, error } = allPermissions;
  const [showFallback, setShowFallback] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Define handleModuleClick at top level so it's accessible everywhere
  const handleModuleClick = (module: ModuleCard) => {
    router.push(module.basePath);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Debug logging
  useEffect(() => {
    console.log('=== MODULE SELECTION DEBUG ===');
    console.log('User:', user?.id);
    console.log('Permissions loading:', permissionsLoading);
    console.log('Permissions error:', error);
    console.log('All permissions object:', allPermissions);
    console.log('Show fallback:', showFallback);
  }, [user, permissionsLoading, error, allPermissions, showFallback]);

  // Timeout fallback after 5 seconds (reduced from 10)
  useEffect(() => {
    if (permissionsLoading) {
      const timeout = setTimeout(() => {
        console.warn('Permissions loading timeout - showing fallback');
        setShowFallback(true);
      }, 5000); // Reduced to 5 seconds

      return () => clearTimeout(timeout);
    }
  }, [permissionsLoading]);

  if (authLoading || (permissionsLoading && !showFallback && !debugMode)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading your modules...</p>
          {permissionsLoading && (
            <div>
              <p className="text-white/40 text-sm mt-2">If this takes too long, we'll show a fallback...</p>
              <button 
                onClick={() => setDebugMode(true)}
                className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm"
              >
                Enable Debug Mode (Skip Permissions)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // DEBUG MODE: Show all modules regardless of permissions
  if (debugMode) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Building2 className="w-8 h-8 text-yellow-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">SilberArrows CRM</h1>
                <p className="text-yellow-400 text-sm">DEBUG MODE - All Modules Shown</p>
              </div>
            </div>
            <div className="text-white/60 mb-4">
              <p>Debug Info:</p>
              <p>User ID: {user?.id}</p>
              <p>Permissions Loading: {permissionsLoading.toString()}</p>
              <p>Error: {error || 'None'}</p>
                             <p>Permissions Object: {JSON.stringify(allPermissions, null, 2)}</p>
            </div>
            <button 
              onClick={() => setDebugMode(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm mr-4"
            >
              Exit Debug Mode
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
            >
              Reload Page
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {moduleCards.map((module) => {
              const IconComponent = module.icon;
              return (
                <div
                  key={module.id}
                  onClick={() => handleModuleClick(module)}
                  className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2"
                >
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 h-full hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700 flex items-center justify-center mb-4 shadow-inner">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{module.name}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{module.description}</p>
                    <div className="mt-2 text-yellow-400 text-xs">DEBUG: Always accessible</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (error || showFallback || (!allPermissions && !permissionsLoading)) {
    console.error('Permissions error:', error);
    // Fallback: Show all modules if permissions fail
    const fallbackModules = moduleCards; // All modules (admin already removed from moduleCards)
    
    return (
      <div className="min-h-screen bg-black">
        {/* Use shared header instead of custom header */}
        <Header />

        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Building2 className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">SilberArrows CRM</h1>
                <p className="text-white/60 text-sm">Select your business module (Fallback Mode)</p>
              </div>
            </div>
            <p className="text-yellow-400 mb-2">⚠️ {showFallback ? 'Permission loading timeout' : 'Permission system unavailable'}</p>
            <p className="text-white/60 mb-4 text-sm">
              {showFallback 
                ? 'Permissions took too long to load. Functions might exist but are not responding.' 
                : 'Database functions missing. Please run the SQL setup script.'}
            </p>
            <div className="space-x-2">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded text-sm"
              >
                Retry Loading Permissions
              </button>
              <button 
                onClick={() => setDebugMode(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm"
              >
                Enable Debug Mode
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {fallbackModules.map((module) => {
              const IconComponent = module.icon;
              return (
                <div
                  key={module.id}
                  onClick={() => handleModuleClick(module)}
                  className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2"
                >
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 h-full hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700 flex items-center justify-center mb-4 shadow-inner">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{module.name}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{module.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Filter modules based on permissions
  const accessibleModules = moduleCards.filter(module => {
    if (!allPermissions) return false;
    const permission = allPermissions[module.id as keyof typeof allPermissions];
    // Check if permission is a ModulePermissions object and has canView
    return typeof permission === 'object' && permission !== null && 'canView' in permission && permission.canView === true;
  });

  return (
    <div className="min-h-screen bg-black">
      {/* Use shared header instead of custom header */}
      <Header />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {accessibleModules.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-white/60" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Modules Available</h2>
            <p className="text-white/60 mb-6">Contact your administrator to get access to business modules.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Choose Your Module</h2>
              <p className="text-white/60 text-lg">Select a business module to get started</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {accessibleModules.map((module) => {
                const IconComponent = module.icon;
                return (
                  <div
                    key={module.id}
                    onClick={() => handleModuleClick(module)}
                    className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2"
                  >
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 h-full hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                      {/* Icon with gradient background */}
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700 flex items-center justify-center mb-4 shadow-inner group-hover:shadow-lg group-hover:shadow-gray-500/25 transition-all duration-300">
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      
                      {/* Content */}
                      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-white transition-colors">
                        {module.name}
                      </h3>
                      <p className="text-white/60 text-sm leading-relaxed group-hover:text-white/80 transition-colors">
                        {module.description}
                      </p>
                      
                      {/* Hover indicator */}
                      <div className="mt-4 flex items-center text-white/40 group-hover:text-white/80 transition-colors text-sm">
                        <span>Click to enter</span>
                        <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer info */}
            <div className="text-center mt-16 pt-8 border-t border-white/10">
              <p className="text-white/40 text-sm">
                You have access to {accessibleModules.length} module{accessibleModules.length !== 1 ? 's' : ''}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 