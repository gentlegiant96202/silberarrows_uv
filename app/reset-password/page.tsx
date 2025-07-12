"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import AuthLogo from "@/components/AuthLogo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { resetPassword, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (user) {
    router.replace("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await resetPassword(email);
    if (error) {
      setError(error);
    } else {
      setSuccess("Reset email sent. Please check your inbox.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        <AuthLogo />
        <form
          onSubmit={handleSubmit}
          className="bg-black/60 backdrop-blur-sm border border-white/10 p-8 rounded-lg shadow-lg shadow-black/40"
        >
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            Reset Password
          </h2>
          <label className="block mb-6">
            <span className="text-white text-sm">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-black/50 border border-white/20 rounded text-white focus:outline-none focus:border-brand"
              required
            />
          </label>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {success && <p className="text-green-500 text-sm mb-4">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-brand rounded text-white font-medium transition-transform duration-150 hover:scale-105 hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Reset Email"}
          </button>
          <div className="text-center text-white/70 text-xs mt-4">
            Remembered? {" "}
            <Link href="/login" className="text-brand hover:underline">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 