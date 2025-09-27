"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import SimpleAccountingModal from "./SimpleAccountingModal";

interface LeaseBalance {
  current_balance: number;
  overdue_amount: number;
  overdue_count: number;
}

interface Props {
  leaseId: string;
  customerName: string;
  leaseStartDate: string;
  monthlyPayment?: number;
  className?: string;
}

export default function SimpleAccountingButton({
  leaseId,
  customerName,
  leaseStartDate,
  monthlyPayment,
  className = ""
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [balance, setBalance] = useState<LeaseBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, [leaseId]);

  const fetchBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_balances')
        .select('current_balance, overdue_amount, overdue_count')
        .eq('lease_id', leaseId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching balance:', error);
        return;
      }

      setBalance(data);
    } catch (error) {
      console.error('Error fetching balance:', error);
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
      return "bg-gradient-to-r from-red-500 to-red-600 animate-pulse";
    } else if (balance.current_balance > 0) {
      return "bg-gradient-to-r from-yellow-500 to-yellow-600";
    } else {
      return "bg-gradient-to-r from-green-500 to-green-600";
    }
  };

  const getIcon = () => {
    if (!balance) return DollarSign;
    
    if (balance.overdue_amount > 0) {
      return AlertTriangle;
    } else if (balance.current_balance <= 0) {
      return CheckCircle;
    } else {
      return DollarSign;
    }
  };

  const getStatusText = () => {
    if (loading) return "Loading...";
    if (!balance) return "No Data";
    
    if (balance.overdue_amount > 0) {
      return `${balance.overdue_count} Overdue`;
    } else if (balance.current_balance > 0) {
      return "Outstanding";
    } else if (balance.current_balance === 0) {
      return "Up to Date";
    } else {
      return "Credit Balance";
    }
  };

  const Icon = getIcon();

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`
          ${getButtonStyle()}
          text-white font-medium rounded-lg hover:shadow-lg transition-all duration-200
          flex items-center gap-2 px-3 py-2 text-sm w-full justify-center
          ${className}
        `}
        title={`Click to manage accounting for ${customerName}`}
      >
        <Icon size={16} />
        <div className="flex flex-col items-center">
          <span className="text-xs opacity-90">{getStatusText()}</span>
          {balance && (
            <span className="text-xs font-bold">
              {balance.overdue_amount > 0 
                ? formatCurrency(balance.overdue_amount)
                : formatCurrency(Math.abs(balance.current_balance))
              }
            </span>
          )}
        </div>
      </button>

      <SimpleAccountingModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          fetchBalance(); // Refresh balance when modal closes
        }}
        leaseId={leaseId}
        customerName={customerName}
        leaseStartDate={leaseStartDate}
        monthlyPayment={monthlyPayment}
      />
    </>
  );
}
