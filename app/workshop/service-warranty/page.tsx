"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useModulePermissions } from '@/lib/useModulePermissions';
import { Shield, Wrench } from 'lucide-react';
import ServiceWarrantyContent from '@/components/shared/ServiceWarrantyContent';
import RouteProtector from '@/components/shared/RouteProtector';

export default function WorkshopServiceWarrantyPage() {
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
          <p className="text-white/70">Checking access permissions...</p>
        </div>
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
        <Header />
        <ServiceWarrantyContent />
      </div>
    </RouteProtector>
  );
} 