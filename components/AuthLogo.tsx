"use client";

export default function AuthLogo() {
  return (
    <div className="flex flex-col items-center mb-8 text-center select-none">
      <div className="mb-4">
        <img
          src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png"
          alt="Logo"
          className="w-16 h-16 object-contain"
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-300 font-medium">Approved Vehicles</p>
        <p className="text-xs text-gray-500">Leads and Sales Pipeline</p>
      </div>
    </div>
  );
} 