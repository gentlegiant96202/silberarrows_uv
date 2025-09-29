"use client";

import { useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { useAccountingStatus } from '@/hooks/useAccountingStatus';

interface AccountingStatusButtonProps {
  leaseId: string;
  leaseStartDate: string;
  onClick: () => void;
}

export default function AccountingStatusButton({ 
  leaseId, 
  leaseStartDate, 
  onClick 
}: AccountingStatusButtonProps) {
  const accountingStatus = useAccountingStatus(leaseId, leaseStartDate);

  // Auto-refresh every 30 seconds to catch any missed real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!accountingStatus.loading) {
        accountingStatus.refresh();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [accountingStatus.loading, accountingStatus.refresh]);

  const getStatusColor = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-gradient-to-br from-red-500 to-red-600';
      case 'yellow':
        return 'bg-gradient-to-br from-yellow-500 to-yellow-600';
      case 'blue':
        return 'bg-gradient-to-br from-blue-500 to-blue-600';
      case 'green':
        return 'bg-gradient-to-br from-green-500 to-green-600';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-xs py-1.5 flex items-center gap-2 px-3 py-2 ${getStatusColor(accountingStatus.color)} text-white font-medium rounded-lg hover:shadow-lg transition-all`}
      title={accountingStatus.description}
    >
      <Receipt size={14} />
      {accountingStatus.loading ? 'Loading...' : accountingStatus.status}
      {accountingStatus.loading && (
        <div className="animate-spin rounded-full h-3 w-3 border-b border-white ml-1"></div>
      )}
    </button>
  );
}
