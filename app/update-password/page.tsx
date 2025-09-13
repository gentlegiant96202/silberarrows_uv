"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/shared/AuthProvider";
import AuthLogo from "@/components/shared/AuthLogo";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validToken, setValidToken] = useState(false);

  // Detect recovery type param (Supabase appends #params but next/navigation treats query params only)
  useEffect(() => {
    // Supabase uses fragment (#) not querystring. We need to parse window.location.hash.
    if (typeof window !== "undefined") {
      const hash = window.location.hash; // e.g., #access_token=...&type=recovery
      if (hash.includes("type=recovery")) {
        setValidToken(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Password updated. Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    }
  };

  if (!validToken && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Invalid or expired password reset link.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        <AuthLogo />
        <form
          onSubmit={handleSubmit}
          className="bg-black/60 backdrop-blur-sm border border-white/10 p-8 rounded-lg shadow-lg shadow-black/40"
        >
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            Set New Password
          </h2>
          <label className="block mb-6">
            <span className="text-white text-sm">New Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-black/50 border border-white/20 rounded text-white focus:outline-none focus:border-brand"
              required
            />
          </label>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {success && <p className="text-green-500 text-sm mb-4">{success}</p>}
          <button
            type="submit"
            className="w-full py-2 bg-brand rounded text-white font-medium transition-transform duration-150 hover:scale-105 hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
} 