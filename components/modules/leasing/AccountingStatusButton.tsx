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
      case 'orange':
        return 'bg-gradient-to-br from-orange-500 to-orange-600';
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

  const getTooltipText = () => {
    let tooltip = accountingStatus.description;
    
    if (accountingStatus.invoiceDueDate) {
      const dueDate = new Date(accountingStatus.invoiceDueDate).toLocaleDateString();
      const today = new Date();
      const dueDateObj = new Date(accountingStatus.invoiceDueDate);
      const daysUntilDue = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue > 0) {
        tooltip += ` | Invoice Due: ${dueDate} (${daysUntilDue} days left)`;
      } else if (daysUntilDue === 0) {
        tooltip += ` | Invoice Due: ${dueDate} (TODAY!)`;
      } else {
        tooltip += ` | Invoice Due: ${dueDate} (${Math.abs(daysUntilDue)} days overdue)`;
      }
    }
    
    return tooltip;
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-xs py-1 flex items-center gap-1.5 px-2 ${getStatusColor(accountingStatus.color)} text-white font-medium rounded-md hover:shadow-md transition-all opacity-90 hover:opacity-100`}
      title={getTooltipText()}
    >
      <Receipt size={12} />
      <span className="truncate">
        {accountingStatus.loading ? 'Loading...' : accountingStatus.status}
      </span>
      {accountingStatus.loading && (
        <div className="animate-spin rounded-full h-2.5 w-2.5 border-b border-white ml-1"></div>
      )}
    </button>
  );
}
