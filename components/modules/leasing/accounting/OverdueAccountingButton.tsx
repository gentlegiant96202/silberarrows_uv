"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import DirhamIcon from "@/components/ui/DirhamIcon";

interface LeaseBalance {
  current_balance: number;
  overdue_amount: number;
  overdue_count: number;
  past_due_amount: number;
  oldest_overdue_date?: string;
}

interface Props {
  leaseId: string;
  customerName: string;
  leaseStartDate: string;
  className?: string;
  onClick?: () => void;
}

export default function AccountingButton({
  leaseId,
  customerName,
  leaseStartDate,
  className = "",
  onClick
}: Props) {
  const [balance, setBalance] = useState<LeaseBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, [leaseId]);

  const fetchBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('ifrs_lease_balances')
        .select('current_balance, overdue_amount, overdue_count, past_due_amount, oldest_overdue_date')
        .eq('lease_id', leaseId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching  balance:', error);
        return;
      }

      setBalance(data);
    } catch (error) {
      console.error('Error fetching  balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getButtonStyle = () => {
    if (!balance) return "bg-gradient-to-r from-gray-500 to-gray-600";
    
    if (balance.overdue_amount > 0) {
      return "bg-gradient-to-r from-red-500 to-red-600 animate-pulse shadow-lg shadow-red-500/25";
    } else if (balance.current_balance > 100) { // Outstanding balance threshold
      return "bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/25";
    } else if (balance.current_balance <= 0) {
      return "bg-gradient-to-r from-green-500 to-green-600 shadow-lg shadow-green-500/25";
    } else {
      return "bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25";
    }
  };

  const getIcon = () => {
    if (!balance) return Clock;
    
    if (balance.overdue_amount > 0) {
      return AlertTriangle;
    } else if (balance.current_balance <= 0) {
      return CheckCircle;
    } else {
      return () => <DirhamIcon size={16} />;
    }
  };

  const getStatusText = () => {
    if (loading) return "Loading...";
    if (!balance) return "No Data";
    
    if (balance.overdue_amount > 0) {
      const daysPastDue = balance.oldest_overdue_date 
        ? Math.floor((Date.now() - new Date(balance.oldest_overdue_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      return `${balance.overdue_count} Overdue (${daysPastDue}d)`;
    } else if (balance.current_balance > 100) {
      return "Outstanding";
    } else if (balance.current_balance <= 0) {
      return "Paid Up";
    } else {
      return "Current";
    }
  };

  const getAmountDisplay = () => {
    if (!balance) return "---";
    
    if (balance.overdue_amount > 0) {
      return formatCurrency(balance.overdue_amount);
    } else {
      return formatCurrency(Math.abs(balance.current_balance));
    }
  };

  const Icon = getIcon();

  return (
    <button
      onClick={onClick}
      className={`
        ${getButtonStyle()}
        text-white font-medium rounded-lg hover:shadow-xl transition-all duration-300
        flex items-center gap-2 px-3 py-2 text-sm w-full justify-center
        border border-white/20 backdrop-blur-sm
        ${className}
      `}
      title={` Accounting for ${customerName} - Click to manage finances`}
    >
      <Icon size={16} className="flex-shrink-0" />
      <div className="flex flex-col items-center min-w-0">
        <span className="text-xs opacity-90 truncate w-full">{getStatusText()}</span>
        <span className="text-xs font-bold truncate w-full">
          {getAmountDisplay()}
        </span>
      </div>
      
      {balance?.overdue_amount > 0 && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-white/50" />
      )}
    </button>
  );
}
