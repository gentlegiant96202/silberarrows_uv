"use client";
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, Car, TrendingUp, Wrench, Users } from 'lucide-react';
import { useAllModulePermissions } from '@/lib/useModulePermissions';

interface Module {
  id: string;
  name: string;
  description: string;
  basePath: string;
  icon: React.ComponentType<any>;
}

const allModules: Module[] = [
  {
    id: 'uv_crm',
    name: 'UV CRM & Inventory',
    description: 'Cars, inventory, leads, customer management',
    basePath: '/',
    icon: Car
  },
  {
    id: 'marketing',
    name: 'Marketing Hub',
    description: 'Campaigns, leads, social media',
    basePath: '/marketing',
    icon: TrendingUp
  },
  {
    id: 'workshop',
    name: 'Workshop',
    description: 'Service, maintenance, repairs',
    basePath: '/workshop',
    icon: Wrench
  },
  {
    id: 'leasing',
    name: 'Leasing Department',
    description: 'Vehicle leasing and financing',
    basePath: '/leasing',
    icon: Users
  }
];

export default function ModuleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const allPermissions = useAllModulePermissions();
  
  // Filter modules based on user permissions
  const allowedModules = allModules.filter(module => {
    const permission = allPermissions[module.id as keyof typeof allPermissions];
    return permission && typeof permission === 'object' && permission.canView;
  });
  
  // Determine current module based on path
  const getCurrentModule = () => {
    if (pathname.startsWith('/workshop')) return 'workshop';
    if (pathname.startsWith('/marketing')) return 'marketing';
    if (pathname.startsWith('/leasing')) return 'leasing';
    // /inventory is part of UV CRM now
    return 'uv_crm'; // default (includes /inventory, /dashboard, etc.)
  };
  
  const currentModuleId = getCurrentModule();
  const currentModule = allowedModules.find(m => m.id === currentModuleId) || allowedModules[0];
  
  const [isOpen, setIsOpen] = useState(false);

  const handleModuleSwitch = (module: Module) => {
    setIsOpen(false);
    if (module.basePath === '/') {
      // UV CRM & Inventory - go to main dashboard by default
      router.push('/dashboard');
    } else {
      router.push(`${module.basePath}/dashboard`);
    }
  };

  // Show loading state while permissions are being fetched
  if (allPermissions.isLoading) {
    return (
      <div className="flex items-center space-x-2 text-white/60">
        <div className="w-4 h-4 animate-spin border border-white/20 border-t-white rounded-full"></div>
        <span className="text-sm">Loading modules...</span>
      </div>
    );
  }

  // If no modules are allowed, don't render the switcher
  if (allowedModules.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Module Switcher Button - styled like profile icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-48 px-4 py-1.5 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-full shadow-inner hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand"
        title="Switch Business Module"
      >
        <div className="flex items-center gap-2">
          {currentModule && (
            <div className="w-4 h-4 bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700 rounded-sm p-0.5 flex items-center justify-center">
              <currentModule.icon className="w-3 h-3 text-white" />
            </div>
          )}
          <span className="text-xs font-impact font-medium whitespace-nowrap truncate">{currentModule?.name}</span>
        </div>
        <ChevronDown className="w-4 h-4 flex-shrink-0" />
      </button>

      {/* Module Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu - styled like profile dropdown */}
          <div className="fixed right-20 top-16 w-64 bg-black/90 backdrop-blur border border-white/10 rounded-lg shadow-lg p-4 z-50 origin-top transition-transform transition-opacity duration-200">
            <p className="text-white/70 text-sm mb-3">Business Modules</p>
            
            <div className="space-y-2">
              {allowedModules.map((module) => {
                const IconComponent = module.icon;
                return (
                  <button
                    key={module.id}
                    onClick={() => handleModuleSwitch(module)}
                    className={`w-full flex items-start p-3 rounded-lg transition-colors text-left ${
                      module.id === currentModuleId
                        ? 'bg-white/20 text-white'
                        : 'hover:bg-white/10 text-white/80'
                    }`}
                  >
                    {/* Silver Gradient Icon */}
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 shadow-inner">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                      <div className="font-impact font-medium text-sm">{module.name}</div>
                      <div className="text-xs text-white/60 mt-1">{module.description}</div>
                      {module.id === currentModuleId && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <div className="text-xs text-green-400">✓ Current Module</div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
} 