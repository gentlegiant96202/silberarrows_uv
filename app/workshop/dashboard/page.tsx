"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useModulePermissions } from '@/lib/useModulePermissions';
import { Shield, Wrench } from 'lucide-react';

export default function WorkshopDashboard() {
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
    <div className="min-h-screen bg-black">
      <Header />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Workshop Dashboard Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-400 via-gray-300 to-gray-500 flex items-center justify-center shadow-lg">
                  <Wrench className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Workshop Department</h1>
                  <p className="text-gray-300">Service Management & Analytics</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon */}
          <div className="flex items-center justify-center h-[calc(100vh-400px)]">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-8 bg-white/5 backdrop-blur border border-white/10 rounded-full flex items-center justify-center">
                <Wrench className="w-16 h-16 text-white/20" />
              </div>
              <div className="text-6xl mb-4">🚧</div>
              <h2 className="text-2xl font-semibold text-white mb-2">Coming Soon</h2>
              <p className="text-white/70 max-w-md mx-auto">
                The <span className="text-white font-semibold">WORKSHOP</span> service analytics dashboard is under development.
              </p>
              <div className="mt-6 text-sm text-white/50">
                Available in Accounts → Service Department
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 