"use client";
import Header from '@/components/Header';

export default function WorkshopDashboard() {
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