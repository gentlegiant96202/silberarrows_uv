"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  X, 
  CreditCard, 
  Calendar, 
  DollarSign,
  Check,
  AlertCircle,
  Plus,
  Minus
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

interface InvoiceGroup {
  invoice_id: string;
  billing_period: string;
  charges: LeaseAccountingRecord[];
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  allocated_amount: number; // Amount being allocated in this payment
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leaseId: string;
  customerName: string;
  onPaymentRecorded: () => void;
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  leaseId, 
  customerName,
  onPaymentRecorded 
}: Props) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'cheque'>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [invoices, setInvoices] = useState<InvoiceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchOutstandingInvoices();
    }
  }, [isOpen, leaseId]);

  const fetchOutstandingInvoices = async () => {
    try {
      setLoading(true);
      
      // Get all invoiced charges that are not fully paid
      const { data, error } = await supabase
        .from('lease_accounting')
        .select('*')
        .eq('lease_id', leaseId)
        .in('status', ['invoiced', 'overdue'])
        .not('invoice_id', 'is', null)
        .order('billing_period', { ascending: true });

      if (error) throw error;

      // Group by invoice_id
      const invoiceGroups: { [key: string]: InvoiceGroup } = {};
      
      data?.forEach(charge => {
        if (charge.invoice_id) {
          if (!invoiceGroups[charge.invoice_id]) {
            invoiceGroups[charge.invoice_id] = {
              invoice_id: charge.invoice_id,
              billing_period: charge.billing_period,
              charges: [],
              total_amount: 0,
              paid_amount: 0,
              outstanding_amount: 0,
              allocated_amount: 0
            };
          }
          
          invoiceGroups[charge.invoice_id].charges.push(charge);
          invoiceGroups[charge.invoice_id].total_amount += charge.total_amount;
        }
      });

      // Calculate paid amounts (in a real app, this would come from payment records)
      // For now, we'll assume unpaid invoices have 0 paid amount
      const invoiceList = Object.values(invoiceGroups).map(invoice => ({
        ...invoice,
        outstanding_amount: invoice.total_amount - invoice.paid_amount
      }));

      setInvoices(invoiceList);
    } catch (error) {
      console.error('Error fetching outstanding invoices:', error);
    } finally {
      setLoading(false);
    }
  };

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
      month: 'short',
      year: 'numeric'
    });
  };

  const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.outstanding_amount, 0);
  const totalAllocated = invoices.reduce((sum, invoice) => sum + invoice.allocated_amount, 0);
  const paymentAmountNum = parseFloat(paymentAmount) || 0;
  const unallocatedAmount = paymentAmountNum - totalAllocated;

  const updateAllocation = (invoiceId: string, amount: number) => {
    setInvoices(prev => prev.map(invoice => 
      invoice.invoice_id === invoiceId 
        ? { ...invoice, allocated_amount: Math.max(0, Math.min(amount, invoice.outstanding_amount)) }
        : invoice
    ));
  };

  const autoAllocatePayment = () => {
    if (paymentAmountNum <= 0) return;
    
    let remainingAmount = paymentAmountNum;
    
    setInvoices(prev => prev.map(invoice => {
      if (remainingAmount <= 0) {
        return { ...invoice, allocated_amount: 0 };
      }
      
      const allocateAmount = Math.min(remainingAmount, invoice.outstanding_amount);
      remainingAmount -= allocateAmount;
      
      return { ...invoice, allocated_amount: allocateAmount };
    }));
  };

  const clearAllocations = () => {
    setInvoices(prev => prev.map(invoice => ({ ...invoice, allocated_amount: 0 })));
  };

  const recordPayment = async () => {
    if (!paymentAmount || paymentAmountNum <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (totalAllocated !== paymentAmountNum) {
      alert(`Payment amount (${formatCurrency(paymentAmountNum)}) must equal total allocated amount (${formatCurrency(totalAllocated)})`);
      return;
    }

    setRecording(true);
    try {
      const paymentId = crypto.randomUUID();
      
      // Update charges that have allocations
      const chargeUpdates: any[] = [];
      
      invoices.forEach(invoice => {
        if (invoice.allocated_amount > 0) {
          // For simplicity in single-table approach, we'll update charges proportionally
          const allocationRatio = invoice.allocated_amount / invoice.total_amount;
          
          invoice.charges.forEach(charge => {
            const chargeAllocation = charge.total_amount * allocationRatio;
            
            chargeUpdates.push({
              id: charge.id,
              lease_id: charge.lease_id,
              billing_period: charge.billing_period,
              charge_type: charge.charge_type,
              quantity: charge.quantity,
              unit_price: charge.unit_price,
              total_amount: charge.total_amount,
              comment: charge.comment,
              invoice_id: charge.invoice_id,
              payment_id: paymentId, // This is what we're updating
              status: chargeAllocation >= charge.total_amount ? 'paid' : 'invoiced', // This is what we're updating
              vat_applicable: charge.vat_applicable,
              account_closed: charge.account_closed
            });
          });
        }
      });

      // Update charges in batch
      if (chargeUpdates.length > 0) {
        console.log('🔄 Updating charges with payment allocation:', chargeUpdates);
        const { error: updateError } = await supabase
          .from('lease_accounting')
          .upsert(chargeUpdates);

        if (updateError) {
          console.error('❌ Error updating charges with payment:', updateError);
          throw updateError;
        }
      }

      // Insert payment record as a special entry
      const paymentRecord = {
        lease_id: leaseId,
        billing_period: paymentDate,
        charge_type: 'rental' as const, // Using rental as payment record type
        quantity: null,
        unit_price: null,
        total_amount: -paymentAmountNum, // Negative amount to indicate payment
        comment: `Payment received - Method: ${paymentMethod.replace('_', ' ').toUpperCase()}, Reference: ${paymentReference || 'N/A'}, Notes: ${notes || 'N/A'}`,
        invoice_id: null,
        payment_id: paymentId,
        status: 'paid' as const,
        vat_applicable: false,
        account_closed: false
      };

      console.log('💰 Inserting payment record:', paymentRecord);
      const { error: paymentError } = await supabase
        .from('lease_accounting')
        .insert([paymentRecord]);

      if (paymentError) {
        console.error('❌ Error inserting payment record:', paymentError);
        throw paymentError;
      }

      onPaymentRecorded();
      onClose();
      
      alert(`Payment recorded successfully!\nPayment ID: ${paymentId}\nAmount: ${formatCurrency(paymentAmountNum)}`);
      
    } catch (error) {
      console.error('❌ Detailed error recording payment:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert('Error recording payment. Please try again.');
    } finally {
      setRecording(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-black/40 backdrop-blur-xl rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                <CreditCard size={24} className="text-white/80" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Record Payment</h2>
                <p className="text-white/60 text-sm">
                  {customerName} • Outstanding: {formatCurrency(totalOutstanding)}
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
          
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Payment Details */}
              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Payment Details</h3>
                  
                  <div className="space-y-4">
                    {/* Payment Amount */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Payment Amount (AED)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-white/30"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Payment Date */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Payment Date</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card Payment</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>

                    {/* Payment Reference */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Reference Number (Optional)</label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                        placeholder="Transaction ID, Cheque number, etc."
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Notes (Optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
                        placeholder="Additional payment notes..."
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Payment Summary</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/70">Payment Amount:</span>
                      <span className="text-white font-semibold">{formatCurrency(paymentAmountNum)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Total Allocated:</span>
                      <span className="text-white font-semibold">{formatCurrency(totalAllocated)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-2">
                      <span className="text-white/70">Unallocated:</span>
                      <span className={`font-semibold ${unallocatedAmount === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {formatCurrency(unallocatedAmount)}
                      </span>
                    </div>
                  </div>

                  {unallocatedAmount !== 0 && (
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-400 text-sm">
                        <AlertCircle size={16} />
                        <span>Payment must be fully allocated to invoices</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Allocation */}
              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Allocate to Invoices</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={autoAllocatePayment}
                        disabled={paymentAmountNum <= 0}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        <Plus size={12} />
                        Auto Allocate
                      </button>
                      <button
                        onClick={clearAllocations}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
                      >
                        <Minus size={12} />
                        Clear All
                      </button>
                    </div>
                  </div>

                  {invoices.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard size={32} className="text-white/20 mx-auto mb-2" />
                      <p className="text-white/60">No outstanding invoices</p>
                      <p className="text-white/40 text-sm">All invoices are fully paid</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div key={invoice.invoice_id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-white font-medium">
                                Invoice - {formatDate(invoice.billing_period)}
                              </p>
                              <p className="text-white/60 text-sm">
                                {invoice.charges.length} charge{invoice.charges.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-semibold">{formatCurrency(invoice.outstanding_amount)}</p>
                              <p className="text-white/60 text-sm">Outstanding</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="text-white/80 text-sm font-medium">Allocate:</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={invoice.outstanding_amount}
                              value={invoice.allocated_amount || ''}
                              onChange={(e) => updateAllocation(invoice.invoice_id, parseFloat(e.target.value) || 0)}
                              className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                              placeholder="0.00"
                            />
                            <button
                              onClick={() => updateAllocation(invoice.invoice_id, invoice.outstanding_amount)}
                              className="px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
                            >
                              Full
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-sm">
              {invoices.length} outstanding invoice{invoices.length !== 1 ? 's' : ''} • 
              Total Outstanding: {formatCurrency(totalOutstanding)}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
              >
                Cancel
              </button>
              
              <button
                onClick={recordPayment}
                disabled={!paymentAmount || paymentAmountNum <= 0 || unallocatedAmount !== 0 || recording}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {recording ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    Recording...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Record Payment
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
