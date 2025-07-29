"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/shared/AuthProvider';
import { useAllModulePermissions } from '@/lib/useModulePermissions';
import Header from '@/components/shared/header/Header';
import LightRays from '@/components/shared/LightRays';
import { Car, Wrench, TrendingUp, CreditCard, Calculator, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

interface ModuleCard {
  id: string;
  name: string;
  description: string;
  basePath: string;
  icon: React.ComponentType<any>;
  gradient: string;
  stats?: string;
  badge?: string;
}

const moduleCards: ModuleCard[] = [
  {
    id: 'workshop',
    name: 'Service Department',
    description: 'Vehicle maintenance, repairs, and service workflow management',
    basePath: '/workshop/dashboard',
    icon: Wrench,
    gradient: 'from-gray-400 via-gray-300 to-gray-500',
    badge: 'Service',
    stats: 'Workshop'
  },
  {
    id: 'uv_crm',
    name: 'Used Vehicles Department',
    description: 'Comprehensive vehicle sales, inventory management, and customer relations',
    basePath: '/dashboard',
    icon: Car,
    gradient: 'from-gray-400 via-gray-300 to-gray-500',
    badge: 'Sales',
    stats: 'Dashboard'
  },
  {
    id: 'leasing',
    name: 'Leasing Department',
    description: 'Vehicle financing, lease agreements, and payment processing',
    basePath: '/leasing/dashboard',
    icon: CreditCard,
    gradient: 'from-gray-400 via-gray-300 to-gray-500',
    badge: 'Leasing',
    stats: 'Portal'
  },
  {
    id: 'marketing',
    name: 'Marketing Department',
    description: 'Campaign management, content creation, and brand promotion',
    basePath: '/marketing/dashboard',
    icon: TrendingUp,
    gradient: 'from-gray-400 via-gray-300 to-gray-500',
    badge: 'Growth',
    stats: 'Studio'
  },
  {
    id: 'accounts',
    name: 'Accounts Department',
    description: 'Financial reporting, accounting, and business analytics',
    basePath: '/accounts/dashboard',
    icon: Calculator,
    gradient: 'from-gray-400 via-gray-300 to-gray-500',
    badge: 'Finance',
    stats: 'Hub'
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

  // Timeout fallback after 5 seconds
  useEffect(() => {
    if (permissionsLoading) {
      const timeout = setTimeout(() => {
        setShowFallback(true);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [permissionsLoading]);

  if (authLoading || (permissionsLoading && !showFallback && !debugMode)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Light Rays Background */}
        <div className="absolute inset-0">
          <LightRays
            raysOrigin="top-center"
            raysColor="#c0c0c0"
            raysSpeed={0.8}
            lightSpread={0.6}
            rayLength={1.5}
            followMouse={true}
            mouseInfluence={0.05}
            noiseAmount={0.02}
            distortion={0.02}
          />
        </div>
        
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-silver-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 font-medium">Loading your workspace...</p>
          {permissionsLoading && (
            <p className="text-gray-500 text-sm mt-2">Initializing departments...</p>
          )}
        </div>
      </div>
    );
  }

  // Filter modules based on permissions
  const accessibleModules = moduleCards.filter(module => {
    if (debugMode || showFallback || error) return true; // Show all in fallback modes
    if (!allPermissions) return false;
    const permission = allPermissions[module.id as keyof typeof allPermissions];
    return typeof permission === 'object' && permission !== null && 'canView' in permission && permission.canView === true;
  });

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* WebGL Light Rays Background */}
      <div className="absolute inset-0 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={1.2}
          lightSpread={0.8}
          rayLength={1.8}
          followMouse={true}
          mouseInfluence={0.08}
          noiseAmount={0.03}
          distortion={0.03}
          fadeDistance={1.0}
          saturation={1.0}
        />
      </div>

      {/* Header with transparent background */}
      <div className="relative z-20">
        <Header />
      </div>

      {/* Main Content - Centered in Viewport */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="px-6 max-w-7xl mx-auto">
          {accessibleModules.length === 0 && !debugMode && !showFallback ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">No Departments Available</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">Contact your administrator to get access to business departments.</p>
            </div>
          ) : (
            <>
              {/* Hero Section */}
              <div className="text-center mb-12">
                <h1 className="text-6xl font-bold text-white mb-6">
                  SilberArrows
                </h1>
                <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
                  Access specialized tools and workflows designed for your department's operations
                </p>
              </div>

              {/* Module Cards */}
              <div className="flex justify-center gap-6 max-w-7xl mx-auto">
                {accessibleModules.map((module, index) => {
                  const IconComponent = module.icon;
                  
                  return (
                    <div
                      key={module.id}
                      onClick={() => handleModuleClick(module)}
                      className="group cursor-pointer relative w-52"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Glass Morphism Card */}
                      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl hover:shadow-white/5 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:bg-white/8 hover:border-white/20 overflow-hidden aspect-square">
                        
                        {/* Background Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`} />
                        
                        {/* Badge */}
                        <div className="absolute top-4 right-4">
                          <span className="px-3 py-1 text-xs font-medium bg-white/20 text-white/90 rounded-full border border-white/30">
                            {module.badge}
                          </span>
                        </div>
                        
                        {/* Card Content */}
                        <div className="p-6 h-full flex flex-col justify-between">
                          
                          {/* Top Section */}
                          <div>
                            {/* Icon Section */}
                            <div className="flex-shrink-0 mb-5">
                              <div className="relative inline-block">
                                <div className={`w-16 h-16 bg-gradient-to-br ${module.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-500`}>
                                  <IconComponent className="w-8 h-8 text-black" />
                                </div>
                                {/* Glow Effect */}
                                <div className={`absolute inset-0 w-16 h-16 bg-gradient-to-br ${module.gradient} rounded-2xl opacity-30 blur-lg group-hover:opacity-50 transition-opacity duration-500 -z-10`} />
                              </div>
                            </div>
                            
                            {/* Heading */}
                            <h3 className="text-xl font-bold text-white leading-tight group-hover:text-gray-100 transition-colors">
                              {module.name}
                            </h3>
                          </div>
                          
                          {/* Bottom Action */}
                          <div className="flex-shrink-0 pt-4 border-t border-white/10">
                            <div className="flex items-center text-gray-500 group-hover:text-gray-300 transition-colors">
                              <span className="text-sm font-medium">Open Portal</span>
                              <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Glass Reflection */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Debug Mode Section */}
        {(debugMode || showFallback || error) && (
          <div className="fixed bottom-6 right-6 p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 text-sm text-gray-400 max-w-xs">
            <div className="font-semibold text-gray-300 mb-2">Debug Info</div>
            <div className="space-y-1 text-xs">
              <div>Debug: {debugMode ? 'ON' : 'OFF'}</div>
              <div>Fallback: {showFallback ? 'ON' : 'OFF'}</div>
              <div>Error: {error ? 'YES' : 'NO'}</div>
            </div>
            {debugMode && (
              <button 
                onClick={() => setDebugMode(false)}
                className="mt-3 px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg transition-colors"
              >
                Exit Debug
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 