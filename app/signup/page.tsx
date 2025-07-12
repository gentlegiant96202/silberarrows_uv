"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLogo from "@/components/AuthLogo";
import { useAuth } from "@/components/AuthProvider";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (user) {
    router.replace("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await signUp(email, password);
    if (error) {
      setError(error);
    } else {
      setSuccess("Account created. Please check your email (if confirmation is required) and then log in.");
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
            Sign Up
          </h2>
          <label className="block mb-4">
            <span className="text-white text-sm">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-black/50 border border-white/20 rounded text-white focus:outline-none focus:border-brand"
              required
            />
          </label>
          <label className="block mb-6">
            <span className="text-white text-sm">Password</span>
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
            disabled={loading}
            className="w-full py-2 bg-brand rounded text-white font-medium transition-transform duration-150 hover:scale-105 hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>

          <div className="text-center text-white/70 text-xs mt-4 space-y-1">
            <div>
              Already have an account? {" "}
              <Link href="/login" className="text-brand hover:underline">
                Log in
              </Link>
            </div>
            <div>
              Forgot password? {" "}
              <Link href="/reset-password" className="text-brand hover:underline">
                Reset it
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 