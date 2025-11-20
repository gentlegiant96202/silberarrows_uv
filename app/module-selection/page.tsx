"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/shared/AuthProvider';
import { useAllModulePermissions } from '@/lib/useModulePermissions';
import { useUserRole } from '@/lib/useUserRole';
import Header from '@/components/shared/header/Header';
import LightRays from '@/components/shared/LightRays';
import PulsatingLogo from '@/components/shared/PulsatingLogo';
import Snowfall from 'react-snowfall';
import { Car, Wrench, TrendingUp, CreditCard, Calculator, AlertCircle } from 'lucide-react';

interface ModuleCard {
  id: string;
  name: string;
  description: string;
  basePath: string;
  icon: React.ComponentType<any>;
  gradient: string;
  stats?: string;
  badge?: string;
  action?: string;
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
    stats: 'Workshop',
    action: 'Open Portal'
  },
  {
    id: 'uv_crm',
    name: 'Used Vehicles Department',
    description: 'Comprehensive vehicle sales, inventory management, and customer relations',
    basePath: '/dashboard',
    icon: Car,
    gradient: 'from-gray-400 via-gray-300 to-gray-500',
    badge: 'Sales',
    stats: 'Dashboard',
    action: 'Open Portal'
  },
  {
    id: 'leasing',
    name: 'Leasing Department',
    description: 'Vehicle financing, lease agreements, and payment processing',
    basePath: '/leasing/dashboard',
    icon: CreditCard,
    gradient: 'from-gray-400 via-gray-300 to-gray-500',
    badge: 'Leasing',
    stats: 'Portal',
    action: 'Open Portal'
  },
  {
    id: 'marketing',
    name: 'Marketing Department',
    description: 'Digital marketing campaigns, brand management, and content creation',
    basePath: '/marketing/dashboard',
    icon: TrendingUp,
    gradient: 'from-gray-400 via-gray-300 to-gray-500',
    badge: 'Marketing',
    stats: 'Studio',
    action: 'Open Portal'
  },
  {
    id: 'accounts',
    name: 'Accounts Department',
    description: 'Financial tracking, business intelligence, and performance analytics',
    basePath: '/accounts/dashboard',
    icon: Calculator,
    gradient: 'from-gray-400 via-gray-300 to-gray-500',
    badge: 'Finance',
    stats: 'Analytics',
    action: 'Open Portal'
  }
];

