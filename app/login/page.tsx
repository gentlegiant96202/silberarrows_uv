"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from 'next/link';
import AuthLogo from '@/components/AuthLogo';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect authenticated users to the home page
  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  // While we are redirecting (or waiting for the auth state), render nothing
  if (user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white"></div>
          <p className="text-white/70 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-gray-900 via-black to-gray-900">
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
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-lg">
          <div className="mb-8">
            <div className="mb-6">
              <img
                src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png"
                alt="Logo"
                className="w-20 h-20 object-contain mx-auto mb-4"
              />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
              Welcome to Your<br />
              <span className="bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent">
                Dashboard
              </span>
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              Your premium automotive CRM platform for managing leads, inventory, and sales with precision.
            </p>
          </div>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <AuthLogo />
          </div>

          {/* Desktop Welcome */}
          <div className="hidden lg:block mb-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400">Sign in to access your dashboard</p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            
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
                    className={`w-full px-4 py-3 bg-black/50 border rounded-xl text-white placeholder-gray-500 transition-all duration-200 focus:outline-none ${
                      isEmailFocused || email
                        ? 'border-gray-300/50 shadow-lg shadow-gray-300/20'
                        : 'border-white/20 hover:border-white/30'
                    }`}
                    placeholder="Enter your email"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-300/10 to-white/10 opacity-0 transition-opacity duration-200 pointer-events-none" 
                       style={{ opacity: isEmailFocused ? 1 : 0 }} />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    className={`w-full px-4 py-3 pr-12 bg-black/50 border rounded-xl text-white placeholder-gray-500 transition-all duration-200 focus:outline-none ${
                      isPasswordFocused || password
                        ? 'border-gray-300/50 shadow-lg shadow-gray-300/20'
                        : 'border-white/20 hover:border-white/30'
                    }`}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-300/10 to-white/10 opacity-0 transition-opacity duration-200 pointer-events-none" 
                       style={{ opacity: isPasswordFocused ? 1 : 0 }} />
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

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-black transition-all duration-200 transform relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  background: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 50%, #9ca3af 100%)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                <span className="relative z-10 flex items-center justify-center space-x-2">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/20 border-t-black"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>

              {/* Links */}
              <div className="space-y-3 text-center text-sm">
                <Link 
                  href="/reset-password" 
                  className="block text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Forgot your password?
                </Link>
                <div className="flex items-center">
                  <div className="flex-1 h-px bg-white/10"></div>
                  <span className="px-4 text-gray-500 text-xs">or</span>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>
                <div className="text-gray-400">
                  Need an account?{' '}
                  <Link 
                    href="/signup" 
                    className="font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    Sign up
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
                <span>Secure Login</span>
              </div>
              <div className="flex items-center space-x-1">
                <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
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