"use client";
import Header from '@/components/Header';
import RouteProtector from '@/components/shared/RouteProtector';

export default function MarketingDashboard() {
  return (
    <RouteProtector moduleName="marketing">
    <div className="min-h-screen bg-black">
      <Header />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Marketing Dashboard Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">📢 Marketing Hub</h1>
            <p className="text-white/60 text-lg">Campaigns, design, and creative workflow</p>
          </div>

          {/* Coming Soon Section */}
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-8 bg-white/5 backdrop-blur border border-white/10 rounded-full flex items-center justify-center">
                <span className="text-6xl">🎨</span>
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">Coming Soon</h2>
              <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
                The Marketing Hub is under development. Soon you'll have access to professional design tools, 
                analytics, and so much more!
              </p>
              
              {/* Feature Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                  <div className="text-3xl mb-3">🎨</div>
                  <div className="text-white text-lg font-medium mb-2">Marketing Design & Photography Workflow</div>
                  <div className="text-white/60 text-sm">Professional content creation and brand management</div>
                </div>
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                  <div className="text-3xl mb-3">📊</div>
                  <div className="text-white text-lg font-medium mb-2">Analytics & So Much More!</div>
                  <div className="text-white/60 text-sm">Campaign tracking, ROI insights, and advanced marketing tools</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </RouteProtector>
  );
} 