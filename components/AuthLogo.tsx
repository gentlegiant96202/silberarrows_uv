"use client";

export default function AuthLogo() {
  return (
    <div className="flex flex-col items-center mb-8 text-center select-none">
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-300/20 to-white/20 rounded-xl blur-xl"></div>
        <img
          src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png"
          alt="SilberArrows Logo"
          className="relative w-16 h-16 object-contain bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/20"
        />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent">
          SilberArrows
        </h1>
        <p className="text-sm text-gray-300 font-medium">Approved Vehicles</p>
        <p className="text-xs text-gray-500">Leads and Sales Pipeline</p>
      </div>
    </div>
  );
} 