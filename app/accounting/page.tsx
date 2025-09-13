'use client';
import React from 'react';
import { useAuth } from '@/components/shared/AuthProvider';
import { useUserRole } from '@/lib/useUserRole';
import { Shield, ArrowLeft } from 'lucide-react';
import ReservationsInvoicesGrid from '@/components/shared/accounting/ReservationsInvoicesGrid';

export default function AccountingPage() {
  const { user } = useAuth();
  const { role, isLoading } = useUserRole();

  // Show loading while checking permissions
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/60 mx-auto mb-4"></div>
          <p className="text-white/60">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Check if user has access (admin, accounts, or sales roles can access accounting)
  const hasAccess = role === 'admin' || role === 'accounts' || role === 'sales';

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2 text-white">Access Denied</h1>
          <p className="text-white/70 mb-6">
            You don't have permission to access the Accounting module. This module is available to Admin, Accounts, and Sales users only.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full">
        <div className="w-full px-4 py-4">
          <ReservationsInvoicesGrid />
        </div>
      </div>
    </div>
  );
}
