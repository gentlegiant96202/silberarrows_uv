"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  X, 
  CreditCard,
  Receipt,
  Check,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Calculator,
  History
} from "lucide-react";

//  Types
interface LeaseAccountingRecord {
  id: string;
  lease_id: string;
  billing_period: string;
  charge_type: 'rental' | 'salik' | 'mileage' | 'late_fee' | 'fine' | 'refund';
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

interface InvoiceGroup {
  invoice_id: string;
  invoice_number: string;
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
  
  const [recording, setRecording] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  
  // Outstanding invoices for allocation
  const [outstandingInvoices, setOutstandingInvoices] = useState<InvoiceGroup[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  
  // Payment history
  const [paymentHistory, setPaymentHistory] = useState<LeaseAccountingRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchOutstandingInvoices();
      fetchPaymentHistory();
    }
  }, [isOpen, leaseId]);

  const fetchOutstandingInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const { data, error } = await supabase
        .from('ifrs_lease_accounting')
        .select('*')
        .eq('lease_id', leaseId)
        .eq('status', 'invoiced')
        .not('invoice_id', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }); // Oldest first for allocation

      if (error) throw error;

      // Group by invoice_id
      const invoiceGroups: { [key: string]: InvoiceGroup } = {};
      
      data?.forEach(record => {
        if (record.invoice_id) {
          if (!invoiceGroups[record.invoice_id]) {
            invoiceGroups[record.invoice_id] = {
              invoice_id: record.invoice_id,
              invoice_number: record.invoice_number || `INV-${record.invoice_id.slice(-8)}`,
              billing_period: record.billing_period,
              charges: [],
              total_amount: 0,
              paid_amount: 0,
              outstanding_amount: 0,
              allocated_amount: 0
            };
          }
          
          invoiceGroups[record.invoice_id].charges.push(record);
          invoiceGroups[record.invoice_id].total_amount += record.total_amount;
        }
      });

      // Calculate outstanding amounts
      Object.values(invoiceGroups).forEach(invoice => {
        invoice.outstanding_amount = invoice.total_amount - invoice.paid_amount;
      });

      setOutstandingInvoices(Object.values(invoiceGroups));
    } catch (error) {
      console.error('Error fetching  outstanding invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchPaymentHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('ifrs_lease_accounting')
        .select('*')
        .eq('lease_id', leaseId)
        .like('comment', 'PAYMENT%')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
      console.error('Error fetching  payment history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const recordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    setRecording(true);
    try {
      console.log('💳 Recording  payment:', {
        leaseId,
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        reference: paymentReference,
        notes
      });

      // Use  transaction-safe function
      const { data, error } = await supabase.rpc('ifrs_record_payment', {
        p_lease_id: leaseId,
        p_amount: parseFloat(paymentAmount),
        p_payment_method: paymentMethod,
        p_reference: paymentReference || null,
        p_notes: notes || null
      });

      if (error) {
        console.error('❌ Error recording  payment:', error);
        throw error;
      }

      console.log('✅  Payment recorded successfully:', data);

      // Generate PDF receipt
      try {
        console.log('📄 Generating payment receipt...');
        const receiptData = {
          receiptNumber: `RCP-${Date.now()}`,
          paymentId: data,
          customerName: customerName,
          leaseId: leaseId,
          amount: parseFloat(paymentAmount),
          paymentMethod: paymentMethod,
          paymentDate: new Date().toISOString(),
          referenceNumber: paymentReference,
          notes: notes,
          status: 'Received',
          processedBy: 'System',
          createdAt: new Date().toISOString()
        };

        const receiptResponse = await fetch('/api/generate-payment-receipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(receiptData),
        });

        if (receiptResponse.ok) {
          const receiptResult = await receiptResponse.json();
          console.log('✅ Payment receipt generated:', receiptResult);
          
          // Update payment record with receipt URL
          if (receiptResult.pdfUrl) {
            try {
              const { error: updateError } = await supabase
                .from('ifrs_payments')
                .update({ receipt_url: receiptResult.pdfUrl })
                .eq('id', data);
              
              if (updateError) {
                console.error('❌ Failed to update payment with receipt URL:', updateError);
              } else {
                console.log('✅ Payment updated with receipt URL:', receiptResult.pdfUrl);
              }
            } catch (updateError) {
              console.error('❌ Error updating payment with receipt URL:', updateError);
            }
          }
          
          // Show success message with receipt info
          alert(`Payment recorded successfully!\nPayment ID: ${data}\nAmount: ${formatCurrency(parseFloat(paymentAmount))}\nReceipt: ${receiptResult.receiptNumber}`);
        } else {
          console.error('❌ Failed to generate receipt:', await receiptResponse.text());
          alert(`Payment recorded successfully!\nPayment ID: ${data}\nAmount: ${formatCurrency(parseFloat(paymentAmount))}\nNote: Receipt generation failed`);
        }
      } catch (receiptError) {
        console.error('❌ Error generating receipt:', receiptError);
        alert(`Payment recorded successfully!\nPayment ID: ${data}\nAmount: ${formatCurrency(parseFloat(paymentAmount))}\nNote: Receipt generation failed`);
      }

      // Refresh data
      fetchPaymentHistory();
      
      onPaymentRecorded();
      onClose();
      
    } catch (error) {
      console.error('❌ Detailed error recording  payment:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert('Error recording payment. Please try again.');
    } finally {
      setRecording(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'decimal',
      minimumFractionDigits: 2
    }).format(amount) + ' AED';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const extractPaymentDetails = (comment: string) => {
    // Extract payment method and reference from comment
    const methodMatch = comment.match(/PAYMENT \w+ - (\w+)/);
    const refMatch = comment.match(/\(Ref: ([^)]+)\)/);
    
    return {
      method: methodMatch ? methodMatch[1] : 'Unknown',
      reference: refMatch ? refMatch[1] : null
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl shadow-2xl border border-neutral-400/20 w-full max-w-5xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-400/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CreditCard className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Record  Payment</h2>
              <p className="text-neutral-400">{customerName}</p>
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
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            
            {/* Payment Form */}
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Receipt size={20} />
                  Payment Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Payment Amount (AED)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-lg font-medium"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="card">Credit/Debit Card</option>
                      <option value="cheque">Cheque</option>
                      <option value="online">Online Payment</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Reference Number</label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      placeholder="Transaction reference..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      rows={3}
                      placeholder="Additional payment notes..."
                    />
                  </div>
                </div>
              </div>

              {/* Outstanding Invoices */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText size={20} />
                  Outstanding Invoices
                </h3>
                
                {loadingInvoices ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/60"></div>
                  </div>
                ) : outstandingInvoices.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-medium">All invoices are paid!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outstandingInvoices.map((invoice) => (
                      <div key={invoice.invoice_id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{invoice.invoice_number}</p>
                            <p className="text-neutral-400 text-sm">
                              {formatDate(invoice.billing_period)} • {invoice.charges.length} charges
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">{formatCurrency(invoice.total_amount)}</p>
                            <p className="text-yellow-400 text-sm">Outstanding</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-400/20">
                      <p className="text-blue-400 text-sm">
                        💡 Payments will be automatically allocated to oldest invoices first
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment History */}
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <History size={20} />
                  Payment History
                </h3>
                
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/60"></div>
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard size={32} className="text-white/20 mx-auto mb-2" />
                    <p className="text-white/60">No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                      <span className="text-sm text-neutral-400">Total Payments</span>
                      <span className="text-green-400 font-bold">
                        {formatCurrency(paymentHistory.reduce((sum, p) => sum + Math.abs(p.total_amount), 0))}
                      </span>
                    </div>
                    
                    {paymentHistory.map((payment) => {
                      const details = extractPaymentDetails(payment.comment || '');
                      return (
                        <div key={payment.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CreditCard size={16} className="text-green-400" />
                              <div>
                                <p className="text-white font-medium">
                                  {details.method.replace('_', ' ').toUpperCase()}
                                </p>
                                <p className="text-neutral-400 text-xs">
                                  {formatDate(payment.created_at)} • {formatTime(payment.created_at)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-green-400 font-bold">
                                {formatCurrency(Math.abs(payment.total_amount))}
                              </p>
                              <p className="text-neutral-400 text-xs">
                                ID: {payment.payment_id?.slice(-8) || payment.id.slice(-8)}
                              </p>
                            </div>
                          </div>
                          
                          {details.reference && (
                            <div className="text-neutral-400 text-xs">
                              Ref: {details.reference}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 bg-green-400/10 text-green-400 rounded-full">
                                {payment.status.toUpperCase()}
                              </span>
                              <span className="text-xs text-neutral-500">
                                Period: {formatDate(payment.billing_period)}
                              </span>
                            </div>
                            {payment.receipt_url && (
                              <a
                                href={payment.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <FileText size={12} />
                                Receipt
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-neutral-400/20 bg-white/5">
          <div className="flex gap-4">
            <button
              onClick={recordPayment}
              disabled={recording || !paymentAmount || parseFloat(paymentAmount) <= 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {recording ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Recording...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Record Payment {paymentAmount && `(${formatCurrency(parseFloat(paymentAmount))})`}
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              className="px-6 py-3 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Payment Recording Status */}
        {recording && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
            <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-600">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
                <div>
                  <p className="text-white font-medium">Recording Payment</p>
                  <p className="text-neutral-400 text-sm">Processing {formatCurrency(parseFloat(paymentAmount || '0'))}...</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
