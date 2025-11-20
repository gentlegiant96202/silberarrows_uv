"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/shared/AuthProvider';
import PulsatingLogo from '@/components/shared/PulsatingLogo';
import Snowfall from 'react-snowfall';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not authenticated, go to login
        router.replace('/login');
      } else {
        // Authenticated, check for last visited module
        const lastModule = localStorage.getItem('lastVisitedModule');
        
        // Check if user came from module selection or explicitly wants to stay there
        const referrer = document.referrer;
        const isFromModuleSelection = referrer.includes('/module-selection');
        const hasModuleSelectionIntent = sessionStorage.getItem('stayOnModuleSelection');
        
        if (lastModule && !isFromModuleSelection && !hasModuleSelectionIntent) {
          // Redirect to the last visited module only if not coming from module selection
          router.replace(lastModule);
        } else {
          // No previous module or user wants to stay on module selection
          sessionStorage.removeItem('stayOnModuleSelection'); // Clean up flag
          router.replace('/module-selection');
        }
      }
    }
  }, [loading, user, router]);

  // Show loading spinner while redirecting
  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      <Snowfall
        color="#ffffff"
        snowflakeCount={100}
        speed={[0.5, 2]}
        wind={[-0.5, 0.5]}
        radius={[0.5, 3]}
        style={{
          position: 'fixed',
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />
      <div className="relative z-10">
        <PulsatingLogo size={48} text="Redirecting..." />
      </div>
    </div>
  );
} 