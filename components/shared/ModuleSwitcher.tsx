"use client";
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

interface Module {
  id: string;
  name: string;
  description: string;
  basePath: string;
}

const modules: Module[] = [
  {
    id: 'uv-crm',
    name: 'Used Vehicle CRM',
    description: 'Cars, inventory, vehicle sales',
    basePath: '/'
  },
  {
    id: 'workshop',
    name: 'Workshop',
    description: 'Service, maintenance, repairs',
    basePath: '/workshop'
  },
  {
    id: 'marketing',
    name: 'Marketing Hub',
    description: 'Campaigns, leads, social media',
    basePath: '/marketing'
  }
];

export default function ModuleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  
  // Determine current module based on path
  const getCurrentModule = () => {
    if (pathname.startsWith('/workshop')) return 'workshop';
    if (pathname.startsWith('/marketing')) return 'marketing';
    return 'uv-crm'; // default
  };
  
  const currentModuleId = getCurrentModule();
  const currentModule = modules.find(m => m.id === currentModuleId) || modules[0];
  
  const [isOpen, setIsOpen] = useState(false);

  const handleModuleSwitch = (module: Module) => {
    setIsOpen(false);
    if (module.basePath === '/') {
      router.push('/dashboard');
    } else {
      router.push(`${module.basePath}/dashboard`);
    }
  };

  return (
    <div className="relative">
      {/* Module Switcher Button - styled like profile icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-36 px-3 py-1.5 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-full shadow-inner hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand"
        title="Switch Business Module"
      >
        <span className="text-xs font-medium whitespace-nowrap">{currentModule.name}</span>
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
              {modules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => handleModuleSwitch(module)}
                  className={`w-full flex flex-col items-start p-3 rounded-lg transition-colors text-left ${
                    module.id === currentModuleId
                      ? 'bg-white/20 text-white'
                      : 'hover:bg-white/10 text-white/80'
                  }`}
                >
                  <div className="font-medium text-sm">{module.name}</div>
                  <div className="text-xs text-white/60 mt-1">{module.description}</div>
                  {module.id === currentModuleId && (
                    <div className="w-full mt-2 pt-2 border-t border-white/20">
                      <div className="text-xs text-green-400">✓ Current Module</div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
} 