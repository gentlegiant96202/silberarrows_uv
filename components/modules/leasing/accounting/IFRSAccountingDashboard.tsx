"use client";

import { useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useModulePermissions } from "@/lib/useModulePermissions";
import { useUserRole } from "@/lib/useUserRole";
import IFRSBillingPeriodsView from "./IFRSBillingPeriodsView";
import IFRSInvoiceModal from "./IFRSInvoiceModal";
import IFRSPaymentModal from "./IFRSPaymentModal";
import IFRSStatementOfAccount from "./IFRSStatementOfAccount";
import IFRSCreditNoteModal from "./IFRSCreditNoteModal";
import ContractDetailsView from "./ContractDetailsView"; // Reuse existing contract details
import { 
  Plus, 
  Calendar, 
  FileText, 
  Download,
  Receipt,
  Clock,
  CheckCircle,
  AlertCircle,
  Circle,
  X,
  Edit,
  Trash2,
  Eye,
  Printer
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

//  Types (matching existing functionality exactly)
interface OverdueLeaseAccountingRecord {
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
  created_by: string | null;
  updated_by: string | null;
  version: number;
  documents: any;
}

interface OverdueBillingPeriod {
  period: string;
  period_start: string;
  period_end: string;
  charges: OverdueLeaseAccountingRecord[];
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

// Helper function to determine accounting status
export function getAccountingStatus(
  records: OverdueLeaseAccountingRecord[],
  invoices: any[],
  leaseStartDate: string
): { status: string; color: string; description: string } {
  const today = new Date();
  const leaseStart = new Date(leaseStartDate);
  
  // Calculate current billing period (monthly from lease start)
  const monthsSinceStart = (today.getFullYear() - leaseStart.getFullYear()) * 12 + 
                          (today.getMonth() - leaseStart.getMonth());
  const currentPeriodStart = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + monthsSinceStart, leaseStart.getDate());
  const currentPeriodEnd = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + monthsSinceStart + 1, leaseStart.getDate() - 1);
  
  const currentPeriodKey = currentPeriodStart.toISOString().split('T')[0];
  
  // Check if current period has charges
  const currentPeriodCharges = records.filter(record => 
    record.billing_period === currentPeriodKey && 
    record.charge_type !== 'credit_note' && 
    record.total_amount > 0
  );
  
  // Check if current period has an invoice
  const currentPeriodInvoice = invoices.find(invoice => 
    invoice.billing_period === currentPeriodKey
  );
  
  // Check for overdue invoices (past due date + 3 days)
  const overdueInvoices = invoices.filter(invoice => {
    if (invoice.is_paid) return false;
    
    const invoiceDate = new Date(invoice.created_at);
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 3); // 3 days grace period
    
    return today > dueDate;
  });
  
  // Check for missed invoices (past billing periods with charges but no invoice)
  const pastPeriodsWithCharges = records.filter(record => {
    const recordDate = new Date(record.billing_period);
    const periodEnd = new Date(recordDate);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(periodEnd.getDate() - 1);
    
    return today > periodEnd && 
           record.charge_type !== 'credit_note' && 
           record.total_amount > 0 &&
           !record.invoice_id; // No invoice generated
  });
  
  // Priority 1: Payment Overdue (highest priority)
  if (overdueInvoices.length > 0) {
    return {
      status: "Payment Overdue",
      color: "red",
      description: `${overdueInvoices.length} invoice(s) past due date`
    };
  }
  
  // Priority 2: Missed Invoice (past periods with charges but no invoice)
  if (pastPeriodsWithCharges.length > 0) {
    const uniquePeriods = [...new Set(pastPeriodsWithCharges.map(record => record.billing_period))];
    return {
      status: "Missed Invoice",
      color: "orange",
      description: `${uniquePeriods.length} past period(s) need invoicing`
    };
  }
  
  // Priority 3: Invoice Due (current period has charges but no invoice)
  if (currentPeriodCharges.length > 0 && !currentPeriodInvoice) {
    return {
      status: "Invoice Due",
      color: "yellow",
      description: "Current period charges need invoicing"
    };
  }
  
  // Priority 4: Invoice Generated (invoice exists but not paid)
  if (currentPeriodInvoice && !currentPeriodInvoice.is_paid) {
    return {
      status: "Invoice Generated",
      color: "blue",
      description: "Invoice generated, awaiting payment"
    };
  }
  
  // Priority 5: Current (all invoices paid and up to date)
  const unpaidInvoices = invoices.filter(invoice => !invoice.is_paid);
  if (unpaidInvoices.length === 0) {
    return {
      status: "Current",
      color: "green",
      description: "All invoices paid and up to date"
    };
  }
  
  // Fallback: Check for any unpaid invoices
  if (invoices.length > 0) {
    return {
      status: "Invoice Generated",
      color: "blue",
      description: "Invoice generated, awaiting payment"
    };
  }
  
  // Default: No charges
  return {
    status: "No Charges",
    color: "gray",
    description: "No charges recorded for current period"
  };
}

