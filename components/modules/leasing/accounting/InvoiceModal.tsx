"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  X, 
  FileText, 
  Calendar, 
  DollarSign,
  Download,
  Check,
  AlertCircle
} from "lucide-react";

interface LeaseAccountingRecord {
  id: string;
  lease_id: string;
  billing_period: string;
  charge_type: 'rental' | 'salik' | 'mileage' | 'late_fee' | 'fine';
  quantity: number | null;
  unit_price: number | null;
  total_amount: number;
  comment: string | null;
  invoice_id: string | null;
  payment_id: string | null;
  status: 'pending' | 'invoiced' | 'paid' | 'overdue';
  vat_applicable: boolean;
  account_closed: boolean;
  created_at: string;
  updated_at: string;
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
  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatRate, setVatRate] = useState(5.0);
  const [generating, setGenerating] = useState(false);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Set due date to 30 days from billing period
      const billingDate = new Date(billingPeriod);
      const dueDateCalc = new Date(billingDate);
      dueDateCalc.setDate(dueDateCalc.getDate() + 30);
      setDueDate(dueDateCalc.toISOString().split('T')[0]);
    }
  }, [isOpen, billingPeriod]);

  if (!isOpen) return null;

  const subtotal = charges.reduce((sum, charge) => sum + charge.total_amount, 0);
  const vatAmount = vatEnabled ? (subtotal * vatRate) / 100 : 0;
  const total = subtotal + vatAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getChargeTypeLabel = (type: string) => {
    const labels = {
      rental: 'Monthly Rental',
      salik: 'Salik Charges',
      mileage: 'Excess Mileage',
      late_fee: 'Late Payment Fee',
      fine: 'Traffic Fine'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const generateInvoice = async () => {
    setGenerating(true);
    try {
      // Generate unique invoice ID
      const invoiceId = crypto.randomUUID();
      
      // Update all charges with the invoice ID and set status to 'invoiced'
      const chargeUpdates = charges.map(charge => ({
        id: charge.id,
        lease_id: charge.lease_id,
        billing_period: charge.billing_period,
        charge_type: charge.charge_type,
        quantity: charge.quantity,
        unit_price: charge.unit_price,
        total_amount: charge.total_amount,
        comment: charge.comment,
        invoice_id: invoiceId, // This is what we're updating
        payment_id: charge.payment_id,
        status: 'invoiced' as const, // This is what we're updating
        vat_applicable: charge.vat_applicable,
        account_closed: charge.account_closed
      }));

      // Update charges in batch
      console.log('🔄 Updating charges with:', chargeUpdates);
      const { error: updateError } = await supabase
        .from('lease_accounting')
        .upsert(chargeUpdates);

      if (updateError) {
        console.error('❌ Error updating charges:', updateError);
        throw updateError;
      }

      // Note: We don't need to create a separate invoice summary record
      // The individual charges with their invoice_id serve as the invoice record

      onInvoiceGenerated();
      onClose();
      
      // Show success message
      alert(`Invoice generated successfully!\nInvoice ID: ${invoiceId}\nTotal: ${formatCurrency(total)}`);
      
    } catch (error) {
      console.error('❌ Detailed error generating invoice:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert('Error generating invoice. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-black/40 backdrop-blur-xl rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                <FileText size={24} className="text-white/80" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Generate Invoice</h2>
                <p className="text-white/60 text-sm">
                  {customerName} • {formatDate(billingPeriod)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          
          {/* Invoice Settings */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Invoice Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* VAT Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div>
                  <label className="text-white font-medium text-sm">VAT Applicable</label>
                  <p className="text-white/60 text-xs">Include VAT in invoice</p>
                </div>
                <button
                  onClick={() => setVatEnabled(!vatEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    vatEnabled ? 'bg-gradient-to-r from-gray-200 to-gray-400' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      vatEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* VAT Rate */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">VAT Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                  disabled={!vatEnabled}
                  className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>
          </div>

          {/* Invoice Preview */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <FileText size={20} />
              Invoice Preview
            </h3>

            {/* Invoice Header */}
            <div className="border-b border-white/10 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-2xl font-bold text-white">INVOICE</h4>
                  <p className="text-white/60 text-sm mt-1">
                    Billing Period: {formatDate(billingPeriod)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-sm">Invoice Date</p>
                  <p className="text-white font-semibold">{formatDate(new Date().toISOString())}</p>
                  <p className="text-white/60 text-sm mt-2">Due Date</p>
                  <p className="text-white font-semibold">{formatDate(dueDate)}</p>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="mb-6">
              <h5 className="text-white font-semibold mb-2">Bill To:</h5>
              <p className="text-white">{customerName}</p>
              <p className="text-white/60 text-sm">Lease ID: {leaseId.slice(0, 8)}...</p>
            </div>

            {/* Charges Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/80 font-medium py-3 px-2">Description</th>
                    <th className="text-center text-white/80 font-medium py-3 px-2">Qty</th>
                    <th className="text-right text-white/80 font-medium py-3 px-2">Rate</th>
                    <th className="text-right text-white/80 font-medium py-3 px-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((charge) => (
                    <tr key={charge.id} className="border-b border-white/5">
                      <td className="py-3 px-2">
                        <div>
                          <p className="text-white font-medium">{getChargeTypeLabel(charge.charge_type)}</p>
                          {charge.comment && (
                            <p className="text-white/50 text-sm">{charge.comment}</p>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-white/70">
                        {charge.quantity || '1'}
                      </td>
                      <td className="text-right py-3 px-2 text-white/70">
                        {charge.unit_price ? formatCurrency(charge.unit_price) : formatCurrency(charge.total_amount)}
                      </td>
                      <td className="text-right py-3 px-2 text-white font-medium">
                        {formatCurrency(charge.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Totals */}
            <div className="flex justify-end">
              <div className="w-80">
                <div className="space-y-2">
                  <div className="flex justify-between py-2">
                    <span className="text-white/70">Subtotal:</span>
                    <span className="text-white font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  
                  {vatEnabled && (
                    <div className="flex justify-between py-2">
                      <span className="text-white/70">VAT ({vatRate}%):</span>
                      <span className="text-white font-medium">{formatCurrency(vatAmount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between py-3 border-t border-white/10">
                    <span className="text-lg font-semibold text-white">Total:</span>
                    <span className="text-lg font-semibold text-white">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Messages */}
          {charges.length === 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle size={16} />
                <span className="font-medium">No charges selected</span>
              </div>
              <p className="text-red-300 text-sm mt-1">
                Please add charges for this billing period before generating an invoice.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-sm">
              {charges.length} charge{charges.length !== 1 ? 's' : ''} • Total: {formatCurrency(total)}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
              >
                Cancel
              </button>
              
              <button
                onClick={generateInvoice}
                disabled={charges.length === 0 || generating}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Generate Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
