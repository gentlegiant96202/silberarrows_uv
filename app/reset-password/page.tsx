"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/shared/AuthProvider";
import AuthLogo from "@/components/shared/AuthLogo";
import Image from 'next/image';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { resetPassword, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  if (user) {
    router.replace("/");
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            {/* Outer ring */}
            <div className="animate-spin rounded-full h-16 w-16 border-2 border-gray-300/20"></div>
            {/* Inner spinning ring */}
            <div className="animate-spin rounded-full h-16 w-16 border-2 border-transparent border-t-gray-300 border-r-gray-300 absolute top-0 left-0" style={{ animationDuration: '1s' }}></div>
            {/* Center glow */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-r from-gray-300/30 to-white/30 rounded-full blur-sm animate-pulse"></div>
          </div>
          <p className="text-white/70 text-sm animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const { error } = await resetPassword(email);
    if (error) {
      setError(error);
    } else {
      setSuccess("Reset email sent. Please check your inbox.");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-black">
      {/* Hero Section */}
      <div className="relative hidden lg:flex items-center justify-center p-8">
        <div className="absolute inset-0">
          <Image 
            src="/5-2.jpg" 
            alt="Luxury car showcase" 
            fill 
            priority 
            sizes="(max-width: 1024px) 0vw, 50vw"
            className="object-cover" 
          />
          {/* Multiple gradient layers for depth - lighter overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-tr from-gray-900/20 via-transparent to-gray-800/15" />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-lg">
          <div className="mb-8">
            <div className="mb-6">
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
            <h1 className="text-6xl font-bold text-white mb-4 leading-tight">
              <span className="bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent">
                SilberArrows
              </span>
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              Your integrated portal for coordinating business operations across Service, Sales, Leasing, and Marketing.
            </p>
          </div>
        </div>
      </div>

      {/* Reset Form Section */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-black relative">
        {/* Top silver glow - subtle and natural */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-400/8 via-gray-400/4 to-transparent pointer-events-none"></div>
        {/* Bottom silver glow - subtle and natural */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-400/8 via-gray-400/4 to-transparent pointer-events-none"></div>
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <AuthLogo />
          </div>

          {/* Desktop Welcome */}
          <div className="hidden lg:block mb-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-2 animate-fadeIn">Reset Password</h2>
            <p className="text-gray-400 animate-fadeIn">We'll send you a reset link</p>
          </div>

          {/* Reset Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-black/80 backdrop-blur-xl border border-gray-300/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
            style={{
              boxShadow: '0 0 60px rgba(209, 213, 219, 0.25), 0 0 120px rgba(209, 213, 219, 0.15), 0 0 180px rgba(209, 213, 219, 0.08)'
            }}
          >
            {/* Background gradient with silver glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-300/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    className={`w-full px-4 py-3 bg-black/50 border-2 rounded-xl text-white placeholder-gray-500 transition-all duration-300 focus:outline-none ${
                      isEmailFocused || email
                        ? 'border-gray-300/60 shadow-lg shadow-gray-300/30 bg-black/60'
                        : 'border-gray-500/30 hover:border-gray-400/50 hover:bg-black/60'
                    }`}
                    placeholder="Enter your email address"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-300/10 to-white/10 opacity-0 transition-opacity duration-200 pointer-events-none" 
                       style={{ opacity: isEmailFocused ? 1 : 0 }} />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="flex items-center space-x-2 text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg p-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-4 rounded-xl font-semibold text-black transition-all duration-300 transform relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 25%, #d1d5db 50%, #9ca3af 75%, #6b7280 100%)',
                  boxShadow: '0 8px 32px rgba(209, 213, 219, 0.3), 0 4px 16px rgba(156, 163, 175, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative z-10 flex items-center justify-center space-x-2">
                  {loading ? (
                    <>
                      <div className="relative">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-black/20"></div>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent border-t-black absolute top-0 left-0 animate-pulse"></div>
                      </div>
                      <span className="animate-pulse">Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Email</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </>
                  )}
                </span>
              </button>

              {/* Links */}
              <div className="space-y-3 text-center text-sm">
                <div className="flex items-center">
                  <div className="flex-1 h-px bg-white/10"></div>
                  <span className="px-4 text-gray-500 text-xs">or</span>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>
                <div className="text-gray-400">
                  Remembered your password?{' '}
                  <Link 
                    href="/login" 
                    className="font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    Back to login
                  </Link>
                </div>
              </div>
            </div>
          </form>

          {/* Trust Indicators */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-1">
                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Secure Reset</span>
              </div>
              <div className="flex items-center space-x-1">
                <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" clipRule="evenodd" />
                </svg>
                <span>SSL Protected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 