"use client";

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import UVAccountingDashboard from './UVAccountingDashboard';

interface Props {
  leadId: string;
  customerName: string;
  customerPhone: string;
  vehicleId?: string;
  className?: string;
}

export default function UVAccountingButton({ 
  leadId, 
  customerName, 
  customerPhone,
  vehicleId,
  className = '' 
}: Props) {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowDashboard(true);
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg
          bg-gradient-to-br from-white/10 to-white/5 
          border border-white/20 text-white/80
          hover:from-white/15 hover:to-white/10 hover:text-white
          transition-all ${className}`}
        title="Open Accounting"
      >
        <Calculator size={14} />
        <span>Accounting</span>
      </button>

      {showDashboard && (
        <UVAccountingDashboard
          leadId={leadId}
          customerName={customerName}
          customerPhone={customerPhone}
          vehicleId={vehicleId}
          onClose={() => setShowDashboard(false)}
        />
      )}
    </>
  );
}

