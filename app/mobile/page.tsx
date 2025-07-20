"use client";

import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MobileHeader from '@/components/mobile/MobileHeader';
import TwoColumnKanban from '@/components/mobile/TwoColumnKanban';
import MobileActions from '@/components/mobile/MobileActions';

export default function MobilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
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