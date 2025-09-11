import { AuthProvider } from "@/components/shared/AuthProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {/* DEBUG: Providers mount banner */}
      <div className="fixed top-5 left-0 right-0 z-[10000] pointer-events-none">
        <div className="mx-auto w-fit px-2 py-0.5 rounded bg-purple-600/80 text-[10px] text-white shadow">
          Providers mounted
        </div>
      </div>
      {children}
    </AuthProvider>
  );
} 