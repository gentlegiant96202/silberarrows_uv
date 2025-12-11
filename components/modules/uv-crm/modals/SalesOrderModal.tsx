"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';
import { useModulePermissions } from '@/lib/useModulePermissions';
import { useIsAdminSimple } from '@/lib/useIsAdminSimple';
import { X, FileText, ArrowRightLeft, CreditCard, ClipboardList, ChevronDown, ChevronUp, Save, Loader2, Plus, Trash2, ScrollText, ExternalLink, Building2, Upload, CheckCircle2, Clock, AlertCircle, XCircle, Download, MessageSquare } from 'lucide-react';

// ===== INTERFACES =====
interface Lead {
  id: string;
  full_name: string;
  phone_number: string;
  country_code: string;
  model_of_interest: string;
  inventory_car_id?: string;
  customer_number?: string;
}

interface InventoryCar {
  id: string;
  stock_number: string;
  vehicle_model: string;
  model_year: number;
  chassis_number: string;
  colour: string;
  interior_colour?: string;
  current_mileage_km?: number;
  current_warranty?: string;
  current_service?: string;
  advertised_price_aed?: number;
}

interface SalesOrder {
  id: string;
  order_number: string;
  lead_id: string;
  car_id: string;
  order_date: string;
  sales_executive: string;
  status: 'draft' | 'invoiced' | 'lost';
  payment_method?: 'cash' | 'bank_finance';
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_id_type: string;
  customer_id_number: string;
  vehicle_make_model: string;
  model_year: number;
  chassis_no: string;
  vehicle_colour: string;
  vehicle_mileage: number;
  has_manufacturer_warranty: boolean;
  manufacturer_warranty_expiry: string;
  manufacturer_warranty_km: number;
  has_manufacturer_service: boolean;
  manufacturer_service_expiry: string;
  manufacturer_service_km: number;
  has_part_exchange: boolean;
  part_exchange_make_model: string;
  part_exchange_year: string;
  part_exchange_chassis: string;
  part_exchange_mileage: number;
  part_exchange_value: number;
  subtotal: number;
  total_amount: number;
  pdf_url: string;
  signed_pdf_url?: string;
  docusign_envelope_id?: string;
  signing_status?: string;
  notes: string;
  created_at: string;
}

interface InitialAccountingStatus {
  invoiceNumber?: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
}

interface SalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onSalesOrderCreated?: (salesOrder: SalesOrder) => void;
  onSalesOrderUpdated?: (salesOrder: SalesOrder) => void;
  initialAccountingStatus?: InitialAccountingStatus;
}

// ===== LINE ITEMS =====
interface LineItem {
  id: string;
  line_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

// ===== INVOICES =====
interface Invoice {
  id: string;
  invoice_number: string;
  sales_order_id: string;
  invoice_date: string;
  due_date?: string;
  status: 'pending' | 'partial' | 'paid' | 'reversed';
  subtotal: number;
  total_amount: number;
  credit_note_total: number;
  paid_amount: number;
  balance_due: number;
  pdf_url?: string;
  signed_pdf_url?: string;
  docusign_envelope_id?: string;
  signing_status?: 'pending' | 'sent' | 'delivered' | 'company_signed' | 'completed';
  reversed_at?: string;
  reversal_reason?: string;
  notes?: string;
  created_at: string;
}

interface InvoiceLine {
  id: string;
  invoice_id: string;
  line_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

// ===== PAYMENTS =====
interface Payment {
  id: string;
  payment_number: string;
  lead_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'bank_finance';
  payment_date: string;
  reference?: string;
  bank_name?: string;
  status: 'received' | 'pending' | 'bounced' | 'cancelled';
  notes?: string;
  created_at: string;
  pdf_url?: string;
  // Calculated fields
  allocated_amount?: number;
  refunded_amount?: number;
  available_amount?: number;  // amount - allocated - refunded (can be allocated OR refunded)
  unallocated_amount?: number;  // DEPRECATED: use available_amount instead
}

interface RefundAllocation {
  id: string;
  refund_id: string;
  payment_id: string;
  amount: number;
  created_at: string;
  // Joined fields
  refund_number?: string;
  payment_number?: string;
}

interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  amount: number;
  created_at: string;
  // Joined fields
  payment_number?: string;
  invoice_number?: string;
}

// ===== ADJUSTMENTS =====
interface Adjustment {
  id: string;
  adjustment_number: string;
  adjustment_type: 'credit_note' | 'refund';
  lead_id: string;
  invoice_id?: string;
  amount: number;
  reason: string;
  refund_method?: string;
  refund_reference?: string;
  created_at: string;
  pdf_url?: string;
}

// ===== BANK FINANCE =====
interface BankFinanceApplication {
  id: string;
  sales_order_id: string;
  lead_id: string;
  application_number: number;
  status: 'documents_pending' | 'documents_complete' | 'accounts_review' | 'submitted_to_bank' | 'approved' | 'rejected';
  // Actual deal
  actual_vehicle_price: number;
  actual_customer_down_payment: number;
  amount_to_finance: number;
  // Bank quotation
  bank_name: string;
  bank_required_down_pct: number;
  bank_quotation_price: number;
  bank_shown_down_payment: number;
  bank_finance_amount: number;
  bank_quotation_number?: string;
  bank_quotation_pdf_url?: string;
  bank_quotation_date?: string;
  bank_quotation_valid_until?: string;
  // Applied terms
  applied_interest_rate?: number;
  applied_tenure_months?: number;
  applied_emi?: number;
  // Approved terms
  bank_reference?: string;
  approved_amount?: number;
  approved_down_payment?: number;
  approved_interest_rate?: number;
  approved_tenure_months?: number;
  approved_emi?: number;
  first_emi_date?: string;
  last_emi_date?: string;
  // Rejection
  rejection_reason?: string;
  // Timestamps
  created_at: string;
  docs_started_at?: string;
  docs_completed_at?: string;
  accounts_received_at?: string;
  submitted_to_bank_at?: string;
  decision_at?: string;
}

interface BankFinanceDocument {
  id: string;
  application_id: string;
  category: 'customer' | 'bank';
  document_type: string;
  document_name: string;
  file_url: string;
  file_name?: string;
  uploaded_at: string;
}

interface BankFinanceActivity {
  id: string;
  application_id: string;
  activity_type: 'note' | 'status_change' | 'document_upload' | 'system';
  note?: string;
  old_status?: string;
  new_status?: string;
  created_at: string;
  created_by?: string;
  user_name?: string;
}

const banksList = [
  { value: 'emirates_nbd', label: 'Emirates NBD' },
  { value: 'adcb', label: 'ADCB' },
  { value: 'fab', label: 'FAB (First Abu Dhabi Bank)' },
  { value: 'dib', label: 'Dubai Islamic Bank' },
  { value: 'mashreq', label: 'Mashreq Bank' },
  { value: 'rak_bank', label: 'RAK Bank' },
  { value: 'enbd_islamic', label: 'ENBD Islamic' },
  { value: 'adib', label: 'ADIB' },
  { value: 'cbd', label: 'Commercial Bank of Dubai' },
  { value: 'other', label: 'Other' },
];

const customerDocTypes = [
  { value: 'eid_front', label: 'Emirates ID (Front)', required: true },
  { value: 'eid_back', label: 'Emirates ID (Back)', required: true },
  { value: 'passport', label: 'Passport Copy', required: true },
  { value: 'salary_cert', label: 'Salary Certificate', required: false },
  { value: 'trade_license', label: 'Trade License', required: false },
  { value: 'bank_statements', label: 'Bank Statements (3 months)', required: true },
  { value: 'proof_of_address', label: 'Proof of Address', required: false },
];

const bankDocTypes = [
  { value: 'loi', label: 'Letter of Intent (LOI)', required: true },
  { value: 'lpo', label: 'Local Purchase Order (LPO)', required: true },
  { value: 'finance_agreement', label: 'Finance Agreement', required: false },
  { value: 'insurance_cert', label: 'Insurance Certificate', required: false },
];

const bfStatusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  documents_pending: { label: 'Docs Pending', color: 'text-amber-400', icon: <Clock className="w-3 h-3" /> },
  documents_complete: { label: 'Docs Complete', color: 'text-blue-400', icon: <CheckCircle2 className="w-3 h-3" /> },
  accounts_review: { label: 'Accounts Review', color: 'text-purple-400', icon: <Clock className="w-3 h-3" /> },
  submitted_to_bank: { label: 'Submitted to Bank', color: 'text-cyan-400', icon: <Building2 className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'text-green-400', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'text-red-400', icon: <XCircle className="w-3 h-3" /> },
};

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_finance', label: 'Bank Finance' },
];

const lineTypes = [
  { value: 'vehicle', label: 'Vehicle', defaultDescription: 'Vehicle Sale Price' },
  { value: 'extended_warranty_standard', label: 'Extended Warranty - Standard', defaultDescription: 'Extended Warranty (Standard)' },
  { value: 'extended_warranty_premium', label: 'Extended Warranty - Premium', defaultDescription: 'Extended Warranty (Premium)' },
  { value: 'servicecare_standard', label: 'ServiceCare - Standard', defaultDescription: 'ServiceCare Package (Standard)' },
  { value: 'servicecare_premium', label: 'ServiceCare - Premium', defaultDescription: 'ServiceCare Package (Premium)' },
  { value: 'ceramic_treatment', label: 'Ceramic Treatment', defaultDescription: 'Ceramic Paint Protection' },
  { value: 'window_tints', label: 'Window Tints', defaultDescription: 'Window Tinting' },
  { value: 'rta_fees', label: 'RTA Fees', defaultDescription: 'RTA Registration & Transfer Fees' },
  { value: 'discount', label: 'Discount', defaultDescription: 'Discount' },
  { value: 'part_exchange', label: 'Part Exchange (Deduction)', defaultDescription: 'Part Exchange Trade-in Value' },
  { value: 'other', label: 'Other', defaultDescription: '' },
];

// Line types that are deductions (negative values)
const deductionTypes = ['part_exchange', 'discount'];

// ===== TABS =====
type TabKey = 'sales_order' | 'invoices' | 'payments' | 'soa' | 'bank_finance';

const baseTabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'sales_order', label: 'Sales Order', icon: <FileText className="w-4 h-4" /> },
  { key: 'invoices', label: 'Invoices', icon: <ScrollText className="w-4 h-4" /> },
  { key: 'payments', label: 'Transactions', icon: <ArrowRightLeft className="w-4 h-4" /> },
  { key: 'soa', label: 'SOA', icon: <ClipboardList className="w-4 h-4" /> },
];

const bankFinanceTab = { key: 'bank_finance' as TabKey, label: 'Bank Finance', icon: <Building2 className="w-4 h-4" /> };

// ===== STYLING =====
const inputClass = `
  w-full px-3 py-2 text-sm font-medium text-white
  bg-black border border-white/10 rounded-lg
  hover:bg-zinc-900 hover:border-white/20
  focus:bg-zinc-900 focus:border-white/30 focus:ring-1 focus:ring-white/20
  focus:outline-none transition-all duration-150
  placeholder-white/40
  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
  [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(0,0,0)] [&:-webkit-autofill]:[-webkit-text-fill-color:white]
  [&:-webkit-autofill:hover]:shadow-[inset_0_0_0px_1000px_rgb(24,24,27)] [&:-webkit-autofill:focus]:shadow-[inset_0_0_0px_1000px_rgb(24,24,27)]
`.replace(/\s+/g, ' ').trim();

const selectClass = `
  w-full pl-3 pr-8 py-2 text-sm font-medium text-white
  bg-black border border-white/10 rounded-lg
  hover:bg-zinc-900 hover:border-white/20
  focus:bg-zinc-900 focus:border-white/30 focus:ring-1 focus:ring-white/20
  focus:outline-none transition-all duration-150
  appearance-none cursor-pointer
  bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.5)%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]
  bg-[length:12px_12px] bg-[position:right_10px_center] bg-no-repeat
  [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(0,0,0)] [&:-webkit-autofill]:[-webkit-text-fill-color:white]
`.replace(/\s+/g, ' ').trim();

const labelClass = "text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1";

// ===== FIELD COMPONENT =====
const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`flex-1 min-w-0 ${className}`}>
    <span className={labelClass}>{label}</span>
    {children}
  </div>
);

