"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  X,
  FileText,
  Calendar,
  Receipt,
  Download,
  Check,
  AlertCircle,
  Printer,
  Eye
} from "lucide-react";

//  Types
interface LeaseAccountingRecord {
  id: string;
  lease_id: string;
  billing_period: string;
  charge_type: 'rental' | 'salik' | 'mileage' | 'late_fee' | 'fine' | 'refund' | 'credit_note' | 'vat';
  quantity: number | null;
  unit_price: number | null;
  total_amount: number;
  comment: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  payment_id: string | null;
  status: 'pending' | 'invoiced' | 'paid' | 'overdue';
  vat_applicable: boolean;
  account_closed: boolean;
  created_at: string;
  updated_at: string;
  version: number;
  documents: any;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  billingPeriod: string;
  charges: LeaseAccountingRecord[];
  customerName: string;
  leaseId: string;
  onInvoiceGenerated: () => void;
}

export default function InvoiceModal({ 
  isOpen, 
  onClose, 
  billingPeriod, 
  charges, 
  customerName,
  leaseId,
  onInvoiceGenerated 
}: Props) {
  
  const [generating, setGenerating] = useState(false);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchNextInvoiceNumber();
    }
  }, [isOpen]);

  const fetchNextInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('ifrs_preview_next_invoice_number');
      if (error) throw error;
      setNextInvoiceNumber(data || 'INV-LE-XXXX');
    } catch (error) {
      setNextInvoiceNumber('INV-LE-XXXX');
    }
  };

  // Calculate totals
  const subtotal = charges.reduce((sum, charge) => sum + charge.total_amount, 0);
  const vatAmount = vatEnabled ? subtotal * 0.05 : 0;
  const total = subtotal + vatAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'decimal',
      minimumFractionDigits: 2
    }).format(amount) + ' AED';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getChargeTypeLabel = (charge: LeaseAccountingRecord) => {
    if (charge.comment?.startsWith('PAYMENT')) {
      return 'Payment Received';
    }

    const labels = {
      rental: 'Monthly Rental',
      salik: 'Salik Fee',
      mileage: 'Excess Mileage',
      late_fee: 'Late Fee',
      fine: 'Traffic Fine',
      refund: 'Refund/Credit',
      vat: 'VAT'
    } as const;
    return labels[charge.charge_type as keyof typeof labels] || charge.charge_type;
  };

  const generateInvoice = async () => {
    setGenerating(true);
    try {
      const uniqueCharges = charges.filter(
        (charge, index, self) =>
          index === self.findIndex((c) => c.id === charge.id)
      );
      const pendingCharges = uniqueCharges.filter(charge => charge.status === 'pending');

      if (pendingCharges.length === 0) {
        alert('There are no pending charges to invoice in this period.');
        setGenerating(false);
        return;
      }
      // Use  transaction-safe function
      const { data, error } = await supabase.rpc('ifrs_generate_invoice', {
        p_lease_id: leaseId,
        p_billing_period: billingPeriod,
        p_charge_ids: pendingCharges.map(c => c.id),
        p_include_vat: true,
        p_vat_rate: 0.05
      });

      if (error) {
        throw error;
      }
      // Parse the JSON response
      const invoiceResult = typeof data === 'string' ? JSON.parse(data) : data;
      
      onInvoiceGenerated();
      onClose();
      
      // Show success message with invoice number
      alert(`Invoice generated successfully!\nInvoice Number: ${invoiceResult.invoice_number}\nInvoice ID: ${invoiceResult.invoice_id}\nCharges Updated: ${invoiceResult.charges_updated}\nVAT: ${formatCurrency(invoiceResult.vat_amount || 0)}`);
      
    } catch (error) {
      alert('Error generating invoice. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl shadow-2xl border border-neutral-400/20 w-full max-w-4xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-400/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Generate  Invoice</h2>
              <p className="text-neutral-400">Sequential Invoice: {nextInvoiceNumber}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Invoice Preview */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
            
            {/* Invoice Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">INVOICE</h3>
                <p className="text-blue-400 font-medium">{nextInvoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-400">Billing Period</p>
                <p className="text-white font-medium">{formatDate(billingPeriod)}</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-6">
              <h4 className="text-white font-semibold mb-2">Bill To:</h4>
              <p className="text-white">{customerName}</p>
              <p className="text-neutral-400 text-sm">Lease ID: {leaseId.slice(-8)}</p>
            </div>

            {/* Charges Table */}
            <div className="mb-6">
              <h4 className="text-white font-semibold mb-4">Charges</h4>
              <div className="space-y-2">
                {charges.map((charge, index) => (
                  <div key={charge.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-neutral-400 w-8">{index + 1}.</span>
                        <div>
                        <p className="text-white font-medium">{getChargeTypeLabel(charge)}</p>
                          {charge.comment && (
                            <p className="text-neutral-400 text-xs">{charge.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {charge.quantity && charge.unit_price ? (
                      <div className="text-right text-sm">
                        <p className="text-neutral-400">{charge.quantity} × {formatCurrency(charge.unit_price)}</p>
                        <p className="text-white font-medium">{formatCurrency(charge.total_amount)}</p>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-white font-medium">{formatCurrency(charge.total_amount)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-white/10 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Subtotal:</span>
                  <span className="text-white">{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">VAT (5%):</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vatEnabled}
                        onChange={(e) => setVatEnabled(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-neutral-700 border-neutral-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-xs text-neutral-400">Apply VAT</span>
                    </label>
                  </div>
                  <span className="text-white">{formatCurrency(vatAmount)}</span>
                </div>
                
                <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
                  <span className="text-white">Total:</span>
                  <span className="text-blue-400">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={generateInvoice}
              disabled={generating || charges.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Generate Invoice {nextInvoiceNumber}
                </>
              )}
            </button>
            
            <button
              onClick={() => {
                // Preview functionality (future enhancement)
                alert('Invoice preview coming soon!');
              }}
              className="flex items-center gap-2 px-6 py-3 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              <Eye size={16} />
              Preview
            </button>
            
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-3 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Invoice Generation Status */}
        {generating && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
            <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-600">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <div>
                  <p className="text-white font-medium">Generating Invoice {nextInvoiceNumber}</p>
                  <p className="text-neutral-400 text-sm">Processing {charges.length} charges...</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
