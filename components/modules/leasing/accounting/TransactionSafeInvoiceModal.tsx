 // TRANSACTION-SAFE INVOICE GENERATION
// Replace the current InvoiceModal with this implementation

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface TransactionSafeInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  billingPeriod: string;
  charges: any[];
  customerName: string;
  leaseId: string;
  onInvoiceGenerated: () => void;
}

export default function TransactionSafeInvoiceModal({
  isOpen,
  onClose,
  billingPeriod,
  charges,
  customerName,
  leaseId,
  onInvoiceGenerated
}: TransactionSafeInvoiceModalProps) {
  const [generating, setGenerating] = useState(false);

  const generateInvoiceTransaction = async () => {
    setGenerating(true);
    try {
      // Use the transaction-safe database function
      const chargeIds = charges.map(c => c.id);
      
      const { data, error } = await supabase.rpc('generate_invoice_transaction', {
        p_lease_id: leaseId,
        p_billing_period: billingPeriod,
        p_charge_ids: chargeIds
      });

      if (error) {
        console.error('❌ Transaction failed:', error);
        throw error;
      }

      const invoiceId = data;
      console.log('✅ Invoice generated successfully:', invoiceId);
      
      onInvoiceGenerated();
      onClose();
      
      alert(`Invoice generated successfully!\nInvoice ID: ${invoiceId}`);
      
    } catch (error) {
      console.error('❌ Invoice generation failed:', error);
      alert('Error generating invoice. All changes have been rolled back.');
    } finally {
      setGenerating(false);
    }
  };

  // ... rest of component implementation
  return (
    <div>
      {/* UI implementation */}
      <button 
        onClick={generateInvoiceTransaction}
        disabled={generating}
      >
        {generating ? 'Generating...' : 'Generate Invoice'}
      </button>
    </div>
  );
}
