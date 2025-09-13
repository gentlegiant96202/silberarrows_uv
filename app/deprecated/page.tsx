"use client";
import { useEffect } from 'react';
import Image from 'next/image';

export default function DeprecatedPage() {
  useEffect(() => {
    // Auto-redirect after 10 seconds
    const timer = setTimeout(() => {
      window.location.href = 'https://portal.silberarrows.com';
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleRedirect = () => {
    window.location.href = 'https://portal.silberarrows.com';
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-2xl mx-auto text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="relative inline-block animate-fadeIn">
            <Image
              src="/MAIN LOGO.png"
              alt="SilberArrows Logo"
              width={120}
              height={120}
              className="object-contain mx-auto mb-4 relative z-10"
            />
            {/* Logo glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-300/20 to-white/20 blur-xl scale-110 opacity-60"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-black/80 backdrop-blur-xl border border-gray-300/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
             style={{
               boxShadow: '0 0 60px rgba(209, 213, 219, 0.25), 0 0 120px rgba(209, 213, 219, 0.15), 0 0 180px rgba(209, 213, 219, 0.08)'
             }}>
          
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-300/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            {/* Warning Icon */}
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              <span className="bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent">
                Domain Migration Notice
              </span>
            </h1>

            {/* Message */}
            <div className="space-y-4 mb-8">
              <p className="text-xl text-gray-300 leading-relaxed">
                This domain <span className="text-yellow-400 font-semibold">uv.silberarrows.com</span> has been deprecated.
              </p>
              <p className="text-lg text-gray-400">
                Please update your bookmarks and use our new portal:
              </p>
              <p className="text-2xl font-semibold bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent">
                portal.silberarrows.com
              </p>
            </div>

            {/* Redirect Button */}
            <button
              onClick={handleRedirect}
              className="w-full py-4 px-6 rounded-xl font-semibold text-black transition-all duration-300 transform relative overflow-hidden group hover:scale-105 active:scale-95 mb-6"
              style={{
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 25%, #d1d5db 50%, #9ca3af 75%, #6b7280 100%)',
                boxShadow: '0 8px 32px rgba(209, 213, 219, 0.3), 0 4px 16px rgba(156, 163, 175, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative z-10 flex items-center justify-center space-x-2">
                <span>Go to New Portal</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </span>
            </button>

            {/* Auto-redirect notice */}
            <div className="text-sm text-gray-500">
              <p>You will be automatically redirected in 10 seconds...</p>
            </div>

            {/* Additional Info */}
            <div className="mt-8 pt-6 border-t border-gray-600/30">
              <p className="text-sm text-gray-400 mb-2">
                <strong>What's changing?</strong>
              </p>
              <ul className="text-sm text-gray-500 space-y-1 text-left max-w-md mx-auto">
                <li>• Same powerful CRM system</li>
                <li>• Enhanced performance and reliability</li>
                <li>• All your data and settings remain intact</li>
                <li>• Improved security and features</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Need help? Contact your system administrator</p>
        </div>
      </div>
    </div>
  );
}
