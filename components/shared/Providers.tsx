import { AuthProvider } from "@/components/shared/AuthProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
} 