export default function ModuleSelectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const allPermissions = useAllModulePermissions();
  const { isLoading: permissionsLoading, error } = allPermissions;
  const { hasRole, isLoading: roleLoading } = useUserRole();
  const [debugMode, setDebugMode] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Pre-calculate display name to prevent layout shifts
  const displayName = React.useMemo(() => {
    if (!user) return 'User';
    
    // First priority: full_name from metadata
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    
    // Second priority: formatted email prefix
    if (user.email) {
      const emailPrefix = user.email.split('@')[0];
      return emailPrefix.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return 'User';
  }, [user?.user_metadata?.full_name, user?.email]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    } else if (!authLoading && user) {
      // Set flag to indicate user wants to stay on module selection
      sessionStorage.setItem('stayOnModuleSelection', 'true');
    }
  }, [authLoading, user, router]);

  // Enable fallback mode if permissions fail to load after a delay
  useEffect(() => {
    if (!permissionsLoading) return;
    
    const fallbackTimer = setTimeout(() => {
      setShowFallback(true);
    }, 5000);

    return () => clearTimeout(fallbackTimer);
  }, [permissionsLoading]);

  // Enable debug mode on triple click
  useEffect(() => {
    let clickCount = 0;
    const handleTripleClick = () => {
      clickCount++;
      if (clickCount === 3) {
        setDebugMode(true);
        clickCount = 0;
      }
      setTimeout(() => clickCount = 0, 1000);
    };
    
    document.addEventListener('click', handleTripleClick);
    return () => document.removeEventListener('click', handleTripleClick);
  }, []);

  useEffect(() => {
    if (!authLoading && user && !hasInitiallyLoaded) {
      // Remove artificial delay to prevent layout shifts
      setHasInitiallyLoaded(true);
    }
  }, [authLoading, user, hasInitiallyLoaded]);

  // Handle module navigation
  const handleModuleClick = (module: ModuleCard) => {
    // Clear the stay on module selection flag since user is navigating away
    sessionStorage.removeItem('stayOnModuleSelection');
    // Store the selected module path in localStorage
    localStorage.setItem('lastVisitedModule', module.basePath);
    
    // Navigate directly to the module
    router.push(module.basePath);
  };

  // Determine if we should show the loading screen
  const isLoading = authLoading || !hasInitiallyLoaded || (permissionsLoading && !showFallback && !debugMode);

  // Early return for unauthenticated users (redirect happens in useEffect)
  if (!authLoading && !user) {
    return null;
  }

  // Show loading with consistent layout structure
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Fixed Logo in Sidebar Position */}
        <div className="fixed top-3 left-3 z-30 pointer-events-none">
          <div className="w-10 h-10 relative">
            {/* Logo container */}
            <div className="relative w-full h-full rounded-lg bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-lg">
              <img 
                src="/MAIN LOGO.png" 
                alt="SilberArrows" 
                className="w-8 h-8 object-contain brightness-150"
              />
            </div>
            {/* Point glow following rectangular border path */}
            <div className="absolute inset-0 z-10 rounded-lg overflow-visible">
              <div className="absolute -translate-x-1/2 -translate-y-1/2 animate-border-glow">
                <div className="w-1 h-1 rounded-full bg-white shadow-[0_0_8px_3px_rgba(255,255,255,0.8),0_0_12px_6px_rgba(200,200,200,0.3)]">
                  <div className="absolute inset-0 rounded-full bg-white/60 blur-[1px]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      {/* Light Rays Background */}
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
      {/* Snowfall Effect */}
      <Snowfall
        color="#ffffff"
        snowflakeCount={100}
        speed={[0.5, 2]}
        wind={[0.5, 2]}
        radius={[0.5, 3]}
        style={{
          position: 'fixed',
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
          top: 0,
          left: 0,
        }}
      />
      {/* Soft white glow overlay */}
      <div className="absolute inset-0 z-[2] pointer-events-none">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(1000px 500px at 50% -10%, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%)'
            }}
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                'radial-gradient(900px 450px at 50% 110%, rgba(255,255,255,0.16), rgba(255,255,255,0) 60%)'
            }}
          />
        </div>
        
        {/* Header with transparent background - shifted right for logo */}
        <div className="relative z-20 ml-[64px]">
          <Header />
        </div>

        {/* Main Content - Centered in Viewport (matching main layout) */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="px-6 max-w-7xl mx-auto animate-fadeIn">
            {/* Loading Text with consistent spacing */}
            <div className="mb-12 text-center">
              <h1 className="text-6xl font-bold text-white mb-6 opacity-50">
                SilberArrows
              </h1>
              <div className="mb-6">
                <h2 className="text-2xl font-medium text-gray-200 opacity-50">
                  Welcome back, {displayName}
                </h2>
                {permissionsLoading && (
                  <p className="text-xl text-gray-400 opacity-50">Initializing departments...</p>
                )}
              </div>
              
              {/* Loading Animation */}
              <PulsatingLogo size={48} showText={false} className="mx-auto mb-8" />
            </div>
            
            {/* Placeholder Module Cards - matching exact structure */}
            <div className="flex justify-center gap-6 max-w-7xl mx-auto">
              {[1, 2, 3, 4, 5].map((index) => (
                <div
                  key={index}
                  className="w-52 opacity-30"
                >
                  {/* Placeholder Glass Morphism Card */}
                  <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden aspect-square">
                    {/* Placeholder Badge */}
                    <div className="absolute top-4 right-4">
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-white/10 text-white/50 rounded-full border border-white/20">
                        Loading...
                      </span>
                    </div>
                    
                    {/* Placeholder Card Content */}
                    <div className="p-6 h-full flex flex-col justify-between">
                      {/* Placeholder Top Section */}
                      <div>
                        {/* Placeholder Icon */}
                        <div className="flex-shrink-0 mb-5">
                          <div className="relative inline-block">
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-400 via-gray-300 to-gray-500 rounded-2xl flex items-center justify-center shadow-lg opacity-50">
                              <div className="w-8 h-8 bg-white/20 rounded animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Placeholder Heading */}
                        <div className="space-y-3">
                          <div className="h-6 bg-white/10 rounded animate-pulse"></div>
                        </div>
                      </div>
                      
                      {/* Placeholder Bottom Action */}
                      <div className="flex-shrink-0 pt-2 border-t border-white/10">
                        <div className="h-4 bg-white/5 rounded animate-pulse w-24"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has no assigned role
  const userHasNoRole = !roleLoading && !hasRole;

  // Filter modules based on permissions
  const accessibleModules = moduleCards.filter(module => {
    if (debugMode || showFallback || error) return true; // Show all in fallback modes
    if (!allPermissions) return false;
    const permission = allPermissions[module.id as keyof typeof allPermissions];
    return typeof permission === 'object' && permission !== null && 'canView' in permission && permission.canView === true;
  });

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Fixed Logo in Sidebar Position */}
      <div className="fixed top-3 left-3 z-30 pointer-events-none">
        <div className="w-10 h-10 relative">
          {/* Logo container */}
          <div className="relative w-full h-full rounded-lg bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-lg">
            <img 
              src="/MAIN LOGO.png" 
              alt="SilberArrows" 
              className="w-8 h-8 object-contain brightness-150"
            />
          </div>
          {/* Point glow following rectangular border path */}
          <div className="absolute inset-0 z-10 rounded-lg overflow-visible">
            <div className="absolute -translate-x-1/2 -translate-y-1/2 animate-border-glow">
              <div className="w-1 h-1 rounded-full bg-white shadow-[0_0_8px_3px_rgba(255,255,255,0.8),0_0_12px_6px_rgba(200,200,200,0.3)]">
                <div className="absolute inset-0 rounded-full bg-white/60 blur-[1px]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Light Rays Background */}
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
      {/* Snowfall Effect */}
      <Snowfall
        color="#ffffff"
        snowflakeCount={100}
        speed={[0.5, 2]}
        wind={[0.5, 2]}
        radius={[0.5, 3]}
        style={{
          position: 'fixed',
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
          top: 0,
          left: 0,
        }}
      />
      {/* Soft white glow overlay */}
      <div className="absolute inset-0 z-[2] pointer-events-none">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(1000px 500px at 50% -10%, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%)'
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              'radial-gradient(900px 450px at 50% 110%, rgba(255,255,255,0.16), rgba(255,255,255,0) 60%)'
          }}
        />
      </div>

      {/* Header with transparent background */}
      <div className="relative z-20">
        <Header />
      </div>

      {/* Main Content - Centered in Viewport */}
      <div className="absolute inset-0 z-10 md:flex md:items-center md:justify-center overflow-y-auto pt-20 md:pt-0">
        <div className="px-6 max-w-7xl mx-auto animate-fadeIn py-8 md:py-0">
          {userHasNoRole ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Access Pending</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">Your account has been created. An administrator will assign access shortly.</p>
            </div>
          ) : accessibleModules.length === 0 && !debugMode && !showFallback ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">No Departments Available</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">Contact your administrator to get access to business departments.</p>
            </div>
          ) : (
            <>
              {/* Hero Section */}
              <div className="mb-8 md:mb-12 text-center">
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 md:mb-6">
                  SilberArrows
                </h1>
                
                {/* Personalized Welcome Message */}
                <div className="mb-4 md:mb-6">
                  <h2 className="text-xl md:text-2xl font-medium text-gray-200">
                    Welcome back, {displayName}
                  </h2>
                </div>
                
                <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-6 md:mb-8">
                  Access specialized tools and workflows designed for your department's operations
                </p>
              </div>

              {/* Module Cards */}
              <div className="flex justify-center gap-6 max-w-7xl mx-auto md:flex-row flex-col items-center">
                {accessibleModules.map((module, index) => {
                  const IconComponent = module.icon;
                  
                  return (
                    <div
                      key={module.id}
                      onClick={() => handleModuleClick(module)}
                      className="group relative w-52 cursor-pointer"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Glass Morphism Card */}
                      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl hover:shadow-white/5 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:bg-white/8 hover:border-white/20 active:scale-95 active:opacity-80 overflow-hidden aspect-square">
                        
                        {/* Background Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`} />
                        
                        {/* Badge */}
                        <div className="absolute top-4 right-4">
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-white/20 text-white/90 rounded-full border border-white/30">
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
                            <div className="space-y-3">
                              <h3 className="text-lg font-bold text-white group-hover:text-gray-100 transition-colors leading-tight">
                                {module.name}
                              </h3>
                            </div>
                          </div>
                          
                          {/* Bottom Action */}
                          <div className="flex-shrink-0 pt-2 border-t border-white/10 group-hover:border-white/20 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                                {module.action}
                              </span>
                              <div className="w-6 h-6 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all duration-300">
                                <svg className="w-3 h-3 text-gray-400 group-hover:text-white transform group-hover:translate-x-0.5 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Debug Panel */}
      {(error || debugMode) && (
        <div className="fixed bottom-4 right-4 bg-red-900/80 backdrop-blur-md border border-red-500/30 rounded-xl p-4 max-w-md text-sm z-50">
          <div className="font-bold text-red-200 mb-2">Debug Information</div>
          <div className="space-y-1 text-red-100">
            <p>Auth Loading: {authLoading ? 'Yes' : 'No'}</p>
            <p>User: {user ? 'Authenticated' : 'Not authenticated'}</p>
            <p>Has Initially Loaded: {hasInitiallyLoaded ? 'Yes' : 'No'}</p>
            <p>Permissions Loading: {permissionsLoading ? 'Yes' : 'No'}</p>
            <p>Error: {error || 'None'}</p>
            <p>Accessible Modules: {accessibleModules.length}</p>
            {error && (
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg transition-colors"
              >
                Reload Page
              </button>
            )}
            {debugMode && (
              <button
                onClick={() => setDebugMode(false)}
                className="mt-3 px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg transition-colors"
              >
                Exit Debug
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 