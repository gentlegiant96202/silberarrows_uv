"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/shared/AuthProvider';

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
        if (lastModule) {
          // Redirect to the last visited module
          router.replace(lastModule);
        } else {
          // No previous module, go to module selection
          router.replace('/module-selection');
        }
      }
    }
  }, [loading, user, router]);

  // Show loading spinner while redirecting
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white/60">Redirecting...</p>
      </div>
    </div>
  );
} 