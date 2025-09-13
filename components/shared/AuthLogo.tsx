"use client";

export default function AuthLogo() {
  return (
    <div className="flex flex-col items-center mb-8 text-center select-none">
      <div className="mb-4">
        <div className="relative inline-block">
          <img
            src="/MAIN LOGO.png"
            alt="SilberArrows Logo"
            className="w-20 h-20 object-contain relative z-10"
          />
          {/* Logo glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-300/20 to-white/20 blur-xl scale-110 opacity-60"></div>
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">
          <span className="bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent">
            SilberArrows
          </span>
        </h1>
        <p className="text-sm text-gray-500">Your integrated portal for coordinating business operations across Service, Sales, Leasing, and Marketing.</p>
      </div>
    </div>
  );
} 