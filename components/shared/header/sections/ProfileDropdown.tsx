"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '@/components/shared/AuthProvider';
import { useIsAdminSimple } from '@/lib/useIsAdminSimple';

export default function ProfileDropdown() {
  const routerHook = useRouter();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdminSimple();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={profileRef} className="relative flex items-center ml-4">
      {user ? (
        <>
          <button
            onClick={() => setShowProfile(prev => !prev)}
            className="flex items-center space-x-1 px-2 py-1.5 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-full shadow-inner hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand"
            title={user.email || 'User'}
          >
            <User className="w-4 h-4" />
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Animated dropdown */}
          <div
            className={`fixed right-4 top-16 w-56 bg-black/90 backdrop-blur border border-white/10 rounded-lg shadow-lg p-4 z-50 origin-top transition-transform transition-opacity duration-200 ${showProfile ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 pointer-events-none'}`}
          >
              <p className="text-sm text-white break-all mb-3">{user.email}</p>
              
              {/* Admin Settings Button */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      routerHook.push('/admin/settings');
                    }}
                    className="flex items-center space-x-2 w-full text-left text-sm text-white hover:text-brand mb-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <div className="border-t border-white/10 my-2"></div>
                </>
              )}
              
              {/* Logout Button */}
              <button
                onClick={async () => {
                  await signOut();
                  routerHook.push('/login');
                }}
                className="flex items-center space-x-2 w-full text-left text-sm text-white hover:text-brand"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
          </div>
        </>
      ) : (
        <a
          href="/login"
          className="px-4 py-1.5 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand/90"
        >
          Login
        </a>
      )}
    </div>
  );
} 