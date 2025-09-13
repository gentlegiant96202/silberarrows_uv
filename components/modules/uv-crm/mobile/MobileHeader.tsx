"use client";
// Updated with SilberArrows branding
import { useAuth } from '@/components/shared/AuthProvider';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function MobileHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Force recompile - updated branding

  return (
    <header className="flex-shrink-0 bg-black border-b border-white/10 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <div className="relative">
              <img 
                src="/MAIN LOGO.png" 
                alt="SilberArrows Logo" 
                className="w-10 h-10 object-contain relative z-10"
              />
              {/* Logo glow effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-300/20 to-white/20 blur-xl scale-110 opacity-60"></div>
            </div>
          </div>
          <div>
            <div className="text-white font-bold text-2xl">
              <span className="bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent">
                SilberArrows TEST
              </span>
            </div>
            <div className="text-gray-300 text-xs leading-tight">
              Your integrated portal for coordinating business operations across Service, Sales, Leasing, and Marketing.
            </div>
          </div>
        </div>

        {/* User & Logout */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-white text-sm font-medium">
              {user?.email?.split('@')[0]}
            </div>
            <div className="text-white/60 text-xs">
              {user?.email?.split('@')[1]}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </div>
    </header>
  );
} 