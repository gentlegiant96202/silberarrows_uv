"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from 'next/link';
import AuthLogo from '@/components/AuthLogo';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Redirect authenticated users to the home page. The navigation call must
  // happen inside a side-effect to avoid triggering React warnings about state
  // updates during render.
  useEffect(() => {
  if (user) {
    router.replace("/");
    }
  }, [user, router]);

  // While we are redirecting (or waiting for the auth state), render nothing
  if (user || loading) {
    return null;
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
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        <AuthLogo />
        <form
          onSubmit={handleSubmit}
          className="bg-black/60 backdrop-blur-sm border border-white/10 p-8 rounded-lg shadow-lg shadow-black/40"
        >
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            Login
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
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-brand rounded text-white font-medium transition-transform duration-150 hover:scale-105 hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="text-center text-white/70 text-xs mt-4 space-y-1">
            <div>
              Need an account?{' '}
              <Link href="/signup" className="text-brand hover:underline">
                Sign up
              </Link>
            </div>
            <div>
              Forgot password?{' '}
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