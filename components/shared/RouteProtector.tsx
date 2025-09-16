import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useModulePermissions } from '@/lib/useModulePermissions';
import { useAuth } from '@/components/shared/AuthProvider';
import { Shield } from 'lucide-react';
import PulsatingLogo from './PulsatingLogo';

// Skeleton components for loading states

// Inventory Module Skeleton (CarKanbanBoard skeleton)
const InventorySkeleton = () => {
  // Import skeleton components from CarKanbanBoard
  const SkeletonCarCard = ({ isExpanded = false }: { isExpanded?: boolean }) => {
    if (isExpanded) {
      return (
        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg shadow-sm p-2 text-xs animate-pulse">
          <div className="w-full h-20 bg-white/10 rounded mb-2"></div>
          <div className="space-y-1">
            <div className="h-3 bg-white/10 rounded w-3/4"></div>
            <div className="h-2 bg-white/10 rounded w-full"></div>
            <div className="h-2 bg-white/10 rounded w-2/3"></div>
            <div className="h-2 bg-white/10 rounded w-1/2"></div>
            <div className="h-5 bg-white/10 rounded w-full mt-1"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg shadow-sm p-1.5 text-xs animate-pulse">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-16 h-12 bg-white/10 flex-shrink-0 rounded"></div>
          <div className="min-w-0 flex-1">
            <div className="h-3 bg-white/10 rounded w-2/3 mb-1"></div>
            <div className="h-2 bg-white/10 rounded w-full mb-1"></div>
            <div className="h-2 bg-white/10 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  };

  const SkeletonColumn = ({ title, isInventory = false }: { title: string; isInventory?: boolean }) => (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex flex-col flex-1 min-w-0">
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <h3 className="text-xs font-medium text-white">{title}</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium animate-pulse">
              --
            </span>
          </div>
          {isInventory && (
            <div className="h-4 w-16 bg-white/10 rounded animate-pulse"></div>
          )}
        </div>
        {isInventory && (
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded w-20 animate-pulse"></div>
            <div className="h-6 bg-white/10 rounded w-full animate-pulse"></div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCarCard key={i} isExpanded={false} />
        ))}
      </div>
    </div>
  );

  const columns = [
    { key: 'marketing', title: 'MARKETING' },
    { key: 'qc_ceo', title: 'SALES' },
    { key: 'inventory', title: 'INVENTORY' },
    { key: 'reserved', title: 'RESERVED' },
    { key: 'sold', title: 'SOLD' },
    { key: 'returned', title: 'RETURNED' },
  ];

  return (
    <div className="px-4" style={{ height: 'calc(100vh - 72px)' }}>
      <div className="flex gap-3 pb-4 w-full h-full">
        {columns.map(col => (
          <SkeletonColumn 
            key={col.key} 
            title={col.title}
            isInventory={col.key === 'inventory'}
          />
        ))}
      </div>
    </div>
  );
};

// CRM Module Skeleton (KanbanBoard skeleton)
const CRMSkeleton = () => {
  const SkeletonLeadCard = () => (
    <div className="backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs bg-white/5 border border-white/10 animate-pulse">
      <div className="flex items-start justify-between mb-1">
        <div className="h-3 bg-white/10 rounded w-3/4"></div>
        <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
          <div className="h-2 bg-white/10 rounded w-1/2"></div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
          <div className="h-2 bg-white/10 rounded w-2/3"></div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
          <div className="h-2 bg-white/10 rounded w-1/3"></div>
        </div>
        <div className="h-2 bg-white/10 rounded w-1/4 mt-1"></div>
      </div>
    </div>
  );

  const SkeletonCRMColumn = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex-1 min-w-0 flex flex-col">
      <div className="mb-3 px-1 flex items-center justify-between relative sticky top-0 z-10 bg-black/50 backdrop-blur-sm pb-2 pt-1">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-medium text-white whitespace-nowrap">{title}</h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium animate-pulse">
            --
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {Array.from({ length: 1 }).map((_, i) => (
          <SkeletonLeadCard key={i} />
        ))}
      </div>
    </div>
  );

  const columns = [
    { key: "new_lead", title: "NEW LEAD", icon: null },
    { key: "new_customer", title: "NEW APPOINTMENT", icon: null },
    { key: "negotiation", title: "NEGOTIATION", icon: <div className="w-4 h-4 bg-white/20 rounded animate-pulse"></div> },
    { key: "won", title: "RESERVED", icon: <div className="w-4 h-4 bg-white/20 rounded animate-pulse"></div> },
    { key: "delivered", title: "DELIVERED", icon: <div className="w-4 h-4 bg-white/20 rounded animate-pulse"></div> },
    { key: "lost", title: "LOST", icon: <div className="w-4 h-4 bg-white/20 rounded animate-pulse"></div> },
  ];

  return (
    <div className="px-4">
      <div
        className="flex gap-3 pb-4 w-full h-full overflow-hidden"
        style={{ height: "calc(100vh - 72px)" }}
      >
        {columns.map(col => (
          <SkeletonCRMColumn key={col.key} title={col.title} icon={col.icon} />
        ))}
      </div>
    </div>
  );
};

// Generic skeleton for modules without specific skeletons
const GenericModuleSkeleton = ({ moduleName }: { moduleName: string }) => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center">
    <PulsatingLogo size={48} text={`Loading ${moduleName.replace('_', ' ')} module...`} />
  </div>
);

