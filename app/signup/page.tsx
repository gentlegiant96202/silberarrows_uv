"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLogo from "@/components/shared/AuthLogo";
import { useAuth } from "@/components/shared/AuthProvider";
import Image from 'next/image';

export default function SignupPage() {
  const router = useRouter();
  const { signUp, loading, user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Domain restriction settings
  const ALLOWED_DOMAINS = ['@silberarrows.com'];
  const [emailDomainError, setEmailDomainError] = useState<string | null>(null);

  // Check if email domain is allowed
  const isValidDomain = (email: string): boolean => {
    return ALLOWED_DOMAINS.some(domain => email.toLowerCase().endsWith(domain.toLowerCase()));
  };

  // Handle email change with real-time domain validation
  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailDomainError(null);
    
    // Only validate if email contains @ and appears complete
    if (value.includes('@') && value.length > 3) {
      if (!isValidDomain(value)) {
        setEmailDomainError(`Only ${ALLOWED_DOMAINS.join(' or ')} email addresses are allowed`);
      }
    }
  };

  if (user) {
    router.replace("/");
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
    setSuccess(null);
    setEmailDomainError(null);

    // Validate domain before attempting signup
    if (!isValidDomain(email)) {
      setEmailDomainError(`Only ${ALLOWED_DOMAINS.join(' or ')} email addresses are allowed`);
      setError('Please use a valid company email address.');
      return;
    }

    const { error } = await signUp(email, password, fullName);
    if (error) {
      setError(error);
    } else {
      setSuccess("Account created successfully! Please check your email to verify your account.");
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
              Join the<br />
              <span className="bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent">
                Team
              </span>
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              Create your account to access the internal CRM system and start managing leads and inventory.
            </p>
          </div>
        </div>
      </div>

      {/* Signup Form Section */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <AuthLogo />
          </div>

          {/* Desktop Welcome */}
          <div className="hidden lg:block mb-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-gray-400">Get access to the internal system</p>
          </div>

          {/* Signup Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onFocus={() => setIsNameFocused(true)}
                    onBlur={() => setIsNameFocused(false)}
                    className={`w-full px-4 py-3 bg-black/50 border rounded-xl text-white placeholder-gray-500 transition-all duration-200 focus:outline-none ${
                      isNameFocused || fullName
                        ? 'border-gray-300/50 shadow-lg shadow-gray-300/20'
                        : 'border-white/20 hover:border-white/30'
                    }`}
                    placeholder="Enter your full name"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-300/10 to-white/10 opacity-0 transition-opacity duration-200 pointer-events-none" 
                       style={{ opacity: isNameFocused ? 1 : 0 }} />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    className={`w-full px-4 py-3 bg-black/50 border rounded-xl text-white placeholder-gray-500 transition-all duration-200 focus:outline-none ${
                      emailDomainError
                        ? 'border-red-400/50 shadow-lg shadow-red-400/20'
                        : isEmailFocused || email
                        ? 'border-gray-300/50 shadow-lg shadow-gray-300/20'
                        : 'border-white/20 hover:border-white/30'
                    }`}
                    placeholder="Enter your company email"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-300/10 to-white/10 opacity-0 transition-opacity duration-200 pointer-events-none" 
                       style={{ opacity: isEmailFocused ? 1 : 0 }} />
                </div>
                
                {/* Domain validation message */}
                {emailDomainError && (
                  <div className="flex items-center space-x-2 text-red-400 text-sm mt-1">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{emailDomainError}</span>
                  </div>
                )}
                
                {/* Helpful hint for valid domains */}
                {!emailDomainError && !email && (
                  <div className="text-gray-500 text-xs mt-1">
                    Use your company email ({ALLOWED_DOMAINS.join(' or ')})
                  </div>
                )}
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
                    placeholder="Create a password"
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
                disabled={loading || !!emailDomainError}
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
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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
                <div className="space-y-2">
                  <div className="text-gray-400">
                    Already have an account?{' '}
                    <Link 
                      href="/login" 
                      className="font-medium text-gray-300 hover:text-white transition-colors"
                    >
                      Sign in
                    </Link>
                  </div>
                  <div className="text-gray-400">
                    Forgot your password?{' '}
                    <Link 
                      href="/reset-password" 
                      className="font-medium text-gray-300 hover:text-white transition-colors"
                    >
                      Reset it
                    </Link>
                  </div>
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
                <span>Secure Signup</span>
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