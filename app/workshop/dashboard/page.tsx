"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useModulePermissions } from '@/lib/useModulePermissions';
import { Shield } from 'lucide-react';

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
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">🔧 Workshop</h1>
            <p className="text-white/60 text-lg">Service, maintenance, and repair management</p>
          </div>

          {/* Coming Soon Section */}
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-8 bg-white/5 backdrop-blur border border-white/10 rounded-full flex items-center justify-center">
                <span className="text-6xl">🚧</span>
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">Coming Soon</h2>
              <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
                The Workshop module is under development. Soon you'll be able to manage service appointments, 
                track repairs, and handle maintenance schedules.
              </p>
              
                             {/* Feature Preview */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                 <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                   <div className="text-3xl mb-3">🚚</div>
                   <div className="text-white text-lg font-medium mb-2">Vehicle Pickup & Drop Tracker</div>
                   <div className="text-white/60 text-sm">Track vehicle collection and delivery schedules</div>
                 </div>
                 <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                   <div className="text-3xl mb-3">🛡️</div>
                   <div className="text-white text-lg font-medium mb-2">Service & Warranty</div>
                   <div className="text-white/60 text-sm">Manage service history and warranty claims</div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 