// ===== SECTION COMPONENT =====
const Section = ({ title, children, collapsible = false, defaultOpen = true }: { 
  title: string; 
  children: React.ReactNode; 
  collapsible?: boolean;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div 
        className={`px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between ${collapsible ? 'cursor-pointer hover:bg-white/10' : ''}`}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">{title}</h3>
        {collapsible && (
          isOpen ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />
        )}
      </div>
      {(!collapsible || isOpen) && (
        <div className="p-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

// ===== MAIN COMPONENT =====
export default function SalesOrderModal({ 
  isOpen, 
  onClose, 
  lead,
  onSalesOrderCreated,
  onSalesOrderUpdated,
  initialAccountingStatus
}: SalesOrderModalProps) {
  const { user } = useAuth();
  const { isAdmin } = useIsAdminSimple();
  const { canCreate, canEdit, canDelete } = useModulePermissions('uv_crm');
  const { canDelete: accountsCanDelete } = useModulePermissions('accounts');
  
  const [activeTab, setActiveTab] = useState<TabKey>('sales_order');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryCar, setInventoryCar] = useState<InventoryCar | null>(null);
  const [allSalesOrders, setAllSalesOrders] = useState<SalesOrder[]>([]);
  const [existingSalesOrder, setExistingSalesOrder] = useState<SalesOrder | null>(null);
  const [creatingNewSO, setCreatingNewSO] = useState(false);
  
  // Line items state
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  
  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [convertingToInvoice, setConvertingToInvoice] = useState(false);
  const [generatingInvoicePdf, setGeneratingInvoicePdf] = useState<string | null>(null);
  const [sendingInvoiceForSigning, setSendingInvoiceForSigning] = useState<string | null>(null);
  const [showInvoiceSigningModal, setShowInvoiceSigningModal] = useState(false);
  const [signingInvoice, setSigningInvoice] = useState<Invoice | null>(null);
  const [invoiceCompanyEmail, setInvoiceCompanyEmail] = useState('');

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [allocatingPayment, setAllocatingPayment] = useState<string | null>(null); // payment_id being allocated
  const [allocationAmount, setAllocationAmount] = useState<number>(0);
  const [allocationInvoiceId, setAllocationInvoiceId] = useState<string | null>(null);
  
  // Invoice reversal state
  const [reversingInvoice, setReversingInvoice] = useState<Invoice | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    payment_method: 'cash' as Payment['payment_method'],
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    bank_name: '',
    notes: '',
  });
  
  // Adjustments state
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [showCreditNoteForm, setShowCreditNoteForm] = useState<string | null>(null); // invoice_id
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  
  // PDF generation state for transactions
  const [generatingReceiptId, setGeneratingReceiptId] = useState<string | null>(null);
  const [generatingCreditNoteId, setGeneratingCreditNoteId] = useState<string | null>(null);
  const [generatingRefundId, setGeneratingRefundId] = useState<string | null>(null);
  
  // WhatsApp sending state
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<{ payments: boolean; credits: boolean; refunds: boolean }>({
    payments: true,
    credits: false,
    refunds: false
  });
  const toggleSection = (section: 'payments' | 'credits' | 'refunds') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Expanded invoice state
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [newCreditNote, setNewCreditNote] = useState({ amount: 0, reason: '' });
  const [newRefund, setNewRefund] = useState({ amount: 0, reason: '', method: 'bank_transfer', reference: '', paymentId: '' });
  
  // SOA state
  const [soaData, setSoaData] = useState<any[]>([]);
  const [soaBalance, setSoaBalance] = useState<any>(null);
  const [loadingSoa, setLoadingSoa] = useState(false);
  
  // Bank Finance state
  const [bfApplications, setBfApplications] = useState<BankFinanceApplication[]>([]);
  const [selectedBfApp, setSelectedBfApp] = useState<BankFinanceApplication | null>(null);
  const [bfDocuments, setBfDocuments] = useState<BankFinanceDocument[]>([]);
  const [bfActivity, setBfActivity] = useState<BankFinanceActivity[]>([]);
  const [loadingBankFinance, setLoadingBankFinance] = useState(false);
  const [showNewBfAppForm, setShowNewBfAppForm] = useState(false);
  const [savingBfApp, setSavingBfApp] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [generatingBankQuotation, setGeneratingBankQuotation] = useState(false);
  const [newBfNote, setNewBfNote] = useState('');
  const [postingNote, setPostingNote] = useState(false);
  const [newBfApp, setNewBfApp] = useState({
    bank_name: '',
    bank_required_down_pct: 20,
    actual_vehicle_price: 0,
    actual_customer_down_payment: 0,
    bank_quotation_price: 0,
    applied_interest_rate: 0,
    applied_tenure_months: 48,
  });
  const [approvalForm, setApprovalForm] = useState({
    bank_reference: '',
    approved_amount: 0,
    approved_down_payment: 0,
    approved_interest_rate: 0,
    approved_tenure_months: 48,
    approved_emi: 0,
    first_emi_date: '',
    last_emi_date: '',
  });
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // PDF & DocuSign state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signingStatus, setSigningStatus] = useState<string>('pending');
  const [docusignEnvelopeId, setDocusignEnvelopeId] = useState<string | null>(null);
  const [sendingForSigning, setSendingForSigning] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [companyEmail, setCompanyEmail] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Generate unique ID for line items
  const generateId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Calculate totals from line items
  const calculateTotals = () => {
    const subtotal = lineItems
      .filter(item => !deductionTypes.includes(item.line_type))
      .reduce((sum, item) => sum + item.line_total, 0);

    const discountValue = lineItems
      .filter(item => item.line_type === 'discount')
      .reduce((sum, item) => sum + Math.abs(item.line_total), 0);

    const partExchangeValue = lineItems
      .filter(item => item.line_type === 'part_exchange')
      .reduce((sum, item) => sum + Math.abs(item.line_total), 0);

    const totalDeductions = discountValue + partExchangeValue;
    const total = subtotal - totalDeductions;

    return { subtotal, discountValue, partExchangeValue, totalDeductions, total };
  };

  const { subtotal, discountValue, partExchangeValue, totalDeductions, total } = calculateTotals();
  
  // Check if Sales Order is locked (has active invoice OR status is 'invoiced')
  // Check SO status first (instant) to prevent flash, then verify with invoices
  const hasActiveInvoice = invoices.some(inv => inv.status !== 'reversed');
  const isLocked = existingSalesOrder?.status === 'invoiced' || hasActiveInvoice;
  
  // Send for Signing Handler
  const handleSendForSigning = () => {
    if (!pdfUrl) {
      alert('Please generate the PDF first before sending for signing.');
      return;
    }
    
    if (!formData.customerEmail) {
      alert('Please add customer email address before sending for signing.');
      return;
    }
    
    setCompanyEmail('');
    setShowEmailModal(true);
  };
  
  // Confirm Send for Signing
  const handleConfirmSendForSigning = async () => {
    if (!companyEmail || !existingSalesOrder) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail)) {
      alert('Please enter a valid email address');
      return;
    }
    
    setSendingForSigning(true);
    setShowEmailModal(false);
    
    try {
      const response = await fetch('/api/docusign/send-for-signing-sales-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesOrderId: existingSalesOrder.id,
          customerEmail: formData.customerEmail,
          customerName: formData.customerName,
          companySignerEmail: companyEmail,
          pdfUrl: pdfUrl,
          orderNumber: existingSalesOrder.order_number
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send for signing');
      }
      
      const result = await response.json();
      setDocusignEnvelopeId(result.envelopeId);
      setSigningStatus('sent');
    } catch (error: any) {
      alert(error.message || 'Failed to send document for signing. Please try again.');
    } finally {
      setSendingForSigning(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Line item handlers
  const addLineItem = () => {
    const newItem: LineItem = {
      id: generateId(),
      line_type: 'other',
      description: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0,
      sort_order: lineItems.length + 1
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      // Auto-update description when line type changes
      if (field === 'line_type') {
        const lineType = lineTypes.find(lt => lt.value === value);
        if (lineType && lineType.defaultDescription) {
          updated.description = lineType.defaultDescription;
        }
      }
      
      // Recalculate line total
      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? value : updated.quantity;
        const price = field === 'unit_price' ? value : updated.unit_price;
        updated.line_total = qty * price;

        // Make deduction types negative
        if (deductionTypes.includes(updated.line_type)) {
          updated.line_total = -Math.abs(updated.line_total);
        }
      }

      // Handle deduction type sign change
      if (field === 'line_type' && deductionTypes.includes(value as string)) {
        updated.line_total = -Math.abs(updated.line_total);
      } else if (field === 'line_type' && !deductionTypes.includes(value as string) && updated.line_total < 0) {
        updated.line_total = Math.abs(updated.line_total);
      }
      
      return updated;
    }));
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  // Form state
  const [formData, setFormData] = useState({
    // Customer Details
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerIdType: 'EID' as 'EID' | 'Passport',
    customerIdNumber: '',
    
    // Vehicle Details
    vehicleMakeModel: '',
    modelYear: 0,
    chassisNo: '',
    vehicleColour: '',
    vehicleMileage: 0,
    
    // Manufacturer Warranty
    hasManufacturerWarranty: false,
    manufacturerWarrantyExpiry: '',
    manufacturerWarrantyKm: 0,
    
    // Manufacturer Service
    hasManufacturerService: false,
    manufacturerServiceExpiry: '',
    manufacturerServiceKm: 0,
    
    // Part Exchange
    hasPartExchange: false,
    partExchangeMakeModel: '',
    partExchangeYear: '',
    partExchangeChassis: '',
    partExchangeMileage: 0,
    partExchangeValue: 0,
    
    // Notes
    notes: '',
    
    // Document
    orderDate: new Date().toISOString().split('T')[0],
    salesExecutive: '',
    
    // Payment Method
    paymentMethod: 'cash' as 'cash' | 'bank_finance',
  });

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return '';
    return user.user_metadata?.full_name || user.email?.split('@')[0] || '';
  };

  // Form is read-only if user lacks edit permission (existing SO) or create permission (new SO)
  const isFormReadOnly = existingSalesOrder ? !canEdit : !canCreate;

  // Load inventory car data
  useEffect(() => {
    if (isOpen && lead.inventory_car_id) {
      loadInventoryCarData();
    }
  }, [isOpen, lead.inventory_car_id]);

  // Load all initial data when modal opens
  useEffect(() => {
    const loadAllData = async () => {
      if (!isOpen || !lead.id) return;
      
      setInitialLoading(true);
      try {
        // Load all data in parallel
        await Promise.all([
          loadExistingSalesOrder(),
          loadPayments(),
          loadAdjustments(),
        ]);
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadAllData();
  }, [isOpen, lead.id]);

  // Load adjustments for this customer
  useEffect(() => {
    if (isOpen && lead.id) {
      loadAdjustments();
    }
  }, [isOpen, lead.id]);

  // Load SOA balance on mount (for header status strip)
  useEffect(() => {
    if (isOpen && lead.id) {
      loadSoaBalance();
    }
  }, [isOpen, lead.id]);

  // Load full SOA data when tab is selected
  useEffect(() => {
    if (isOpen && lead.id && activeTab === 'soa') {
      loadSoaData();
    }
  }, [isOpen, lead.id, activeTab]);

  // Set sales executive on load
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        salesExecutive: getUserDisplayName()
      }));
    }
  }, [isOpen, user]);

  // Poll for signing status updates when modal is open and document is in signing process
  useEffect(() => {
    if (!isOpen || !existingSalesOrder?.id) return;
    
    // Only poll if signing is in progress (not pending and not completed)
    const shouldPoll = signingStatus !== 'pending' && signingStatus !== 'completed';
    if (!shouldPoll) return;

    const pollSigningStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('uv_sales_orders')
          .select('signing_status, signed_pdf_url, docusign_envelope_id')
          .eq('id', existingSalesOrder.id)
          .single();

        if (error || !data) return;

        // Update state if status changed
        if (data.signing_status && data.signing_status !== signingStatus) {
          setSigningStatus(data.signing_status);
          
          // If completed, also update the signed PDF URL
          if (data.signing_status === 'completed' && data.signed_pdf_url) {
            setSignedPdfUrl(data.signed_pdf_url);
            setPdfUrl(data.signed_pdf_url);
          }
        }
      } catch (err) {
        console.error('Error polling signing status:', err);
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(pollSigningStatus, 5000);
    
    // Also poll immediately
    pollSigningStatus();

    return () => clearInterval(interval);
  }, [isOpen, existingSalesOrder?.id, signingStatus]);

  // Poll for invoice signing status updates
  useEffect(() => {
    if (!isOpen || !existingSalesOrder?.id) return;
    
    // Check if any invoice is in signing process
    const signingInvoices = invoices.filter(inv => 
      inv.signing_status && inv.signing_status !== 'pending' && inv.signing_status !== 'completed'
    );
    if (signingInvoices.length === 0) return;

    const pollInvoiceStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('uv_invoices')
          .select('id, signing_status, signed_pdf_url, pdf_url')
          .eq('sales_order_id', existingSalesOrder.id);

        if (error || !data) return;

        // Check if any invoice status changed
        let hasChanges = false;
        data.forEach(inv => {
          const existing = invoices.find(i => i.id === inv.id);
          if (existing && inv.signing_status !== existing.signing_status) {
            hasChanges = true;
          }
        });

        // Reload invoices if changes detected
        if (hasChanges) {
          await loadInvoices(existingSalesOrder.id);
        }
      } catch (err) {
        console.error('Error polling invoice signing status:', err);
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(pollInvoiceStatus, 5000);
    
    // Also poll immediately
    pollInvoiceStatus();

    return () => clearInterval(interval);
  }, [isOpen, existingSalesOrder?.id, invoices]);

  const loadInventoryCarData = async () => {
    if (!lead.inventory_car_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('id', lead.inventory_car_id)
        .single();
      
      if (error) throw error;
      if (data) {
        setInventoryCar(data);
        
        // Parse warranty info
        const warrantyInfo = parseWarrantyString(data.current_warranty);
        const serviceInfo = parseServiceString(data.current_service);
        
        // Only set form data if no existing sales order
        if (!existingSalesOrder) {
          setFormData(prev => ({
            ...prev,
            customerName: lead.full_name || '',
            customerPhone: `${lead.country_code || '+971'}${lead.phone_number || ''}`,
            vehicleMakeModel: (data.vehicle_model || '').toUpperCase().startsWith('MERCEDES') 
              ? (data.vehicle_model || '').toUpperCase() 
              : `MERCEDES-BENZ ${(data.vehicle_model || '').toUpperCase()}`,
            modelYear: data.model_year || 0,
            chassisNo: data.chassis_number || '',
            vehicleColour: (data.colour || '').toUpperCase(),
            vehicleMileage: data.current_mileage_km || 0,
            hasManufacturerWarranty: warrantyInfo.hasWarranty,
            manufacturerWarrantyExpiry: warrantyInfo.expiry,
            manufacturerWarrantyKm: warrantyInfo.km,
            hasManufacturerService: serviceInfo.hasService,
            manufacturerServiceExpiry: serviceInfo.expiry,
            manufacturerServiceKm: serviceInfo.km,
          }));
          
          // Auto-add vehicle line item if no line items exist yet
          if (lineItems.length === 0 && data.advertised_price_aed) {
            setLineItems([{
              id: generateId(),
              line_type: 'vehicle',
              description: (data.vehicle_model || '').toUpperCase().startsWith('MERCEDES') 
                ? `${(data.vehicle_model || '').toUpperCase()} ${data.model_year || ''}`
                : `MERCEDES-BENZ ${(data.vehicle_model || '').toUpperCase()} ${data.model_year || ''}`,
              quantity: 1,
              unit_price: data.advertised_price_aed || 0,
              line_total: data.advertised_price_aed || 0,
              sort_order: 1
            }]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading inventory car:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingSalesOrder = async () => {
    try {
      // Load ALL sales orders for this lead
      const { data: allSOs, error } = await supabase
        .from('uv_sales_orders')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      
      if (error && !error.message.includes('does not exist')) throw error;
      
      if (allSOs && allSOs.length > 0) {
        setAllSalesOrders(allSOs);
        
        // Find the most relevant SO to show:
        // 1. First, try to find a draft SO
        // 2. Then, try to find an invoiced SO
        // 3. Finally, show the most recent one
        const draftSO = allSOs.find(so => so.status === 'draft');
        const invoicedSO = allSOs.find(so => so.status === 'invoiced');
        const currentSO = draftSO || invoicedSO || allSOs[0];
        
        await selectSalesOrder(currentSO);
      } else {
        setAllSalesOrders([]);
      }
    } catch (error) {
      console.error('Error loading existing sales order:', error);
    }
  };

  // Select and load a specific sales order
  const selectSalesOrder = async (data: SalesOrder) => {
    setExistingSalesOrder(data);
    setCreatingNewSO(false);
    setSaveSuccess(false);
    
    // Set PDF and signing state
    setPdfUrl(data.pdf_url || null);
    setSignedPdfUrl(data.signed_pdf_url || null);
    setDocusignEnvelopeId(data.docusign_envelope_id || null);
    setSigningStatus(data.signing_status || 'pending');
    
    // Populate form with existing data
    setFormData({
      customerName: data.customer_name || '',
      customerPhone: data.customer_phone || '',
      customerEmail: data.customer_email || '',
      customerIdType: (data.customer_id_type as 'EID' | 'Passport') || 'EID',
      customerIdNumber: data.customer_id_number || '',
      vehicleMakeModel: data.vehicle_make_model || '',
      modelYear: data.model_year || 0,
      chassisNo: data.chassis_no || '',
      vehicleColour: data.vehicle_colour || '',
      vehicleMileage: data.vehicle_mileage || 0,
      hasManufacturerWarranty: data.has_manufacturer_warranty || false,
      manufacturerWarrantyExpiry: data.manufacturer_warranty_expiry || '',
      manufacturerWarrantyKm: data.manufacturer_warranty_km || 0,
      hasManufacturerService: data.has_manufacturer_service || false,
      manufacturerServiceExpiry: data.manufacturer_service_expiry || '',
      manufacturerServiceKm: data.manufacturer_service_km || 0,
      hasPartExchange: data.has_part_exchange || false,
      partExchangeMakeModel: data.part_exchange_make_model || '',
      partExchangeYear: data.part_exchange_year || '',
      partExchangeChassis: data.part_exchange_chassis || '',
      partExchangeMileage: data.part_exchange_mileage || 0,
      partExchangeValue: data.part_exchange_value || 0,
      notes: data.notes || '',
      orderDate: data.order_date || new Date().toISOString().split('T')[0],
      salesExecutive: data.sales_executive || getUserDisplayName(),
      paymentMethod: data.payment_method || 'cash',
    });
    
    // Load line items for this sales order
    const { data: lineItemsData, error: lineItemsError } = await supabase
      .from('uv_sales_order_lines')
      .select('*')
      .eq('sales_order_id', data.id)
      .order('sort_order', { ascending: true });
    
    if (!lineItemsError && lineItemsData && lineItemsData.length > 0) {
      setLineItems(lineItemsData.map(item => ({
        id: item.id,
        line_type: item.line_type,
        description: item.description,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price) || 0,
        line_total: parseFloat(item.line_total) || 0,
        sort_order: item.sort_order
      })));
    } else {
      setLineItems([]);
    }
    
    // Load invoices for this sales order
    await loadInvoices(data.id);
    
    // Reset invoices state if switching SOs
    setInvoices([]);
    await loadInvoices(data.id);
  };

  // Start creating a new Sales Order
  const startNewSalesOrder = async () => {
    setCreatingNewSO(true);
    setExistingSalesOrder(null);
    setLineItems([]);
    setInvoices([]);
    
    // Reset PDF and signing state
    setPdfUrl(null);
    setSignedPdfUrl(null);
    setDocusignEnvelopeId(null);
    setSigningStatus('pending');
    
    // Reset form with customer details from lead, but clear vehicle details
    setFormData({
      customerName: lead.full_name || '',
      customerPhone: `${lead.country_code || ''}${lead.phone_number || ''}`,
      customerEmail: '',
      customerIdType: 'EID',
      customerIdNumber: '',
      vehicleMakeModel: '',
      modelYear: 0,
      chassisNo: '',
      vehicleColour: '',
      vehicleMileage: 0,
      hasManufacturerWarranty: false,
      manufacturerWarrantyExpiry: '',
      manufacturerWarrantyKm: 0,
      hasManufacturerService: false,
      manufacturerServiceExpiry: '',
      manufacturerServiceKm: 0,
      hasPartExchange: false,
      partExchangeMakeModel: '',
      partExchangeYear: '',
      partExchangeChassis: '',
      partExchangeMileage: 0,
      partExchangeValue: 0,
      notes: '',
      orderDate: new Date().toISOString().split('T')[0],
      salesExecutive: getUserDisplayName(),
      paymentMethod: 'cash',
    });
    
    // Load inventory car if lead has one
    if (lead.inventory_car_id) {
      await loadInventoryCarData();
    }
  };

  // Load invoices for this sales order
  const loadInvoices = async (salesOrderId: string) => {
    setLoadingInvoices(true);
    try {
      const { data, error } = await supabase
        .from('uv_invoices')
        .select('*')
        .eq('sales_order_id', salesOrderId)
        .order('created_at', { ascending: false });
      
      if (error && !error.message?.includes('does not exist')) throw error;
      if (data) {
        setInvoices(data);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Convert Sales Order to Invoice
  const handleConvertToInvoice = async () => {
    if (!existingSalesOrder) {
      alert('Please save the Sales Order first.');
      return;
    }
    
    // Check if there are line items
    if (lineItems.length === 0) {
      alert('Please add at least one line item before creating an invoice.');
      return;
    }
    
    // Check if there's already an active invoice
    const activeInvoice = invoices.find(inv => inv.status !== 'reversed');
    if (activeInvoice) {
      alert(`An active invoice (${activeInvoice.invoice_number}) already exists for this Sales Order.`);
      return;
    }
    
    if (!confirm('Are you sure you want to convert this Sales Order to an Invoice? Line items will be locked.')) {
      return;
    }
    
    setConvertingToInvoice(true);
    try {
      // Call the database function to convert SO to Invoice
      const { data, error } = await supabase
        .rpc('convert_so_to_invoice', {
          p_sales_order_id: existingSalesOrder.id,
          p_created_by: user?.id
        });
      
      if (error) throw error;
      
      // Reload invoices to show the new invoice
      await loadInvoices(existingSalesOrder.id);
      
      // Reload sales order to ensure signing status is preserved
      await loadExistingSalesOrder();
      
      // Switch to invoices tab
      setActiveTab('invoices');
      
      alert('Invoice created successfully!');
    } catch (error: any) {
      console.error('Error converting to invoice:', error);
      if (error.message?.includes('does not exist')) {
        alert('Database table not found. Please run the SQL migration for invoices first.');
      } else if (error.message?.includes('already exists')) {
        alert('An invoice already exists for this Sales Order.');
      } else {
        alert('Error creating invoice: ' + error.message);
      }
    } finally {
      setConvertingToInvoice(false);
    }
  };

  // Generate Invoice PDF
  const handleGenerateInvoicePdf = async (invoiceId: string) => {
    setGeneratingInvoicePdf(invoiceId);
    try {
      const response = await fetch('/api/generate-invoice-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate PDF');
      }

      // Reload invoices to get updated PDF URL
      if (existingSalesOrder) {
        await loadInvoices(existingSalesOrder.id);
      }
    } catch (error: any) {
      console.error('Error generating invoice PDF:', error);
      alert('Error generating invoice PDF: ' + error.message);
    } finally {
      setGeneratingInvoicePdf(null);
    }
  };

  // Send Invoice for DocuSign signing - show modal to select company signer
  const handleSendInvoiceForSigning = (invoice: Invoice) => {
    if (!invoice.pdf_url) {
      alert('Please generate the PDF first before sending for signing.');
      return;
    }

    if (!formData.customerEmail) {
      alert('Please add customer email address before sending for signing.');
      return;
    }

    setSigningInvoice(invoice);
    setInvoiceCompanyEmail('');
    setShowInvoiceSigningModal(true);
  };

  // Confirm Send Invoice for Signing
  const handleConfirmSendInvoiceForSigning = async () => {
    if (!invoiceCompanyEmail || !signingInvoice) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(invoiceCompanyEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    setSendingInvoiceForSigning(signingInvoice.id);
    setShowInvoiceSigningModal(false);

    try {
      const response = await fetch('/api/docusign/send-for-signing-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: signingInvoice.id,
          customerEmail: formData.customerEmail,
          customerName: formData.customerName || 'Customer',
          companySignerEmail: invoiceCompanyEmail,
          pdfUrl: signingInvoice.pdf_url,
          invoiceNumber: signingInvoice.invoice_number
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send for signing');
      }

      // Reload invoices to get updated signing status
      if (existingSalesOrder) {
        await loadInvoices(existingSalesOrder.id);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to send invoice for signing. Please try again.');
    } finally {
      setSendingInvoiceForSigning(null);
      setSigningInvoice(null);
    }
  };

  // Reverse an invoice - show confirmation form
  const handleReverseInvoice = (invoice: Invoice) => {
    setReversingInvoice(invoice);
    setReversalReason('');
  };
  
  // Confirm the invoice reversal
  const confirmReverseInvoice = async () => {
    if (!reversingInvoice || !reversalReason.trim()) return;

    try {
      const { error } = await supabase
        .rpc('reverse_invoice', {
          p_invoice_id: reversingInvoice.id,
          p_reason: reversalReason.trim(),
          p_reversed_by: user?.id
        });

      if (error) throw error;

      // Reload invoices
      if (existingSalesOrder) {
        await loadInvoices(existingSalesOrder.id);
        
        // Reload the sales order to get updated status
        const { data: updatedSO } = await supabase
          .from('uv_sales_orders')
          .select('*')
          .eq('id', existingSalesOrder.id)
          .single();
        
        if (updatedSO) {
          setExistingSalesOrder(updatedSO);
          // Notify parent component of the update
          onSalesOrderUpdated?.(updatedSO);
        }
      }

      // Reload payments (allocations may have been deleted) and SOA balance
      await loadPayments();
      await loadSoaBalance();

      // Close the form
      setReversingInvoice(null);
      setReversalReason('');
    } catch (error: any) {
      console.error('Error reversing invoice:', error);
      alert('Error reversing invoice: ' + error.message);
    }
  };

  // Load payments for this customer (lead)
  const loadPayments = async () => {
    if (!lead.id) return;
    
    setLoadingPayments(true);
    try {
      // Load payments directly from base table
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('uv_payments')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      
      if (paymentsError && !paymentsError.message?.includes('does not exist')) {
        throw paymentsError;
      }
      
      // Load allocations for calculating allocated amounts
      let allocationsMap: Record<string, number> = {};
      // Load refund allocations for calculating refunded amounts
      let refundedMap: Record<string, number> = {};
      const paymentIds = paymentsData?.map(p => p.id) || [];
      
      if (paymentIds.length > 0) {
        // Load payment allocations (to invoices)
        const { data: allocData, error: allocError } = await supabase
          .from('uv_payment_allocations')
          .select(`
            *,
            uv_payments!inner(payment_number),
            uv_invoices!inner(invoice_number)
          `)
          .in('payment_id', paymentIds);
        
        if (!allocError && allocData) {
          // Calculate total allocated per payment
          allocData.forEach(a => {
            const amount = parseFloat(a.amount) || 0;
            allocationsMap[a.payment_id] = (allocationsMap[a.payment_id] || 0) + amount;
          });
          
          setAllocations(allocData.map(a => ({
            id: a.id,
            payment_id: a.payment_id,
            invoice_id: a.invoice_id,
            amount: parseFloat(a.amount) || 0,
            created_at: a.created_at,
            payment_number: a.uv_payments?.payment_number,
            invoice_number: a.uv_invoices?.invoice_number,
          })));
        }
        
        // Load refund allocations (from refunds)
        const { data: refundAllocData, error: refundAllocError } = await supabase
          .from('uv_refund_allocations')
          .select('*')
          .in('payment_id', paymentIds);
        
        if (!refundAllocError && refundAllocData) {
          // Calculate total refunded per payment
          refundAllocData.forEach(ra => {
            const amount = parseFloat(ra.amount) || 0;
            refundedMap[ra.payment_id] = (refundedMap[ra.payment_id] || 0) + amount;
          });
        }
      }
      
      if (paymentsData) {
        setPayments(paymentsData.map(p => {
          const amount = parseFloat(p.amount) || 0;
          const allocatedAmount = allocationsMap[p.id] || 0;
          const refundedAmount = refundedMap[p.id] || 0;
          const availableAmount = amount - allocatedAmount - refundedAmount;
          return {
            ...p,
            amount,
            allocated_amount: allocatedAmount,
            refunded_amount: refundedAmount,
            available_amount: availableAmount,
            unallocated_amount: availableAmount, // Keep for backward compatibility
          };
        }));
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Add a new payment
  const handleAddPayment = async () => {
    if (!lead.id) return;
    if (newPayment.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    setSavingPayment(true);
    try {
      const { data, error } = await supabase
        .from('uv_payments')
        .insert({
          lead_id: lead.id,
          amount: newPayment.amount,
          payment_method: newPayment.payment_method,
          payment_date: newPayment.payment_date,
          reference: newPayment.reference || null,
          bank_name: newPayment.bank_name || null,
          notes: newPayment.notes || null,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Reset form
      setNewPayment({
        amount: 0,
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        reference: '',
        bank_name: '',
        notes: '',
      });
      setShowAddPaymentForm(false);
      
      // Reload payments and SOA balance
      await loadPayments();
      await loadSoaBalance();
      
      alert(`Payment ${data.payment_number} added successfully!`);
    } catch (error: any) {
      console.error('Error adding payment:', error);
      if (error.message?.includes('does not exist')) {
        alert('Database table not found. Please run the SQL migration for payments first.');
      } else {
        alert('Error adding payment: ' + error.message);
      }
    } finally {
      setSavingPayment(false);
    }
  };

  // Allocate payment to invoice
  const handleAllocatePayment = async (paymentId: string, invoiceId: string, amount: number) => {
    try {
      const { error } = await supabase.rpc('allocate_payment_to_invoice', {
        p_payment_id: paymentId,
        p_invoice_id: invoiceId,
        p_amount: amount,
        p_created_by: user?.id,
      });
      
      if (error) throw error;
      
      // Reload data and SOA balance
      await loadPayments();
      await loadSoaBalance();
      if (existingSalesOrder) {
        await loadInvoices(existingSalesOrder.id);
      }
      
      setAllocatingPayment(null);
    } catch (error: any) {
      console.error('Error allocating payment:', error);
      alert('Error allocating payment: ' + error.message);
    }
  };

  // Unallocate payment
  const handleUnallocate = async (allocationId: string) => {
    if (!confirm('Are you sure you want to remove this allocation?')) return;
    
    try {
      const { error } = await supabase.rpc('unallocate_payment', {
        p_allocation_id: allocationId,
      });
      
      if (error) throw error;
      
      // Reload data and SOA balance
      await loadPayments();
      await loadSoaBalance();
      if (existingSalesOrder) {
        await loadInvoices(existingSalesOrder.id);
      }
    } catch (error: any) {
      console.error('Error removing allocation:', error);
      alert('Error removing allocation: ' + error.message);
    }
  };

  // Load adjustments for this customer
  const loadAdjustments = async () => {
    if (!lead.id) return;
    
    try {
      const { data, error } = await supabase
        .from('uv_adjustments')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      
      if (error && !error.message?.includes('does not exist')) throw error;
      if (data) {
        setAdjustments(data.map(a => ({
          ...a,
          amount: parseFloat(a.amount) || 0,
        })));
      }
    } catch (error) {
      console.error('Error loading adjustments:', error);
    }
  };

  // Load SOA balance summary (lightweight - for header)
  const loadSoaBalance = async () => {
    if (!lead.id) return;
    
    try {
      const { data: balanceResult, error: balanceError } = await supabase
        .rpc('get_customer_balance', { p_lead_id: lead.id });
      
      if (!balanceError && balanceResult && balanceResult.length > 0) {
        setSoaBalance({
          total_invoiced: parseFloat(balanceResult[0].total_invoiced) || 0,
          total_paid: parseFloat(balanceResult[0].total_paid) || 0,
          total_credit_notes: parseFloat(balanceResult[0].total_credit_notes) || 0,
          total_refunds: parseFloat(balanceResult[0].total_refunds) || 0,
          current_balance: parseFloat(balanceResult[0].current_balance) || 0,
        });
      }
    } catch (error) {
      console.error('Error loading SOA balance:', error);
    }
  };

  // Load full SOA data (transactions + balance)
  const loadSoaData = async () => {
    if (!lead.id) return;
    
    setLoadingSoa(true);
    try {
      // Get SOA transactions
      const { data: soaResult, error: soaError } = await supabase
        .from('uv_statement_of_account')
        .select('*')
        .eq('lead_id', lead.id)
        .order('transaction_date', { ascending: true });
      
      if (soaError && !soaError.message?.includes('does not exist')) throw soaError;
      if (soaResult) {
        setSoaData(soaResult.map(row => ({
          ...row,
          debit: parseFloat(row.debit) || 0,
          credit: parseFloat(row.credit) || 0,
          running_balance: parseFloat(row.running_balance) || 0,
        })));
      }
      
      // Also refresh balance summary
      await loadSoaBalance();
    } catch (error) {
      console.error('Error loading SOA:', error);
    } finally {
      setLoadingSoa(false);
    }
  };

  // Add credit note to invoice
  const handleAddCreditNote = async (invoiceId: string) => {
    if (newCreditNote.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!newCreditNote.reason.trim()) {
      alert('Please enter a reason');
      return;
    }
    
    // Validate credit note amount doesn't exceed invoice balance
    const targetInvoice = invoices.find(inv => inv.id === invoiceId);
    if (!targetInvoice) {
      alert('Invoice not found');
      return;
    }
    if (newCreditNote.amount > targetInvoice.balance_due) {
      alert(`Credit note amount cannot exceed invoice balance (AED ${formatCurrency(targetInvoice.balance_due)})`);
      return;
    }
    
    setSavingAdjustment(true);
    try {
      const { data, error } = await supabase
        .from('uv_adjustments')
        .insert({
          adjustment_type: 'credit_note',
          lead_id: lead.id,
          invoice_id: invoiceId,
          amount: newCreditNote.amount,
          reason: newCreditNote.reason,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Reset form
      setNewCreditNote({ amount: 0, reason: '' });
      setShowCreditNoteForm(null);
      
      // Reload data and SOA balance
      await loadAdjustments();
      await loadSoaBalance();
      if (existingSalesOrder) {
        await loadInvoices(existingSalesOrder.id);
      }
      
      alert(`Credit Note ${data.adjustment_number} created successfully!`);
    } catch (error: any) {
      console.error('Error creating credit note:', error);
      alert('Error creating credit note: ' + error.message);
    } finally {
      setSavingAdjustment(false);
    }
  };

  // Add refund (linked to a specific payment)
  const handleAddRefund = async () => {
    if (!newRefund.paymentId) {
      alert('Please select a payment to refund from');
      return;
    }
    if (newRefund.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!newRefund.reason.trim()) {
      alert('Please enter a reason');
      return;
    }
    
    // Find the selected payment and validate amount
    const selectedPayment = payments.find(p => p.id === newRefund.paymentId);
    if (!selectedPayment) {
      alert('Selected payment not found');
      return;
    }
    
    const paymentAvailable = selectedPayment.available_amount || 0;
    if (newRefund.amount > paymentAvailable) {
      alert(`Refund amount cannot exceed payment's available balance (AED ${formatCurrency(paymentAvailable)})`);
      return;
    }
    
    setSavingAdjustment(true);
    try {
      // Step 1: Create the refund record
      const { data: refundData, error: refundError } = await supabase
        .from('uv_adjustments')
        .insert({
          adjustment_type: 'refund',
          lead_id: lead.id,
          invoice_id: null, // No longer linking to invoice
          amount: newRefund.amount,
          reason: newRefund.reason,
          refund_method: newRefund.method,
          refund_reference: newRefund.reference || null,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (refundError) throw refundError;
      
      // Step 2: Create the refund allocation (link refund to payment)
      const { error: allocError } = await supabase
        .from('uv_refund_allocations')
        .insert({
          refund_id: refundData.id,
          payment_id: newRefund.paymentId,
          amount: newRefund.amount,
          created_by: user?.id,
        });
      
      if (allocError) {
        console.error('Error creating refund allocation:', allocError);
        // Don't throw - refund was created, just allocation failed
        alert(`Refund ${refundData.adjustment_number} created but failed to link to payment. Please contact support.`);
      }
      
      // Reset form
      setNewRefund({ amount: 0, reason: '', method: 'bank_transfer', reference: '', paymentId: '' });
      setShowRefundForm(false);
      
      // Reload data and SOA balance
      await loadAdjustments();
      await loadPayments(); // Reload to update available_amount
      await loadSoaBalance();
      if (existingSalesOrder) {
        await loadInvoices(existingSalesOrder.id);
      }
      
      alert(`Refund ${refundData.adjustment_number} created and linked to ${selectedPayment.payment_number}!`);
    } catch (error: any) {
      console.error('Error creating refund:', error);
      alert('Error creating refund: ' + error.message);
    } finally {
      setSavingAdjustment(false);
    }
  };

  // View and download PDF - opens in new tab and triggers download
  const openAndDownloadPdf = async (url: string, filename: string) => {
    // Open in new tab
    window.open(url, '_blank');
    
    // Trigger download
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // View Receipt - generates if needed, then opens and downloads
  const handleViewReceipt = async (payment: Payment) => {
    setGeneratingReceiptId(payment.id);
    try {
      let pdfUrl = payment.pdf_url;
      
      // Generate if not exists
      if (!pdfUrl) {
        const response = await fetch('/api/generate-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: payment.id })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to generate receipt');
        }

        const result = await response.json();
        pdfUrl = result.pdfUrl;
        
        // Reload payments to update state
        loadPayments();
      }
      
      // Open and download
      if (pdfUrl) {
        await openAndDownloadPdf(pdfUrl, `${payment.payment_number}.pdf`);
      }
    } catch (error: any) {
      console.error('Error viewing receipt:', error);
      alert('Error: ' + error.message);
    } finally {
      setGeneratingReceiptId(null);
    }
  };

  // Send Payment Receipt via WhatsApp webhook
  const handleSendWhatsApp = async (payment: Payment) => {
    // Check if PDF exists
    if (!payment.pdf_url) {
      alert('Please generate the receipt first before sending via WhatsApp.');
      return;
    }

    setSendingWhatsAppId(payment.id);
    try {
      // Prepare webhook payload
      const payload = {
        payment_number: payment.payment_number,
        payment_amount: payment.amount,
        payment_method: payment.payment_method,
        payment_date: payment.payment_date,
        pdf_url: payment.pdf_url,
        customer_name: lead.full_name,
        customer_phone: lead.phone_number,
        customer_country_code: lead.country_code || '+971',
      };

      // Send to webhook
      const response = await fetch('/api/webhooks/send-payment-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send WhatsApp');
      }

      alert('Payment receipt sent via WhatsApp successfully!');
    } catch (error: any) {
      console.error('Error sending WhatsApp:', error);
      alert('Error sending WhatsApp: ' + error.message);
    } finally {
      setSendingWhatsAppId(null);
    }
  };

  // View Credit Note - generates if needed, then opens and downloads
  const handleViewCreditNote = async (adjustment: Adjustment) => {
    setGeneratingCreditNoteId(adjustment.id);
    try {
      let pdfUrl = adjustment.pdf_url;
      
      // Generate if not exists
      if (!pdfUrl) {
        const response = await fetch('/api/generate-credit-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adjustmentId: adjustment.id })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to generate credit note');
        }

        const result = await response.json();
        pdfUrl = result.pdfUrl;
        
        // Reload adjustments to update state
        loadAdjustments();
      }
      
      // Open and download
      if (pdfUrl) {
        await openAndDownloadPdf(pdfUrl, `${adjustment.adjustment_number}.pdf`);
      }
    } catch (error: any) {
      console.error('Error viewing credit note:', error);
      alert('Error: ' + error.message);
    } finally {
      setGeneratingCreditNoteId(null);
    }
  };

  // View Refund - generates if needed, then opens and downloads
  const handleViewRefund = async (adjustment: Adjustment) => {
    setGeneratingRefundId(adjustment.id);
    try {
      let pdfUrl = adjustment.pdf_url;
      
      // Generate if not exists
      if (!pdfUrl) {
        const response = await fetch('/api/generate-refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adjustmentId: adjustment.id })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to generate refund');
        }

        const result = await response.json();
        pdfUrl = result.pdfUrl;
        
        // Reload adjustments to update state
        loadAdjustments();
      }
      
      // Open and download
      if (pdfUrl) {
        await openAndDownloadPdf(pdfUrl, `${adjustment.adjustment_number}.pdf`);
      }
    } catch (error: any) {
      console.error('Error viewing refund:', error);
      alert('Error: ' + error.message);
    } finally {
      setGeneratingRefundId(null);
    }
  };

  // Parse warranty string from inventory
  // Parse warranty string from inventory - only match DEALER or MANUFACTURER warranty, not SilberArrows
  const parseWarrantyString = (warrantyStr: string | null | undefined) => {
    if (!warrantyStr) return { hasWarranty: false, expiry: '', km: 0 };
    
    const lowerStr = warrantyStr.toLowerCase();
    // Only mark as having manufacturer warranty if it's explicitly "dealer" or "manufacturer" warranty
    // SilberArrows extended warranty should NOT trigger this checkbox
    const isManufacturerOrDealer = lowerStr.includes('dealer') || lowerStr.includes('manufacturer');
    
    if (!isManufacturerOrDealer) {
      return { hasWarranty: false, expiry: '', km: 0 };
    }
    
    // Parse format: "Dealer warranty until 2025-10-08 or 100000 km"
    const dateMatch = warrantyStr.match(/(\d{4}-\d{2}-\d{2})/);
    const kmMatch = warrantyStr.match(/(\d+)\s*km/i);
    
    return {
      hasWarranty: true,
      expiry: dateMatch ? dateMatch[1] : '',
      km: kmMatch ? parseInt(kmMatch[1]) : 0
    };
  };

  // Parse service string from inventory - only match DEALER or MANUFACTURER service, not SilberArrows
  const parseServiceString = (serviceStr: string | null | undefined) => {
    if (!serviceStr) return { hasService: false, expiry: '', km: 0 };
    
    const lowerStr = serviceStr.toLowerCase();
    // Only mark as having manufacturer service if it's explicitly "dealer" or "manufacturer" service
    // SilberArrows ServiceCare should NOT trigger this checkbox
    const isManufacturerOrDealer = lowerStr.includes('dealer') || lowerStr.includes('manufacturer');
    
    if (!isManufacturerOrDealer) {
      return { hasService: false, expiry: '', km: 0 };
    }
    
    const dateMatch = serviceStr.match(/(\d{4}-\d{2}-\d{2})/);
    const kmMatch = serviceStr.match(/(\d+)\s*km/i);
    
    return {
      hasService: true,
      expiry: dateMatch ? dateMatch[1] : '',
      km: kmMatch ? parseInt(kmMatch[1]) : 0
    };
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ===== BANK FINANCE FUNCTIONS =====
  const loadBfApplications = async (salesOrderId: string) => {
    setLoadingBankFinance(true);
    try {
      const { data, error } = await supabase
        .from('uv_bank_finance_applications')
        .select('*')
        .eq('sales_order_id', salesOrderId)
        .order('application_number', { ascending: true });
      
      if (error) throw error;
      setBfApplications(data || []);
    } catch (error) {
      console.error('Error loading bank finance applications:', error);
    } finally {
      setLoadingBankFinance(false);
    }
  };

  const loadBfAppDetails = async (appId: string) => {
    try {
      // Load documents
      const { data: docs, error: docsError } = await supabase
        .from('uv_bank_finance_documents')
        .select('*')
        .eq('application_id', appId)
        .order('uploaded_at', { ascending: false });
      
      if (!docsError) setBfDocuments(docs || []);
      
      // Load activity
      const { data: activity, error: actError } = await supabase
        .from('uv_bank_finance_activity')
        .select('*')
        .eq('application_id', appId)
        .order('created_at', { ascending: false });
      
      if (!actError) setBfActivity(activity || []);
    } catch (error) {
      console.error('Error loading bank finance details:', error);
    }
  };

  const handleCreateBfApplication = async () => {
    if (!existingSalesOrder) return;
    
    setSavingBfApp(true);
    try {
      // Calculate amounts
      const amountToFinance = newBfApp.actual_vehicle_price - newBfApp.actual_customer_down_payment;
      const bankShownDownPayment = newBfApp.bank_quotation_price * (newBfApp.bank_required_down_pct / 100);
      const bankFinanceAmount = newBfApp.bank_quotation_price - bankShownDownPayment;
      const appliedEmi = newBfApp.applied_tenure_months > 0 ? bankFinanceAmount / newBfApp.applied_tenure_months : 0;

      // Get next application number
      const { data: nextNum } = await supabase.rpc('get_next_bf_application_number', {
        p_sales_order_id: existingSalesOrder.id
      });

      const { data, error } = await supabase
        .from('uv_bank_finance_applications')
        .insert({
          sales_order_id: existingSalesOrder.id,
          lead_id: lead.id,
          application_number: nextNum || 1,
          status: 'documents_pending',
          bank_name: newBfApp.bank_name,
          actual_vehicle_price: newBfApp.actual_vehicle_price,
          actual_customer_down_payment: newBfApp.actual_customer_down_payment,
          amount_to_finance: amountToFinance,
          bank_required_down_pct: newBfApp.bank_required_down_pct,
          bank_quotation_price: newBfApp.bank_quotation_price,
          bank_shown_down_payment: Math.round(bankShownDownPayment),
          bank_finance_amount: Math.round(bankFinanceAmount),
          applied_interest_rate: newBfApp.applied_interest_rate,
          applied_tenure_months: newBfApp.applied_tenure_months,
          applied_emi: Math.round(appliedEmi),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add system activity
      await supabase.from('uv_bank_finance_activity').insert({
        application_id: data.id,
        activity_type: 'system',
        note: `Application created for ${newBfApp.bank_name}`,
        created_by: user?.id,
      });

      setShowNewBfAppForm(false);
      await loadBfApplications(existingSalesOrder.id);
    } catch (error: any) {
      console.error('Error creating bank finance application:', error);
      alert('Error creating application: ' + error.message);
    } finally {
      setSavingBfApp(false);
    }
  };

  const handleBfStatusChange = async (newStatus: string) => {
    if (!selectedBfApp) return;
    
    setSavingBfApp(true);
    try {
      const { error } = await supabase
        .from('uv_bank_finance_applications')
        .update({ status: newStatus })
        .eq('id', selectedBfApp.id);

      if (error) throw error;

      // Update local state
      setSelectedBfApp(prev => prev ? { ...prev, status: newStatus as any } : null);
      await loadBfAppDetails(selectedBfApp.id);
      if (existingSalesOrder) await loadBfApplications(existingSalesOrder.id);
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert('Error updating status: ' + error.message);
    } finally {
      setSavingBfApp(false);
    }
  };

  const handleBfApproval = async () => {
    if (!selectedBfApp) return;
    
    setSavingBfApp(true);
    try {
      const { error } = await supabase
        .from('uv_bank_finance_applications')
        .update({
          status: 'approved',
          bank_reference: approvalForm.bank_reference,
          approved_amount: approvalForm.approved_amount,
          approved_down_payment: approvalForm.approved_down_payment,
          approved_interest_rate: approvalForm.approved_interest_rate,
          approved_tenure_months: approvalForm.approved_tenure_months,
          approved_emi: approvalForm.approved_emi,
          first_emi_date: approvalForm.first_emi_date || null,
          last_emi_date: approvalForm.last_emi_date || null,
        })
        .eq('id', selectedBfApp.id);

      if (error) throw error;

      setShowApprovalModal(false);
      setSelectedBfApp(prev => prev ? { ...prev, status: 'approved', ...approvalForm } : null);
      await loadBfAppDetails(selectedBfApp.id);
      if (existingSalesOrder) await loadBfApplications(existingSalesOrder.id);
    } catch (error: any) {
      console.error('Error approving application:', error);
      alert('Error: ' + error.message);
    } finally {
      setSavingBfApp(false);
    }
  };

  const handleBfRejection = async () => {
    if (!selectedBfApp) return;
    
    setSavingBfApp(true);
    try {
      const { error } = await supabase
        .from('uv_bank_finance_applications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
        })
        .eq('id', selectedBfApp.id);

      if (error) throw error;

      setShowRejectionModal(false);
      setRejectionReason('');
      setSelectedBfApp(prev => prev ? { ...prev, status: 'rejected', rejection_reason: rejectionReason } : null);
      await loadBfAppDetails(selectedBfApp.id);
      if (existingSalesOrder) await loadBfApplications(existingSalesOrder.id);
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      alert('Error: ' + error.message);
    } finally {
      setSavingBfApp(false);
    }
  };

  const handleBfDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: 'customer' | 'bank', docType: string, docName: string) => {
    if (!selectedBfApp || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploadingDoc(docType);
    
    try {
      // Upload to storage
      const fileName = `bank-finance/${selectedBfApp.id}/${docType}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
      
      // Save document record
      const { error: docError } = await supabase
        .from('uv_bank_finance_documents')
        .insert({
          application_id: selectedBfApp.id,
          category,
          document_type: docType,
          document_name: docName,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user?.id,
        });

      if (docError) throw docError;

      // Log activity
      await supabase.from('uv_bank_finance_activity').insert({
        application_id: selectedBfApp.id,
        activity_type: 'document_upload',
        note: `Uploaded: ${docName}`,
        created_by: user?.id,
      });

      await loadBfAppDetails(selectedBfApp.id);
    } catch (error: any) {
      console.error('Error uploading document:', error);
      alert('Error uploading: ' + error.message);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handlePostBfNote = async () => {
    if (!selectedBfApp || !newBfNote.trim()) return;
    
    setPostingNote(true);
    try {
      const { error } = await supabase
        .from('uv_bank_finance_activity')
        .insert({
          application_id: selectedBfApp.id,
          activity_type: 'note',
          note: newBfNote.trim(),
          created_by: user?.id,
        });

      if (error) throw error;
      
      setNewBfNote('');
      await loadBfAppDetails(selectedBfApp.id);
    } catch (error: any) {
      console.error('Error posting note:', error);
      alert('Error: ' + error.message);
    } finally {
      setPostingNote(false);
    }
  };

  const [downloadingAllDocs, setDownloadingAllDocs] = useState(false);

  const handleGenerateBankQuotation = async () => {
    if (!selectedBfApp) return;
    
    setGeneratingBankQuotation(true);
    try {
      const response = await fetch('/api/generate-bank-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: selectedBfApp.id }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate quotation');
      }

      const result = await response.json();
      
      // Update local state
      setSelectedBfApp(prev => prev ? { 
        ...prev, 
        bank_quotation_pdf_url: result.pdfUrl,
        bank_quotation_number: result.quotationNumber,
      } : null);

      // Force download PDF
      const pdfResponse = await fetch(result.pdfUrl);
      const blob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bank_Quotation_${result.quotationNumber || 'Document'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error generating bank quotation:', error);
      alert('Error: ' + error.message);
    } finally {
      setGeneratingBankQuotation(false);
    }
  };

  const handleDownloadAllDocuments = async () => {
    if (!selectedBfApp) return;
    
    setDownloadingAllDocs(true);
    try {
      const response = await fetch('/api/download-bank-finance-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: selectedBfApp.id }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to download documents');
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'BankFinance_Documents.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading documents:', error);
      alert('Error: ' + error.message);
    } finally {
      setDownloadingAllDocs(false);
    }
  };

  // Load bank finance when tab is selected
  useEffect(() => {
    if (isOpen && existingSalesOrder?.id && activeTab === 'bank_finance') {
      loadBfApplications(existingSalesOrder.id);
    }
  }, [isOpen, existingSalesOrder?.id, activeTab]);

  // Validation helper
  const getMissingFields = () => {
    const missing: string[] = [];
    if (!formData.customerName?.trim()) missing.push('Customer Name');
    if (!formData.customerPhone?.trim()) missing.push('Customer Phone');
    if (!formData.customerEmail?.trim()) missing.push('Customer Email');
    if (!formData.customerIdNumber?.trim()) missing.push('Customer ID Number');
    if (!formData.vehicleMakeModel?.trim()) missing.push('Vehicle Make & Model');
    if (!formData.modelYear) missing.push('Model Year');
    if (!formData.chassisNo?.trim()) missing.push('Chassis Number');
    if (lineItems.length === 0) missing.push('Line Items');
    return missing;
  };
  
  const missingFields = getMissingFields();
  const canSave = missingFields.length === 0;

  const handleSave = async () => {
    // Validate all required fields
    if (!canSave) {
      return;
    }
    
    setSaving(true);
    try {
      const salesOrderData = {
        lead_id: lead.id,
        car_id: lead.inventory_car_id || null,
        order_date: formData.orderDate,
        sales_executive: formData.salesExecutive,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_email: formData.customerEmail,
        customer_id_type: formData.customerIdType,
        customer_id_number: formData.customerIdNumber,
        vehicle_make_model: formData.vehicleMakeModel,
        model_year: formData.modelYear,
        chassis_no: formData.chassisNo,
        vehicle_colour: formData.vehicleColour,
        vehicle_mileage: formData.vehicleMileage,
        has_manufacturer_warranty: formData.hasManufacturerWarranty,
        manufacturer_warranty_expiry: formData.manufacturerWarrantyExpiry || null,
        manufacturer_warranty_km: formData.manufacturerWarrantyKm || null,
        has_manufacturer_service: formData.hasManufacturerService,
        manufacturer_service_expiry: formData.manufacturerServiceExpiry || null,
        manufacturer_service_km: formData.manufacturerServiceKm || null,
        has_part_exchange: formData.hasPartExchange,
        part_exchange_make_model: formData.partExchangeMakeModel || null,
        part_exchange_year: formData.partExchangeYear || null,
        part_exchange_chassis: formData.partExchangeChassis || null,
        part_exchange_mileage: formData.partExchangeMileage || null,
        part_exchange_value: formData.partExchangeValue || 0,
        subtotal: subtotal,
        total_amount: total,
        notes: formData.notes || null,
        payment_method: formData.paymentMethod,
        created_by: user?.id,
      };

      let salesOrderId: string;
      let savedSalesOrder: SalesOrder;
      const isUpdate = !!existingSalesOrder;

      if (existingSalesOrder) {
        // Update existing Sales Order - reset signing status since we're regenerating
        const { data, error } = await supabase
          .from('uv_sales_orders')
          .update({
            ...salesOrderData,
            // Reset signing status when updating (PDF will be regenerated)
            signing_status: 'pending',
            docusign_envelope_id: null,
            signed_pdf_url: null,
          })
          .eq('id', existingSalesOrder.id)
          .select()
          .single();
        
        if (error) throw error;
        savedSalesOrder = data;
        salesOrderId = data.id;
      } else {
        // Create new Sales Order
        const { data, error } = await supabase
          .from('uv_sales_orders')
          .insert(salesOrderData)
          .select()
          .single();
        
        if (error) throw error;
        savedSalesOrder = data;
        salesOrderId = data.id;
        setCreatingNewSO(false);
        // Add to the list of all SOs
        setAllSalesOrders(prev => [data, ...prev]);
      }

      // Save line items first
      await saveLineItems(salesOrderId);
      
      // Now generate PDF (required step)
      const pdfResponse = await fetch('/api/generate-sales-order-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesOrderId })
      });
      
      if (!pdfResponse.ok) {
        const pdfError = await pdfResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('PDF Generation Error:', pdfError);
        throw new Error(pdfError.details || pdfError.error || 'Failed to generate PDF');
      }
      
      const pdfResult = await pdfResponse.json();
      
      // Update local state with PDF URL
      setPdfUrl(pdfResult.pdfUrl);
      setSigningStatus('pending');
      setSignedPdfUrl(null);
      setDocusignEnvelopeId(null);
      
      // Update the saved sales order with PDF URL
      savedSalesOrder = { ...savedSalesOrder, pdf_url: pdfResult.pdfUrl, signing_status: 'pending' };
      setExistingSalesOrder(savedSalesOrder);
      
      // Call appropriate callback
      if (isUpdate) {
        onSalesOrderUpdated?.(savedSalesOrder);
      } else {
        onSalesOrderCreated?.(savedSalesOrder);
      }
      
      // Show success state briefly
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      
    } catch (error: any) {
      console.error('Error saving sales order:', error);
      if (error.message?.includes('does not exist')) {
        alert('Database table not found. Please run the SQL migration first.');
      } else if (error.message?.includes('PDF')) {
        alert(`Sales Order saved but PDF generation failed: ${error.message}`);
      } else {
        alert('Error saving sales order. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Save line items to database
  const saveLineItems = async (salesOrderId: string) => {
    if (!salesOrderId) {
      console.error('saveLineItems: No salesOrderId provided');
      return;
    }
    
    console.log('saveLineItems called with:', { salesOrderId, lineItemsCount: lineItems.length });
    
    try {
      // Delete existing line items for this sales order
      const { error: deleteError } = await supabase
        .from('uv_sales_order_lines')
        .delete()
        .eq('sales_order_id', salesOrderId);
      
      if (deleteError) {
        console.error('Error deleting existing line items:', deleteError);
      }
      
      // Insert new line items
      if (lineItems.length > 0) {
        const lineItemsToInsert = lineItems.map((item, index) => ({
          sales_order_id: salesOrderId,
          line_type: item.line_type || 'other',
          description: item.description || '',
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          line_total: Number(item.line_total) || 0,
          sort_order: index + 1
        }));
        
        console.log('Inserting line items:', JSON.stringify(lineItemsToInsert, null, 2));
        
        const { data: insertedItems, error } = await supabase
          .from('uv_sales_order_lines')
          .insert(lineItemsToInsert)
          .select();
        
        if (error) {
          console.error('Supabase insert error:', error);
          throw error;
        }
        
        // Update local state with the new IDs from database
        if (insertedItems) {
          setLineItems(insertedItems.map(item => ({
            id: item.id,
            line_type: item.line_type,
            description: item.description,
            quantity: item.quantity,
            unit_price: parseFloat(item.unit_price) || 0,
            line_total: parseFloat(item.line_total) || 0,
            sort_order: item.sort_order
          })));
        }
      }
    } catch (error: any) {
      console.error('Error saving line items:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error hint:', error?.hint);
      console.error('Error details:', error?.details);
      // Don't throw - line items table might not exist yet
      if (!error.message?.includes('does not exist')) {
        throw error;
      }
    }
  };

  if (!isOpen) return null;

  // Show loading screen while initial data loads
  if (initialLoading) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300" />
        <div className="relative flex flex-col items-center gap-4 animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin text-white/70" />
          <p className="text-sm text-white/50">Loading...</p>
        </div>
      </div>,
      document.body
    );
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-5xl h-[85vh] bg-zinc-900/95 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-start justify-between">
            {/* Left: Customer Info */}
            <div>
              {/* Customer Name & CIN - Primary */}
              <h2 className="text-xl font-bold text-white">
                {lead.full_name}
              </h2>
              <p className="text-sm text-white/60 mt-0.5">
                {lead.customer_number || 'No Customer ID'} • {lead.phone_number}
              </p>
              {/* Sales Order Info - Secondary */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-white/40">
                  {existingSalesOrder ? `SO: ${existingSalesOrder.order_number}` : 'New Sales Order'}
                </span>
                {existingSalesOrder && (
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    existingSalesOrder.status === 'draft' ? 'bg-blue-500/20 text-blue-400' :
                    existingSalesOrder.status === 'invoiced' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {existingSalesOrder.status === 'draft' ? 'Draft' : 
                     existingSalesOrder.status === 'invoiced' ? 'Invoiced' : 'Lost'}
                  </span>
                )}
              </div>
            </div>
            
            {/* Right: Invoice Status Strip */}
            {(() => {
              // Use loaded invoice data if available, otherwise use initial status from hook
              const hasInvoiceData = invoices.length > 0;
              const hasInitialStatus = initialAccountingStatus?.invoiceNumber;
              
              if (!hasInvoiceData && !hasInitialStatus) return null;
              
              // Only show status strip if there are active (non-reversed) invoices
              const activeInvoices = invoices.filter(inv => inv.status !== 'reversed');
              if (hasInvoiceData && activeInvoices.length === 0) return null;
              
              const activeInvoice = activeInvoices[0] || invoices[0];
              
              // Use invoice-level data (now includes refund_total in balance_due calculation)
              const totalInvoiced = hasInvoiceData 
                ? invoices.filter(i => i.status !== 'reversed').reduce((sum, i) => sum + i.total_amount, 0)
                : (initialAccountingStatus?.totalAmount || 0);
              const totalPaid = hasInvoiceData 
                ? invoices.filter(i => i.status !== 'reversed').reduce((sum, i) => sum + (i.paid_amount || 0), 0)
                : (initialAccountingStatus?.paidAmount || 0);
              // Invoice balance_due now includes: total - credit_notes - paid + refunds
              const totalBalance = hasInvoiceData 
                ? invoices.filter(i => i.status !== 'reversed').reduce((sum, i) => sum + (i.balance_due || 0), 0)
                : (initialAccountingStatus?.balanceDue || 0);
              const invoiceNumber = activeInvoice?.invoice_number || initialAccountingStatus?.invoiceNumber || '-';
              
              return (
                <div className="flex items-center px-4 py-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-center w-24">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Invoice</p>
                    <p className="text-sm font-semibold text-white">{invoiceNumber}</p>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="text-center w-24">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Amount</p>
                    <p className="text-sm font-semibold text-white">{totalInvoiced.toLocaleString()}</p>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="text-center w-24">
                    <p className="text-[10px] text-green-400/70 uppercase tracking-wider mb-0.5">Paid</p>
                    <p className="text-sm font-semibold text-green-400">{totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="text-center w-24">
                    <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${totalBalance === 0 ? 'text-green-400/70' : 'text-orange-400/70'}`}>Balance</p>
                    <p className={`text-sm font-semibold ${totalBalance > 0 ? 'text-orange-400' : totalBalance < 0 ? 'text-blue-400' : 'text-green-400'}`}>
                      {totalBalance > 0 ? totalBalance.toLocaleString() : totalBalance < 0 ? `${Math.abs(totalBalance).toLocaleString()} CR` : 'Paid ✓'}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10">
          <div className="flex">
            {[...baseTabs, ...(formData.paymentMethod === 'bank_finance' ? [bankFinanceTab] : [])].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors relative
                  ${activeTab === tab.key 
                    ? 'text-white' 
                    : 'text-white/30 hover:text-white/50'}
                `}
              >
                <span className={activeTab === tab.key ? 'text-white/60' : 'text-white/20'}>
                  {tab.icon}
                </span>
                {tab.label}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-white rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>


        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'sales_order' && (
                <div className="space-y-4">
                  {/* Form content - disabled when locked OR user lacks permission */}
                  <fieldset disabled={isLocked || isFormReadOnly} className={`space-y-6 ${isLocked || isFormReadOnly ? 'opacity-60' : ''}`} style={{ border: 'none', padding: 0, margin: 0 }}>
                  {/* Customer Details */}
                  <Section title="Customer Details">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Customer Name">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.customerName}
                          onChange={(e) => handleInputChange('customerName', e.target.value)}
                          placeholder="Full name"
                        />
                      </Field>
                      <Field label="Phone Number">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.customerPhone}
                          onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                          placeholder="+971..."
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Email Address">
                        <input
                          type="email"
                          className={inputClass}
                          value={formData.customerEmail}
                          onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                          placeholder="email@example.com"
                        />
                      </Field>
                      <Field label="ID Type">
                        <select
                          className={selectClass}
                          value={formData.customerIdType}
                          onChange={(e) => handleInputChange('customerIdType', e.target.value)}
                        >
                          <option value="EID">Emirates ID</option>
                          <option value="Passport">Passport</option>
                        </select>
                      </Field>
                      <Field label="ID Number">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.customerIdNumber}
                          onChange={(e) => handleInputChange('customerIdNumber', e.target.value)}
                          placeholder="784-XXXX-XXXXXXX-X"
                        />
                      </Field>
                    </div>
                  </Section>

                  {/* Vehicle Details */}
                  <Section title="Vehicle Details">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Make & Model">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.vehicleMakeModel}
                          onChange={(e) => handleInputChange('vehicleMakeModel', e.target.value)}
                          placeholder="Mercedes-Benz C300"
                        />
                      </Field>
                      <Field label="Model Year">
                        <input
                          type="number"
                          className={inputClass}
                          value={formData.modelYear || ''}
                          onChange={(e) => handleInputChange('modelYear', parseInt(e.target.value) || 0)}
                          placeholder="2023"
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Chassis No. (VIN)">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.chassisNo}
                          onChange={(e) => handleInputChange('chassisNo', e.target.value)}
                          placeholder="WDD..."
                        />
                      </Field>
                      <Field label="Exterior Colour">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.vehicleColour}
                          onChange={(e) => handleInputChange('vehicleColour', e.target.value)}
                          placeholder="Obsidian Black"
                        />
                      </Field>
                      <Field label="Mileage (km)">
                        <input
                          type="number"
                          className={inputClass}
                          value={formData.vehicleMileage || ''}
                          onChange={(e) => handleInputChange('vehicleMileage', parseInt(e.target.value) || 0)}
                          placeholder="25000"
                        />
                      </Field>
                    </div>
                  </Section>

                  {/* Manufacturer Warranty */}
                  <Section title="Manufacturer Warranty">
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="hasManufacturerWarranty"
                        checked={formData.hasManufacturerWarranty}
                        onChange={(e) => handleInputChange('hasManufacturerWarranty', e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-black text-blue-500 focus:ring-blue-500/30"
                      />
                      <label htmlFor="hasManufacturerWarranty" className="text-sm text-white/70">
                        Vehicle has manufacturer warranty
                      </label>
                    </div>
                    {formData.hasManufacturerWarranty && (
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Warranty Expiry Date">
                          <input
                            type="date"
                            className={inputClass}
                            value={formData.manufacturerWarrantyExpiry}
                            onChange={(e) => handleInputChange('manufacturerWarrantyExpiry', e.target.value)}
                          />
                        </Field>
                        <Field label="Warranty Expiry Mileage (km)">
                          <input
                            type="number"
                            className={inputClass}
                            value={formData.manufacturerWarrantyKm || ''}
                            onChange={(e) => handleInputChange('manufacturerWarrantyKm', parseInt(e.target.value) || 0)}
                            placeholder="100000"
                          />
                        </Field>
                      </div>
                    )}
                  </Section>

                  {/* Manufacturer Service */}
                  <Section title="Manufacturer Service Package">
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="hasManufacturerService"
                        checked={formData.hasManufacturerService}
                        onChange={(e) => handleInputChange('hasManufacturerService', e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-black text-blue-500 focus:ring-blue-500/30"
                      />
                      <label htmlFor="hasManufacturerService" className="text-sm text-white/70">
                        Vehicle has manufacturer service package
                      </label>
                    </div>
                    {formData.hasManufacturerService && (
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Service Expiry Date">
                          <input
                            type="date"
                            className={inputClass}
                            value={formData.manufacturerServiceExpiry}
                            onChange={(e) => handleInputChange('manufacturerServiceExpiry', e.target.value)}
                          />
                        </Field>
                        <Field label="Service Expiry Mileage (km)">
                          <input
                            type="number"
                            className={inputClass}
                            value={formData.manufacturerServiceKm || ''}
                            onChange={(e) => handleInputChange('manufacturerServiceKm', parseInt(e.target.value) || 0)}
                            placeholder="60000"
                          />
                        </Field>
                      </div>
                    )}
                  </Section>

                  {/* Part Exchange */}
                  <Section title="Part Exchange" collapsible defaultOpen={formData.hasPartExchange}>
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="hasPartExchange"
                        checked={formData.hasPartExchange}
                        onChange={(e) => handleInputChange('hasPartExchange', e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-black text-blue-500 focus:ring-blue-500/30"
                      />
                      <label htmlFor="hasPartExchange" className="text-sm text-white/70">
                        Customer has part exchange vehicle
                      </label>
                    </div>
                    {formData.hasPartExchange && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Make & Model">
                            <input
                              type="text"
                              className={inputClass}
                              value={formData.partExchangeMakeModel}
                              onChange={(e) => handleInputChange('partExchangeMakeModel', e.target.value)}
                              placeholder="BMW 320i"
                            />
                          </Field>
                          <Field label="Year">
                            <input
                              type="text"
                              className={inputClass}
                              value={formData.partExchangeYear}
                              onChange={(e) => handleInputChange('partExchangeYear', e.target.value)}
                              placeholder="2020"
                            />
                          </Field>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <Field label="Chassis No. (VIN)">
                            <input
                              type="text"
                              className={inputClass}
                              value={formData.partExchangeChassis}
                              onChange={(e) => handleInputChange('partExchangeChassis', e.target.value)}
                              placeholder="WBA..."
                            />
                          </Field>
                          <Field label="Mileage (km)">
                            <input
                              type="number"
                              className={inputClass}
                              value={formData.partExchangeMileage || ''}
                              onChange={(e) => handleInputChange('partExchangeMileage', parseInt(e.target.value) || 0)}
                              placeholder="45000"
                            />
                          </Field>
                          <Field label="Trade-in Value (AED)">
                            <input
                              type="number"
                              className={inputClass}
                              value={formData.partExchangeValue || ''}
                              onChange={(e) => handleInputChange('partExchangeValue', parseFloat(e.target.value) || 0)}
                              placeholder="120000"
                            />
                          </Field>
                        </div>
                      </>
                    )}
                  </Section>

                  {/* Payment Method Toggle */}
                  <div className="bg-gradient-to-r from-white/5 to-white/10 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Payment Method</h3>
                        <p className="text-xs text-white/50 mt-0.5">How will the customer pay?</p>
                      </div>
                      <div className="flex bg-black rounded-lg p-1 gap-1">
                        <button
                          type="button"
                          onClick={() => handleInputChange('paymentMethod', 'cash')}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            formData.paymentMethod === 'cash'
                              ? 'bg-gradient-to-r from-gray-200 via-white to-gray-200 text-black shadow-lg'
                              : 'text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('paymentMethod', 'bank_finance')}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            formData.paymentMethod === 'bank_finance'
                              ? 'bg-gradient-to-r from-gray-200 via-white to-gray-200 text-black shadow-lg'
                              : 'text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          Bank Finance
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* LINE ITEMS SECTION */}
                  <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Line Items</h3>
                      {canEdit && (
                      <button
                        onClick={addLineItem}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100 rounded-lg transition-all shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Line
                      </button>
                      )}
                    </div>
                    <div className="p-4">
                      {lineItems.length === 0 ? (
                        <div className="text-center py-8 text-white/40">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm mb-3">No line items yet</p>
                          {canEdit && (
                          <button
                            onClick={addLineItem}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100 rounded-lg transition-all shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Add First Line Item
                          </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-white/50 uppercase tracking-wide px-2">
                            <div className="col-span-3">Type</div>
                            <div className="col-span-4">Description</div>
                            <div className="col-span-1 text-center">Qty</div>
                            <div className="col-span-2 text-right">Unit Price</div>
                            <div className="col-span-1 text-right">Total</div>
                            <div className="col-span-1"></div>
                          </div>
                          
                          {/* Line Items */}
                          {lineItems.map((item) => (
                            <div 
                              key={item.id}
                              className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${
                                deductionTypes.includes(item.line_type)
                                  ? 'bg-red-500/10 border border-red-500/20'
                                  : 'bg-white/5 border border-white/10'
                              }`}
                            >
                              <div className="col-span-3">
                                <select
                                  className={`${selectClass} text-xs py-1.5`}
                                  value={item.line_type}
                                  onChange={(e) => updateLineItem(item.id, 'line_type', e.target.value)}
                                >
                                  {lineTypes.map(lt => (
                                    <option key={lt.value} value={lt.value}>{lt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-span-4">
                                <input
                                  type="text"
                                  className={`${inputClass} text-xs py-1.5`}
                                  value={item.description}
                                  onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                                  placeholder="Description"
                                />
                              </div>
                              <div className="col-span-1">
                                <input
                                  type="number"
                                  className={`${inputClass} text-xs py-1.5 text-center`}
                                  value={item.quantity}
                                  onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                  min="1"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  className={`${inputClass} text-xs py-1.5 text-right`}
                                  value={item.unit_price || ''}
                                  onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                />
                              </div>
                              <div className={`col-span-1 text-right text-sm font-medium ${
                                deductionTypes.includes(item.line_type) ? 'text-red-400' : 'text-white'
                              }`}>
                                {deductionTypes.includes(item.line_type) && item.line_total !== 0 ? '-' : ''}
                                {formatCurrency(Math.abs(item.line_total))}
                              </div>
                              <div className="col-span-1 flex justify-end">
                                {canEdit && (
                                <button
                                  onClick={() => removeLineItem(item.id)}
                                  className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {/* Totals */}
                          <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-white/60">Subtotal</span>
                              <span className="text-white font-medium">AED {formatCurrency(subtotal)}</span>
                            </div>
                            {discountValue > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-red-400">Discount</span>
                                <span className="text-red-400 font-medium">- AED {formatCurrency(discountValue)}</span>
                              </div>
                            )}
                            {partExchangeValue > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-red-400">Part Exchange</span>
                                <span className="text-red-400 font-medium">- AED {formatCurrency(partExchangeValue)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
                              <span className="text-white">Total</span>
                              <span className="text-green-400">AED {formatCurrency(total)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <Section title="Additional Notes">
                    <div className="space-y-1">
                      <input
                        type="text"
                        className={`${inputClass} uppercase`}
                      value={formData.notes}
                        onChange={(e) => {
                          const upperValue = e.target.value.toUpperCase();
                          if (upperValue.length <= 150) {
                            handleInputChange('notes', upperValue);
                          }
                        }}
                        placeholder="USE • TO SEPARATE ITEMS (E.G. FREE SERVICE • FLOOR MATS)"
                        maxLength={150}
                      />
                      <div className="flex justify-between text-[10px] text-white/40">
                        <span>Use • or / to separate multiple notes</span>
                        <span className={formData.notes.length > 130 ? 'text-orange-400' : ''}>
                          {formData.notes.length}/150
                        </span>
                      </div>
                    </div>
                  </Section>
                  </fieldset>
                </div>
              )}

              {activeTab === 'invoices' && (
                <div className="space-y-4">
                  {/* Header with Convert button - Admin Only */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Invoices</h3>
                    {existingSalesOrder && !isLocked && isAdmin && (
                      <button
                        onClick={handleConvertToInvoice}
                        disabled={convertingToInvoice || lineItems.length === 0}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Admin Only: Convert Sales Order to Invoice"
                      >
                        {convertingToInvoice ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <ScrollText className="w-4 h-4" />
                            Convert to Invoice
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* No Sales Order yet message */}
                  {!existingSalesOrder && (
                    <div className="flex items-center justify-center h-48 text-white/40 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-center">
                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Create a Sales Order first to generate invoices</p>
                      </div>
                    </div>
                  )}

                  {/* No line items message */}
                  {existingSalesOrder && lineItems.length === 0 && (
                    <div className="flex items-center justify-center h-48 text-white/40 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-center">
                        <Plus className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Add line items to the Sales Order first</p>
                      </div>
                    </div>
                  )}

                  {/* Loading */}
                  {loadingInvoices && (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                    </div>
                  )}

                  {/* No invoices yet */}
                  {existingSalesOrder && lineItems.length > 0 && !loadingInvoices && invoices.length === 0 && (
                    <div className="flex items-center justify-center h-48 text-white/40 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-center">
                        <ScrollText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm mb-3">No invoices yet</p>
                        <p className="text-xs">Click "Convert to Invoice" to create one</p>
                      </div>
                    </div>
                  )}

                  {/* Invoice List - Condensed Expandable Cards */}
                  {!loadingInvoices && invoices.length > 0 && (
                    <div className="space-y-2">
                      {invoices.map((invoice) => {
                        const isExpanded = expandedInvoiceId === invoice.id;
                        // Check if fully paid - account for credits reducing the balance
                        const effectiveBalance = (invoice.total_amount || 0) - (invoice.credit_note_total || 0) - (invoice.paid_amount || 0);
                        const isPaid = invoice.status === 'paid' || effectiveBalance <= 0;
                        const isReversed = invoice.status === 'reversed';
                        
                        return (
                          <div 
                            key={invoice.id} 
                            className={`border rounded-lg overflow-hidden transition-all ${
                              isReversed ? 'opacity-50 border-white/10 bg-white/5' : 'border-white/15 bg-white/5'
                            }`}
                          >
                            {/* Condensed Header - Always Visible */}
                            <button
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : invoice.id)}
                              className="w-full flex items-center justify-between px-4 py-4 bg-white/10 hover:bg-white/15 transition-colors text-left"
                            >
                              <div className="flex items-center gap-4">
                                <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                <div>
                                  <p className="text-base font-medium text-white">{invoice.invoice_number}</p>
                                  <p className="text-xs text-white/40">
                                    {new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="text-base font-semibold text-white">{formatCurrency(invoice.total_amount)}</p>
                                  {!isPaid && !isReversed && invoice.balance_due > 0 && (
                                    <p className="text-xs text-amber-400">{formatCurrency(invoice.balance_due)} due</p>
                                  )}
                                  {isPaid && <p className="text-xs text-green-400 font-medium">Paid ✓</p>}
                                  {isReversed && <p className="text-xs text-white/30">Reversed</p>}
                                </div>
                                <div className={`w-2.5 h-2.5 rounded-full ${
                                  isPaid ? 'bg-green-400' :
                                  isReversed ? 'bg-white/20' :
                                  invoice.status === 'partial' ? 'bg-amber-400' :
                                  'bg-amber-400'
                                }`} />
                              </div>
                            </button>
                            
                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="px-4 py-3 border-t border-white/5 bg-black/20 space-y-3">
                                {/* Amounts Breakdown */}
                                <div className="space-y-1.5 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-white/40">Total</span>
                                    <span className="text-white">{formatCurrency(invoice.total_amount)}</span>
                                  </div>
                                  {(invoice.credit_note_total || 0) > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-white/40">Credits</span>
                                      <span className="text-white/60">-{formatCurrency(invoice.credit_note_total || 0)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-white/40">Paid</span>
                                    <span className="text-white/60">{formatCurrency(invoice.paid_amount)}</span>
                                  </div>
                                  <div className="flex justify-between pt-1.5 border-t border-white/5">
                                    <span className={`font-medium ${invoice.balance_due === 0 ? 'text-green-400' : 'text-white/60'}`}>Balance</span>
                                    <span className={`font-semibold ${invoice.balance_due > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                                      {invoice.balance_due === 0 ? 'Paid ✓' : formatCurrency(invoice.balance_due)}
                                    </span>
                                  </div>
                                </div>

                                {/* Reversal Info */}
                                {isReversed && invoice.reversal_reason && (
                                  <div className="p-2 bg-white/5 rounded text-xs text-white/50">
                                    Reversed: {invoice.reversal_reason}
                                  </div>
                                )}

                                {/* Document Section - Only show when paid and not reversed */}
                                {isPaid && !isReversed && (
                                  <div className={`p-3 rounded-lg border ${
                                    invoice.signing_status === 'completed'
                                      ? 'bg-green-500/10 border-green-400/20'
                                      : invoice.signing_status === 'company_signed'
                                      ? 'bg-orange-500/10 border-orange-400/20'
                                      : invoice.signing_status === 'sent' || invoice.signing_status === 'delivered'
                                      ? 'bg-blue-500/10 border-blue-400/20'
                                      : 'bg-white/[0.02] border-white/10'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      {/* Status */}
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                          invoice.signing_status === 'completed' ? 'bg-green-400' :
                                          invoice.signing_status === 'company_signed' ? 'bg-orange-400 animate-pulse' :
                                          invoice.signing_status === 'sent' || invoice.signing_status === 'delivered' ? 'bg-blue-400 animate-pulse' :
                                          invoice.pdf_url ? 'bg-white/40' : 'bg-white/20'
                                        }`} />
                                        <span className={`text-xs font-medium ${
                                          invoice.signing_status === 'completed' ? 'text-green-400' :
                                          invoice.signing_status === 'company_signed' ? 'text-orange-400' :
                                          invoice.signing_status === 'sent' || invoice.signing_status === 'delivered' ? 'text-blue-400' :
                                          'text-white/60'
                                        }`}>
                                          {invoice.signing_status === 'completed' ? '✓ Invoice Signed' :
                                           invoice.signing_status === 'company_signed' ? 'Awaiting Customer Signature' :
                                           invoice.signing_status === 'sent' || invoice.signing_status === 'delivered' ? 'Sent for Signing' :
                                           invoice.pdf_url ? 'Invoice Generated' : 'No Invoice Generated'}
                                        </span>
                                        {invoice.docusign_envelope_id && invoice.signing_status !== 'completed' && invoice.signing_status !== 'pending' && (
                                          <span className="text-[10px] text-white/30 font-mono">
                                            {invoice.docusign_envelope_id.slice(0, 8)}...
                                          </span>
                                        )}
                                      </div>

                                      {/* Actions */}
                                      <div className="flex items-center gap-2">
                                        {/* View PDF */}
                                        {invoice.pdf_url && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); window.open(invoice.signed_pdf_url || invoice.pdf_url, '_blank'); }}
                                            className="px-2.5 py-1 text-xs font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded transition-colors flex items-center gap-1"
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                            {invoice.signed_pdf_url ? 'View Signed' : 'View PDF'}
                                          </button>
                                        )}

                                        {/* Generate Invoice - only when no PDF exists */}
                                        {!invoice.pdf_url && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleGenerateInvoicePdf(invoice.id); }}
                                            disabled={generatingInvoicePdf === invoice.id}
                                            className="px-2.5 py-1 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-50"
                                          >
                                            {generatingInvoicePdf === invoice.id ? 'Generating...' : 'Generate Invoice'}
                                          </button>
                                        )}

                                        {/* Regenerate Invoice - when PDF exists but not sent for signing */}
                                        {invoice.pdf_url && (!invoice.signing_status || invoice.signing_status === 'pending') && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleGenerateInvoicePdf(invoice.id); }}
                                            disabled={generatingInvoicePdf === invoice.id}
                                            className="px-2.5 py-1 text-xs font-medium text-white/50 hover:text-white/70 bg-white/5 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                                          >
                                            {generatingInvoicePdf === invoice.id ? 'Regenerating...' : 'Regenerate'}
                                          </button>
                                        )}

                                        {/* Send for Signing - when PDF exists and not already in signing process */}
                                        {invoice.pdf_url && (!invoice.signing_status || invoice.signing_status === 'pending') && formData.customerEmail && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleSendInvoiceForSigning(invoice); }}
                                            disabled={sendingInvoiceForSigning === invoice.id}
                                            className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors disabled:opacity-50"
                                          >
                                            {sendingInvoiceForSigning === invoice.id ? 'Sending...' : 'Send for Signing'}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Helper text for missing email */}
                                    {invoice.pdf_url && (!invoice.signing_status || invoice.signing_status === 'pending') && !formData.customerEmail && (
                                      <p className="text-[10px] text-yellow-400/70 mt-2">
                                        💡 Add customer email to enable "Send for Signing"
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Paid Status Notice - Show when not paid yet */}
                                {!isPaid && !isReversed && (
                                  <div className="p-2 bg-amber-500/10 border border-amber-400/20 rounded-lg">
                                    <p className="text-xs text-amber-400/80">
                                      💡 Invoice generation available once fully paid
                                    </p>
                                  </div>
                                )}

                                {/* Reverse Action - Admin or Accounts with canDelete */}
                                {!isReversed && invoice.signing_status !== 'completed' && (isAdmin || accountsCanDelete) && (
                                  <div className="pt-2 border-t border-white/5">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleReverseInvoice(invoice); }}
                                      className="text-xs font-medium text-white/30 hover:text-red-400 transition-colors"
                                    >
                                      Reverse Invoice
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Invoice Reversal Confirmation Form */}
                  {reversingInvoice && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                      <div className="bg-black border border-white/10 rounded-lg p-5 w-full max-w-sm space-y-4">
                        <div>
                          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Reverse Invoice</p>
                          <p className="text-lg font-semibold text-white">{reversingInvoice.invoice_number}</p>
                        </div>
                        <p className="text-sm text-white/50">
                          This will void the invoice and create a credit note. This action cannot be undone.
                        </p>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">Reason *</label>
                          <input
                            type="text"
                            value={reversalReason}
                            onChange={(e) => setReversalReason(e.target.value)}
                            placeholder="Why is this invoice being reversed?"
                            className={inputClass}
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={() => {
                              setReversingInvoice(null);
                              setReversalReason('');
                            }}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-white/50 hover:text-white/70 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={confirmReverseInvoice}
                            disabled={!reversalReason.trim()}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-black bg-white hover:bg-white/90 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Reverse
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="space-y-3">
                  {/* Loading */}
                  {loadingPayments && (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                    </div>
                  )}

                  {!loadingPayments && (
                    <>
                      {/* PAYMENTS SECTION */}
                      <div className="border border-white/15 rounded-lg overflow-hidden bg-white/5">
                        <button
                          onClick={() => toggleSection('payments')}
                          className="w-full flex items-center justify-between px-4 py-3 bg-white/10 hover:bg-white/15 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${expandedSections.payments ? '' : '-rotate-90'}`} />
                            <span className="text-sm font-medium text-white/80">Payments</span>
                            <span className="text-xs text-white/40">({payments.length})</span>
                          </div>
                          <span className="text-sm font-semibold text-white">+{formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}</span>
                        </button>
                        
                        {expandedSections.payments && (
                          <div className="p-3 space-y-2 border-t border-white/10">
                            {/* Add Payment Button - Requires canCreate */}
                            {!showAddPaymentForm && canCreate && (
                              <button
                                onClick={() => setShowAddPaymentForm(true)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white/50 hover:text-white/70 border border-dashed border-white/10 hover:border-white/20 rounded-lg transition-all"
                              >
                                <Plus className="w-3 h-3" />
                                Add Payment
                              </button>
                            )}

                            {/* Add Payment Form */}
                            {showAddPaymentForm && (
                              <div className="bg-black/20 border border-white/10 rounded-lg p-3 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <Field label="Amount (AED)">
                                    <input type="number" className={inputClass} value={newPayment.amount || ''} onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
                                  </Field>
                                  <Field label="Method">
                                    <select className={selectClass} value={newPayment.payment_method} onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value as Payment['payment_method'] }))}>
                                      {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                  </Field>
                                  <Field label="Date">
                                    <input type="date" className={inputClass} value={newPayment.payment_date} onChange={(e) => setNewPayment(prev => ({ ...prev, payment_date: e.target.value }))} />
                                  </Field>
                                  <Field label="Reference">
                                    <input type="text" className={inputClass} value={newPayment.reference} onChange={(e) => setNewPayment(prev => ({ ...prev, reference: e.target.value }))} placeholder="Optional" />
                                  </Field>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setShowAddPaymentForm(false)} className="px-3 py-1.5 text-xs text-white/50 hover:text-white">Cancel</button>
                                  <button onClick={handleAddPayment} disabled={savingPayment || newPayment.amount <= 0} className="px-3 py-1.5 text-xs font-medium text-black bg-white rounded-lg disabled:opacity-50">
                                    {savingPayment ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Payments List */}
                            {payments.map((payment) => {
                              const isUnallocated = (payment.unallocated_amount || 0) > 0;
                              const paymentAllocations = allocations.filter(a => a.payment_id === payment.id);
                              return (
                                <div key={payment.id} className="bg-black/20 rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-white">{payment.payment_number}</p>
                                      <p className="text-xs text-white/40">
                                        {new Date(payment.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • {paymentMethods.find(m => m.value === payment.payment_method)?.label}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {/* Receipt PDF Actions */}
                                      <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleViewReceipt(payment)}
                                        disabled={generatingReceiptId === payment.id}
                                        className="px-2 py-1 text-[10px] font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                                      >
                                        {generatingReceiptId === payment.id ? (
                                          <>
                                            <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                            Loading...
                                          </>
                                        ) : (
                                          'View Receipt'
                                        )}
                                      </button>
                                        {/* WhatsApp Button - only enabled if PDF exists */}
                                        <button
                                          onClick={() => handleSendWhatsApp(payment)}
                                          disabled={!payment.pdf_url || sendingWhatsAppId === payment.id}
                                          className={`px-2 py-1 text-[10px] font-medium rounded transition-colors flex items-center gap-1 ${
                                            payment.pdf_url 
                                              ? 'text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20' 
                                              : 'text-white/30 bg-white/5 cursor-not-allowed'
                                          } disabled:opacity-50`}
                                          title={payment.pdf_url ? 'Send via WhatsApp' : 'Generate receipt first'}
                                        >
                                          {sendingWhatsAppId === payment.id ? (
                                            <div className="w-3 h-3 border border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                                          ) : (
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                            </svg>
                                          )}
                                        </button>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-white">+{formatCurrency(payment.amount)}</p>
                                        {/* Show breakdown: allocated / refunded / available */}
                                        <div className="flex items-center gap-2 text-[10px]">
                                          {(payment.allocated_amount || 0) > 0 && (
                                            <span className="text-green-400">{formatCurrency(payment.allocated_amount || 0)} allocated</span>
                                          )}
                                          {(payment.refunded_amount || 0) > 0 && (
                                            <span className="text-orange-400">{formatCurrency(payment.refunded_amount || 0)} refunded</span>
                                          )}
                                          {(payment.available_amount || 0) > 0 && (
                                            <span className="text-amber-400">{formatCurrency(payment.available_amount || 0)} available</span>
                                          )}
                                          {(payment.available_amount || 0) === 0 && (payment.allocated_amount || 0) > 0 && (payment.refunded_amount || 0) === 0 && (
                                            <span className="text-green-400/60">fully allocated</span>
                                          )}
                                          {(payment.available_amount || 0) === 0 && (payment.refunded_amount || 0) > 0 && (payment.allocated_amount || 0) === 0 && (
                                            <span className="text-orange-400/60">fully refunded</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Allocations */}
                                  {paymentAllocations.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                                      {paymentAllocations.map(alloc => (
                                        <div key={alloc.id} className="flex items-center justify-between text-xs">
                                          <span className="text-white/50">→ {alloc.invoice_number}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-white/70">{formatCurrency(alloc.amount)}</span>
                                            <button onClick={() => handleUnallocate(alloc.id)} className="text-white/30 hover:text-red-400">×</button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Allocate - show if payment has available amount */}
                                  {(payment.available_amount || 0) > 0 && invoices.some(inv => inv.status !== 'reversed' && inv.balance_due > 0) && (
                                    <div className="mt-2 pt-2 border-t border-white/5">
                                      {allocatingPayment === payment.id ? (
                                        <div className="space-y-2">
                                          {invoices.filter(inv => inv.status !== 'reversed' && inv.balance_due > 0).map(inv => {
                                            const maxAmount = Math.min(payment.available_amount || 0, inv.balance_due);
                                            const isSelected = allocationInvoiceId === inv.id;
                                            return (
                                              <div key={inv.id} className={`p-2 rounded text-xs ${isSelected ? 'bg-white/10' : ''}`}>
                                                <div className="flex items-center justify-between">
                                                  <span className="text-white/70">{inv.invoice_number} <span className="text-white/40">({formatCurrency(inv.balance_due)})</span></span>
                                                  {!isSelected && <button onClick={() => { setAllocationInvoiceId(inv.id); setAllocationAmount(maxAmount); }} className="text-white/50 hover:text-white">Select</button>}
                                                </div>
                                                {isSelected && (
                                                  <div className="mt-2 flex items-center gap-2">
                                                    <input type="number" value={allocationAmount || ''} onChange={(e) => setAllocationAmount(Math.min(parseFloat(e.target.value) || 0, maxAmount))} className={`${inputClass} w-24 text-xs`} />
                                                    <button onClick={() => { if (allocationAmount > 0) { handleAllocatePayment(payment.id, inv.id, allocationAmount); setAllocationInvoiceId(null); setAllocationAmount(0); }}} className="px-2 py-1 text-xs bg-white text-black rounded">Apply</button>
                                                    <button onClick={() => { setAllocationInvoiceId(null); setAllocationAmount(0); }} className="text-white/40">×</button>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                          <button onClick={() => { setAllocatingPayment(null); setAllocationInvoiceId(null); }} className="text-xs text-white/40">Close</button>
                                        </div>
                                      ) : (
                                        <button onClick={() => setAllocatingPayment(payment.id)} className="text-xs text-amber-400 hover:text-amber-300">Allocate →</button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* CREDIT NOTES SECTION */}
                      <div className="border border-white/15 rounded-lg overflow-hidden bg-white/5">
                        <button
                          onClick={() => toggleSection('credits')}
                          className="w-full flex items-center justify-between px-4 py-3 bg-white/10 hover:bg-white/15 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${expandedSections.credits ? '' : '-rotate-90'}`} />
                            <span className="text-sm font-medium text-white/80">Credit Notes</span>
                            <span className="text-xs text-white/40">({adjustments.filter(a => a.adjustment_type === 'credit_note').length})</span>
                          </div>
                          <span className="text-sm font-semibold text-white/60">-{formatCurrency(adjustments.filter(a => a.adjustment_type === 'credit_note').reduce((sum, a) => sum + a.amount, 0))}</span>
                        </button>
                        
                        {expandedSections.credits && (
                          <div className="p-3 space-y-2 border-t border-white/10">
                            {/* Add Credit Note Button - Requires canCreate */}
                            {!showCreditNoteForm && canCreate && (
                              <button
                                onClick={() => setShowCreditNoteForm(invoices.find(i => i.status !== 'reversed' && i.balance_due > 0)?.id || 'select')}
                                disabled={!invoices.some(i => i.status !== 'reversed' && i.balance_due > 0)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white/50 hover:text-white/70 border border-dashed border-white/10 hover:border-white/20 rounded-lg transition-all disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3" />
                                Add Credit Note
                              </button>
                            )}

                            {/* Add Credit Note Form */}
                            {showCreditNoteForm && (
                              <div className="bg-black/20 border border-white/10 rounded-lg p-3 space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                  <Field label="Invoice">
                                    <select value={typeof showCreditNoteForm === 'string' && showCreditNoteForm !== 'select' ? showCreditNoteForm : ''} onChange={(e) => setShowCreditNoteForm(e.target.value || 'select')} className={selectClass}>
                                      <option value="">Select</option>
                                      {invoices.filter(inv => inv.status !== 'reversed' && inv.balance_due > 0).map(inv => <option key={inv.id} value={inv.id}>{inv.invoice_number}</option>)}
                                    </select>
                                  </Field>
                                  <Field label="Amount">
                                    <input type="number" placeholder="0.00" value={newCreditNote.amount || ''} onChange={(e) => setNewCreditNote(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} className={inputClass} />
                                  </Field>
                                  <Field label="Reason">
                                    <input type="text" placeholder="Reason" value={newCreditNote.reason} onChange={(e) => setNewCreditNote(prev => ({ ...prev, reason: e.target.value }))} className={inputClass} />
                                  </Field>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setShowCreditNoteForm(null)} className="px-3 py-1.5 text-xs text-white/50 hover:text-white">Cancel</button>
                                  <button onClick={() => { const invoiceId = typeof showCreditNoteForm === 'string' && showCreditNoteForm !== 'select' ? showCreditNoteForm : null; if (invoiceId) handleAddCreditNote(invoiceId); }} disabled={savingAdjustment || !showCreditNoteForm || showCreditNoteForm === 'select' || newCreditNote.amount <= 0} className="px-3 py-1.5 text-xs font-medium text-black bg-white rounded-lg disabled:opacity-50">
                                    {savingAdjustment ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Credit Notes List */}
                            {adjustments.filter(a => a.adjustment_type === 'credit_note').map(cn => {
                              const linkedInvoice = invoices.find(inv => inv.id === cn.invoice_id);
                              return (
                                <div key={cn.id} className="flex items-center justify-between bg-black/20 rounded-lg p-3">
                                  <div>
                                    <p className="text-sm font-medium text-white/80">{cn.adjustment_number}</p>
                                    <p className="text-xs text-white/40">{linkedInvoice ? `→ ${linkedInvoice.invoice_number}` : ''} • {cn.reason}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {/* Credit Note PDF Actions */}
                                    <button
                                      onClick={() => handleViewCreditNote(cn)}
                                      disabled={generatingCreditNoteId === cn.id}
                                      className="px-2 py-1 text-[10px] font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                      {generatingCreditNoteId === cn.id ? (
                                        <>
                                          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                          Loading...
                                        </>
                                      ) : (
                                        'View'
                                      )}
                                    </button>
                                    <p className="text-sm font-semibold text-white/60">-{formatCurrency(cn.amount)}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* REFUNDS SECTION */}
                      <div className="border border-white/15 rounded-lg overflow-hidden bg-white/5">
                        <button
                          onClick={() => toggleSection('refunds')}
                          className="w-full flex items-center justify-between px-4 py-3 bg-white/10 hover:bg-white/15 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${expandedSections.refunds ? '' : '-rotate-90'}`} />
                            <span className="text-sm font-medium text-white/80">Refunds</span>
                            <span className="text-xs text-white/40">({adjustments.filter(a => a.adjustment_type === 'refund').length})</span>
                          </div>
                          <span className="text-sm font-semibold text-white/60">-{formatCurrency(adjustments.filter(a => a.adjustment_type === 'refund').reduce((sum, a) => sum + a.amount, 0))}</span>
                        </button>
                        
                        {expandedSections.refunds && (
                          <div className="p-3 space-y-2 border-t border-white/10">
                            {/* Add Refund Button - Requires canCreate */}
                            {!showRefundForm && canCreate && (
                              <button
                                onClick={() => setShowRefundForm(true)}
                                disabled={!payments.some(p => (p.available_amount || 0) > 0)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white/50 hover:text-white/70 border border-dashed border-white/10 hover:border-white/20 rounded-lg transition-all disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3" />
                                Add Refund
                              </button>
                            )}

                            {/* Add Refund Form */}
                            {showRefundForm && (
                              <div className="bg-black/20 border border-white/10 rounded-lg p-3 space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                  <Field label="Refund From Payment">
                                    <select value={newRefund.paymentId} onChange={(e) => {
                                      const selectedPmt = payments.find(p => p.id === e.target.value);
                                      setNewRefund(prev => ({ 
                                        ...prev, 
                                        paymentId: e.target.value,
                                        amount: selectedPmt?.available_amount || 0 // Pre-fill with available amount
                                      }));
                                    }} className={selectClass}>
                                      <option value="">Select Payment</option>
                                      {payments.filter(p => (p.available_amount || 0) > 0).map(p => (
                                        <option key={p.id} value={p.id}>
                                          {p.payment_number} - AED {formatCurrency(p.available_amount || 0)} available
                                        </option>
                                      ))}
                                    </select>
                                  </Field>
                                  <Field label="Amount">
                                    <input 
                                      type="number" 
                                      value={newRefund.amount || ''} 
                                      onChange={(e) => {
                                        const selectedPmt = payments.find(p => p.id === newRefund.paymentId);
                                        const maxAmount = selectedPmt?.available_amount || 0;
                                        const enteredAmount = parseFloat(e.target.value) || 0;
                                        setNewRefund(prev => ({ ...prev, amount: Math.min(enteredAmount, maxAmount) }));
                                      }} 
                                      className={inputClass} 
                                      placeholder="0.00" 
                                    />
                                  </Field>
                                  <Field label="Method">
                                    <select value={newRefund.method} onChange={(e) => setNewRefund(prev => ({ ...prev, method: e.target.value }))} className={selectClass}>
                                      <option value="cash">Cash</option>
                                      <option value="bank_transfer">Bank Transfer</option>
                                      <option value="cheque">Cheque</option>
                                    </select>
                                  </Field>
                                  <Field label="Reason" className="col-span-3">
                                    <input type="text" value={newRefund.reason} onChange={(e) => setNewRefund(prev => ({ ...prev, reason: e.target.value }))} className={inputClass} placeholder="Reason for refund" />
                                  </Field>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setShowRefundForm(false)} className="px-3 py-1.5 text-xs text-white/50 hover:text-white">Cancel</button>
                                  <button onClick={handleAddRefund} disabled={savingAdjustment || !newRefund.paymentId || newRefund.amount <= 0} className="px-3 py-1.5 text-xs font-medium text-black bg-white rounded-lg disabled:opacity-50">
                                    {savingAdjustment ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Refunds List */}
                            {adjustments.filter(a => a.adjustment_type === 'refund').map(refund => {
                              const linkedInvoice = invoices.find(inv => inv.id === refund.invoice_id);
                              return (
                                <div key={refund.id} className="flex items-center justify-between bg-black/20 rounded-lg p-3">
                                  <div>
                                    <p className="text-sm font-medium text-white/80">{refund.adjustment_number}</p>
                                    <p className="text-xs text-white/40">{linkedInvoice ? `→ ${linkedInvoice.invoice_number}` : ''} • {refund.reason}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {/* Refund PDF Actions */}
                                    <button
                                      onClick={() => handleViewRefund(refund)}
                                      disabled={generatingRefundId === refund.id}
                                      className="px-2 py-1 text-[10px] font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                      {generatingRefundId === refund.id ? (
                                        <>
                                          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                          Loading...
                                        </>
                                      ) : (
                                        'View'
                                      )}
                                    </button>
                                    <p className="text-sm font-semibold text-white/60">-{formatCurrency(refund.amount)}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'soa' && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Statement of Account</h3>
                    <button
                      onClick={() => loadSoaData()}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white/70 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Balance Summary */}
                  {soaBalance && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="grid grid-cols-5 gap-4 text-center">
                        <div>
                          <p className="text-xs text-white/50 uppercase tracking-wide">Invoiced</p>
                          <p className="text-sm font-bold text-white">AED {formatCurrency(soaBalance.total_invoiced)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50 uppercase tracking-wide">Paid</p>
                          <p className="text-sm font-bold text-green-400">AED {formatCurrency(soaBalance.total_paid)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50 uppercase tracking-wide">Credit Notes</p>
                          <p className="text-sm font-bold text-purple-400">AED {formatCurrency(soaBalance.total_credit_notes)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50 uppercase tracking-wide">Refunds</p>
                          <p className="text-sm font-bold text-orange-400">AED {formatCurrency(soaBalance.total_refunds)}</p>
                        </div>
                        <div className="border-l border-white/10 pl-4">
                          <p className="text-xs text-white/50 uppercase tracking-wide">Balance</p>
                          <p className={`text-sm font-bold ${soaBalance.current_balance > 0 ? 'text-red-400' : soaBalance.current_balance < 0 ? 'text-green-400' : 'text-white'}`}>
                            AED {formatCurrency(Math.abs(soaBalance.current_balance))}
                            {soaBalance.current_balance < 0 && ' CR'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading */}
                  {loadingSoa && (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                    </div>
                  )}

                  {/* No transactions */}
                  {!loadingSoa && soaData.length === 0 && (
                    <div className="flex items-center justify-center h-48 text-white/40 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-center">
                        <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No transactions yet</p>
                      </div>
                    </div>
                  )}

                  {/* Transactions Table */}
                  {!loadingSoa && soaData.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/5 border-b border-white/10 text-xs font-medium text-white/50 uppercase tracking-wide">
                        <div className="col-span-2">Date</div>
                        <div className="col-span-2">Reference</div>
                        <div className="col-span-4">Description</div>
                        <div className="col-span-1 text-right">Debit</div>
                        <div className="col-span-1 text-right">Credit</div>
                        <div className="col-span-2 text-right">Balance</div>
                      </div>
                      
                      {/* Table Rows */}
                      <div className="divide-y divide-white/5">
                        {soaData.map((row, index) => (
                          <div 
                            key={`${row.reference}-${index}`}
                            className={`grid grid-cols-12 gap-2 px-4 py-3 text-sm ${
                              row.transaction_type === 'invoice' ? 'bg-white/[0.02]' :
                              row.transaction_type === 'payment' ? 'bg-green-500/5' :
                              row.transaction_type === 'credit_note' ? 'bg-purple-500/5' :
                              row.transaction_type === 'refund' ? 'bg-orange-500/5' :
                              row.transaction_type === 'invoice_reversal' ? 'bg-red-500/5' :
                              ''
                            }`}
                          >
                            <div className="col-span-2 text-white/60">
                              {new Date(row.transaction_date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="col-span-2">
                              <span className={`text-xs font-medium ${
                                row.transaction_type === 'invoice' ? 'text-white' :
                                row.transaction_type === 'payment' ? 'text-green-400' :
                                row.transaction_type === 'credit_note' ? 'text-purple-400' :
                                row.transaction_type === 'refund' ? 'text-orange-400' :
                                row.transaction_type === 'invoice_reversal' ? 'text-red-400' :
                                'text-white/70'
                              }`}>
                                {row.reference}
                              </span>
                            </div>
                            <div className="col-span-4 text-white/70 truncate" title={row.description}>
                              {row.description}
                            </div>
                            <div className="col-span-1 text-right text-white/80">
                              {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                            </div>
                            <div className="col-span-1 text-right text-green-400">
                              {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                            </div>
                            <div className={`col-span-2 text-right font-medium ${
                              row.running_balance > 0 ? 'text-red-400' : 
                              row.running_balance < 0 ? 'text-green-400' : 
                              'text-white'
                            }`}>
                              {formatCurrency(Math.abs(row.running_balance))}
                              {row.running_balance < 0 && ' CR'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Note */}
                  <p className="text-xs text-white/40 text-center">
                    Debit = Amount owed by customer • Credit = Amount paid/adjusted • CR = Credit balance (we owe customer)
                  </p>
                </div>
              )}

              {/* ===== BANK FINANCE TAB ===== */}
              {activeTab === 'bank_finance' && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Bank Finance Applications</h3>
                    <button
                      onClick={() => {
                        setNewBfApp({
                          bank_name: '',
                          bank_required_down_pct: 20,
                          actual_vehicle_price: existingSalesOrder?.total_amount || 0,
                          actual_customer_down_payment: 0,
                          bank_quotation_price: 0,
                          applied_interest_rate: 0,
                          applied_tenure_months: 48,
                        });
                        setShowNewBfAppForm(true);
                      }}
                      disabled={!existingSalesOrder}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-white/90 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      New Application
                    </button>
                  </div>

                  {/* No Sales Order Warning */}
                  {!existingSalesOrder && (
                    <div className="flex items-center justify-center h-48 text-white/40 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-center">
                        <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Create a Sales Order first to add bank finance applications</p>
                      </div>
                    </div>
                  )}

                  {/* Loading */}
                  {loadingBankFinance && (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                    </div>
                  )}

                  {/* New Application Form */}
                  {showNewBfAppForm && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white/80">New Bank Finance Application</h4>
                        <button onClick={() => setShowNewBfAppForm(false)} className="text-white/40 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Bank Selection */}
                      <div>
                        <label className={labelClass}>Bank</label>
                        <select
                          className={selectClass}
                          value={newBfApp.bank_name}
                          onChange={(e) => setNewBfApp(prev => ({ ...prev, bank_name: e.target.value }))}
                        >
                          <option value="">Select Bank</option>
                          {banksList.map(b => <option key={b.value} value={b.label}>{b.label}</option>)}
                        </select>
                      </div>

                      {/* Actual Deal Section */}
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-3">
                        <p className="text-xs font-medium text-white/60 uppercase">Actual Deal (From Sales Order)</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className={labelClass}>Vehicle Price (SO)</label>
                            <input
                              type="number"
                              className={inputClass}
                              value={newBfApp.actual_vehicle_price}
                              onChange={(e) => {
                                const price = parseFloat(e.target.value) || 0;
                                setNewBfApp(prev => ({ ...prev, actual_vehicle_price: price }));
                              }}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Customer Down Payment</label>
                            <input
                              type="number"
                              className={inputClass}
                              value={newBfApp.actual_customer_down_payment}
                              onChange={(e) => setNewBfApp(prev => ({ ...prev, actual_customer_down_payment: parseFloat(e.target.value) || 0 }))}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Amount to Finance</label>
                            <input
                              type="text"
                              className={`${inputClass} bg-white/5`}
                              value={`AED ${formatCurrency(newBfApp.actual_vehicle_price - newBfApp.actual_customer_down_payment)}`}
                              readOnly
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bank Quotation Section */}
                      <div className="bg-blue-500/5 border border-blue-400/20 rounded-lg p-3 space-y-3">
                        <p className="text-xs font-medium text-blue-400 uppercase">Bank Quotation (Inflated for Bank)</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Bank Required Down Payment %</label>
                            <input
                              type="number"
                              className={inputClass}
                              value={newBfApp.bank_required_down_pct}
                              onChange={(e) => {
                                const pct = parseFloat(e.target.value) || 0;
                                const amountToFinance = newBfApp.actual_vehicle_price - newBfApp.actual_customer_down_payment;
                                const quotationPrice = amountToFinance / (1 - pct / 100);
                                setNewBfApp(prev => ({ 
                                  ...prev, 
                                  bank_required_down_pct: pct,
                                  bank_quotation_price: Math.round(quotationPrice)
                                }));
                              }}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Quotation Price (To Bank)</label>
                            <input
                              type="number"
                              className={inputClass}
                              value={newBfApp.bank_quotation_price}
                              onChange={(e) => setNewBfApp(prev => ({ ...prev, bank_quotation_price: parseFloat(e.target.value) || 0 }))}
                            />
                          </div>
                        </div>

                        {/* Calculator hint */}
                        {newBfApp.bank_required_down_pct > 0 && newBfApp.actual_vehicle_price > 0 && (
                          <div className="bg-white/5 rounded-lg p-2 text-xs text-white/60">
                            <p>💡 To get AED {formatCurrency(newBfApp.actual_vehicle_price - newBfApp.actual_customer_down_payment)} financed with {newBfApp.bank_required_down_pct}% down:</p>
                            <p className="font-medium text-white mt-1">
                              Quotation = {formatCurrency(newBfApp.actual_vehicle_price - newBfApp.actual_customer_down_payment)} ÷ {(100 - newBfApp.bank_required_down_pct) / 100} = AED {formatCurrency(Math.round((newBfApp.actual_vehicle_price - newBfApp.actual_customer_down_payment) / (1 - newBfApp.bank_required_down_pct / 100)))}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const amountToFinance = newBfApp.actual_vehicle_price - newBfApp.actual_customer_down_payment;
                                const quotationPrice = amountToFinance / (1 - newBfApp.bank_required_down_pct / 100);
                                setNewBfApp(prev => ({ ...prev, bank_quotation_price: Math.round(quotationPrice) }));
                              }}
                              className="mt-2 px-2 py-1 text-xs font-medium text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 rounded transition-colors"
                            >
                              Use Calculated Amount
                            </button>
                          </div>
                        )}

                        {/* Validation */}
                        {newBfApp.bank_quotation_price > 0 && (
                          <div className={`p-2 rounded-lg text-xs ${
                            newBfApp.bank_quotation_price * (1 - newBfApp.bank_required_down_pct / 100) >= (newBfApp.actual_vehicle_price - newBfApp.actual_customer_down_payment)
                              ? 'bg-green-500/10 text-green-400 border border-green-400/20'
                              : 'bg-red-500/10 text-red-400 border border-red-400/20'
                          }`}>
                            {newBfApp.bank_quotation_price * (1 - newBfApp.bank_required_down_pct / 100) >= (newBfApp.actual_vehicle_price - newBfApp.actual_customer_down_payment)
                              ? `✅ Bank will finance AED ${formatCurrency(newBfApp.bank_quotation_price * (1 - newBfApp.bank_required_down_pct / 100))} - covers required amount`
                              : `⚠️ Bank will finance AED ${formatCurrency(newBfApp.bank_quotation_price * (1 - newBfApp.bank_required_down_pct / 100))} - shortfall of AED ${formatCurrency((newBfApp.actual_vehicle_price - newBfApp.actual_customer_down_payment) - (newBfApp.bank_quotation_price * (1 - newBfApp.bank_required_down_pct / 100)))}`
                            }
                          </div>
                        )}
                      </div>

                      {/* Finance Terms */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className={labelClass}>Interest Rate %</label>
                          <input
                            type="number"
                            step="0.01"
                            className={inputClass}
                            value={newBfApp.applied_interest_rate}
                            onChange={(e) => setNewBfApp(prev => ({ ...prev, applied_interest_rate: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Tenure (Months)</label>
                          <input
                            type="number"
                            className={inputClass}
                            value={newBfApp.applied_tenure_months}
                            onChange={(e) => setNewBfApp(prev => ({ ...prev, applied_tenure_months: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Est. Monthly EMI</label>
                          <input
                            type="text"
                            className={`${inputClass} bg-white/5`}
                            value={newBfApp.applied_tenure_months > 0 && newBfApp.bank_quotation_price > 0 
                              ? `AED ${formatCurrency(Math.round((newBfApp.bank_quotation_price * (1 - newBfApp.bank_required_down_pct / 100)) / newBfApp.applied_tenure_months))}`
                              : '-'
                            }
                            readOnly
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                        <button
                          onClick={() => setShowNewBfAppForm(false)}
                          className="px-4 py-2 text-xs font-medium text-white/60 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateBfApplication}
                          disabled={savingBfApp || !newBfApp.bank_name || newBfApp.bank_quotation_price <= 0}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-black bg-white hover:bg-white/90 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {savingBfApp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          Create Application
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Applications List */}
                  {!loadingBankFinance && existingSalesOrder && bfApplications.length === 0 && !showNewBfAppForm && (
                    <div className="flex items-center justify-center h-48 text-white/40 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-center">
                        <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No bank finance applications yet</p>
                        <p className="text-xs text-white/30 mt-1">Click "New Application" to start</p>
                      </div>
                    </div>
                  )}

                  {/* Application Cards */}
                  {bfApplications.length > 0 && !selectedBfApp && (
                    <div className="space-y-3">
                      {bfApplications.map(app => {
                        const statusInfo = bfStatusLabels[app.status] || { label: app.status, color: 'text-white/50', icon: null };
                        return (
                          <div
                            key={app.id}
                            onClick={() => {
                              setSelectedBfApp(app);
                              loadBfAppDetails(app.id);
                            }}
                            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 cursor-pointer transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-white">#{app.application_number} {app.bank_name}</span>
                                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.color} bg-white/5`}>
                                    {statusInfo.icon}
                                    {statusInfo.label}
                                  </span>
                                </div>
                                <p className="text-xs text-white/50">
                                  AED {formatCurrency(app.bank_finance_amount || 0)} • {app.applied_tenure_months} months • {app.applied_interest_rate || 0}%
                                </p>
                                {app.status === 'rejected' && app.rejection_reason && (
                                  <p className="text-xs text-red-400 mt-1">Rejected: {app.rejection_reason}</p>
                                )}
                                {app.status === 'approved' && app.bank_reference && (
                                  <p className="text-xs text-green-400 mt-1">Ref: {app.bank_reference}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-white/40">
                                  {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                                {app.decision_at && (
                                  <p className="text-[10px] text-white/30">
                                    {Math.ceil((new Date(app.decision_at).getTime() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24))} days
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected Application Detail View */}
                  {selectedBfApp && (
                    <div className="space-y-4">
                      {/* Back button */}
                      <button
                        onClick={() => setSelectedBfApp(null)}
                        className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
                      >
                        ← Back to Applications
                      </button>

                      {/* Application Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-white">#{selectedBfApp.application_number} {selectedBfApp.bank_name}</h4>
                          <p className="text-xs text-white/50">Created {new Date(selectedBfApp.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${bfStatusLabels[selectedBfApp.status]?.color || 'text-white/50'} bg-white/5 border border-white/10`}>
                          {bfStatusLabels[selectedBfApp.status]?.icon}
                          {bfStatusLabels[selectedBfApp.status]?.label || selectedBfApp.status}
                        </span>
                      </div>

                      {/* Status Progress Bar */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center justify-between relative">
                          {/* Line */}
                          <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/10" />
                          
                          {['documents_pending', 'documents_complete', 'accounts_review', 'submitted_to_bank', 'approved'].map((status, idx) => {
                            const statusList = ['documents_pending', 'documents_complete', 'accounts_review', 'submitted_to_bank', 'approved', 'rejected'];
                            const currentIdx = statusList.indexOf(selectedBfApp.status);
                            const isRejected = selectedBfApp.status === 'rejected';
                            const isActive = status === selectedBfApp.status;
                            const isCompleted = !isRejected && currentIdx > idx;
                            const statusInfo = bfStatusLabels[status];
                            
                            return (
                              <div key={status} className="flex flex-col items-center z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isActive ? 'bg-white/20 ring-2 ring-white/40' :
                                  isCompleted ? 'bg-green-500/20' :
                                  'bg-white/5'
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <span className={isActive ? statusInfo.color : 'text-white/30'}>{statusInfo.icon}</span>
                                  )}
                                </div>
                                <p className={`text-[9px] mt-1 ${isActive ? 'text-white' : 'text-white/40'}`}>
                                  {statusInfo.label.split(' ')[0]}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Finance Details - Approved Terms (if approved) */}
                      {selectedBfApp.status === 'approved' && (
                        <div className="bg-green-500/5 border border-green-400/20 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <p className="text-sm font-semibold text-green-400">Approved Finance Terms</p>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <p className="text-xs text-white/50">Approved Amount</p>
                              <p className="text-sm font-bold text-white">AED {formatCurrency(selectedBfApp.approved_amount || 0)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-white/50">Interest Rate</p>
                              <p className="text-sm font-bold text-white">{selectedBfApp.approved_interest_rate || 0}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-white/50">Tenure</p>
                              <p className="text-sm font-bold text-white">{selectedBfApp.approved_tenure_months} months</p>
                            </div>
                            <div>
                              <p className="text-xs text-white/50">Monthly EMI</p>
                              <p className="text-sm font-bold text-white">AED {formatCurrency(selectedBfApp.approved_emi || 0)}</p>
                            </div>
                          </div>
                          {selectedBfApp.bank_reference && (
                            <p className="text-xs text-center text-white/50">Bank Reference: <span className="text-green-400 font-mono">{selectedBfApp.bank_reference}</span></p>
                          )}
                        </div>
                      )}

                      {/* Bank Quotation */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-white/80 uppercase">Bank Quotation</p>
                          <div className="flex items-center gap-2">
                            {/* Always regenerate PDF when clicked - ensures latest data */}
                            <button
                              onClick={handleGenerateBankQuotation}
                              disabled={generatingBankQuotation}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-black bg-white hover:bg-white/90 rounded transition-colors disabled:opacity-50"
                            >
                              {generatingBankQuotation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                              {generatingBankQuotation ? 'Generating...' : 'Download PDF'}
                            </button>
                            {/* Quick view last generated PDF if exists */}
                            {selectedBfApp.bank_quotation_pdf_url && (
                              <button
                                onClick={() => window.open(selectedBfApp.bank_quotation_pdf_url, '_blank')}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white/50 hover:text-white/70 transition-colors"
                                title="View last generated PDF"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-white/50">Quotation Price</p>
                            <p className="font-medium text-white">AED {formatCurrency(selectedBfApp.bank_quotation_price || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50">Bank Down Payment ({selectedBfApp.bank_required_down_pct}%)</p>
                            <p className="font-medium text-white">AED {formatCurrency(selectedBfApp.bank_shown_down_payment || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50">Bank Will Finance</p>
                            <p className="font-medium text-blue-400">AED {formatCurrency(selectedBfApp.bank_finance_amount || 0)}</p>
                          </div>
                        </div>
                        <div className="text-xs text-white/40 pt-2 border-t border-white/10">
                          Actual vehicle price: AED {formatCurrency(selectedBfApp.actual_vehicle_price || 0)} • Customer down: AED {formatCurrency(selectedBfApp.actual_customer_down_payment || 0)} • Needed: AED {formatCurrency(selectedBfApp.amount_to_finance || 0)}
                        </div>
                      </div>

                      {/* Documents Section */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-white/80 uppercase">Customer Documents</p>
                        <div className="grid grid-cols-2 gap-2">
                          {customerDocTypes.map(docType => {
                            const doc = bfDocuments.find(d => d.document_type === docType.value && d.category === 'customer');
                            return (
                              <div key={docType.value} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                <span className="text-xs text-white/70">{docType.label}</span>
                                <div className="flex items-center gap-1">
                                  {doc ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                                      <button
                                        onClick={() => window.open(doc.file_url, '_blank')}
                                        className="text-xs text-blue-400 hover:underline"
                                      >
                                        View
                                      </button>
                                    </>
                                  ) : (
                                    <label className="flex items-center gap-1 text-xs text-white/40 hover:text-white cursor-pointer">
                                      <Upload className="w-3 h-3" />
                                      Upload
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleBfDocUpload(e, 'customer', docType.value, docType.label)}
                                      />
                                    </label>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Bank Documents (show after approval) */}
                        {(selectedBfApp.status === 'approved' || selectedBfApp.status === 'submitted_to_bank') && (
                          <>
                            <p className="text-xs font-semibold text-white/80 uppercase pt-3 border-t border-white/10">Bank Documents</p>
                            <div className="grid grid-cols-2 gap-2">
                              {bankDocTypes.map(docType => {
                                const doc = bfDocuments.find(d => d.document_type === docType.value && d.category === 'bank');
                                return (
                                  <div key={docType.value} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                    <span className="text-xs text-white/70">{docType.label}</span>
                                    <div className="flex items-center gap-1">
                                      {doc ? (
                                        <>
                                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                                          <button
                                            onClick={() => window.open(doc.file_url, '_blank')}
                                            className="text-xs text-blue-400 hover:underline"
                                          >
                                            View
                                          </button>
                                        </>
                                      ) : (
                                        <label className="flex items-center gap-1 text-xs text-white/40 hover:text-white cursor-pointer">
                                          <Upload className="w-3 h-3" />
                                          Upload
                                          <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => handleBfDocUpload(e, 'bank', docType.value, docType.label)}
                                          />
                                        </label>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {/* Download All Documents Button */}
                        {(bfDocuments.length > 0 || selectedBfApp.bank_quotation_pdf_url) && (
                          <div className="pt-3 border-t border-white/10">
                            <button
                              onClick={handleDownloadAllDocuments}
                              disabled={downloadingAllDocs}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-black bg-white hover:bg-white/90 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {downloadingAllDocs ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Preparing ZIP...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4" />
                                  Download All Documents (ZIP)
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Activity Log */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-white/80 uppercase">Activity Log</p>
                        
                        {/* Add Note */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className={inputClass}
                            placeholder="Add a note..."
                            value={newBfNote}
                            onChange={(e) => setNewBfNote(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePostBfNote()}
                          />
                          <button
                            onClick={handlePostBfNote}
                            disabled={postingNote || !newBfNote.trim()}
                            className="px-3 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {postingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Post'}
                          </button>
                        </div>

                        {/* Activity List */}
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {bfActivity.length === 0 ? (
                            <p className="text-xs text-white/30 text-center py-4">No activity yet</p>
                          ) : (
                            bfActivity.map(act => (
                              <div key={act.id} className="flex gap-2 p-2 bg-white/5 rounded-lg">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                  {act.activity_type === 'status_change' ? <ArrowRightLeft className="w-3 h-3 text-blue-400" /> :
                                   act.activity_type === 'document_upload' ? <Upload className="w-3 h-3 text-green-400" /> :
                                   <MessageSquare className="w-3 h-3 text-white/50" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-white">
                                    {act.activity_type === 'status_change' 
                                      ? `Status changed: ${bfStatusLabels[act.old_status || '']?.label || act.old_status} → ${bfStatusLabels[act.new_status || '']?.label || act.new_status}`
                                      : act.note}
                                  </p>
                                  <p className="text-[10px] text-white/40 mt-0.5">
                                    {new Date(act.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                        {selectedBfApp.status === 'documents_pending' && (
                          <button
                            onClick={() => handleBfStatusChange('documents_complete')}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Mark Documents Complete
                          </button>
                        )}
                        {selectedBfApp.status === 'documents_complete' && (
                          <button
                            onClick={() => handleBfStatusChange('accounts_review')}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 rounded-lg transition-colors"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            Hand Over to Accounts
                          </button>
                        )}
                        {selectedBfApp.status === 'accounts_review' && (
                          <button
                            onClick={() => handleBfStatusChange('submitted_to_bank')}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 rounded-lg transition-colors"
                          >
                            <Building2 className="w-3 h-3" />
                            Submit to Bank
                          </button>
                        )}
                        {selectedBfApp.status === 'submitted_to_bank' && (
                          <>
                            <button
                              onClick={() => setShowApprovalModal(true)}
                              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-black bg-green-400 hover:bg-green-300 rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Mark Approved
                            </button>
                            <button
                              onClick={() => setShowRejectionModal(true)}
                              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-400 bg-red-400/20 hover:bg-red-400/30 border border-red-400/30 rounded-lg transition-colors"
                            >
                              <XCircle className="w-3 h-3" />
                              Mark Rejected
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Approval Modal */}
                  {showApprovalModal && selectedBfApp && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
                      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-white">✅ Mark as Approved</h4>
                          <button onClick={() => setShowApprovalModal(false)} className="text-white/40 hover:text-white">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className={labelClass}>Bank Reference Number *</label>
                            <input type="text" className={inputClass} value={approvalForm.bank_reference} onChange={(e) => setApprovalForm(prev => ({ ...prev, bank_reference: e.target.value }))} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelClass}>Approved Finance Amount *</label>
                              <input type="number" className={inputClass} value={approvalForm.approved_amount} onChange={(e) => setApprovalForm(prev => ({ ...prev, approved_amount: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div>
                              <label className={labelClass}>Down Payment</label>
                              <input type="number" className={inputClass} value={approvalForm.approved_down_payment} onChange={(e) => setApprovalForm(prev => ({ ...prev, approved_down_payment: parseFloat(e.target.value) || 0 }))} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelClass}>Interest Rate % *</label>
                              <input type="number" step="0.01" className={inputClass} value={approvalForm.approved_interest_rate} onChange={(e) => setApprovalForm(prev => ({ ...prev, approved_interest_rate: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div>
                              <label className={labelClass}>Tenure (Months) *</label>
                              <input type="number" className={inputClass} value={approvalForm.approved_tenure_months} onChange={(e) => setApprovalForm(prev => ({ ...prev, approved_tenure_months: parseInt(e.target.value) || 0 }))} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelClass}>Monthly EMI</label>
                              <input type="number" className={inputClass} value={approvalForm.approved_emi} onChange={(e) => setApprovalForm(prev => ({ ...prev, approved_emi: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div>
                              <label className={labelClass}>First EMI Date</label>
                              <input type="date" className={inputClass} value={approvalForm.first_emi_date} onChange={(e) => setApprovalForm(prev => ({ ...prev, first_emi_date: e.target.value }))} />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button onClick={() => setShowApprovalModal(false)} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
                          <button
                            onClick={handleBfApproval}
                            disabled={savingBfApp || !approvalForm.bank_reference || approvalForm.approved_amount <= 0}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-green-400 hover:bg-green-300 rounded-lg disabled:opacity-50"
                          >
                            {savingBfApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Confirm Approval
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rejection Modal */}
                  {showRejectionModal && selectedBfApp && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
                      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-white">❌ Mark as Rejected</h4>
                          <button onClick={() => setShowRejectionModal(false)} className="text-white/40 hover:text-white">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div>
                          <label className={labelClass}>Rejection Reason *</label>
                          <textarea
                            className={`${inputClass} min-h-[100px]`}
                            placeholder="e.g., Insufficient income, credit score too low..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button onClick={() => setShowRejectionModal(false)} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
                          <button
                            onClick={handleBfRejection}
                            disabled={savingBfApp || !rejectionReason.trim()}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-400 rounded-lg disabled:opacity-50"
                          >
                            {savingBfApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5">
          {/* Document Status Row - Show when SO exists */}
          {activeTab === 'sales_order' && existingSalesOrder && pdfUrl && (
            <div className={`mb-3 p-3 rounded-lg border ${
              signingStatus === 'completed' 
                ? 'bg-green-500/10 border-green-400/20' 
                : signingStatus === 'company_signed'
                ? 'bg-orange-500/10 border-orange-400/20'
                : signingStatus === 'sent' || signingStatus === 'delivered'
                ? 'bg-blue-500/10 border-blue-400/20'
                : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    signingStatus === 'completed' ? 'bg-green-400' :
                    signingStatus === 'company_signed' ? 'bg-orange-400 animate-pulse' :
                    signingStatus === 'sent' || signingStatus === 'delivered' ? 'bg-blue-400 animate-pulse' :
                    'bg-white/40'
                  }`} />
                  <span className={`text-xs font-medium ${
                    signingStatus === 'completed' ? 'text-green-400' :
                    signingStatus === 'company_signed' ? 'text-orange-400' :
                    signingStatus === 'sent' || signingStatus === 'delivered' ? 'text-blue-400' :
                    'text-white/60'
                  }`}>
                    {signingStatus === 'completed' ? '✓ Document Signed - Ready for Invoice' :
                     signingStatus === 'company_signed' ? 'Awaiting Customer Signature' :
                     signingStatus === 'sent' || signingStatus === 'delivered' ? 'Sent for Signing' :
                     `${existingSalesOrder.order_number} Generated`}
                  </span>
                  {docusignEnvelopeId && signingStatus !== 'completed' && (
                    <span className="text-[10px] text-white/30 font-mono">
                      {docusignEnvelopeId.slice(0, 8)}...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* View/Download PDF */}
                  <button
                    onClick={() => window.open(signedPdfUrl || pdfUrl, '_blank')}
                    className="px-2.5 py-1 text-xs font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded transition-colors flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    View
                  </button>
                  <button
                    onClick={async () => {
                      const url = signedPdfUrl || pdfUrl;
                      try {
                        const response = await fetch(url);
                        const blob = await response.blob();
                        const downloadUrl = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        link.download = `${existingSalesOrder.order_number}${signedPdfUrl ? '-SIGNED' : ''}.pdf`;
                        link.click();
                        window.URL.revokeObjectURL(downloadUrl);
                      } catch {
                        window.open(url, '_blank');
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Main Footer Buttons */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/40">
              {existingSalesOrder && (
                <span>{existingSalesOrder.order_number} • Created: {new Date(existingSalesOrder.created_at).toLocaleDateString()}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {existingSalesOrder ? 'Close' : 'Cancel'}
              </button>
              
              {/* Send for Signing - Show when PDF exists, not signed, and has customer email */}
              {activeTab === 'sales_order' && existingSalesOrder && pdfUrl && signingStatus === 'pending' && formData.customerEmail && (
                <button
                  onClick={handleSendForSigning}
                  disabled={sendingForSigning}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {sendingForSigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <ClipboardList className="w-4 h-4" />
                      Send for Signing
                    </>
                  )}
                </button>
              )}
              
              {/* Convert to Invoice - Only show when document is SIGNED */}
              {activeTab === 'sales_order' && existingSalesOrder && signingStatus === 'completed' && !isLocked && (
                <button
                  onClick={handleConvertToInvoice}
                  disabled={convertingToInvoice}
                  className="px-4 py-2 text-sm font-medium text-green-400 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {convertingToInvoice ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Invoice...
                    </>
                  ) : (
                    <>
                      <ScrollText className="w-4 h-4" />
                      Convert to Invoice
                    </>
                  )}
                </button>
              )}
              
              {/* Create/Update/Regenerate Sales Order - Requires canCreate (new) or canEdit (existing) */}
              {activeTab === 'sales_order' && !isLocked && (existingSalesOrder ? canEdit : canCreate) && (
                <button
                  onClick={handleSave}
                  disabled={saving || !canSave || saveSuccess}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm flex items-center gap-2 disabled:cursor-not-allowed ${
                    saveSuccess 
                      ? 'bg-green-500 text-white' 
                      : signingStatus === 'completed'
                        ? 'text-white bg-white/10 hover:bg-white/20 border border-white/20'
                        : 'text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100 disabled:opacity-50'
                  }`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {existingSalesOrder ? 'Regenerating...' : 'Creating...'}
                    </>
                  ) : saveSuccess ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      PDF Generated
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {!existingSalesOrder 
                        ? 'Create Sales Order' 
                        : signingStatus === 'completed'
                          ? 'Regenerate & Re-sign'
                          : signingStatus !== 'pending' 
                            ? 'Regenerate Sales Order' 
                            : 'Update Sales Order'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* Validation warnings */}
          {activeTab === 'sales_order' && !isLocked && missingFields.length > 0 && (
            <p className="text-[10px] text-yellow-400/70 mt-2 text-right">
              ⚠️ Required: {missingFields.slice(0, 3).join(', ')}{missingFields.length > 3 ? ` +${missingFields.length - 3} more` : ''}
            </p>
          )}
          
          {/* Helper text for missing email when PDF exists */}
          {activeTab === 'sales_order' && existingSalesOrder && pdfUrl && (signingStatus === 'pending' || (signingStatus === 'completed' && !isLocked)) && !formData.customerEmail && missingFields.length === 0 && (
            <p className="text-[10px] text-yellow-400/70 mt-2 text-right">
              💡 Add customer email to enable "Send for Signing"
            </p>
          )}
        </div>
      </div>
      
      {/* Company Signer Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 p-0.5 rounded-xl w-full max-w-xs shadow-2xl">
            <div className="bg-black/95 backdrop-blur-2xl rounded-xl p-4 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent pointer-events-none rounded-xl" />

              <div className="relative z-10 mb-4">
                <h3 className="text-sm font-semibold text-white">Select Company Signer</h3>
              </div>

              {/* Quick Select Buttons */}
              <div className="relative z-10 mb-3 flex flex-col gap-1.5">
                {[
                  { name: 'Samuel', email: 'samuel.sanjeev@silberarrows.com' },
                  { name: 'Glen', email: 'glen.hawkins@silberarrows.com' },
                  { name: 'Nick', email: 'nick.hurst@silberarrows.com' },
                ].map((signer) => (
                  <button
                    key={signer.email}
                    onClick={() => setCompanyEmail(signer.email)}
                    className={`w-full px-3 py-2 text-left text-xs rounded-lg border transition-all ${
                      companyEmail === signer.email
                        ? 'bg-blue-600/30 border-blue-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="font-medium">{signer.name}</span>
                    <span className="text-white/50 ml-1">({signer.email.split('@')[0]})</span>
                  </button>
                ))}
              </div>

              {/* Or manual input */}
              <div className="relative z-10 mb-3">
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="Or enter email..."
                  className="w-full px-3 py-2 text-xs bg-black border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                />
              </div>

              {/* Customer info */}
              <div className="relative z-10 mb-3 p-2 bg-white/5 rounded-lg border border-white/10">
                <p className="text-[10px] text-white/50 mb-0.5">Then sent to customer:</p>
                <p className="text-xs text-white/80">{formData.customerName} ({formData.customerEmail})</p>
              </div>

              <div className="relative z-10 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setCompanyEmail('');
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white/70 border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSendForSigning}
                  disabled={!companyEmail || sendingForSigning}
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50"
                >
                  {sendingForSigning ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Company Signer Email Modal */}
      {showInvoiceSigningModal && signingInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 p-0.5 rounded-xl w-full max-w-xs shadow-2xl">
            <div className="bg-black/95 backdrop-blur-2xl rounded-xl p-4 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent pointer-events-none rounded-xl" />

              <div className="relative z-10 mb-4">
                <h3 className="text-sm font-semibold text-white">Send Invoice for Signing</h3>
                <p className="text-xs text-white/50 mt-1">{signingInvoice.invoice_number}</p>
              </div>

              {/* Quick Select Buttons */}
              <div className="relative z-10 mb-3 flex flex-col gap-1.5">
                {[
                  { name: 'Samuel', email: 'samuel.sanjeev@silberarrows.com' },
                  { name: 'Glen', email: 'glen.hawkins@silberarrows.com' },
                  { name: 'Nick', email: 'nick.hurst@silberarrows.com' },
                ].map((signer) => (
                  <button
                    key={signer.email}
                    onClick={() => setInvoiceCompanyEmail(signer.email)}
                    className={`w-full px-3 py-2 text-left text-xs rounded-lg border transition-all ${
                      invoiceCompanyEmail === signer.email
                        ? 'bg-blue-600/30 border-blue-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="font-medium">{signer.name}</span>
                    <span className="text-white/50 ml-1">({signer.email.split('@')[0]})</span>
                  </button>
                ))}
              </div>

              {/* Or manual input */}
              <div className="relative z-10 mb-3">
                <input
                  type="email"
                  value={invoiceCompanyEmail}
                  onChange={(e) => setInvoiceCompanyEmail(e.target.value)}
                  placeholder="Or enter email..."
                  className="w-full px-3 py-2 text-xs bg-black border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                />
              </div>

              {/* Customer info */}
              <div className="relative z-10 mb-3 p-2 bg-white/5 rounded-lg border border-white/10">
                <p className="text-[10px] text-white/50 mb-0.5">Then sent to customer:</p>
                <p className="text-xs text-white/80">{formData.customerName} ({formData.customerEmail})</p>
              </div>

              <div className="relative z-10 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowInvoiceSigningModal(false);
                    setSigningInvoice(null);
                    setInvoiceCompanyEmail('');
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white/70 border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSendInvoiceForSigning}
                  disabled={!invoiceCompanyEmail || sendingInvoiceForSigning === signingInvoice.id}
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50"
                >
                  {sendingInvoiceForSigning === signingInvoice.id ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}