interface RouteProtectorProps {
  moduleName: string;
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RouteProtector({ 
  moduleName, 
  children, 
  redirectTo = '/' 
}: RouteProtectorProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { canView, isLoading, error } = useModulePermissions(moduleName);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [skeletonVisible, setSkeletonVisible] = useState(true);

  useEffect(() => {
    // Wait for both user authentication and permissions to load
    if (!isLoading && user) {
      setHasInitialized(true);
      // Don't redirect - just show access denied screen
      // This prevents the constant reloading issue
      
      // If user has permission, show content immediately
      if (canView) {
        setSkeletonVisible(false);
        setShowContent(true);
      }
    }
  }, [canView, isLoading, user]);

  // Show skeleton loading while checking authentication and permissions
  if (!hasInitialized || isLoading || !user) {
    // Show appropriate skeleton based on module
    switch (moduleName) {
      case 'inventory':
        // Inventory handles its own progressive loading, show minimal loading
        return <GenericModuleSkeleton moduleName={moduleName} />;
      case 'uv_crm':
        // CRM handles its own progressive loading, show minimal loading
        return <GenericModuleSkeleton moduleName={moduleName} />;
      default:
        return <GenericModuleSkeleton moduleName={moduleName} />;
    }
  }

  // Show access denied if no permission (only after initialization)
  if (hasInitialized && !canView) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2 text-white">Access Denied</h1>
          <p className="text-white/70 mb-6">
            You don't have permission to access the {moduleName.replace('_', ' ')} module.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there was an error
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h1 className="text-2xl font-bold mb-2 text-white">Permission Error</h1>
          <p className="text-white/70 mb-6">
            Unable to verify permissions: {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // User has permission - render with smooth cross-fade transition
  const getSkeleton = () => {
    switch (moduleName) {
      case 'inventory':
        return <InventorySkeleton />;
      case 'uv_crm':
        return <CRMSkeleton />;
      default:
        return <GenericModuleSkeleton moduleName={moduleName} />;
    }
  };

  return (
    <div className="relative h-full">
      {/* Skeleton - fades out */}
      <div className={`absolute inset-0 transition-opacity duration-500 ease-out ${
        skeletonVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {getSkeleton()}
      </div>
      
      {/* Real content - fades in */}
      <div className={`transition-opacity duration-500 ease-out ${
        showContent ? 'opacity-100' : 'opacity-0'
      }`}>
        {children}
      </div>
    </div>
  );
} 