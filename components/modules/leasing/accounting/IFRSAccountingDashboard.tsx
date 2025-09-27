"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useModulePermissions } from "@/lib/useModulePermissions";
import { useUserRole } from "@/lib/useUserRole";
import IFRSBillingPeriodsView from "./IFRSBillingPeriodsView";
import IFRSInvoiceModal from "./IFRSInvoiceModal";
import IFRSPaymentModal from "./IFRSPaymentModal";
import IFRSStatementOfAccount from "./IFRSStatementOfAccount";
import ContractDetailsView from "./ContractDetailsView"; // Reuse existing contract details
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

// IFRS Types (matching existing functionality exactly)
interface IFRSLeaseAccountingRecord {
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
  created_by: string | null;
  updated_by: string | null;
  version: number;
  documents: any;
}

interface IFRSBillingPeriod {
  period: string;
  period_start: string;
  period_end: string;
  charges: IFRSLeaseAccountingRecord[];
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

export default function IFRSAccountingDashboard({ leaseId, leaseStartDate, customerName, onClose }: Props) {
  
  // Permissions (exactly like existing)
  const { role, isAdmin, isAccounts } = useUserRole();
  const { canEdit, canDelete } = useModulePermissions('leasing');
  
  // Check if user has edit/delete permissions (accounts or admin roles only)
  const hasEditPermission = (isAdmin || isAccounts) && canEdit;
  const hasDeletePermission = (isAdmin || isAccounts) && canDelete;
  
  const [records, setRecords] = useState<IFRSLeaseAccountingRecord[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<IFRSBillingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contract' | 'charges' | 'periods' | 'invoices' | 'payments' | 'statement'>('contract');
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [editingCharge, setEditingCharge] = useState<string | null>(null);
  
  // Modal states (exactly like existing)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('');
  const [selectedChargesForInvoice, setSelectedChargesForInvoice] = useState<IFRSLeaseAccountingRecord[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  
  // Lease information state (exactly like existing)
  const [leaseInfo, setLeaseInfo] = useState<{
    lease_start_date?: string;
    lease_end_date?: string;
    lease_term_months?: number;
    monthly_payment?: number;
  } | null>(null);

  // New charge form state (exactly like existing)
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
    fetchLeaseInfo();
    fetchAccountingData();
    fetchInvoices();
    fetchPaymentHistory();
  }, [leaseId]);

  const fetchLeaseInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('leasing_customers')
        .select('lease_start_date, lease_end_date, lease_term_months, monthly_payment')
        .eq('id', leaseId)
        .single();

      if (error) throw error;
      setLeaseInfo(data);
    } catch (error) {
      console.error('Error fetching lease info:', error);
    }
  };

  const fetchAccountingData = async () => {
    try {
      const { data, error } = await supabase
        .from('ifrs_lease_accounting')
        .select('*')
        .eq('lease_id', leaseId)
        .is('deleted_at', null)
        .order('billing_period', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching IFRS accounting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      // Get all invoiced and paid records grouped by invoice_id
      const { data, error } = await supabase
        .from('ifrs_lease_accounting')
        .select('*')
        .eq('lease_id', leaseId)
        .in('status', ['invoiced', 'paid'])
        .not('invoice_id', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by invoice_id (exactly like existing)
      const invoiceGroups: { [key: string]: any } = {};
      
      data?.forEach(record => {
        if (record.invoice_id) {
          if (!invoiceGroups[record.invoice_id]) {
            invoiceGroups[record.invoice_id] = {
              invoice_id: record.invoice_id,
              invoice_number: record.invoice_number,
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
      console.error('Error fetching IFRS invoices:', error);
    }
  };

  const fetchPaymentHistory = async () => {
    setLoadingPayments(true);
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
      console.error('Error fetching IFRS payment history:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const generateBillingPeriods = () => {
    if (!leaseInfo?.lease_start_date) return;
    
    const startDate = new Date(leaseInfo.lease_start_date);
    const endDate = leaseInfo.lease_end_date ? new Date(leaseInfo.lease_end_date) : null;
    const periods: IFRSBillingPeriod[] = [];
    
    // Calculate number of periods based on lease term or until end date + buffer
    let numberOfPeriods: number;
    if (endDate) {
      // Calculate months between start and end date, plus 3 month buffer
      const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (endDate.getMonth() - startDate.getMonth()) + 3;
      numberOfPeriods = Math.max(12, monthsDiff);
    } else if (leaseInfo.lease_term_months) {
      // Use lease term + 3 month buffer
      numberOfPeriods = leaseInfo.lease_term_months + 3;
    } else {
      // Default to 12 months if no end date or term specified
      numberOfPeriods = 12;
    }
    
    // Generate billing periods from lease start date
    for (let i = 0; i < numberOfPeriods; i++) {
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
    if (records.length > 0 && leaseInfo) {
      generateBillingPeriods();
    }
  }, [records, leaseInfo]);

  const handleAddCharge = async () => {
    try {
      console.log('💰 IFRS Form data before processing:', newCharge);
      
      if (editingCharge) {
        // Update existing charge using IFRS function
        const { data, error } = await supabase.rpc('ifrs_update_charge', {
          p_charge_id: editingCharge,
          p_charge_type: newCharge.charge_type,
          p_total_amount: parseFloat(newCharge.total_amount),
          p_expected_version: 1, // TODO: Get actual version from UI
          p_quantity: newCharge.quantity && !isNaN(parseFloat(newCharge.quantity)) ? parseFloat(newCharge.quantity) : null,
          p_unit_price: newCharge.unit_price && !isNaN(parseFloat(newCharge.unit_price)) ? parseFloat(newCharge.unit_price) : null,
          p_comment: newCharge.comment || null,
          p_vat_applicable: true
        });

        if (error) throw error;

        alert('Charge updated successfully.');
        fetchAccountingData(); // Refresh data
      } else {
        // Add new charge using IFRS function
        const { data, error } = await supabase.rpc('ifrs_add_charge', {
          p_lease_id: leaseId,
          p_billing_period: newCharge.billing_period,
          p_charge_type: newCharge.charge_type,
          p_total_amount: parseFloat(newCharge.total_amount),
          p_quantity: newCharge.quantity && !isNaN(parseFloat(newCharge.quantity)) ? parseFloat(newCharge.quantity) : null,
          p_unit_price: newCharge.unit_price && !isNaN(parseFloat(newCharge.unit_price)) ? parseFloat(newCharge.unit_price) : null,
          p_comment: newCharge.comment || null,
          p_vat_applicable: true
        });

        if (error) throw error;

        alert('Charge added successfully.');
        fetchAccountingData(); // Refresh data
      }

      setShowAddCharge(false);
      resetNewChargeForm();
      setEditingCharge(null);
    } catch (error) {
      console.error('Error saving IFRS charge:', error);
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

  const handleEditCharge = (charge: IFRSLeaseAccountingRecord) => {
    if (!hasEditPermission) {
      alert('You do not have permission to edit charges.');
      return;
    }

    if (charge.status !== 'pending') {
      alert('Only pending charges can be edited.');
      return;
    }

    setNewCharge({
      charge_type: charge.charge_type,
      quantity: charge.quantity?.toString() || '',
      unit_price: charge.unit_price?.toString() || '',
      total_amount: charge.total_amount.toString(),
      comment: charge.comment || '',
      billing_period: charge.billing_period
    });
    setEditingCharge(charge.id);
    setShowAddCharge(true);
  };

  const handleDeleteCharge = async (chargeId: string) => {
    if (!hasDeletePermission) {
      alert('You do not have permission to delete charges.');
      return;
    }

    if (!confirm('Are you sure you want to delete this charge? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('ifrs_delete_charge', {
        p_charge_id: chargeId,
        p_reason: 'User requested deletion'
      });

      if (error) throw error;

      alert('Charge deleted successfully.');
      fetchAccountingData();
    } catch (error) {
      console.error('Error deleting IFRS charge:', error);
      alert('Error deleting charge. It may have already been invoiced.');
    }
  };

  const handleGenerateInvoice = (billingPeriod: string, charges: IFRSLeaseAccountingRecord[]) => {
    setSelectedBillingPeriod(billingPeriod);
    setSelectedChargesForInvoice(charges);
    setShowInvoiceModal(true);
  };

  const handleAddChargeForPeriod = (billingPeriod: string) => {
    setNewCharge(prev => ({ ...prev, billing_period: billingPeriod }));
    setShowAddCharge(true);
  };

  const handleInvoiceGenerated = () => {
    fetchAccountingData();
    fetchInvoices();
  };

  const handlePaymentRecorded = () => {
    fetchAccountingData();
    fetchInvoices();
    fetchPaymentHistory();
  };

  // Auto-calculate total when quantity and unit price change
  useEffect(() => {
    if (newCharge.quantity && newCharge.unit_price) {
      const quantity = parseFloat(newCharge.quantity);
      const unitPrice = parseFloat(newCharge.unit_price);
      if (!isNaN(quantity) && !isNaN(unitPrice)) {
        setNewCharge(prev => ({
          ...prev,
          total_amount: (quantity * unitPrice).toFixed(2)
        }));
      }
    }
  }, [newCharge.quantity, newCharge.unit_price]);

  // Auto-set total amount to negative for refunds
  useEffect(() => {
    if (newCharge.charge_type === 'refund' && newCharge.total_amount && parseFloat(newCharge.total_amount) > 0) {
      setNewCharge(prev => ({
        ...prev,
        total_amount: (-Math.abs(parseFloat(prev.total_amount))).toString()
      }));
    }
  }, [newCharge.charge_type, newCharge.total_amount]);

  // Populate form when editing
  useEffect(() => {
    if (editingCharge) {
      const charge = records.find(r => r.id === editingCharge);
      if (charge) {
        setNewCharge({
          charge_type: charge.charge_type,
          quantity: charge.quantity?.toString() || '',
          unit_price: charge.unit_price?.toString() || '',
          total_amount: charge.total_amount.toString(),
          comment: charge.comment || '',
          billing_period: charge.billing_period
        });
      }
    }
  }, [editingCharge, records]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getChargeTypeLabel = (type: string) => {
    const labels = {
      rental: 'Monthly Rental',
      salik: 'Salik Fee',
      mileage: 'Excess Mileage',
      late_fee: 'Late Fee',
      fine: 'Traffic Fine',
      refund: 'Refund/Credit'
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            <span className="text-white">Loading IFRS Accounting...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl shadow-2xl border border-neutral-400/20 w-full max-w-7xl h-[95vh] flex flex-col">
        
        {/* Header - Exactly like existing */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-400/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl border border-blue-400/30">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">IFRS Lease Accounting</h2>
              <p className="text-neutral-400">{customerName}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Navigation - Exactly like existing */}
          <div className="flex gap-1 mt-6 mx-6 bg-white/5 backdrop-blur-sm p-1 rounded-lg">
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

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            
            {/* Contract Details Tab - Reuse existing component */}
            {activeTab === 'contract' && (
              <div className="h-full overflow-y-auto p-6">
                <ContractDetailsView
                  leaseId={leaseId}
                  customerName={customerName}
                />
              </div>
            )}

            {/* Charges Tab - Exactly like existing but with IFRS backend */}
            {activeTab === 'charges' && (
              <div className="h-full flex flex-col">
                <div className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">IFRS Charge Management</h3>
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
                  {/* Charges List - Exactly like existing */}
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

                              {record.invoice_number && (
                                <div className="text-blue-400 text-sm font-medium">
                                  {record.invoice_number}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Amount with styling for refunds */}
                              <div className={`text-right ${
                                record.charge_type === 'refund' || record.total_amount < 0 
                                  ? 'text-green-400' 
                                  : record.comment?.startsWith('PAYMENT') 
                                    ? 'text-green-400' 
                                    : 'text-white'
                              }`}>
                                <div className="font-bold text-base flex items-center gap-1">
                                  {(record.charge_type === 'refund' || record.total_amount < 0) && '🔄'}
                                  {record.comment?.startsWith('PAYMENT') && '💳'}
                                  {formatCurrency(record.total_amount)}
                                </div>
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                  record.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10' :
                                  record.status === 'invoiced' ? 'text-blue-400 bg-blue-400/10' :
                                  record.status === 'paid' ? 'text-green-400 bg-green-400/10' :
                                  'text-red-400 bg-red-400/10'
                                }`}>
                                  {record.status.toUpperCase()}
                                </div>
                              </div>

                              {/* Edit/Delete buttons for pending charges */}
                              {record.status === 'pending' && (
                                <div className="flex items-center gap-2">
                                  {hasEditPermission && (
                                    <button
                                      onClick={() => handleEditCharge(record)}
                                      className="p-2 text-white/60 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                                      title="Edit charge"
                                    >
                                      <Edit size={16} />
                                    </button>
                                  )}
                                  {hasDeletePermission && (
                                    <button
                                      onClick={() => handleDeleteCharge(record.id)}
                                      className="p-2 text-white/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                      title="Delete charge"
                                    >
                                      <Trash2 size={16} />
                                    </button>
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

            {/* Other tabs will be implemented next... */}
            {activeTab === 'periods' && (
              <div className="h-full flex flex-col">
                <div className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">IFRS Billing Periods</h3>
                      <p className="text-white/60 text-sm">
                        {leaseInfo?.lease_start_date ? (
                          <>
                            Lease: {new Date(leaseInfo.lease_start_date).toLocaleDateString('en-GB')} 
                            {leaseInfo.lease_end_date && (
                              <> - {new Date(leaseInfo.lease_end_date).toLocaleDateString('en-GB')}</>
                            )}
                            {leaseInfo.lease_term_months && (
                              <> • {leaseInfo.lease_term_months} months</>
                            )}
                            {leaseInfo.monthly_payment && (
                              <> • AED {leaseInfo.monthly_payment.toLocaleString()}/month</>
                            )}
                          </>
                        ) : (
                          'Loading lease information...'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                  {/* TODO: Implement IFRSBillingPeriodsView */}
                  <div className="text-center py-12">
                    <Calendar size={48} className="text-white/20 mx-auto mb-4" />
                    <p className="text-white/60">IFRS Billing Periods</p>
                    <p className="text-white/40 text-sm mt-2">Coming next...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Add Charge Modal - Exactly like existing */}
            {showAddCharge && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center p-4">
                <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-xl p-6 w-full max-w-md border border-neutral-400/20">
                  <h3 className="text-lg font-bold text-white mb-4">
                    {editingCharge ? 'Edit Charge' : 'Add New Charge'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-neutral-400 mb-2">Billing Period</label>
                      <input
                        type="date"
                        value={newCharge.billing_period}
                        onChange={(e) => setNewCharge(prev => ({ ...prev, billing_period: e.target.value }))}
                        className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-neutral-400 mb-2">Charge Type</label>
                      <select
                        value={newCharge.charge_type}
                        onChange={(e) => setNewCharge(prev => ({ ...prev, charge_type: e.target.value as any }))}
                        className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      >
                        <option value="rental">Monthly Rental</option>
                        <option value="salik">Salik Fee</option>
                        <option value="mileage">Excess Mileage</option>
                        <option value="late_fee">Late Fee</option>
                        <option value="fine">Traffic Fine</option>
                        <option value="refund">Refund/Credit</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-neutral-400 mb-2">Quantity</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newCharge.quantity}
                          onChange={(e) => setNewCharge(prev => ({ ...prev, quantity: e.target.value }))}
                          className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-neutral-400 mb-2">Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newCharge.unit_price}
                          onChange={(e) => setNewCharge(prev => ({ ...prev, unit_price: e.target.value }))}
                          className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-neutral-400 mb-2">
                        Total Amount (AED)
                        {newCharge.charge_type === 'refund' && (
                          <span className="text-green-400 text-xs ml-2">Will be negative for refunds</span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newCharge.total_amount}
                        onChange={(e) => setNewCharge(prev => ({ ...prev, total_amount: e.target.value }))}
                        className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-neutral-400 mb-2">Comment</label>
                      <textarea
                        value={newCharge.comment}
                        onChange={(e) => setNewCharge(prev => ({ ...prev, comment: e.target.value }))}
                        className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                        rows={3}
                        placeholder="Optional notes..."
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleAddCharge}
                      className="flex-1 py-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
                    >
                      {editingCharge ? 'Update Charge' : 'Add Charge'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddCharge(false);
                        setEditingCharge(null);
                        resetNewChargeForm();
                      }}
                      className="flex-1 py-3 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
