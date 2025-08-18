"use client";

import { useAuth } from '@/components/shared/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isPWAStandalone, checkPWASessionHealth, restorePWASession } from '@/lib/mobileAuth';
import MobileHeader from '@/components/modules/uv-crm/mobile/MobileHeader';
import TwoColumnKanban from '@/components/modules/uv-crm/mobile/TwoColumnKanban';
import MobileActions from '@/components/modules/uv-crm/mobile/MobileActions';

export default function MobilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pwaSessionChecked, setPwaSessionChecked] = useState(false);

  // Enhanced PWA authentication handling
  useEffect(() => {
    const handlePWAAuth = async () => {
      // Check if we're in PWA standalone mode
      const isStandalone = isPWAStandalone();
      
      if (isStandalone) {
        console.log('🔧 PWA Mode: Running in standalone mode');
        
        // Check session health first
        const isHealthy = checkPWASessionHealth();
        
        if (!isHealthy && !user && !loading) {
          console.log('🔄 PWA Mode: Attempting session restoration...');
          try {
            const result = await restorePWASession();
            if (!result.session) {
              console.log('🔄 PWA Mode: Session restoration failed, redirecting to login');
              router.push('/login?returnTo=/mobile&pwa=true');
            }
          } catch (error) {
            console.error('PWA Mode: Session restoration error:', error);
            router.push('/login?returnTo=/mobile&pwa=true');
          }
        }
      } else if (!loading && !user) {
        // Regular browser mode
        router.push('/login?returnTo=/mobile');
      }
      
      setPwaSessionChecked(true);
    };

    handlePWAAuth();
  }, [user, loading, router]);

  if (loading || !pwaSessionChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg mb-2">SilberCRM</div>
          <div className="text-sm text-white/70">
            {isPWAStandalone() ? 'Restoring PWA session...' : 'Loading mobile app...'}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      <MobileHeader />
      <TwoColumnKanban />
      <MobileActions />
    </div>
  );
} 