export default function AccountingDashboard({ leaseId, leaseStartDate, customerName, onClose }: Props) {
  
  // Permissions (exactly like existing)
  const { role, isAdmin, isAccounts } = useUserRole();
  const { canEdit, canDelete } = useModulePermissions('leasing');
  
  // Check if user has edit/delete permissions (accounts or admin roles only)
  const hasEditPermission = (isAdmin || isAccounts) && canEdit;
  const hasDeletePermission = (isAdmin || isAccounts) && canDelete;
  
  const [records, setRecords] = useState<OverdueLeaseAccountingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contract' | 'charges' | 'periods' | 'invoices' | 'payments' | 'statement'>('contract');
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [editingCharge, setEditingCharge] = useState<string | null>(null);
  
  // Modal states (exactly like existing)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showApplyCreditModal, setShowApplyCreditModal] = useState(false);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('');
  const [selectedChargesForInvoice, setSelectedChargesForInvoice] = useState<OverdueLeaseAccountingRecord[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [availableCredits, setAvailableCredits] = useState<any[]>([]);
  const [selectedInvoiceForCredit, setSelectedInvoiceForCredit] = useState<any | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [isApplyingCredit, setIsApplyingCredit] = useState(false);
  const [creditAmountToApply, setCreditAmountToApply] = useState('');
  const [selectedCreditId, setSelectedCreditId] = useState<string>('');
  const [selectedInvoiceForCreditNote, setSelectedInvoiceForCreditNote] = useState<any | null>(null);
  
  // Lease information state (exactly like existing)
  const [leaseInfo, setLeaseInfo] = useState<{
    lease_start_date?: string;
    lease_end_date?: string;
    lease_term_months?: number;
    monthly_payment?: number;
  } | null>(null);

  // New charge form state (exactly like existing)
  const [newCharge, setNewCharge] = useState<{
    charge_type: 'rental' | 'salik' | 'mileage' | 'late_fee' | 'fine' | 'refund' | 'credit_note' | 'vat';
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
    fetchAvailableCredits();
  }, [leaseId]);

  const fetchAvailableCredits = async () => {
    try {
      // Fetch unallocated payments from new ifrs_payments table
      const { data, error } = await supabase
        .from('ifrs_payments')
        .select(`
          *,
          applications:ifrs_payment_applications(applied_amount)
        `)
        .eq('lease_id', leaseId)
        .in('status', ['received', 'allocated'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Filter to payments with remaining balance
      const availablePayments = (data || []).filter(payment => {
        const appliedAmount = payment.applications?.reduce((sum: number, app: any) => sum + app.applied_amount, 0) || 0;
        return payment.total_amount > appliedAmount;
      });

      setAvailableCredits(availablePayments || []);
    } catch (error) {
    }
  };

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
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      // Get all invoiced and paid records grouped by invoice_id (charges only, exclude credit notes)
      const { data, error } = await supabase
        .from('ifrs_lease_accounting')
        .select('*')
        .eq('lease_id', leaseId)
        .in('status', ['invoiced', 'paid'])
        .not('invoice_id', 'is', null)
        .neq('charge_type', 'credit_note')  // Exclude credit notes from invoice totals
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get payment applications for all invoices
      const { data: paymentApps, error: paymentError } = await supabase
        .from('ifrs_payment_applications')
        .select('invoice_id, applied_amount')
        .in('invoice_id', [...new Set(data?.map(r => r.invoice_id).filter(Boolean))]);

      if (paymentError) throw paymentError;

      // Group payment applications by invoice
      const paymentsByInvoice: { [key: string]: number } = {};
      paymentApps?.forEach(app => {
        paymentsByInvoice[app.invoice_id] = (paymentsByInvoice[app.invoice_id] || 0) + app.applied_amount;
      });

      // Group by invoice_id
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
              base_amount: 0,
              payments_applied: paymentsByInvoice[record.invoice_id] || 0,
              outstanding_amount: 0,
              balance_due: 0,
              is_paid: false,
              has_partial_payment: false
            };
          }
          
          invoiceGroups[record.invoice_id].charges.push(record);
          invoiceGroups[record.invoice_id].total_amount += record.total_amount;
            invoiceGroups[record.invoice_id].base_amount += record.total_amount;
        }
      });

      // Calculate final balances with payment applications
      Object.values(invoiceGroups).forEach((invoice: any) => {
        const outstanding = invoice.base_amount - invoice.payments_applied;
        invoice.outstanding_amount = outstanding;
        invoice.balance_due = Math.max(outstanding, 0);

        if (outstanding <= 0.01) {
          invoice.is_paid = true;
          invoice.has_partial_payment = false;
        } else if (invoice.payments_applied > 0) {
          invoice.is_paid = false;
          invoice.has_partial_payment = true;
        } else {
          invoice.is_paid = false;
          invoice.has_partial_payment = false;
        }
      });

      setInvoices(Object.values(invoiceGroups));
    } catch (error) {
    }
  };

  const fetchPaymentHistory = async () => {
    setLoadingPayments(true);
    try {
      // Fetch from new ifrs_payments table
      const { data, error } = await supabase
        .from('ifrs_payments')
        .select(`
          *,
          applications:ifrs_payment_applications(
            id,
            invoice_id,
            applied_amount,
            application_date
          )
        `)
        .eq('lease_id', leaseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
    } finally {
      setLoadingPayments(false);
    }
  };


  const handleAddCharge = async () => {
    try {
      // Validation
      if (!newCharge.billing_period) {
        alert('Please select a billing period');
        return;
      }
      if (!newCharge.total_amount || parseFloat(newCharge.total_amount) === 0) {
        alert('Please enter a valid amount');
        return;
      }
      
      if (editingCharge) {
        // Update existing charge using  function
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
        // Add new charge using  function
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

        if (error) {
          throw error;
        }
        alert('Charge added successfully.');
        fetchAccountingData(); // Refresh data
      }

      setShowAddCharge(false);
      resetNewChargeForm();
      setEditingCharge(null);
    } catch (error) {
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

  const handleEditCharge = (charge: OverdueLeaseAccountingRecord) => {
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
      alert('Error deleting charge. It may have already been invoiced.');
    }
  };

  const handleGenerateInvoice = (billingPeriod: string, charges: OverdueLeaseAccountingRecord[]) => {
    setSelectedBillingPeriod(billingPeriod);
    setSelectedChargesForInvoice(charges);
    setShowInvoiceModal(true);
  };

  const handleAddChargeForPeriod = (billingPeriod: string) => {
    setNewCharge(prev => ({ ...prev, billing_period: billingPeriod }));
    setActiveTab('charges'); // Switch to charges tab
    setShowAddCharge(true);
  };

  const handleInvoiceGenerated = () => {
    fetchAccountingData();
    fetchInvoices();
    fetchAvailableCredits();
  };

  const handlePaymentRecorded = () => {
    fetchAccountingData();
    fetchInvoices();
    fetchPaymentHistory();
    fetchAvailableCredits();
  };

  const availableCreditsTotal = availableCredits.reduce((sum, payment) => {
    const appliedAmount = payment.applications?.reduce((appSum: number, app: any) => appSum + app.applied_amount, 0) || 0;
    return sum + (payment.total_amount - appliedAmount);
  }, 0);
  const outstandingInvoices = invoices.filter((invoice) => (invoice.balance_due ?? invoice.total_amount ?? 0) > 0.0001);

  const unappliedPaymentTotal = records
    .filter(record => record.charge_type === 'refund'
      && !record.invoice_id
      && (record.comment?.toLowerCase().includes('(unapplied credit)') ?? false))
    .reduce((sum, record) => sum + record.total_amount, 0);

  const totalInvoiceCharges = records
    .filter(record => record.total_amount > 0 && record.charge_type !== 'refund')
    .reduce((sum, record) => sum + record.total_amount, 0);

  const totalRecognisedPayments = records
    .filter(record => record.total_amount < 0)
    .reduce((sum, record) => sum + Math.abs(record.total_amount), 0);

  const handleApplyCredit = async () => {
    const invoiceId = selectedInvoiceId || selectedInvoiceForCredit?.invoice_id;
    const targetInvoice = invoices.find((invoice) => invoice.invoice_id === invoiceId);
    if (!invoiceId || !targetInvoice) {
      alert('Please select an invoice to apply the payment to.');
      return;
    }

    if (!selectedCreditId) {
      alert('Please select a payment to apply.');
      return;
    }

    const amount = parseFloat(creditAmountToApply || '0');
    if (!amount || amount <= 0) {
      alert('Enter a valid amount to apply.');
      return;
    }

    const selectedPayment = availableCredits.find((payment) => payment.id === selectedCreditId);
    if (!selectedPayment) {
      alert('Selected payment not found.');
      return;
    }

    const appliedAmount = selectedPayment.applications?.reduce((sum: number, app: any) => sum + app.applied_amount, 0) || 0;
    const remainingPayment = selectedPayment.total_amount - appliedAmount;
    
    if (amount > remainingPayment) {
      alert('Amount exceeds remaining payment balance.');
      return;
    }

    const invoiceBalance = Math.max(targetInvoice.balance_due ?? targetInvoice.total_amount ?? 0, 0);
    if (amount > invoiceBalance) {
      alert('Amount exceeds invoice balance due.');
      return;
    }

    setIsApplyingCredit(true);
    try {
      const { error } = await supabase.rpc('ifrs_apply_payment', {
        p_payment_id: selectedCreditId,
        p_invoice_id: invoiceId,
        p_amount: amount
      });

      if (error) throw error;

      setShowApplyCreditModal(false);
      setCreditAmountToApply('');
      setSelectedCreditId('');
      setSelectedInvoiceForCredit(null);
      setSelectedInvoiceId('');

      fetchAccountingData();
      fetchInvoices();
      fetchAvailableCredits();
      fetchPaymentHistory();
    } catch (error) {
      alert('Failed to apply payment. Please try again.');
    } finally {
      setIsApplyingCredit(false);
    }
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

const primaryButtonClass = "flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-white/80 via-white/55 to-white/80 text-black/80 font-medium rounded-lg shadow-[0_0_28px_rgba(255,255,255,0.15)] hover:shadow-[0_0_34px_rgba(255,255,255,0.22)] transition-all";
const secondaryButtonClass = "flex items-center gap-2 px-4 py-2 border border-white/15 text-white/80 rounded-lg hover:text-white hover:bg-white/10 transition-all";
const subtleButtonClass = "flex items-center gap-2 px-3 py-2 border border-white/15 text-white/70 rounded-lg hover:text-white hover:bg-white/10 transition-all text-sm";
const badgeBaseClass = "inline-flex items-center gap-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] rounded-full border border-white/15 bg-white/12 text-white/75";
const ledgerRowClass = "rounded-xl border border-white/12 bg-gradient-to-br from-white/14 via-white/6 to-transparent p-4 hover:border-white/20 hover:shadow-[0_0_26px_rgba(255,255,255,0.22)] transition-all";
const panelSurfaceClass = "border border-white/12 rounded-2xl bg-gradient-to-br from-white/12 via-white/4 to-transparent backdrop-blur-xl hover:border-white/18 hover:shadow-[0_0_36px_rgba(255,255,255,0.18)] transition-all";
const iconSurfaceClass = "p-3 rounded-xl bg-white/15 border border-white/20 text-white/85 shadow-[0_0_18px_rgba(255,255,255,0.12)]";

const statusPalette: Record<string, { label: string; icon: LucideIcon }> = {
  pending: { label: 'Pending', icon: Clock },
  invoiced: { label: 'Invoiced', icon: FileText },
  paid: { label: 'Paid', icon: CheckCircle },
  overdue: { label: 'Overdue', icon: AlertCircle },
  active: { label: 'Active', icon: Calendar },
  upcoming: { label: 'Upcoming', icon: Calendar },
  "pending invoice": { label: 'Pending Invoice', icon: FileText },
  partial: { label: 'Partial', icon: AlertCircle }
};

const renderStatusBadge = (status: string) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  const palette = statusPalette[normalized] || { label: status.toUpperCase(), icon: Circle };
  const Icon = palette.icon;
  return (
    <span className={badgeBaseClass}>
      {Icon && <Icon size={11} className="text-white/60" />}
      {palette.label}
    </span>
  );
};

interface DashboardSectionProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const DashboardSection = ({ icon: Icon, title, description, actions, children, footer, className = '' }: DashboardSectionProps) => {
  return (
    <section className={`border border-white/10 rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.35)] ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-4 min-w-[240px]">
          {Icon && (
            <div className="p-3 rounded-xl bg-white/15 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              <Icon size={22} className="text-white/85" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-semibold text-white tracking-wide">{title}</h3>
            {description && <p className="text-white/60 text-sm leading-relaxed mt-1 max-w-2xl">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-3 ml-auto">{actions}</div>}
      </div>

      {children && <div className="mt-6 space-y-4">{children}</div>}
      {footer && <div className="mt-8 border-t border-white/10 pt-4 text-sm text-white/60">{footer}</div>}
    </section>
  );
};

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
  <div className="text-center py-12">
    <Icon size={48} className="text-white/15 mx-auto mb-4" />
    <p className="text-white/70 font-medium">{title}</p>
    {description && <p className="text-white/40 text-sm mt-2 max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

  const getChargeTypeLabel = (record: OverdueLeaseAccountingRecord) => {
    if (record.comment?.startsWith('PAYMENT')) {
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
    return labels[record.charge_type as keyof typeof labels] || record.charge_type;
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

  const tabs = [
    { id: 'contract', label: 'Contract Details', icon: FileText, number: 1 },
    { id: 'charges', label: 'Charges', icon: Plus, number: 2 },
    { id: 'periods', label: 'Billing Periods', icon: Calendar, number: 3 },
    { id: 'invoices', label: 'Invoices', icon: FileText, number: 4 },
    { id: 'payments', label: 'Payments', icon: Circle, number: 5 },
    { id: 'statement', label: 'Statement', icon: Download, number: 6 }
  ] as const;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            <span className="text-white">Loading Accounting...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        input[type="date"], input[type="tel"], input[type="email"], input[type="text"], input[type="number"], select, textarea {
          background-color: rgba(0, 0, 0, 0.2) !important;
          color: white !important;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.7;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(0, 0, 0, 0.2) inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col border border-white/10 shadow-[0_0_60px_rgba(255,255,255,0.05)]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                  <Receipt size={26} className="text-white/80" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Lease Accounting</h2>
                  <p className="text-white/60 text-sm">Managing finances for {customerName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/50 text-sm hidden md:block">Step-by-step finance workflow</span>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 border-b border-white/5 bg-white/5 backdrop-blur-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-1 bg-white/5 backdrop-blur-sm p-1 rounded-lg border border-white/10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative w-full py-3 px-2 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black/30 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black border border-white/30'
                      : 'text-white/70 hover:text-white/90 hover:bg-white/10 border border-transparent'
                  }`}
                  type="button"
                >
                  <span className="flex flex-col items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-white/15 text-white/80'
                    }`}>
                      {tab.number}
                    </span>
                    <span className="text-center text-xs font-semibold uppercase tracking-wide leading-tight">
                      {tab.label}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {activeTab === 'contract' && (
              <div className="pt-6 space-y-6">
                <DashboardSection
                  icon={FileText}
                  title="Lease Snapshot"
                  description={`Headline information for ${customerName}. Validate the core contract set-up before moving to billing.`}
                >
                  {leaseInfo ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        {
                          label: 'Lease Start',
                          value: leaseInfo.lease_start_date ? formatDate(leaseInfo.lease_start_date) : 'Not set'
                        },
                        {
                          label: 'Lease End',
                          value: leaseInfo.lease_end_date ? formatDate(leaseInfo.lease_end_date) : 'Open ended'
                        },
                        {
                          label: 'Term (Months)',
                          value: leaseInfo.lease_term_months || '—'
                        },
                        {
                          label: 'Monthly Payment',
                          value: leaseInfo.monthly_payment != null ? formatCurrency(leaseInfo.monthly_payment) : '—'
                        }
                      ].map((item) => (
                        <div key={item.label} className={`${panelSurfaceClass} p-4`}>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">{item.label}</p>
                          <p className="text-white text-lg font-semibold mt-2">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Clock}
                      title="Loading lease information"
                      description="We're fetching the contract details. They'll appear here in just a moment."
                    />
                  )}
                </DashboardSection>

                <DashboardSection icon={FileText} title="Contract Details" description="Full contract metadata exactly as captured in the leasing module.">
                  <div className={`${panelSurfaceClass} border-none p-4`}> 
                <ContractDetailsView
                  leaseId={leaseId}
                  customerName={customerName}
                />
                  </div>
                </DashboardSection>
              </div>
            )}

            {activeTab === 'charges' && (
              <div className="pt-6 space-y-6">
                <DashboardSection
                  title="Charges"
                  description="Create, review, and keep track of every billing touchpoint before it gets invoiced. Use refunds for credits and keep pending items clean."
                  actions={
                    <button
                      onClick={() => setShowAddCharge(true)}
                      className={primaryButtonClass}
                    >
                      <Plus size={16} />
                      Add Charge
                    </button>
                  }
                  footer={
                    records.length > 0 && (
                      <div className="flex flex-wrap items-center gap-4 justify-between">
                        <span className="font-medium text-white/80">{records.length} charges tracked</span>
                        <span>
                          Total value (excludes refunds):{" "}
                          <span className="text-white">
                            {formatCurrency(records.filter((r) => r.total_amount > 0).reduce((sum, r) => sum + r.total_amount, 0))}
                          </span>
                        </span>
                  </div>
                    )
                  }
                />

                {showAddCharge && (
                  <DashboardSection
                    icon={Edit}
                    title={editingCharge ? 'Edit Charge' : 'Add New Charge'}
                    description="Populate the billing details. Quantities auto-calculate totals for usage-based charges; refunds are negative values by default."
                    className="border-dashed border-white/20"
                    actions={
                      <button
                        onClick={() => {
                          setShowAddCharge(false);
                          setEditingCharge(null);
                          resetNewChargeForm();
                        }}
                        className={subtleButtonClass}
                      >
                        Cancel
                      </button>
                    }
                  >
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
                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-white/80 text-sm font-medium mb-2">Comment (Optional)</label>
                        <textarea
                          value={newCharge.comment}
                          onChange={(e) => setNewCharge(prev => ({ ...prev, comment: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                          rows={2}
                          placeholder="Optional notes about this charge..."
                        />
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex flex-wrap gap-3 mt-6">
                      <button
                        onClick={handleAddCharge}
                        className={primaryButtonClass}
                      >
                        {editingCharge ? 'Update Charge' : 'Add Charge'}
                      </button>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <AlertCircle size={14} />
                        Pending charges can be edited; invoiced charges are locked.
                      </div>
                    </div>
                  </DashboardSection>
                )}
                <DashboardSection
                  title="Charge Activity"
                  description="Every charge flows through this ledger before it becomes an invoice. Use filters in future iterations to slice by type or status."
                >
                  {records.length === 0 ? (
                    <EmptyState
                      icon={Receipt}
                      title="No charges recorded yet"
                      description="Add a first charge to start building the ledger for this lease. Charges can be edited while they remain in pending status."
                      action={
                      <button
                          onClick={() => setShowAddCharge(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all"
                        >
                          <Plus size={16} />
                          Add Charge
                      </button>
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {records.map((record) => (
                        <div
                          key={record.id}
                          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all p-4 flex flex-wrap items-center gap-4 justify-between"
                        >
                          <div className="flex items-center gap-4 min-w-[240px]">
                            <div className="p-2 rounded-lg bg-white/10 text-white/80">
                              <FileText size={18} />
                    </div>
                            <div className="space-y-1">
                              <span className="text-white font-medium block">{getChargeTypeLabel(record)}</span>
                              <span className="text-white/60 text-sm block">{formatDate(record.billing_period)}</span>
                              {record.comment && (
                                <span className="text-white/50 text-xs italic block max-w-[220px] truncate">
                                  {record.comment}
                                </span>
                              )}
                              {record.invoice_number && (
                                <span className="text-xs text-blue-300 font-medium">Linked to {record.invoice_number}</span>
                              )}
                    </div>
                            </div>
                            
                            {record.quantity && record.unit_price && (
                              <div className="text-white/60 text-sm">
                                {record.quantity} × {formatCurrency(record.unit_price)}
                              </div>
                            )}
                            
                          <div className="ml-auto flex items-center gap-4">
                            <div
                              className={`text-right ${
                              record.charge_type === 'refund' || record.total_amount < 0 
                                ? 'text-green-400' 
                                : record.comment?.startsWith('PAYMENT') 
                                  ? 'text-green-400' 
                                  : 'text-white'
                              }`}
                            >
                              <div className="font-bold text-base flex items-center gap-1 justify-end">
                                {(record.charge_type === 'refund' || record.total_amount < 0) && '🔄'}
                                {formatCurrency(record.total_amount)}
                              </div>
                              <div
                                className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border ${
                                  record.status === 'pending'
                                    ? 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20'
                                    : record.status === 'invoiced'
                                      ? 'text-blue-300 bg-blue-500/10 border-blue-500/20'
                                      : record.status === 'paid'
                                        ? 'text-green-300 bg-green-500/10 border-green-500/20'
                                        : 'text-red-300 bg-red-500/10 border-red-500/20'
                                }`}
                              >
                                <CheckCircle size={12} />
                                {record.status.toUpperCase()}
                              </div>
                            </div>

                            {record.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                {hasEditPermission && (
                                  <button
                                    onClick={() => handleEditCharge(record)}
                                    className="p-2 text-white/60 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-all"
                                    title="Edit charge"
                                  >
                                    <Edit size={16} />
                                  </button>
                                )}
                                {hasDeletePermission && (
                                  <button
                                    onClick={() => handleDeleteCharge(record.id)}
                                    className="p-2 text-white/60 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all"
                                    title="Delete charge"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      </div>
                  )}
                </DashboardSection>
              </div>
            )}

            {/* Billing Periods Tab */}
            {activeTab === 'periods' && (
              <div className="pt-6 space-y-6">
                <DashboardSection
                  icon={Calendar}
                  title="Billing Periods"
                  description="Track the lifecycle of each month in the lease. Generate invoices in sequence and fill any gaps with pending charges before invoicing."
                  actions={
                    <button
                      onClick={() => {
                        // Add 6 more billing periods
                        alert('Extend periods functionality will be wired to the billing periods view');
                      }}
                      className={primaryButtonClass}
                      title="Add 6 more billing periods"
                    >
                      <Plus size={16} />
                      Extend Periods
                    </button>
                  }
                  footer={
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                      <span>
                        Lease duration:
                        <span className="text-white font-medium ml-2">
                          {leaseInfo?.lease_start_date
                            ? `${new Date(leaseInfo.lease_start_date).toLocaleDateString('en-GB')}${leaseInfo?.lease_end_date ? ` — ${new Date(leaseInfo.lease_end_date).toLocaleDateString('en-GB')}` : ''}`
                            : 'Loading...'}
                        </span>
                      </span>
                      {leaseInfo?.lease_term_months && (
                        <span className="text-white/70">Term: <span className="text-white font-medium">{leaseInfo.lease_term_months}</span> months</span>
                      )}
                      {leaseInfo?.monthly_payment && (
                        <span className="text-white/70">Monthly: <span className="text-white font-medium">{formatCurrency(leaseInfo.monthly_payment)}</span></span>
                      )}
                </div>
                  }
                />

                <DashboardSection
                  icon={FileText}
                  title="Period Ledger"
                  description="Each row represents a billing period with its aggregated charges, invoices, and status."
                >
                  <IFRSBillingPeriodsView
                    leaseId={leaseId}
                    leaseStartDate={leaseInfo?.lease_start_date || leaseStartDate}
                    leaseEndDate={leaseInfo?.lease_end_date}
                    leaseTermMonths={leaseInfo?.lease_term_months}
                    records={records}
                    onGenerateInvoice={handleGenerateInvoice}
                    onAddChargeForPeriod={handleAddChargeForPeriod}
                  />
                </DashboardSection>
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="pt-6 space-y-6">
                <DashboardSection
                  icon={FileText}
                  title="Invoices"
                  description="Sequential invoice generation keeps numbering clean and VAT totals accurate. Apply credits or log payments directly to close balances."
                  actions={
                    <>
                    {availableCreditsTotal > 0 && outstandingInvoices.length > 0 && (
                      <button
                        onClick={() => setShowApplyCreditModal(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-white/10 text-white/80 hover:bg-white/15 border border-white/20 transition-all"
                      >
                          <Circle size={14} />
                        {`Apply ${formatCurrency(availableCreditsTotal)} credit`}
                      </button>
                    )}
                      <button
                        onClick={() => {
                          if (invoices.length === 0) {
                            alert('No invoices available to credit.');
                            return;
                          }
                          const outstanding = invoices.find(inv => !inv.is_paid && (inv.balance_due ?? inv.total_amount ?? 0) > 0);
                          const target = outstanding || invoices[0];
                          setSelectedInvoiceForCreditNote(target);
                          setShowCreditNoteModal(true);
                        }}
                        className={primaryButtonClass}
                      >
                        Issue Credit Note
                      </button>
                    </>
                  }
                  footer={
                    invoices.length > 0 && (
                      <div className="flex flex-wrap items-center gap-4 justify-between">
                        <span className="text-white/70">{invoices.length} invoices generated</span>
                        <span className="text-white/70">
                          Open balance:{' '}
                          <span className="text-white font-medium">
                            {formatCurrency(invoices.reduce((sum, inv) => sum + Math.max(inv.balance_due || inv.total_amount || 0, 0), 0))}
                          </span>
                        </span>
                  </div>
                    )
                  }
                />

                <DashboardSection
                  icon={Receipt}
                  title="Invoice Ledger"
                  description="Every invoice includes its line items, payment activity, and status."
                >
                  {invoices.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="No invoices generated yet"
                      description="Use the billing periods tab to raise the first invoice for this lease."
                    />
                  ) : (
                    <div className="space-y-4">
                      {invoices.map((invoice) => (
                        <div key={invoice.invoice_id} className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10 hover:bg-white/10 transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-blue-500/20 rounded-lg">
                                <FileText size={20} className="text-blue-400" />
                              </div>
                              <div>
                                <h4 className="text-white font-semibold text-lg">
                                  {invoice.invoice_number || `Invoice ${invoice.invoice_id.slice(-8)}`}
                                </h4>
                                <p className="text-neutral-400 text-sm">
                                  Period: {formatDate(invoice.billing_period)} • Generated: {formatDate(invoice.created_at)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-bold text-xl">
                                {formatCurrency(invoice.balance_due || invoice.total_amount)}
                              </div>
                              <div className={`text-xs px-3 py-1 rounded-full font-medium ${
                                invoice.is_paid
                                  ? 'text-green-400 bg-green-400/10 border border-green-400/20'
                                  : invoice.has_partial_payment
                                    ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20'
                                    : 'text-blue-400 bg-blue-400/10 border border-blue-400/20'
                              }`}>
                                {invoice.is_paid ? 'PAID' : invoice.has_partial_payment ? 'PARTIAL PAYMENT' : 'INVOICED'}
                              </div>
                              {invoice.has_partial_payment && invoice.balance_due > 0 && (
                                <div className="text-white/50 text-xs mt-1">
                                  Balance due: {formatCurrency(invoice.balance_due)}
                                </div>
                              )}
                              {invoice.payments_applied > 0 && (
                                <div className="text-green-400 text-xs mt-1">
                                  Payments applied: {formatCurrency(invoice.payments_applied)}
                                </div>
                              )}
                              {invoice.outstanding_amount < 0 && (
                                <div className="text-green-300 text-xs mt-1">
                                  Credit balance: {formatCurrency(Math.abs(invoice.outstanding_amount))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            {invoice.charges.map((charge: OverdueLeaseAccountingRecord) => (
                              <div key={charge.id} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5">
                                <div className="flex items-center gap-2">
                                  <span className="text-white/60 text-sm">{getChargeTypeLabel(charge)}</span>
                                  {charge.comment && (
                                    <span className="text-white/40 text-xs italic">"{charge.comment}"</span>
                                  )}
                                </div>
                                <div className={`text-sm font-medium ${
                                  charge.charge_type === 'refund' || charge.total_amount < 0
                                    ? 'text-green-400'
                                    : charge.comment?.startsWith('PAYMENT')
                                      ? 'text-green-400'
                                      : 'text-white'
                                }`}>
                                  {(charge.charge_type === 'refund' || charge.total_amount < 0) && '🔄 '}
                                  {formatCurrency(charge.total_amount)}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => alert(`Viewing invoice ${invoice.invoice_number || invoice.invoice_id.slice(-8)}`)}
                              className="flex items-center gap-2 px-4 py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-all border border-blue-400/20 text-sm"
                            >
                              <Eye size={14} />
                              View
                            </button>
                            <button
                              onClick={() => alert(`Downloading invoice ${invoice.invoice_number || invoice.invoice_id.slice(-8)}`)}
                              className="flex items-center gap-2 px-4 py-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10 text-sm"
                            >
                              <Download size={14} />
                              Download
                            </button>
                            <button
                              onClick={() => alert(`Printing invoice ${invoice.invoice_number || invoice.invoice_id.slice(-8)}`)}
                              className="flex items-center gap-2 px-4 py-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10 text-sm"
                            >
                              <Printer size={14} />
                              Print
                            </button>
                            {!invoice.is_paid && availableCreditsTotal > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForCredit(invoice);
                                  setSelectedInvoiceId(invoice.invoice_id);
                                  setShowApplyCreditModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white/80 hover:bg-white/15 rounded-lg transition-all border border-white/20 text-sm"
                              >
                                <Circle size={14} />
                                Apply Credit
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedInvoiceForCreditNote(invoice);
                                setShowCreditNoteModal(true);
                              }}
                              className={secondaryButtonClass}
                            >
                              Credit Note
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </DashboardSection>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="pt-6 space-y-6">
                <DashboardSection
                  title="Payments"
                  description="Record receipts, link them to invoices, and keep credits aligned with open balances."
                  actions={
                  <button
                    onClick={() => setShowPaymentModal(true)}
                      className={primaryButtonClass}
                  >
                      <Circle size={16} />
                    Record Payment
                  </button>
                  }
                  footer={
                    !loadingPayments && paymentHistory.length > 0 && (
                      <div className="flex flex-wrap items-center gap-4 justify-between">
                        <span className="text-white/70">{paymentHistory.length} payments captured</span>
                        <span className="text-green-300">
                          Lifetime receipts: {formatCurrency(paymentHistory.reduce((sum, p) => sum + p.total_amount, 0))}
                        </span>
                </div>
                    )
                  }
                />

                <DashboardSection icon={Clock} title="Payment Ledger" description="Chronological log of payments applied to the lease. Click through to see allocation details in future iterations.">
                  {loadingPayments ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
                    </div>
                  ) : paymentHistory.length === 0 ? (
                    <EmptyState
                      icon={Circle}
                      title="No payments recorded"
                      description="Log the first payment to start maintaining the receipt history for this lease."
                      action={
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className={primaryButtonClass}
                        >
                          <Circle size={16} />
                          Record Payment
                        </button>
                      }
                    />
                  ) : (
                    <div className="space-y-4">
                      {paymentHistory.map((payment) => {
                        const appliedAmount = payment.applications?.reduce((sum: number, app: any) => sum + app.applied_amount, 0) || 0;
                        const remainingAmount = payment.total_amount - appliedAmount;
                        
                        return (
                          <div key={payment.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10 hover:bg-white/10 transition-all">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                  <Circle size={20} className="text-green-400" />
                                </div>
                                <div>
                                  <p className="text-white font-semibold">
                                    {payment.payment_method.replace('_', ' ').toUpperCase()} Payment
                                  </p>
                                  <p className="text-neutral-400 text-sm">
                                    {formatDate(payment.created_at)} • {formatTime(payment.created_at)}
                                  </p>
                                  {payment.reference_number && (
                                    <p className="text-neutral-400 text-xs">
                                      Ref: {payment.reference_number}
                                    </p>
                                  )}
                                  {payment.notes && (
                                    <p className="text-white/60 text-xs italic mt-1">
                                      "{payment.notes}"
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right min-w-[140px]">
                                <p className="text-green-400 font-bold text-xl">
                                  {formatCurrency(payment.total_amount)}
                                </p>
                                <p className="text-neutral-400 text-xs">
                                  ID: {payment.id.slice(-8)}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-3 py-1 bg-green-400/10 text-green-300 rounded-full font-medium">
                                  {payment.status.toUpperCase()}
                                </span>
                                {appliedAmount > 0 && (
                                  <span className="text-xs text-green-300">
                                    Applied: {formatCurrency(appliedAmount)}
                                </span>
                                )}
                                {remainingAmount > 0 && (
                                  <span className="text-xs text-yellow-300">
                                    Remaining: {formatCurrency(remainingAmount)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
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
                              <div className="text-xs text-neutral-400">
                                  Created by: {payment.created_by?.slice(-8) || 'System'}
                              </div>
                            </div>
                            </div>

                            {payment.applications && payment.applications.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                <p className="text-xs text-white/60 mb-2">Applications:</p>
                                <div className="space-y-1">
                                  {payment.applications.map((app: any) => (
                                    <div key={app.id} className="flex justify-between text-xs">
                                      <span className="text-white/50">Invoice {app.invoice_id.slice(-8)}</span>
                                      <span className="text-green-300">{formatCurrency(app.applied_amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </DashboardSection>
              </div>
            )}

            {/* Statement Tab */}
            {activeTab === 'statement' && (
              <div className="pt-6 space-y-6">
                <DashboardSection
                  icon={Download}
                  title="Statement of Account"
                  description="Full ledger for the lease summarizing charges, invoices, payments, and outstanding balances. Ideal for customer-facing exports."
                  actions={
                    <button
                      onClick={() => {
                        alert('PDF export coming soon!');
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
                    >
                      <Download size={16} />
                      Export PDF
                    </button>
                  }
                  footer="The statement reflects only invoiced or recognized transactions. Pending charges stay in the charges tab until invoiced."
                />

                <DashboardSection icon={FileText} title="Account Timeline">
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                <IFRSStatementOfAccount
                  leaseId={leaseId}
                  customerName={customerName}
                  records={records}
                  onExportPDF={() => {
                    alert('PDF export coming soon!');
                  }}
                />
                  </div>
                </DashboardSection>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <IFRSInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          billingPeriod={selectedBillingPeriod}
          charges={selectedChargesForInvoice}
          customerName={customerName}
          leaseId={leaseId}
          onInvoiceGenerated={handleInvoiceGenerated}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <IFRSPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          leaseId={leaseId}
          customerName={customerName}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}

      {showApplyCreditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl w-full max-w-xl border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-semibold text-white">Apply Credit</h3>
                <p className="text-white/60 text-sm">Manually allocate unapplied credit to an outstanding invoice.</p>
              </div>
              <button
                onClick={() => {
                  setShowApplyCreditModal(false);
                  setSelectedInvoiceForCredit(null);
                  setSelectedInvoiceId('');
                  setSelectedCreditId('');
                  setCreditAmountToApply('');
                }}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Select Invoice</label>
                <select
                  value={selectedInvoiceId || selectedInvoiceForCredit?.invoice_id || ''}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    setSelectedInvoiceForCredit(invoices.find((invoice) => invoice.invoice_id === e.target.value) || null);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  <option value="" className="bg-black">Choose invoice</option>
                  {outstandingInvoices.map((invoice) => (
                    <option key={invoice.invoice_id} value={invoice.invoice_id} className="bg-black">
                      {`${invoice.invoice_number || invoice.invoice_id.slice(-8)} • Balance ${formatCurrency(invoice.balance_due || invoice.total_amount)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Select Credit</label>
                <select
                  value={selectedCreditId}
                  onChange={(e) => {
                    setSelectedCreditId(e.target.value);
                    const payment = availableCredits.find((p) => p.id === e.target.value);
                    if (payment) {
                      const appliedAmount = payment.applications?.reduce((sum: number, app: any) => sum + app.applied_amount, 0) || 0;
                      const remainingAmount = payment.total_amount - appliedAmount;
                      setCreditAmountToApply(remainingAmount.toString());
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  <option value="" className="bg-black">Choose credit</option>
                  {availableCredits.map((payment) => {
                    const appliedAmount = payment.applications?.reduce((sum: number, app: any) => sum + app.applied_amount, 0) || 0;
                    const remainingAmount = payment.total_amount - appliedAmount;
                    return (
                      <option key={payment.id} value={payment.id} className="bg-black">
                        {`${payment.payment_method.toUpperCase()} Payment${payment.reference_number ? ` (${payment.reference_number})` : ''} • ${formatCurrency(remainingAmount)}`}
                    </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Amount to Apply</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditAmountToApply}
                  onChange={(e) => setCreditAmountToApply(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="0.00"
                />
                <p className="text-white/40 text-xs mt-1">
                  Credits available: {formatCurrency(availableCreditsTotal)}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-white/5 rounded-b-2xl flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowApplyCreditModal(false);
                  setSelectedInvoiceForCredit(null);
                  setSelectedInvoiceId('');
                  setSelectedCreditId('');
                  setCreditAmountToApply('');
                }}
                className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCredit}
                disabled={isApplyingCredit}
                className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplyingCredit ? 'Applying...' : 'Apply Credit'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showCreditNoteModal && selectedInvoiceForCreditNote && (
        <IFRSCreditNoteModal
          isOpen={showCreditNoteModal}
          onClose={() => {
            setShowCreditNoteModal(false);
            setSelectedInvoiceForCreditNote(null);
          }}
          invoice={selectedInvoiceForCreditNote}
          onCreditNoteIssued={() => {
            fetchAccountingData();
            fetchInvoices();
            fetchAvailableCredits();
          }}
        />
      )}
    </>
  );
}
