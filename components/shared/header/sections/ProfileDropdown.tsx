"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { LogOut, User, ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '@/components/shared/AuthProvider';
import { useUserRole } from '@/lib/useUserRole';

export default function ProfileDropdown() {
  const routerHook = useRouter();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const [showProfile, setShowProfile] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const profileRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get user's name from metadata
  const userName = user?.user_metadata?.full_name;
  const displayName = userName || 
    (user?.email?.split('@')[0]?.replace(/\./g, ' ')?.replace(/\b\w/g, l => l.toUpperCase())) || 
    'User';

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  };

  // Handle toggle and position update
  const handleToggle = () => {
    if (!showProfile) {
      updateDropdownPosition();
    }
    setShowProfile(!showProfile);
  };

  // close dropdown on outside click and handle resize
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    
    function handleResize() {
      if (showProfile) {
        updateDropdownPosition();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [showProfile]);

  return (
    <div className="relative flex items-center ml-4">
      {user ? (
        <>
          <button
            ref={buttonRef}
            onClick={handleToggle}
            className="flex items-center space-x-1 px-2 py-1.5 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-full shadow-inner hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand"
            title={user.email || 'User'}
          >
            <User className="w-4 h-4" />
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Dropdown rendered via Portal */}
          {showProfile && typeof window !== 'undefined' && createPortal(
            <div
              ref={profileRef}
              className="fixed w-56 bg-black/90 backdrop-blur border border-white/10 rounded-lg shadow-lg p-4 origin-top transition-transform transition-opacity duration-200 animate-in slide-in-from-top-2"
              style={{
                top: `${dropdownPosition.top}px`,
                right: `${dropdownPosition.right}px`,
                zIndex: 999999
              }}
            >
              {/* Personalized Welcome */}
              <div className="mb-3">
                <p className="text-sm font-medium text-white">Welcome back,</p>
                <p className="text-base font-semibold text-white">{displayName}</p>
              </div>
              
              <p className="text-xs text-white/60 truncate mb-3" title={user.email}>{user.email}</p>
              
              {/* Admin Settings Button */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      routerHook.push('/admin/settings');
                    }}
                    className="flex items-center space-x-2 w-full text-left text-sm text-white hover:text-white hover:bg-gradient-to-r hover:from-gray-300/20 hover:via-gray-500/20 hover:to-gray-700/20 p-2 rounded transition-all mb-2"
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
                className="flex items-center space-x-2 w-full text-left text-sm text-white hover:text-white hover:bg-gradient-to-r hover:from-gray-300/20 hover:via-gray-500/20 hover:to-gray-700/20 p-2 rounded transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>,
            document.body
          )}
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