import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useModulePermissions } from '@/lib/useModulePermissions';
import { Shield } from 'lucide-react';

interface RouteProtectorProps {
  moduleName: string;
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RouteProtector({ 
  moduleName, 
  children, 
  redirectTo = '/' 
}: RouteProtectorProps) {
  const router = useRouter();
  const { canView, isLoading, error } = useModulePermissions(moduleName);

  useEffect(() => {
    if (!isLoading && !canView) {
      router.push(redirectTo);
    }
  }, [canView, isLoading, router, redirectTo]);

  // Show loading while checking permissions
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
          <p className="text-white/70">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (!canView) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2 text-white">Access Denied</h1>
          <p className="text-white/70 mb-6">
            You don't have permission to access the {moduleName.replace('_', ' ')} module.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show error state if there was an error
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h1 className="text-2xl font-bold mb-2 text-white">Permission Error</h1>
          <p className="text-white/70 mb-6">
            Unable to verify permissions: {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // User has permission, render the protected content
  return <>{children}</>;
} 