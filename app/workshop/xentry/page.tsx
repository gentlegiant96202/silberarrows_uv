"use client";
import { useAuth } from '@/components/shared/AuthProvider';
import XentryContent from '@/components/shared/XentryContent';
import { Monitor } from 'lucide-react';

export default function WorkshopXentryPage() {
  const { user } = useAuth();

  // If no user, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="p-4 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 rounded-full w-16 h-16 mx-auto mb-6">
            <Monitor className="h-8 w-8 text-black mx-auto" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-200 via-gray-100 to-gray-400 bg-clip-text text-transparent mb-4">Authentication Required</h1>
          <p className="text-white/70 text-lg">Please log in to access XENTRY remote desktop.</p>
        </div>
      </div>
    );
  }

  // Show XENTRY content for any authenticated user
  return <XentryContent />;
}

