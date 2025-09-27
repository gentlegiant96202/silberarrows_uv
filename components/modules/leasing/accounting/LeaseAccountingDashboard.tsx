"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useModulePermissions } from "@/lib/useModulePermissions";
import { useUserRole } from "@/lib/useUserRole";
import BillingPeriodsView from "./BillingPeriodsView";
import InvoiceModal from "./InvoiceModal";
import PaymentModal from "./PaymentModal";
import StatementOfAccount from "./StatementOfAccount";
import ContractDetailsView from "./ContractDetailsView";
import { 
  Plus, 
  Calendar, 
  FileText, 
  CreditCard, 
  Download,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Edit,
  Trash2
} from "lucide-react";

// Types
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

interface BillingPeriod {
  period: string;
  period_start: string;
  period_end: string;
  charges: LeaseAccountingRecord[];
  total_amount: number;
  has_invoice: boolean;
  invoice_id?: string;
}

interface Props {
  leaseId: string;
  leaseStartDate: string;
  customerName: string;
  onClose: () => void;
}

export default function LeaseAccountingDashboard({ leaseId, leaseStartDate, customerName, onClose }: Props) {
  
  // Permissions
  const { role, isAdmin, isAccounts } = useUserRole();
  const { canEdit, canDelete } = useModulePermissions('leasing');
  
  // Check if user has edit/delete permissions (accounts or admin roles only)
  const hasEditPermission = (isAdmin || isAccounts) && canEdit;
  const hasDeletePermission = (isAdmin || isAccounts) && canDelete;
  
  const [records, setRecords] = useState<LeaseAccountingRecord[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contract' | 'charges' | 'periods' | 'invoices' | 'payments' | 'statement'>('contract');
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [editingCharge, setEditingCharge] = useState<string | null>(null);
  
  // Modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('');
  const [selectedChargesForInvoice, setSelectedChargesForInvoice] = useState<LeaseAccountingRecord[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // New charge form state
  const [newCharge, setNewCharge] = useState<{
    charge_type: 'rental' | 'salik' | 'mileage' | 'late_fee' | 'fine' | 'refund';
    quantity: string;
    unit_price: string;
    total_amount: string;
    comment: string;
    billing_period: string;
  }>({
    charge_type: 'rental',
    quantity: '',
    unit_price: '',
    total_amount: '',
    comment: '',
    billing_period: ''
  });

  useEffect(() => {
    fetchAccountingData();
    generateBillingPeriods();
    fetchInvoices();
    fetchPaymentHistory();
  }, [leaseId]);

  const fetchAccountingData = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_accounting')
        .select('*')
        .eq('lease_id', leaseId)
        .order('billing_period', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching accounting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      // Get all invoiced and paid records grouped by invoice_id
      const { data, error } = await supabase
        .from('lease_accounting')
        .select('*')
        .eq('lease_id', leaseId)
        .in('status', ['invoiced', 'paid'])
        .not('invoice_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by invoice_id
      const invoiceGroups: { [key: string]: any } = {};
      
      data?.forEach(record => {
        if (record.invoice_id) {
          if (!invoiceGroups[record.invoice_id]) {
            invoiceGroups[record.invoice_id] = {
              invoice_id: record.invoice_id,
              billing_period: record.billing_period,
              created_at: record.created_at,
              charges: [],
              total_amount: 0,
              is_paid: false,
              has_partial_payment: false
            };
          }
          
          invoiceGroups[record.invoice_id].charges.push(record);
          invoiceGroups[record.invoice_id].total_amount += record.total_amount;
          
          // Track payment status
          if (record.status === 'paid') {
            invoiceGroups[record.invoice_id].has_partial_payment = true;
          }
        }
      });

      // Determine if invoices are fully paid
      Object.values(invoiceGroups).forEach((invoice: any) => {
        const allChargesPaid = invoice.charges.every((charge: any) => charge.status === 'paid');
        invoice.is_paid = allChargesPaid;
      });

      setInvoices(Object.values(invoiceGroups));
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      setLoadingPayments(true);
      
      // Fetch payment records (identified by PAYMENT prefix in comment)
      const { data, error } = await supabase
        .from('lease_accounting')
        .select('*')
        .eq('lease_id', leaseId)
        .ilike('comment', 'PAYMENT%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const generateBillingPeriods = () => {
    const startDate = new Date(leaseStartDate);
    const periods: BillingPeriod[] = [];
    
    // Generate 12 months of billing periods
    for (let i = 0; i < 12; i++) {
      const periodStart = new Date(startDate);
      periodStart.setMonth(startDate.getMonth() + i);
      
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(periodEnd.getDate() - 1);
      
      const periodCharges = records.filter(record => 
        record.billing_period === periodStart.toISOString().split('T')[0]
      );

      periods.push({
        period: periodStart.toISOString().split('T')[0],
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        charges: periodCharges,
        total_amount: periodCharges.reduce((sum, charge) => sum + charge.total_amount, 0),
        has_invoice: periodCharges.some(charge => charge.invoice_id),
        invoice_id: periodCharges.find(charge => charge.invoice_id)?.invoice_id || undefined
      });
    }
    
    setBillingPeriods(periods);
  };

  useEffect(() => {
    if (records.length > 0) {
      generateBillingPeriods();
    }
  }, [records]);

  const handleAddCharge = async () => {
    try {
      console.log('💰 Form data before processing:', newCharge);
      
      const chargeData = {
        lease_id: leaseId,
        billing_period: newCharge.billing_period,
        charge_type: newCharge.charge_type,
        quantity: newCharge.quantity && !isNaN(parseFloat(newCharge.quantity)) ? parseFloat(newCharge.quantity) : null,
        unit_price: newCharge.unit_price && !isNaN(parseFloat(newCharge.unit_price)) ? parseFloat(newCharge.unit_price) : null,
        total_amount: parseFloat(newCharge.total_amount),
        comment: newCharge.comment || null,
        status: 'pending' as const,
        vat_applicable: true,
        account_closed: false
      };

      console.log('💰 Processed charge data:', chargeData);

      if (editingCharge) {
        // Update existing charge
        const { data, error } = await supabase
          .from('lease_accounting')
          .update(chargeData)
          .eq('id', editingCharge)
          .select()
          .single();

        if (error) throw error;

        // Update the record in the list
        setRecords(prev => prev.map(record => 
          record.id === editingCharge ? data : record
        ));
        
        alert('Charge updated successfully.');
      } else {
        // Add new charge
        const { data, error } = await supabase
          .from('lease_accounting')
          .insert([chargeData])
          .select()
          .single();

        if (error) throw error;

        setRecords(prev => [data, ...prev]);
        alert('Charge added successfully.');
      }

      setShowAddCharge(false);
      resetNewChargeForm();
      setEditingCharge(null);
    } catch (error) {
      console.error('Error saving charge:', error);
      alert('Error saving charge. Please try again.');
    }
  };

  const resetNewChargeForm = () => {
    setNewCharge({
      charge_type: 'rental',
      quantity: '',
      unit_price: '',
      total_amount: '',
      comment: '',
      billing_period: ''
    });
  };

  const calculateTotal = () => {
    if (newCharge.quantity && newCharge.unit_price) {
      const total = parseFloat(newCharge.quantity) * parseFloat(newCharge.unit_price);
      setNewCharge(prev => ({ ...prev, total_amount: total.toFixed(2) }));
    }
  };

  useEffect(() => {
    calculateTotal();
  }, [newCharge.quantity, newCharge.unit_price]);

  // Populate form when editing
  useEffect(() => {
    if (editingCharge) {
      const chargeToEdit = records.find(record => record.id === editingCharge);
      if (chargeToEdit) {
        setNewCharge({
          charge_type: chargeToEdit.charge_type,
          quantity: chargeToEdit.quantity?.toString() || '',
          unit_price: chargeToEdit.unit_price?.toString() || '',
          total_amount: chargeToEdit.total_amount.toString(),
          comment: chargeToEdit.comment || '',
          billing_period: chargeToEdit.billing_period
        });
      }
    }
  }, [editingCharge, records]);

  const getChargeTypeLabel = (type: string) => {
    const labels = {
      rental: 'Monthly Rental',
      salik: 'Salik Charges',
      mileage: 'Excess Mileage',
      late_fee: 'Late Payment Fee',
      fine: 'Traffic Fine',
      refund: 'Refund/Credit'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-yellow-400 bg-yellow-400/10',
      invoiced: 'text-blue-400 bg-blue-400/10',
      paid: 'text-green-400 bg-green-400/10',
      overdue: 'text-red-400 bg-red-400/10'
    };
    return colors[status as keyof typeof colors] || 'text-gray-400 bg-gray-400/10';
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

  // Modal handlers
  const handleGenerateInvoice = (billingPeriod: string, charges: LeaseAccountingRecord[]) => {
    setSelectedBillingPeriod(billingPeriod);
    setSelectedChargesForInvoice(charges);
    setShowInvoiceModal(true);
  };

  const handleAddChargeForPeriod = (billingPeriod: string) => {
    setNewCharge(prev => ({ ...prev, billing_period: billingPeriod }));
    setShowAddCharge(true);
    setActiveTab('charges');
  };

  const handleInvoiceGenerated = () => {
    fetchAccountingData();
    fetchInvoices(); // Refresh invoices list
    setShowInvoiceModal(false);
  };

  const handlePaymentRecorded = () => {
    fetchAccountingData();
    fetchInvoices(); // Refresh invoices list
    fetchPaymentHistory(); // Refresh payment history
    setShowPaymentModal(false);
  };

  const handleEditCharge = (chargeId: string) => {
    if (!hasEditPermission) {
      alert('You do not have permission to edit accounting records.');
      return;
    }
    setEditingCharge(chargeId);
    setShowAddCharge(true);
  };

  const handleDeleteCharge = async (chargeId: string) => {
    if (!hasDeletePermission) {
      alert('You do not have permission to delete accounting records.');
      return;
    }

    const charge = records.find(r => r.id === chargeId);
    if (!charge) return;

    // Prevent deletion of invoiced or paid charges
    if (charge.status === 'invoiced' || charge.status === 'paid') {
      alert(`Cannot delete ${charge.status} charges. Please reverse the ${charge.status === 'invoiced' ? 'invoice' : 'payment'} first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete this ${charge.charge_type} charge for ${formatCurrency(charge.total_amount)}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lease_accounting')
        .delete()
        .eq('id', chargeId);

      if (error) throw error;

      // Refresh data
      fetchAccountingData();
      alert('Charge deleted successfully.');
    } catch (error) {
      console.error('Error deleting charge:', error);
      alert('Error deleting charge. Please try again.');
    }
  };

  const handleExportPDF = () => {
    // Implementation for PDF export would go here
    alert('PDF export feature coming soon!');
  };


  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mx-auto"></div>
          <p className="text-white/60 mt-4 text-center">Loading accounting data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-black/40 backdrop-blur-xl rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col border border-white/10 shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                  <DollarSign size={24} className="text-white/80" />
                </div>
                Lease Accounting
              </h2>
              <p className="text-white/60 mt-1">
                Managing finances for {customerName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mt-6 bg-white/5 backdrop-blur-sm p-1 rounded-lg">
            {[
              { id: 'contract', label: 'Contract Details', icon: FileText },
              { id: 'charges', label: 'Charges', icon: Plus },
              { id: 'periods', label: 'Billing Periods', icon: Calendar },
              { id: 'invoices', label: 'Invoices', icon: FileText },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'statement', label: 'Statement', icon: Download }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/10'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          
          {/* Contract Details Tab */}
          {activeTab === 'contract' && (
            <div className="h-full overflow-y-auto p-6">
              <ContractDetailsView
                leaseId={leaseId}
                customerName={customerName}
              />
            </div>
          )}

          {/* Charges Tab */}
          {activeTab === 'charges' && (
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Charge Management</h3>
                  <button
                    onClick={() => setShowAddCharge(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all"
                  >
                    <Plus size={16} />
                    Add Charge
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Add Charge Form */}
                {showAddCharge && (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
                    <h4 className="text-white font-semibold mb-4">
                      {editingCharge ? 'Edit Charge' : 'Add New Charge'}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Charge Type */}
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Charge Type</label>
                        <select
                          value={newCharge.charge_type}
                          onChange={(e) => {
                            const chargeType = e.target.value as any;
                            setNewCharge(prev => ({ 
                              ...prev, 
                              charge_type: chargeType,
                              // Auto-set negative amount for refunds
                              total_amount: chargeType === 'refund' && parseFloat(prev.total_amount) > 0 
                                ? '-' + prev.total_amount 
                                : prev.total_amount
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                        >
                          <option value="rental">Monthly Rental</option>
                          <option value="salik">Salik Charges</option>
                          <option value="mileage">Excess Mileage</option>
                          <option value="late_fee">Late Payment Fee</option>
                          <option value="fine">Traffic Fine</option>
                          <option value="refund">🔄 Refund/Credit</option>
                        </select>
                      </div>

                      {/* Billing Period */}
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Billing Period</label>
                        <input
                          type="date"
                          value={newCharge.billing_period}
                          onChange={(e) => setNewCharge(prev => ({ ...prev, billing_period: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                        />
                      </div>

                      {/* Quantity */}
                      {(newCharge.charge_type === 'salik' || newCharge.charge_type === 'mileage') && (
                        <div>
                          <label className="block text-white/80 text-sm font-medium mb-2">
                            {newCharge.charge_type === 'salik' ? 'Salik Count' : 'Excess KM'}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={newCharge.quantity}
                            onChange={(e) => setNewCharge(prev => ({ ...prev, quantity: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                            placeholder="0"
                          />
                        </div>
                      )}

                      {/* Unit Price */}
                      {(newCharge.charge_type === 'salik' || newCharge.charge_type === 'mileage') && (
                        <div>
                          <label className="block text-white/80 text-sm font-medium mb-2">
                            {newCharge.charge_type === 'salik' ? 'Price per Salik' : 'Rate per KM'}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={newCharge.unit_price}
                            onChange={(e) => setNewCharge(prev => ({ ...prev, unit_price: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                            placeholder="0.00"
                          />
                        </div>
                      )}

                      {/* Total Amount */}
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Total Amount (AED)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newCharge.total_amount}
                          onChange={(e) => setNewCharge(prev => ({ ...prev, total_amount: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                          placeholder="0.00"
                          readOnly={newCharge.charge_type === 'salik' || newCharge.charge_type === 'mileage'}
                        />
                        <p className="text-white/50 text-xs mt-1">
                          {newCharge.charge_type === 'refund' 
                            ? 'Refunds automatically use negative amounts (e.g., -200.00)' 
                            : 'Use negative amounts for manual refunds/credits (e.g., -200.00)'
                          }
                        </p>
                      </div>

                      {/* Comment */}
                      <div className="md:col-span-2">
                        <label className="block text-white/80 text-sm font-medium mb-2">Comment (Optional)</label>
                        <input
                          type="text"
                          value={newCharge.comment}
                          onChange={(e) => setNewCharge(prev => ({ ...prev, comment: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                          placeholder="Add any notes or references..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={handleAddCharge}
                        disabled={!newCharge.billing_period || !newCharge.total_amount}
                        className="px-6 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingCharge ? 'Update Charge' : 'Add Charge'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddCharge(false);
                          resetNewChargeForm();
                          setEditingCharge(null);
                        }}
                        className="px-6 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Charges List */}
                <div className="space-y-3">
                  {records.length === 0 ? (
                    <div className="text-center py-12">
                      <DollarSign size={48} className="text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No charges recorded yet</p>
                      <p className="text-white/40 text-sm mt-2">Click "Add Charge" to get started</p>
                    </div>
                  ) : (
                    records.map((record) => (
                      <div key={record.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-white font-medium">{getChargeTypeLabel(record.charge_type)}</span>
                              <span className="text-white/60 text-sm">{formatDate(record.billing_period)}</span>
                            </div>
                            
                            {record.quantity && record.unit_price && (
                              <div className="text-white/60 text-sm">
                                {record.quantity} × {formatCurrency(record.unit_price)}
                              </div>
                            )}
                            
                            {record.comment && (
                              <div className="text-white/50 text-sm italic max-w-xs truncate">
                                "{record.comment}"
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className={`font-semibold ${
                                record.charge_type === 'refund' || 
                                (record.comment && record.comment.startsWith('PAYMENT')) || 
                                record.total_amount < 0 ? 'text-green-400' : 'text-white'
                              }`}>
                                {formatCurrency(record.total_amount)}
                                {record.charge_type === 'refund' && <span className="text-xs ml-1">🔄</span>}
                                {record.comment && record.comment.startsWith('PAYMENT') && <span className="text-xs ml-1">💳</span>}
                              </div>
                              <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(record.status)}`}>
                                {record.status.toUpperCase()}
                              </div>
                            </div>
                            
                            {/* Edit/Delete Actions */}
                            {(hasEditPermission || hasDeletePermission) && (
                              <div className="flex items-center gap-2">
                                {hasEditPermission && record.status === 'pending' && (
                                  <button
                                    onClick={() => handleEditCharge(record.id)}
                                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                    title="Edit charge"
                                  >
                                    <Edit size={16} />
                                  </button>
                                )}
                                
                                {hasDeletePermission && record.status === 'pending' && (
                                  <button
                                    onClick={() => handleDeleteCharge(record.id)}
                                    className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                    title="Delete charge"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                
                                {(record.status === 'invoiced' || record.status === 'paid') && (
                                  <div className="text-white/40 text-xs px-2">
                                    {record.status === 'invoiced' ? 'Invoiced' : 'Paid'}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Billing Periods Tab */}
          {activeTab === 'periods' && (
            <div className="h-full overflow-y-auto p-6">
              <BillingPeriodsView
                leaseId={leaseId}
                leaseStartDate={leaseStartDate}
                records={records}
                onGenerateInvoice={handleGenerateInvoice}
                onAddChargeForPeriod={handleAddChargeForPeriod}
              />
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Generated Invoices</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all"
                    >
                      <CreditCard size={16} />
                      Record Payment
                    </button>
                    
                    {hasEditPermission && (
                      <button
                        onClick={() => setShowRefundModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-green-500 via-green-400 to-green-600 text-white font-medium rounded-lg hover:shadow-lg transition-all"
                      >
                        <DollarSign size={16} />
                        Process Refund
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                {invoices.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FileText size={48} className="text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No invoices generated yet</p>
                      <p className="text-white/40 text-sm mt-2">Use Billing Periods to generate invoices</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invoices.map((invoice) => (
                      <div key={invoice.invoice_id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-white">Invoice #{invoice.invoice_id.slice(-8)}</h4>
                            <p className="text-white/60 text-sm">
                              Period: {new Date(invoice.billing_period).toLocaleDateString('en-GB')} • 
                              Generated: {new Date(invoice.created_at).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">
                              {new Intl.NumberFormat('en-AE', {
                                style: 'currency',
                                currency: 'AED',
                                minimumFractionDigits: 2
                              }).format(invoice.total_amount)}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              invoice.is_paid 
                                ? 'bg-green-100 text-green-800' 
                                : invoice.has_partial_payment 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              {invoice.is_paid ? 'Paid' : invoice.has_partial_payment ? 'Partial Payment' : 'Invoiced'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h5 className="text-sm font-medium text-white/80">Charges:</h5>
                          </div>
                          {invoice.charges.map((charge: LeaseAccountingRecord) => (
                            <div key={charge.id} className="flex justify-between items-center py-2 px-3 bg-white/5 rounded">
                              <span className="text-white/70 text-sm">
                                {charge.charge_type.charAt(0).toUpperCase() + charge.charge_type.slice(1)}
                                {charge.comment && ` - ${charge.comment}`}
                              </span>
                              <span className={`font-medium ${
                                charge.charge_type === 'refund' || 
                                (charge.comment && charge.comment.startsWith('PAYMENT')) || 
                                charge.total_amount < 0 ? 'text-green-400' : 'text-white'
                              }`}>
                                {new Intl.NumberFormat('en-AE', {
                                  style: 'currency',
                                  currency: 'AED',
                                  minimumFractionDigits: 2
                                }).format(charge.total_amount)}
                                {charge.charge_type === 'refund' && <span className="text-xs ml-1">🔄</span>}
                                {charge.comment && charge.comment.startsWith('PAYMENT') && <span className="text-xs ml-1">💳</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Payment Management</h3>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all"
                  >
                    <Plus size={16} />
                    Record Payment
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden">
                {loadingPayments ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <CreditCard size={48} className="text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No payment history found</p>
                      <p className="text-white/40 text-sm mt-2">Use "Record Payment" to add payments</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 space-y-4 overflow-y-auto h-full">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-white font-medium">Payment History ({paymentHistory.length})</h4>
                      <div className="text-white/60 text-sm">
                        Total Payments: {formatCurrency(paymentHistory.reduce((sum, payment) => sum + Math.abs(payment.total_amount), 0))}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {paymentHistory.map((payment) => (
                        <div key={payment.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-green-400 font-medium flex items-center gap-1">
                                  💳 Payment
                                </span>
                                <span className="text-white/50 text-xs">
                                  {new Date(payment.created_at).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                                <span className="text-white/50 text-xs">
                                  {new Date(payment.created_at).toLocaleTimeString('en-GB', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="text-white/70 text-sm">
                                  {payment.comment?.replace('PAYMENT ', '').split(' - ').slice(1).join(' - ') || 'Payment recorded'}
                                </p>
                                
                                {payment.payment_id && (
                                  <p className="text-white/50 text-xs">
                                    Payment ID: {payment.payment_id.slice(-8)}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-4 text-xs text-white/50">
                                  <span>Billing Period: {new Date(payment.billing_period).toLocaleDateString('en-GB')}</span>
                                  <span className={`px-2 py-1 rounded-full ${getStatusColor(payment.status)}`}>
                                    {payment.status.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right ml-4">
                              <div className="text-green-400 font-semibold text-lg">
                                {formatCurrency(Math.abs(payment.total_amount))}
                              </div>
                              <div className="text-white/50 text-xs">
                                Payment Amount
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statement Tab */}
          {activeTab === 'statement' && (
            <div className="h-full overflow-y-auto p-6">
              <StatementOfAccount
                leaseId={leaseId}
                customerName={customerName}
                records={records}
                onExportPDF={handleExportPDF}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        billingPeriod={selectedBillingPeriod}
        charges={selectedChargesForInvoice}
        customerName={customerName}
        leaseId={leaseId}
        onInvoiceGenerated={handleInvoiceGenerated}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        leaseId={leaseId}
        customerName={customerName}
        onPaymentRecorded={handlePaymentRecorded}
      />


      {/* Refund Modal */}
      {showRefundModal && (
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          leaseId={leaseId}
          customerName={customerName}
          onRefundProcessed={() => {
            fetchAccountingData();
            fetchInvoices();
            setShowRefundModal(false);
          }}
        />
      )}
    </div>
  );
}

// Simple IFRS-Compliant Credit Note Modal Component

// End-of-Lease Refund Modal Component
function RefundModal({ 
  isOpen, 
  onClose, 
  leaseId, 
  customerName, 
  onRefundProcessed 
}: {
  isOpen: boolean;
  onClose: () => void;
  leaseId: string;
  customerName: string;
  onRefundProcessed: () => void;
}) {
  const [refundAmount, setRefundAmount] = useState('');
  const [refundType, setRefundType] = useState('security_deposit');
  const [description, setDescription] = useState('');
  const [refundMethod, setRefundMethod] = useState<'bank_transfer' | 'cash' | 'cheque'>('bank_transfer');
  const [processing, setProcessing] = useState(false);

  const REFUND_TYPES = {
    'security_deposit': 'Security Deposit Refund',
    'prepaid_rent': 'Prepaid Rent Refund',
    'overpayment': 'Customer Overpayment Refund',
    'early_termination': 'Early Termination Refund',
    'insurance_refund': 'Insurance Premium Refund',
    'other': 'Other Refund'
  };

  const processRefund = async () => {
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      alert('Please enter a valid refund amount');
      return;
    }

    if (!description.trim()) {
      alert('Please provide a description for the refund');
      return;
    }

    setProcessing(true);
    try {
      const refundNumber = `REF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      
      // IFRS-Compliant Refund Record (using negative amount for natural credit)
      const refundData = {
        lease_id: leaseId,
        billing_period: new Date().toISOString().split('T')[0], // Today's date
        charge_type: 'rental' as const, // Use rental type (valid enum value)
        quantity: null,
        unit_price: null,
        total_amount: -parseFloat(refundAmount), // Negative amount (natural credit/refund)
        comment: `REFUND ${refundNumber} - ${REFUND_TYPES[refundType as keyof typeof REFUND_TYPES]} - Method: ${refundMethod.replace('_', ' ').toUpperCase()} - ${description}`,
        invoice_id: null,
        payment_id: null, // No payment ID needed - identified by comment
        status: 'paid' as const, // Refunds are immediately processed
        vat_applicable: false,
        account_closed: false
      };

      console.log('💰 Inserting refund record:', refundData);
      const { error } = await supabase
        .from('lease_accounting')
        .insert([refundData]);

      if (error) {
        console.error('❌ Error inserting refund record:', error);
        throw error;
      }

      alert(`Refund ${refundNumber} processed successfully for ${formatCurrency(parseFloat(refundAmount))}`);
      onRefundProcessed();
    } catch (error) {
      console.error('❌ Detailed error processing refund:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert('Error processing refund. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-black/40 backdrop-blur-xl rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-400/10 backdrop-blur-sm">
                <DollarSign size={24} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Process Refund</h2>
                <p className="text-white/60 text-sm">
                  End-of-Lease Refund for {customerName}
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
        <div className="p-6">
          <div className="space-y-4">
            {/* Refund Amount */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Refund Amount (AED)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-green-400/30"
                placeholder="0.00"
              />
            </div>

            {/* Refund Type */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Refund Type</label>
              <select
                value={refundType}
                onChange={(e) => setRefundType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-green-400/30"
              >
                {Object.entries(REFUND_TYPES).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>

            {/* Refund Method */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Refund Method</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-green-400/30"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Description (Required)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-green-400/30 resize-none"
                placeholder="Details about the refund (e.g., 'Security deposit refund less AED 200 for cleaning charges')"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/5 backdrop-blur-sm">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
            >
              Cancel
            </button>
            
            <button
              onClick={processRefund}
              disabled={!refundAmount || !description.trim() || processing}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-br from-green-500 via-green-400 to-green-600 text-white font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign size={16} />
                  Process Refund
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
