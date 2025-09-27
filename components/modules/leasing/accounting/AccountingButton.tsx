"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import LeaseAccountingDashboard from "./LeaseAccountingDashboard";

interface Props {
  leaseId: string;
  leaseStartDate: string;
  customerName: string;
  className?: string;
}

export default function AccountingButton({ 
  leaseId, 
  leaseStartDate, 
  customerName, 
  className = "" 
}: Props) {
  const [showAccounting, setShowAccounting] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowAccounting(true)}
        className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all text-sm ${className}`}
        title="Manage Accounting"
      >
        <DollarSign size={14} />
        Accounting
      </button>

      {showAccounting && (
        <LeaseAccountingDashboard
          leaseId={leaseId}
          leaseStartDate={leaseStartDate}
          customerName={customerName}
          onClose={() => setShowAccounting(false)}
        />
      )}
    </>
  );
}
