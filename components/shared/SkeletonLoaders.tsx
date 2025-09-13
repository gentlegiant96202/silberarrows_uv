"use client";

// Skeleton loading components for dashboard
export const SkeletonCard = ({ className = "", height = "h-20" }: { className?: string; height?: string }) => (
  <div className={`rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur border border-white/10 animate-pulse ${height} ${className}`}>
    <div className="p-3 h-full flex flex-col justify-between">
      <div className="h-3 bg-white/20 rounded w-2/3 mb-2"></div>
      <div className="h-6 bg-white/30 rounded w-1/2 mb-1"></div>
      <div className="h-2 bg-white/15 rounded w-3/4"></div>
    </div>
  </div>
);

export const SkeletonChart = ({ className = "", height = "h-60" }: { className?: string; height?: string }) => {
  // Use deterministic heights to avoid hydration mismatch
  const barHeights = [65, 45, 85, 35, 75, 55, 95, 25];
  
  return (
    <div className={`rounded-lg bg-black/70 backdrop-blur border border-white/10 animate-pulse ${height} ${className}`}>
      <div className="p-4 h-full">
        <div className="h-4 bg-white/20 rounded w-1/3 mb-4"></div>
        <div className="flex-1 flex items-end justify-between space-x-2 h-40">
          {barHeights.map((height, i) => (
            <div key={i} className="bg-white/20 rounded-t" style={{ height: `${height}%`, width: '12%' }}></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const SkeletonSalesDashboard = ({ className = "" }: { className?: string }) => (
  <div className={`space-y-4 ${className}`}>
    {/* Sales metrics grid skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} height="h-24" />
      ))}
    </div>
    
    {/* Charts skeleton */}
    <div className="grid gap-4 lg:grid-cols-2">
      <SkeletonChart height="h-48" />
      <SkeletonChart height="h-48" />
    </div>
  </div>
);

export const SkeletonKPIGrid = ({ className = "" }: { className?: string }) => (
  <div className={`grid gap-3 grid-cols-2 ${className}`}>
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonCard key={i} height="h-20" />
    ))}
  </div>
);

export const SkeletonStockAge = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-lg bg-black/50 backdrop-blur border border-white/10 animate-pulse ${className}`}>
    <div className="p-4">
      <div className="h-4 bg-white/20 rounded w-1/4 mb-3"></div>
      <div className="grid gap-3 grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} height="h-16" />
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonLocationInsights = ({ className = "" }: { className?: string }) => (
  <div className={`bg-gradient-to-br from-white/10 to-white/5 backdrop-blur border border-white/10 rounded-lg animate-pulse ${className}`}>
    <div className="p-4">
      <div className="h-4 bg-white/20 rounded w-1/3 mb-4"></div>
      <div className="flex gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-2 flex-1">
            <div className="text-center">
              <div className="h-6 bg-white/20 rounded w-8 mx-auto mb-1"></div>
              <div className="h-3 bg-white/15 rounded w-full mb-1"></div>
              <div className="h-2 bg-white/10 rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonFunnel = ({ className = "" }: { className?: string }) => {
  // Use deterministic widths to avoid hydration mismatch
  const barWidths = [75, 60, 45, 30, 20];
  
  return (
    <div className={`rounded-lg bg-black/70 backdrop-blur border border-white/10 animate-pulse h-[260px] ${className}`}>
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-white/20 rounded w-1/3"></div>
          <div className="h-3 bg-white/15 rounded w-1/4"></div>
        </div>
        <div className="space-y-2 flex-1">
          {barWidths.map((width, i) => (
            <div key={i} className="w-full bg-white/10 rounded-lg h-8 relative overflow-hidden">
              <div 
                className="bg-white/30 h-8 rounded-lg absolute inset-0"
                style={{ width: `${width}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
