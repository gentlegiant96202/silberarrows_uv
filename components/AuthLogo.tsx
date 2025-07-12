"use client";

export default function AuthLogo() {
  return (
    <div className="flex flex-col items-center mb-8 text-center select-none">
      <img
        src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png"
        alt="Logo"
        className="w-16 h-16 object-contain mb-2"
      />
      <h1 className="text-xl font-semibold text-white">SilberArrows</h1>
      <p className="text-sm text-white/70">Approved Vehicles</p>
      <p className="text-xs text-white/60">Leads and Sales Pipeline</p>
    </div>
  );
} 