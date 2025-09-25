"use client";
import { useState, useEffect } from 'react';
import { X, FileText, DollarSign, Receipt, Calculator, Download, Plus, Edit2, Trash2, Car, User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { useUserRole } from '@/lib/useUserRole';

interface ActiveLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  lease: any; // Lease customer data from active_leases column
  vehicle?: any; // Vehicle data if linked
}

type TabType = 'overview' | 'invoices' | 'charges' | 'payments' | 'statement';

export default function ActiveLeaseModal({ isOpen, onClose, lease, vehicle }: ActiveLeaseModalProps) {
  const { isAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  
  // Modal states for adding charges and payments
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showEditCharge, setShowEditCharge] = useState(false);
  const [showEditPayment, setShowEditPayment] = useState(false);
  const [showEditInvoice, setShowEditInvoice] = useState(false);
  const [editingCharge, setEditingCharge] = useState<any>(null);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [chargeType, setChargeType] = useState<'monthly_rental' | 'excess_mileage' | 'salik' | 'traffic_fine' | 'other'>('excess_mileage');
  
  // Form states
  const [chargeForm, setChargeForm] = useState({
    description: '',
    amount: 0,
    vat_amount: 0,
    due_date: format(new Date(), 'yyyy-MM-dd'),
    // Excess mileage specific
    start_mileage: 0,
    end_mileage: 0,
    excess_km: 0,
    rate_per_km: 0.5, // Default AED 0.50 per km
    // Salik specific
    salik_gate: '',
    salik_date: '',
    salik_reference: '',
    // Traffic fine specific
    fine_number: '',
    fine_date: '',
    fine_location: '',
    fine_type: '',
    // General
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    payment_method: 'cash',
    payment_reference: '',
    bank_name: '',
    cheque_number: '',
    invoice_id: '',
    notes: '',
    receipt_file: null as File | null
  });

  const [invoiceForm, setInvoiceForm] = useState({
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });


  useEffect(() => {
    if (isOpen && lease) {
      console.log('Lease data loaded:', lease);
      console.log('Vehicle data:', vehicle);
      fetchLeaseData();
    }
  }, [isOpen, lease]);

  const fetchLeaseData = async () => {
    if (!lease?.id) return;
    
    setLoading(true);
    try {
      // Fetch transactions
      const { data: transData, error: transError } = await supabase
        .from('lease_transactions')
        .select('*')
        .eq('lease_customer_id', lease.id)
        .order('transaction_date', { ascending: false });

      if (!transError && transData) {
        setTransactions(transData);
      }

      // Fetch invoices
      const { data: invData, error: invError } = await supabase
        .from('lease_invoices')
        .select('*')
        .eq('lease_customer_id', lease.id)
        .order('invoice_date', { ascending: false });

      if (!invError && invData) {
        console.log('Fetched invoices:', invData);
        setInvoices(invData);
      } else if (invError) {
        console.error('Error fetching invoices:', invError);
      }

      // Fetch payments
      const { data: payData, error: payError } = await supabase
        .from('lease_payments')
        .select('*')
        .eq('lease_customer_id', lease.id)
        .order('payment_date', { ascending: false });

      if (!payError && payData) {
        setPayments(payData);
      }
      
      // Calculate outstanding balance from invoices
      if (invData) {
        const outstandingFromInvoices = invData
          .filter(inv => inv.status !== 'cancelled')
          .reduce((sum, inv) => {
            const invoiceTotal = inv.total_amount || 0;
            const paidAmount = inv.paid_amount || 0;
            console.log(`Invoice ${inv.invoice_number}: Total=${invoiceTotal}, Paid=${paidAmount}, Outstanding=${invoiceTotal - paidAmount}`);
            return sum + (invoiceTotal - paidAmount);
          }, 0);
        
        // Also add any uninvoiced transactions
        const uninvoicedTransactions = transData?.filter(t => !t.invoice_id && t.status !== 'cancelled' && t.status !== 'paid') || [];
        const outstandingFromTransactions = uninvoicedTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        
        console.log(`Outstanding calculation: Invoices=${outstandingFromInvoices}, Transactions=${outstandingFromTransactions}, Total=${outstandingFromInvoices + outstandingFromTransactions}`);
        setOutstandingBalance(outstandingFromInvoices + outstandingFromTransactions);
      }
    } catch (error) {
      console.error('Error fetching lease data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCharge = async () => {
    try {
      const transactionData: any = {
        lease_customer_id: lease.id,
        vehicle_id: lease.selected_vehicle_id || vehicle?.id,
        transaction_type: chargeType === 'excess_mileage' ? 'excess_mileage' : 
                         chargeType === 'salik' ? 'salik_charges' :
                         chargeType === 'traffic_fine' ? 'traffic_fine' : 'adjustment',
        description: chargeForm.description,
        amount: chargeForm.amount,
        vat_amount: chargeForm.vat_amount,
        due_date: chargeForm.due_date,
        status: 'pending',
        notes: chargeForm.notes
      };

      // Add specific fields based on charge type
      if (chargeType === 'excess_mileage') {
        transactionData.start_mileage = chargeForm.start_mileage;
        transactionData.end_mileage = chargeForm.end_mileage;
        transactionData.excess_km = chargeForm.excess_km;
        transactionData.rate_per_km = chargeForm.rate_per_km;
      } else if (chargeType === 'salik') {
        transactionData.salik_gate = chargeForm.salik_gate;
        transactionData.salik_date = chargeForm.salik_date;
        transactionData.salik_reference = chargeForm.salik_reference;
      } else if (chargeType === 'traffic_fine') {
        transactionData.fine_number = chargeForm.fine_number;
        transactionData.fine_date = chargeForm.fine_date;
        transactionData.fine_location = chargeForm.fine_location;
        transactionData.fine_type = chargeForm.fine_type;
      }

      const { data, error } = await supabase
        .from('lease_transactions')
        .insert([transactionData])
        .select();

      if (error) throw error;

      // Refresh data
      await fetchLeaseData();
      setShowAddCharge(false);
      resetChargeForm();
    } catch (error) {
      console.error('Error adding charge:', error);
      alert('Failed to add charge. Please try again.');
    }
  };

  const resetChargeForm = () => {
    setChargeForm({
      description: '',
      amount: 0,
      vat_amount: 0,
      due_date: format(new Date(), 'yyyy-MM-dd'),
      start_mileage: 0,
      end_mileage: 0,
      excess_km: 0,
      rate_per_km: 0.5,
      salik_gate: '',
      salik_date: '',
      salik_reference: '',
      fine_number: '',
      fine_date: '',
      fine_location: '',
      fine_type: '',
      notes: ''
    });
  };

  const generateInvoice = async () => {
    try {
      setLoading(true);
      
      // Get unbilled transactions
      const unbilledTransactions = transactions.filter(t => !t.invoice_id && t.status === 'pending');
      
      if (unbilledTransactions.length === 0) {
        alert('No pending charges to invoice. Please add charges (including monthly rental) before generating an invoice.');
        return;
      }

      // Calculate totals
      const subtotal = unbilledTransactions.reduce((sum, t) => sum + t.amount, 0);
      const vatTotal = unbilledTransactions.reduce((sum, t) => sum + (t.vat_amount || 0), 0);
      
      // Generate invoice number
      const { data: invoiceNumber, error: rpcError } = await supabase.rpc('generate_lease_invoice_number');
      
      if (rpcError) {
        console.error('Error generating invoice number:', rpcError);
        // Fallback to manual generation
        const fallbackNumber = `INV-L-${Date.now().toString().slice(-6)}`;
        console.log('Using fallback invoice number:', fallbackNumber);
      }
      
      const finalInvoiceNumber = invoiceNumber || `INV-L-${Date.now().toString().slice(-6)}`;
      
      // Create invoice
      const { data: invoice, error: invError } = await supabase
        .from('lease_invoices')
        .insert([{
          lease_customer_id: lease.id,
          vehicle_id: lease.selected_vehicle_id || vehicle?.id || null,
          invoice_number: finalInvoiceNumber,
          invoice_date: new Date().toISOString().split('T')[0], // Use date format
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          billing_period_start: new Date().toISOString().split('T')[0],
          billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subtotal: subtotal,
          vat_amount: vatTotal,
          paid_amount: 0,
          status: 'pending'
        }])
        .select()
        .single();

      if (invError) throw invError;

      // Update transactions with invoice ID
      const { error: updateError } = await supabase
        .from('lease_transactions')
        .update({ 
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: 'invoiced'
        })
        .in('id', unbilledTransactions.map(t => t.id));

      if (updateError) throw updateError;

      // Generate PDF (call API endpoint)
      const response = await fetch('/api/leasing/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id })
      });

      if (response.ok) {
        const { pdfUrl } = await response.json();
        
        // Update invoice with PDF URL
        await supabase
          .from('lease_invoices')
          .update({ pdf_url: pdfUrl })
          .eq('id', invoice.id);
      }

      // Refresh data
      await fetchLeaseData();
      alert('Invoice generated successfully!');
      
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-white/10 text-white/70 border border-white/20',
      invoiced: 'bg-white/10 text-white/70 border border-white/20',
      paid: 'bg-white/20 text-white border border-white/30',
      partially_paid: 'bg-white/10 text-white/70 border border-white/20',
      overdue: 'bg-white/10 text-white border border-white/30',
      cancelled: 'bg-black/20 text-white/50 border border-white/10'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.pending}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col border border-white/20 shadow-white/10" style={{ boxShadow: '0 0 50px rgba(255, 255, 255, 0.1), 0 0 100px rgba(255, 255, 255, 0.05)' }}>
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Active Lease Management</h2>
              <div className="flex items-center gap-4 text-sm text-white/70">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{lease?.customer_name}</span>
                </div>
                {vehicle && (
                  <div className="flex items-center gap-1">
                    <Car className="w-4 h-4" />
                    <span>{vehicle.make} {vehicle.vehicle_model} ({vehicle.plate_number})</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{lease?.lease_start_date} to {lease?.lease_end_date}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Outstanding Balance Alert */}
          {outstandingBalance > 0 && (
            <div className="mt-4 p-3 bg-black/20 border border-white/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-white/70" />
                <span className="text-white/70 font-medium">Outstanding Balance</span>
              </div>
              <span className="text-2xl font-bold text-white">{formatCurrency(outstandingBalance)}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 px-6 pt-4">
          <div className="flex space-x-1 bg-black/40 p-1 rounded-lg border border-white/20 overflow-x-auto">
            {(['overview', 'invoices', 'charges', 'payments', 'statement'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative whitespace-nowrap py-2.5 px-4 font-semibold text-[13px] md:text-sm uppercase tracking-wide rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:ring-offset-2 focus:ring-offset-black/40 flex-shrink-0 ${
                  activeTab === tab
                    ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black border border-white/30'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/10 border border-transparent'
                }`}
                type="button"
                aria-current={activeTab === tab ? 'page' : undefined}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/70 text-sm">Monthly Rental</span>
                        <DollarSign className="w-4 h-4 text-white/50" />
                      </div>
                      <p className="text-2xl font-bold text-white">{formatCurrency(lease?.monthly_payment || 0)}</p>
                    </div>
                    
                    <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/70 text-sm">Total Collected</span>
                        <Receipt className="w-4 h-4 text-white/50" />
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                      </p>
                    </div>
                    
                    <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/70 text-sm">Outstanding</span>
                        <AlertCircle className="w-4 h-4 text-white/50" />
                      </div>
                      <p className="text-2xl font-bold text-white">{formatCurrency(outstandingBalance)}</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-black/20 border border-white/10 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <button
                        onClick={generateInvoice}
                        className="p-4 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg text-white font-medium transition-all flex flex-col items-center gap-2 border border-white/10"
                      >
                        <FileText className="w-6 h-6" />
                        <span>Generate Invoice</span>
                      </button>
                      
                      <button
                        onClick={async () => {
                          try {
                            // Check if monthly rental for current period already exists
                            const currentMonth = new Date().toISOString().slice(0, 7);
                            const existingRental = transactions.find(t => 
                              t.transaction_type === 'monthly_rental' && 
                              t.transaction_date?.startsWith(currentMonth)
                            );
                            
                            if (existingRental) {
                              alert('Monthly rental charge already exists for this month');
                              return;
                            }
                            
                            // Create monthly rental charge directly
                            const monthlyAmount = lease?.monthly_payment || 0;
                            if (monthlyAmount === 0) {
                              alert('No monthly payment amount set for this lease');
                              return;
                            }
                            
                            console.log('Creating monthly rental with:', {
                              lease_customer_id: lease.id,
                              vehicle_id: vehicle?.id,
                              monthly_amount: monthlyAmount
                            });
                            
                            const { data, error } = await supabase
                              .from('lease_transactions')
                              .insert([{
                                lease_customer_id: lease.id,
                                vehicle_id: vehicle?.id || null,
                                transaction_type: 'monthly_rental',
                                description: `Monthly Lease Rental - ${format(new Date(), 'MMMM yyyy')}`,
                                amount: monthlyAmount,
                                vat_amount: monthlyAmount * 0.05, // 5% VAT
                                total_amount: monthlyAmount + (monthlyAmount * 0.05),
                                balance_amount: monthlyAmount + (monthlyAmount * 0.05), // Add balance_amount
                                due_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
                                status: 'pending',
                                transaction_date: new Date().toISOString().split('T')[0]
                              }])
                              .select()
                              .single();
                              
                            if (error) {
                              console.error('Database error:', error);
                              throw error;
                            }
                            
                            console.log('Monthly rental created:', data);
                            
                            // Refresh transactions
                            await fetchLeaseData();
                            alert('Monthly rental charge added successfully');
                          } catch (error) {
                            console.error('Error adding monthly rental:', error);
                            alert(`Failed to add monthly rental charge: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          }
                        }}
                        className="p-4 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg text-white font-medium transition-all flex flex-col items-center gap-2 border border-white/10"
                      >
                        <DollarSign className="w-6 h-6" />
                        <span>Add Monthly Rental</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setChargeType('excess_mileage');
                          setShowAddCharge(true);
                        }}
                        className="p-4 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg text-white font-medium transition-all flex flex-col items-center gap-2 border border-white/10"
                      >
                        <Car className="w-6 h-6" />
                        <span>Add Excess Mileage</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setChargeType('salik');
                          setShowAddCharge(true);
                        }}
                        className="p-4 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg text-white font-medium transition-all flex flex-col items-center gap-2 border border-white/10"
                      >
                        <Calculator className="w-6 h-6" />
                        <span>Add Salik Charges</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setChargeType('traffic_fine');
                          setShowAddCharge(true);
                        }}
                        className="p-4 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg text-white font-medium transition-all flex flex-col items-center gap-2 border border-white/10"
                      >
                        <AlertCircle className="w-6 h-6" />
                        <span>Add Traffic Fine</span>
                      </button>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="bg-black/20 border border-white/10 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
                    <div className="space-y-2">
                      {transactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                          <div>
                            <p className="text-white font-medium">{transaction.description}</p>
                            <p className="text-white/50 text-sm">{format(new Date(transaction.transaction_date), 'dd MMM yyyy')}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(transaction.status)}
                            <span className="text-white font-bold">{formatCurrency(transaction.total_amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Charges Tab */}
              {activeTab === 'charges' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">All Charges</h3>
                    <button
                      onClick={() => setShowAddCharge(true)}
                      className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Charge
                    </button>
                  </div>

                  <div className="bg-black/20 border border-white/10 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-black/30 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-sm text-white">
                              {format(new Date(transaction.transaction_date), 'dd MMM yyyy')}
                            </td>
                            <td className="px-4 py-3 text-sm text-white">
                              <span className={`${transaction.transaction_type === 'monthly_rental' ? 'font-semibold text-white' : 'text-white/70'}`}>
                                {transaction.transaction_type.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-white">{transaction.description}</td>
                            <td className="px-4 py-3 text-sm text-white font-medium">
                              {formatCurrency(transaction.total_amount)}
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(transaction.status)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingCharge(transaction);
                                    setChargeForm({
                                      description: transaction.description || '',
                                      amount: transaction.amount || 0,
                                      vat_amount: transaction.vat_amount || 0,
                                      due_date: transaction.due_date ? format(new Date(transaction.due_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                                      start_mileage: transaction.start_mileage || 0,
                                      end_mileage: transaction.end_mileage || 0,
                                      excess_km: transaction.excess_km || 0,
                                      rate_per_km: transaction.rate_per_km || 0.5,
                                      salik_gate: transaction.salik_gate || '',
                                      salik_date: transaction.salik_date || '',
                                      salik_reference: transaction.salik_reference || '',
                                      fine_number: transaction.fine_number || '',
                                      fine_date: transaction.fine_date || '',
                                      fine_location: transaction.fine_location || '',
                                      fine_type: transaction.fine_type || '',
                                      notes: transaction.notes || ''
                                    });
                                    // Set charge type based on transaction type
                                    if (transaction.transaction_type === 'excess_mileage') {
                                      setChargeType('excess_mileage');
                                    } else if (transaction.transaction_type === 'salik_charges') {
                                      setChargeType('salik');
                                    } else if (transaction.transaction_type === 'traffic_fine') {
                                      setChargeType('traffic_fine');
                                    } else {
                                      setChargeType('other');
                                    }
                                    setShowEditCharge(true);
                                  }}
                                  className="p-1 rounded hover:bg-white/10 transition-colors"
                                  title="Edit charge"
                                >
                                  <Edit2 className="w-4 h-4 text-white/70" />
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to delete this charge?')) {
                                      const { error } = await supabase
                                        .from('lease_transactions')
                                        .delete()
                                        .eq('id', transaction.id);
                                      
                                      if (!error) {
                                        await fetchLeaseData();
                                      } else {
                                        alert('Failed to delete charge');
                                      }
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-white/10 transition-colors"
                                  title="Delete charge"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Statement Tab */}
              {activeTab === 'statement' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Statement of Account</h3>
                    <button className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export PDF
                    </button>
                  </div>

                  <div className="bg-black/20 border border-white/10 rounded-lg p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-white/70 text-sm mb-1">Customer</p>
                        <p className="text-white font-medium">{lease?.customer_name}</p>
                        <p className="text-white/50 text-sm">{lease?.customer_phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/70 text-sm mb-1">Statement Date</p>
                        <p className="text-white font-medium">{format(new Date(), 'dd MMMM yyyy')}</p>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="pb-2 text-left text-xs font-medium text-white/70 uppercase">Date</th>
                            <th className="pb-2 text-left text-xs font-medium text-white/70 uppercase">Description</th>
                            <th className="pb-2 text-right text-xs font-medium text-white/70 uppercase">Debit</th>
                            <th className="pb-2 text-right text-xs font-medium text-white/70 uppercase">Credit</th>
                            <th className="pb-2 text-right text-xs font-medium text-white/70 uppercase">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {/* Combine transactions and payments for statement */}
                          {[...transactions, ...payments.map(p => ({
                            ...p,
                            transaction_type: 'payment',
                            transaction_date: p.payment_date,
                            description: `Payment - ${p.payment_method || 'Cash'}`,
                            total_amount: -p.amount // Negative for credits
                          }))]
                            .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
                            .reduce((acc: any[], item, index) => {
                              const prevBalance = index > 0 ? acc[index - 1].runningBalance : 0;
                              const currentBalance = prevBalance + (item.total_amount || 0);
                              
                              return [...acc, {
                                ...item,
                                runningBalance: currentBalance
                              }];
                            }, [])
                            .map((item) => (
                              <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-2 text-sm text-white">
                                  {format(new Date(item.transaction_date), 'dd/MM/yyyy')}
                                </td>
                                <td className="py-2 text-sm text-white">{item.description}</td>
                                <td className="py-2 text-sm text-white text-right">
                                  {item.total_amount > 0 ? formatCurrency(item.total_amount) : '-'}
                                </td>
                                <td className="py-2 text-sm text-white text-right">
                                  {item.total_amount < 0 ? formatCurrency(Math.abs(item.total_amount)) : '-'}
                                </td>
                                <td className="py-2 text-sm text-white text-right font-medium">
                                  {formatCurrency(item.runningBalance)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t-2 border-white/20">
                          <tr>
                            <td colSpan={4} className="pt-4 text-right text-white font-semibold">
                              Total Outstanding:
                            </td>
                            <td className="pt-4 text-right text-xl font-bold text-white">
                              {formatCurrency(outstandingBalance)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoices Tab */}
              {activeTab === 'invoices' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Invoices</h3>
                    <button
                      onClick={generateInvoice}
                      className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Generate Invoice
                    </button>
                  </div>

                  <div className="bg-black/20 border border-white/10 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-black/30 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Invoice #</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Due Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-sm text-white font-medium">{invoice.invoice_number}</td>
                            <td className="px-4 py-3 text-sm text-white">
                              {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                            </td>
                            <td className="px-4 py-3 text-sm text-white">
                              {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                            </td>
                            <td className="px-4 py-3 text-sm text-white font-medium">
                              {formatCurrency(invoice.total_amount)}
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(invoice.status)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {invoice.pdf_url && (
                                  <a
                                    href={invoice.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded hover:bg-white/10 transition-colors"
                                    title="Download PDF"
                                  >
                                    <Download className="w-4 h-4 text-blue-400" />
                                  </a>
                                )}
                                <button 
                                  onClick={() => {
                                    if (!isAdmin) {
                                      alert('Only administrators can edit invoices');
                                      return;
                                    }
                                    
                                    setEditingInvoice(invoice);
                                    setInvoiceForm({
                                      invoice_date: format(new Date(invoice.invoice_date), 'yyyy-MM-dd'),
                                      due_date: format(new Date(invoice.due_date), 'yyyy-MM-dd'),
                                      notes: invoice.notes || ''
                                    });
                                    setShowEditInvoice(true);
                                  }}
                                  className="p-1 rounded hover:bg-white/10 transition-colors"
                                  title="Edit invoice (Admin only)"
                                >
                                  <Edit2 className="w-4 h-4 text-white/70" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Payments</h3>
                    <button
                      onClick={() => setShowAddPayment(true)}
                      className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Record Payment
                    </button>
                  </div>

                  <div className="bg-black/20 border border-white/10 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-black/30 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Method</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Reference</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Invoice</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {payments.length > 0 ? (
                          payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 text-sm text-white">
                                {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                              </td>
                              <td className="px-4 py-3 text-sm text-white">
                                {payment.payment_method?.replace('_', ' ').toUpperCase() || 'CASH'}
                              </td>
                              <td className="px-4 py-3 text-sm text-white">
                                {payment.payment_reference || payment.cheque_number || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-white font-medium">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="px-4 py-3 text-sm text-white">
                                {payment.invoice_id ? 
                                  invoices.find(inv => inv.id === payment.invoice_id)?.invoice_number || 'N/A'
                                  : 'Unallocated'
                                }
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {payment.receipt_url && (
                                    <a
                                      href={payment.receipt_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded hover:bg-white/10 transition-colors"
                                      title="Download Receipt"
                                    >
                                      <Download className="w-4 h-4 text-green-400" />
                                    </a>
                                  )}
                                  <button 
                                    onClick={() => {
                                      setEditingPayment(payment);
                                      setPaymentForm({
                                        payment_date: format(new Date(payment.payment_date), 'yyyy-MM-dd'),
                                        amount: payment.amount || 0,
                                        payment_method: payment.payment_method || 'cash',
                                        payment_reference: payment.payment_reference || '',
                                        bank_name: payment.bank_name || '',
                                        cheque_number: payment.cheque_number || '',
                                        invoice_id: payment.invoice_id || '',
                                        notes: payment.notes || '',
                                        receipt_file: null
                                      });
                                      setShowEditPayment(true);
                                    }}
                                    className="p-1 rounded hover:bg-white/10 transition-colors"
                                    title="Edit payment"
                                  >
                                    <Edit2 className="w-4 h-4 text-white/70" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                              No payments recorded yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Payment Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/70 text-sm">Total Payments</span>
                        <Receipt className="w-4 h-4 text-green-400" />
                      </div>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                      </p>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/70 text-sm">Allocated</span>
                        <CheckCircle className="w-4 h-4 text-blue-400" />
                      </div>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(payments.reduce((sum, p) => sum + (p.allocated_amount || 0), 0))}
                      </p>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/70 text-sm">Unallocated</span>
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      </div>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(payments.reduce((sum, p) => sum + (p.unallocated_amount || 0), 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Charge Modal */}
      {(showAddCharge || showEditCharge) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-black border border-white/20 rounded-xl w-full max-w-2xl p-6" style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.1)' }}>
            <h3 className="text-xl font-bold text-white mb-4">
              {showEditCharge ? 'Edit' : 'Add'} {chargeType.replace('_', ' ').charAt(0).toUpperCase() + chargeType.replace('_', ' ').slice(1)}
            </h3>

            <div className="space-y-4">
              {/* Charge Type Selector */}
              <div className="grid grid-cols-5 gap-2">
                {['monthly_rental', 'excess_mileage', 'salik', 'traffic_fine', 'other'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setChargeType(type as any);
                      // Pre-fill monthly rental amount if selected
                      if (type === 'monthly_rental') {
                        const monthlyAmount = lease?.monthly_payment || 0;
                        setChargeForm(prev => ({
                          ...prev,
                          description: `Monthly Lease Rental - ${format(new Date(), 'MMMM yyyy')}`,
                          amount: monthlyAmount,
                          vat_amount: monthlyAmount * 0.05,
                          due_date: format(new Date(new Date().setDate(new Date().getDate() + 30)), 'yyyy-MM-dd')
                        }));
                      }
                    }}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors border ${
                      chargeType === type 
                        ? 'bg-white/20 text-white border-white/30' 
                        : 'bg-black/20 text-white/70 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    {type.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Dynamic form fields based on charge type */}
              {chargeType === 'monthly_rental' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
                    <input
                      type="text"
                      value={chargeForm.description}
                      onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                      className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                      placeholder="Monthly Lease Rental - Month Year"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Amount</label>
                      <input
                        type="number"
                        value={chargeForm.amount}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          setChargeForm({ 
                            ...chargeForm, 
                            amount,
                            vat_amount: amount * 0.05
                          });
                        }}
                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">VAT (5%)</label>
                      <input
                        type="number"
                        value={chargeForm.vat_amount}
                        readOnly
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={chargeForm.due_date}
                      onChange={(e) => setChargeForm({ ...chargeForm, due_date: e.target.value })}
                      className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    />
                  </div>
                </>
              )}

              {chargeType === 'excess_mileage' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Start Mileage</label>
                      <input
                        type="number"
                        value={chargeForm.start_mileage}
                        onChange={(e) => {
                          const start = parseInt(e.target.value) || 0;
                          const excess = Math.max(0, chargeForm.end_mileage - start - (lease?.max_mileage_per_year || 20000));
                          const amount = excess * chargeForm.rate_per_km;
                          setChargeForm({
                            ...chargeForm,
                            start_mileage: start,
                            excess_km: excess,
                            amount: amount,
                            description: `Excess Mileage Charge - ${excess} km @ AED ${chargeForm.rate_per_km}/km`
                          });
                        }}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">End Mileage</label>
                      <input
                        type="number"
                        value={chargeForm.end_mileage}
                        onChange={(e) => {
                          const end = parseInt(e.target.value) || 0;
                          const excess = Math.max(0, end - chargeForm.start_mileage - (lease?.max_mileage_per_year || 20000));
                          const amount = excess * chargeForm.rate_per_km;
                          setChargeForm({
                            ...chargeForm,
                            end_mileage: end,
                            excess_km: excess,
                            amount: amount,
                            description: `Excess Mileage Charge - ${excess} km @ AED ${chargeForm.rate_per_km}/km`
                          });
                        }}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Excess KM</label>
                      <input
                        type="number"
                        value={chargeForm.excess_km}
                        readOnly
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Rate per KM (AED)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={chargeForm.rate_per_km}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0;
                          const amount = chargeForm.excess_km * rate;
                          setChargeForm({
                            ...chargeForm,
                            rate_per_km: rate,
                            amount: amount,
                            description: `Excess Mileage Charge - ${chargeForm.excess_km} km @ AED ${rate}/km`
                          });
                        }}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {chargeType === 'salik' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Salik Gate</label>
                      <input
                        type="text"
                        value={chargeForm.salik_gate}
                        onChange={(e) => setChargeForm({ ...chargeForm, salik_gate: e.target.value })}
                        placeholder="e.g., Al Maktoum Bridge"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Date</label>
                      <input
                        type="date"
                        value={chargeForm.salik_date}
                        onChange={(e) => setChargeForm({ ...chargeForm, salik_date: e.target.value })}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Reference Number</label>
                    <input
                      type="text"
                      value={chargeForm.salik_reference}
                      onChange={(e) => setChargeForm({ ...chargeForm, salik_reference: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                </>
              )}

              {/* Common fields */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Description</label>
                <input
                  type="text"
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Amount (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={chargeForm.amount}
                    onChange={(e) => setChargeForm({ ...chargeForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">VAT (5%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={chargeForm.vat_amount}
                    onChange={(e) => setChargeForm({ ...chargeForm, vat_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={chargeForm.due_date}
                    onChange={(e) => setChargeForm({ ...chargeForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Notes</label>
                <textarea
                  value={chargeForm.notes}
                  onChange={(e) => setChargeForm({ ...chargeForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white resize-none"
                />
              </div>

              {/* Total */}
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Total Amount:</span>
                  <span className="text-2xl font-bold text-white">
                    {formatCurrency(chargeForm.amount + chargeForm.vat_amount)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddCharge(false);
                    setShowEditCharge(false);
                    setEditingCharge(null);
                    resetChargeForm();
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (showEditCharge && editingCharge) {
                      // Update existing charge
                      try {
                        const updateData: any = {
                          description: chargeForm.description,
                          amount: chargeForm.amount,
                          vat_amount: chargeForm.vat_amount,
                          due_date: chargeForm.due_date,
                          notes: chargeForm.notes,
                          updated_at: new Date().toISOString()
                        };

                        // Add specific fields based on charge type
                        if (chargeType === 'excess_mileage') {
                          updateData.start_mileage = chargeForm.start_mileage;
                          updateData.end_mileage = chargeForm.end_mileage;
                          updateData.excess_km = chargeForm.excess_km;
                          updateData.rate_per_km = chargeForm.rate_per_km;
                        } else if (chargeType === 'salik') {
                          updateData.salik_gate = chargeForm.salik_gate;
                          updateData.salik_date = chargeForm.salik_date;
                          updateData.salik_reference = chargeForm.salik_reference;
                        } else if (chargeType === 'traffic_fine') {
                          updateData.fine_number = chargeForm.fine_number;
                          updateData.fine_date = chargeForm.fine_date;
                          updateData.fine_location = chargeForm.fine_location;
                          updateData.fine_type = chargeForm.fine_type;
                        }

                        const { error } = await supabase
                          .from('lease_transactions')
                          .update(updateData)
                          .eq('id', editingCharge.id);

                        if (error) throw error;

                        // Refresh data
                        await fetchLeaseData();
                        setShowEditCharge(false);
                        setEditingCharge(null);
                        resetChargeForm();
                      } catch (error) {
                        console.error('Error updating charge:', error);
                        alert('Failed to update charge. Please try again.');
                      }
                    } else {
                      // Add new charge
                      await handleAddCharge();
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  {showEditCharge ? 'Update' : 'Add'} Charge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Payment Modal */}
      {(showAddPayment || showEditPayment) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-black border border-white/20 rounded-xl w-full max-w-2xl p-6" style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.1)' }}>
            <h3 className="text-xl font-bold text-white mb-4">{showEditPayment ? 'Edit' : 'Record'} Payment</h3>

            <div className="space-y-4">
              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Amount (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {['cash', 'bank_transfer', 'cheque', 'credit_card'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentForm({ ...paymentForm, payment_method: method })}
                      className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                        paymentForm.payment_method === method 
                          ? 'bg-green-600 text-white' 
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {method.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Method-specific fields */}
              {paymentForm.payment_method === 'bank_transfer' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={paymentForm.bank_name}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Reference Number</label>
                    <input
                      type="text"
                      value={paymentForm.payment_reference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                </div>
              )}

              {paymentForm.payment_method === 'cheque' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={paymentForm.bank_name}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Cheque Number</label>
                    <input
                      type="text"
                      value={paymentForm.cheque_number}
                      onChange={(e) => setPaymentForm({ ...paymentForm, cheque_number: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                </div>
              )}

              {/* Allocate to Invoice */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Allocate to Invoice (Optional)</label>
                <select
                  value={paymentForm.invoice_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, invoice_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white [&>option]:bg-gray-900 [&>option]:text-white"
                >
                  <option value="">-- Unallocated Payment --</option>
                  {invoices
                    .filter(inv => inv.status !== 'paid')
                    .map(inv => {
                      const outstanding = (inv.total_amount || 0) - (inv.paid_amount || 0);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} | Due: {format(new Date(inv.due_date), 'dd MMM')} | Outstanding: AED {outstanding.toFixed(2)}
                        </option>
                      );
                    })}
                </select>
                {invoices.filter(inv => inv.status !== 'paid').length === 0 && (
                  <p className="text-xs text-yellow-400 mt-1">No unpaid invoices available. Generate an invoice first.</p>
                )}
              </div>

              {/* Payment Proof Upload */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Payment Proof / Receipt (Optional but Recommended)
                </label>
                <div className="mt-1">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-2 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mb-2 text-sm text-white/70">
                        {paymentForm.receipt_file ? (
                          <span className="font-medium text-green-400">
                            {paymentForm.receipt_file.name}
                          </span>
                        ) : (
                          <>
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </>
                        )}
                      </p>
                      <p className="text-xs text-white/50">
                        PDF, PNG, JPG up to 10MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            alert('File size must be less than 10MB');
                            return;
                          }
                          setPaymentForm({ ...paymentForm, receipt_file: file });
                        }
                      }}
                    />
                  </label>
                  {paymentForm.receipt_file && (
                    <button
                      onClick={() => setPaymentForm({ ...paymentForm, receipt_file: null })}
                      className="mt-2 text-xs text-red-400 hover:text-red-300"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddPayment(false);
                    setShowEditPayment(false);
                    setEditingPayment(null);
                    setPaymentForm({
                      payment_date: format(new Date(), 'yyyy-MM-dd'),
                      amount: 0,
                      payment_method: 'cash',
                      payment_reference: '',
                      bank_name: '',
                      cheque_number: '',
                      invoice_id: '',
                      notes: '',
                      receipt_file: null
                    });
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (showEditPayment && editingPayment) {
                        // Update existing payment
                        console.log('Updating payment:', editingPayment.id);
                        
                        const updateData: any = {
                          payment_date: paymentForm.payment_date,
                          amount: paymentForm.amount,
                          payment_method: paymentForm.payment_method,
                          payment_reference: paymentForm.payment_reference || null,
                          bank_name: paymentForm.bank_name || null,
                          cheque_number: paymentForm.cheque_number || null,
                          invoice_id: paymentForm.invoice_id || null,
                          notes: paymentForm.notes || null,
                          allocated_amount: paymentForm.invoice_id ? paymentForm.amount : 0
                        };

                        // Upload new receipt if provided
                        if (paymentForm.receipt_file) {
                          const fileExt = paymentForm.receipt_file.name.split('.').pop();
                          const fileName = `payment-receipts/${lease.id}/${Date.now()}.${fileExt}`;
                          
                          const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('leasing-payments')
                            .upload(fileName, paymentForm.receipt_file);

                          if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage
                              .from('leasing-payments')
                              .getPublicUrl(fileName);
                            updateData.receipt_url = publicUrl;
                          }
                        }

                        const { error } = await supabase
                          .from('lease_payments')
                          .update(updateData)
                          .eq('id', editingPayment.id);

                        if (error) throw error;

                        // Refresh data
                        await fetchLeaseData();
                        setShowEditPayment(false);
                        setEditingPayment(null);
                        setPaymentForm({
                          payment_date: format(new Date(), 'yyyy-MM-dd'),
                          amount: 0,
                          payment_method: 'cash',
                          payment_reference: '',
                          bank_name: '',
                          cheque_number: '',
                          invoice_id: '',
                          notes: '',
                          receipt_file: null
                        });
                        
                        return;
                      }
                      
                      // Add new payment (existing code)
                      console.log('Recording payment:', {
                        customer_id: lease.id,
                        invoice_id: paymentForm.invoice_id,
                        amount: paymentForm.amount,
                        has_receipt: !!paymentForm.receipt_file
                      });

                      // Upload receipt file if provided
                      let receiptUrl = null;
                      if (paymentForm.receipt_file) {
                        const fileExt = paymentForm.receipt_file.name.split('.').pop();
                        const fileName = `payment-receipts/${lease.id}/${Date.now()}.${fileExt}`;
                        
                        const { data: uploadData, error: uploadError } = await supabase.storage
                          .from('leasing-payments')
                          .upload(fileName, paymentForm.receipt_file);

                        if (uploadError) {
                          console.error('Receipt upload error:', uploadError);
                          // Continue without receipt - don't block payment recording
                        } else {
                          const { data: { publicUrl } } = supabase.storage
                            .from('leasing-payments')
                            .getPublicUrl(fileName);
                          receiptUrl = publicUrl;
                          console.log('Receipt uploaded:', receiptUrl);
                        }
                      }

                      const { data, error } = await supabase
                        .from('lease_payments')
                        .insert([{
                          lease_customer_id: lease.id,
                          invoice_id: paymentForm.invoice_id || null,
                          payment_date: paymentForm.payment_date,
                          payment_method: paymentForm.payment_method,
                          payment_reference: paymentForm.payment_reference || null,
                          amount: paymentForm.amount,
                          allocated_amount: paymentForm.invoice_id ? paymentForm.amount : 0,
                          bank_name: paymentForm.bank_name || null,
                          cheque_number: paymentForm.cheque_number || null,
                          notes: paymentForm.notes || null,
                          receipt_url: receiptUrl
                        }])
                        .select();

                      if (error) {
                        console.error('Payment insert error:', error);
                        throw error;
                      }

                      console.log('Payment recorded with receipt:', data);

                      // If allocated to invoice, update invoice paid amount and create allocation record
                      if (paymentForm.invoice_id && data && data[0]) {
                        const selectedInvoice = invoices.find(i => i.id === paymentForm.invoice_id);
                        if (selectedInvoice) {
                          const currentPaid = selectedInvoice.paid_amount || 0;
                          const newPaidAmount = currentPaid + paymentForm.amount;
                          const totalAmount = selectedInvoice.total_amount || 0;
                          
                          // Determine new status
                          let newStatus = 'partially_paid';
                          if (newPaidAmount >= totalAmount) {
                            newStatus = 'paid';
                          }
                          
                          // Update invoice
                          console.log(`Updating invoice ${paymentForm.invoice_id}: paid_amount from ${currentPaid} to ${newPaidAmount}, status to ${newStatus}`);
                          const { error: updateError } = await supabase
                            .from('lease_invoices')
                            .update({ 
                              paid_amount: newPaidAmount,
                              status: newStatus
                            })
                            .eq('id', paymentForm.invoice_id);
                          
                          if (updateError) {
                            console.error('Error updating invoice:', updateError);
                          } else {
                            console.log('Invoice updated successfully');
                          }
                          
                          // Create payment allocation record
                          await supabase
                            .from('lease_payment_allocations')
                            .insert([{
                              payment_id: data[0].id,
                              transaction_id: null, // We can link to specific transactions later
                              allocated_amount: paymentForm.amount,
                              allocation_date: paymentForm.payment_date
                            }]);
                          
                          // Update the payment's allocated amount
                          await supabase
                            .from('lease_payments')
                            .update({
                              allocated_amount: paymentForm.amount
                            })
                            .eq('id', data[0].id);
                        }
                      }

                      // Refresh data
                      await fetchLeaseData();
                      setShowAddPayment(false);
                      
                      // Reset form
                      setPaymentForm({
                        payment_date: format(new Date(), 'yyyy-MM-dd'),
                        amount: 0,
                        payment_method: 'cash',
                        payment_reference: '',
                        bank_name: '',
                        cheque_number: '',
                        invoice_id: '',
                        notes: '',
                        receipt_file: null
                      });
                    } catch (error) {
                      console.error('Error recording payment:', error);
                      alert('Failed to record payment. Please try again.');
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  {showEditPayment ? 'Update' : 'Record'} Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditInvoice && editingInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-black border border-white/20 rounded-xl w-full max-w-2xl p-6" style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.1)' }}>
            <h3 className="text-xl font-bold text-white mb-4">Edit Invoice</h3>
            <p className="text-white/60 mb-4">Invoice #{editingInvoice.invoice_number}</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceForm.invoice_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                    className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Notes</label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                  rows={3}
                  placeholder="Optional notes for this invoice"
                />
              </div>

              <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Invoice Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Subtotal:</span>
                    <span className="text-white">{formatCurrency(editingInvoice.subtotal_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">VAT (5%):</span>
                    <span className="text-white">{formatCurrency(editingInvoice.vat_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-1 font-medium">
                    <span className="text-white">Total:</span>
                    <span className="text-white">{formatCurrency(editingInvoice.total_amount || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditInvoice(false);
                    setEditingInvoice(null);
                    setInvoiceForm({
                      invoice_date: format(new Date(), 'yyyy-MM-dd'),
                      due_date: format(new Date(), 'yyyy-MM-dd'),
                      notes: ''
                    });
                  }}
                  className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('lease_invoices')
                        .update({
                          invoice_date: invoiceForm.invoice_date,
                          due_date: invoiceForm.due_date,
                          notes: invoiceForm.notes || null,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', editingInvoice.id);

                      if (error) throw error;

                      // Refresh data
                      await fetchLeaseData();
                      setShowEditInvoice(false);
                      setEditingInvoice(null);
                      setInvoiceForm({
                        invoice_date: format(new Date(), 'yyyy-MM-dd'),
                        due_date: format(new Date(), 'yyyy-MM-dd'),
                        notes: ''
                      });

                      alert('Invoice updated successfully');
                    } catch (error) {
                      console.error('Error updating invoice:', error);
                      alert('Failed to update invoice. Please try again.');
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  Update Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
