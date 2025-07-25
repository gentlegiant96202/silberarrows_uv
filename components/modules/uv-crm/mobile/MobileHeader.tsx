"use client";

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

  return (
    <header className="flex-shrink-0 bg-black border-b border-white/10 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img 
              src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" 
              alt="Logo" 
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <div className="text-white font-semibold text-lg">SilberArrows</div>
            <div className="text-white/60 text-xs">Mobile CRM</div>
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