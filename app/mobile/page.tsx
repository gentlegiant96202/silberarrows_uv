"use client";

import { useAuth } from '@/components/shared/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MobileHeader from '@/components/modules/uv-crm/mobile/MobileHeader';
import TwoColumnKanban from '@/components/modules/uv-crm/mobile/TwoColumnKanban';
import MobileActions from '@/components/modules/uv-crm/mobile/MobileActions';

export default function MobilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Pass the current URL as return destination
      router.push('/login?returnTo=/mobile');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-pulse text-lg">Loading...</div>
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