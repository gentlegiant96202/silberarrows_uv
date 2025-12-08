"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';
import { X, FileText, ArrowRightLeft, CreditCard, ClipboardList, ChevronDown, ChevronUp, Save, Loader2, Plus, Trash2, ScrollText, ExternalLink } from 'lucide-react';

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
  // Calculated fields from view
  allocated_amount?: number;
  unallocated_amount?: number;
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
  { value: 'part_exchange', label: 'Part Exchange (Deduction)', defaultDescription: 'Part Exchange Trade-in Value' },
  { value: 'other', label: 'Other', defaultDescription: '' },
];

// ===== TABS =====
type TabKey = 'sales_order' | 'invoices' | 'payments' | 'soa';

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'sales_order', label: 'Sales Order', icon: <FileText className="w-4 h-4" /> },
  { key: 'invoices', label: 'Invoices', icon: <ScrollText className="w-4 h-4" /> },
  { key: 'payments', label: 'Transactions', icon: <ArrowRightLeft className="w-4 h-4" /> },
  { key: 'soa', label: 'SOA', icon: <ClipboardList className="w-4 h-4" /> },
];

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
  const [newRefund, setNewRefund] = useState({ amount: 0, reason: '', method: 'bank_transfer', reference: '', invoiceId: '' });
  
  // SOA state
  const [soaData, setSoaData] = useState<any[]>([]);
  const [soaBalance, setSoaBalance] = useState<any>(null);
  const [loadingSoa, setLoadingSoa] = useState(false);
  
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
      .filter(item => item.line_type !== 'part_exchange')
      .reduce((sum, item) => sum + item.line_total, 0);
    
    const partExchangeValue = lineItems
      .filter(item => item.line_type === 'part_exchange')
      .reduce((sum, item) => sum + Math.abs(item.line_total), 0);
    
    const total = subtotal - partExchangeValue;
    
    return { subtotal, partExchangeValue, total };
  };

  const { subtotal, partExchangeValue, total } = calculateTotals();
  
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
        
        // Make part exchange negative
        if (updated.line_type === 'part_exchange') {
          updated.line_total = -Math.abs(updated.line_total);
        }
      }
      
      // Handle part exchange sign change
      if (field === 'line_type' && value === 'part_exchange') {
        updated.line_total = -Math.abs(updated.line_total);
      } else if (field === 'line_type' && value !== 'part_exchange' && updated.line_total < 0) {
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
            vehicleMakeModel: `Mercedes-Benz ${data.vehicle_model || ''}`,
            modelYear: data.model_year || 0,
            chassisNo: data.chassis_number || '',
            vehicleColour: data.colour || '',
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
              description: `Mercedes-Benz ${data.vehicle_model || ''} ${data.model_year || ''}`,
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
      // Load payments using the summary view
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('uv_payment_summary')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      
      if (paymentsError && !paymentsError.message?.includes('does not exist')) {
        throw paymentsError;
      }
      
      if (paymentsData) {
        // Also fetch pdf_url from base table (not in view)
        const paymentIds = paymentsData.map(p => p.id);
        let pdfUrls: Record<string, string> = {};
        
        if (paymentIds.length > 0) {
          const { data: pdfData } = await supabase
            .from('uv_payments')
            .select('id, pdf_url')
            .in('id', paymentIds);
          
          if (pdfData) {
            pdfUrls = pdfData.reduce((acc, p) => {
              if (p.pdf_url) acc[p.id] = p.pdf_url;
              return acc;
            }, {} as Record<string, string>);
          }
        }
        
        setPayments(paymentsData.map(p => ({
          ...p,
          amount: parseFloat(p.total_amount) || 0,
          allocated_amount: parseFloat(p.allocated_amount) || 0,
          unallocated_amount: parseFloat(p.unallocated_amount) || 0,
          pdf_url: pdfUrls[p.id] || undefined,
        })));
        
        // Load ALL allocations for this customer's payments (not just current SO)
        const paymentIds = paymentsData.map(p => p.id);
        if (paymentIds.length > 0) {
          const { data: allocData, error: allocError } = await supabase
            .from('uv_payment_allocations')
            .select(`
              *,
              uv_payments!inner(payment_number),
              uv_invoices!inner(invoice_number)
            `)
            .in('payment_id', paymentIds);
          
          if (!allocError && allocData) {
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
        }
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

  // Add refund
  const handleAddRefund = async () => {
    if (!newRefund.invoiceId) {
      alert('Please select an invoice');
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
    
    setSavingAdjustment(true);
    try {
      const { data, error } = await supabase
        .from('uv_adjustments')
        .insert({
          adjustment_type: 'refund',
          lead_id: lead.id,
          invoice_id: newRefund.invoiceId,
          amount: newRefund.amount,
          reason: newRefund.reason,
          refund_method: newRefund.method,
          refund_reference: newRefund.reference || null,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Reset form
      setNewRefund({ amount: 0, reason: '', method: 'bank_transfer', reference: '', invoiceId: '' });
      setShowRefundForm(false);
      
      // Reload data and SOA balance
      await loadAdjustments();
      await loadSoaBalance();
      if (existingSalesOrder) {
        await loadInvoices(existingSalesOrder.id);
      }
      
      alert(`Refund ${data.adjustment_number} created successfully!`);
    } catch (error: any) {
      console.error('Error creating refund:', error);
      alert('Error creating refund: ' + error.message);
    } finally {
      setSavingAdjustment(false);
    }
  };

  // Generate Receipt PDF
  const handleGenerateReceipt = async (paymentId: string) => {
    setGeneratingReceiptId(paymentId);
    try {
      const response = await fetch('/api/generate-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate receipt');
      }

      // Reload payments to get updated PDF URL
      await loadPayments();
    } catch (error: any) {
      console.error('Error generating receipt:', error);
      alert('Error generating receipt: ' + error.message);
    } finally {
      setGeneratingReceiptId(null);
    }
  };

  // Generate Credit Note PDF
  const handleGenerateCreditNote = async (adjustmentId: string) => {
    setGeneratingCreditNoteId(adjustmentId);
    try {
      const response = await fetch('/api/generate-credit-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustmentId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate credit note');
      }

      // Reload adjustments to get updated PDF URL
      await loadAdjustments();
    } catch (error: any) {
      console.error('Error generating credit note:', error);
      alert('Error generating credit note: ' + error.message);
    } finally {
      setGeneratingCreditNoteId(null);
    }
  };

  // Generate Refund PDF
  const handleGenerateRefund = async (adjustmentId: string) => {
    setGeneratingRefundId(adjustmentId);
    try {
      const response = await fetch('/api/generate-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustmentId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate refund');
      }

      // Reload adjustments to get updated PDF URL
      await loadAdjustments();
    } catch (error: any) {
      console.error('Error generating refund:', error);
      alert('Error generating refund: ' + error.message);
    } finally {
      setGeneratingRefundId(null);
    }
  };

  // Parse warranty string from inventory
  const parseWarrantyString = (warrantyStr: string | null | undefined) => {
    if (!warrantyStr) return { hasWarranty: false, expiry: '', km: 0 };
    
    const lowerStr = warrantyStr.toLowerCase();
    if (!lowerStr.includes('warranty') && !lowerStr.includes('dealer') && !lowerStr.includes('manufacturer')) {
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

  // Parse service string from inventory
  const parseServiceString = (serviceStr: string | null | undefined) => {
    if (!serviceStr) return { hasService: false, expiry: '', km: 0 };
    
    const lowerStr = serviceStr.toLowerCase();
    if (!lowerStr.includes('service')) {
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
    try {
      // Delete existing line items for this sales order
      await supabase
        .from('uv_sales_order_lines')
        .delete()
        .eq('sales_order_id', salesOrderId);
      
      // Insert new line items
      if (lineItems.length > 0) {
        const lineItemsToInsert = lineItems.map((item, index) => ({
          sales_order_id: salesOrderId,
          line_type: item.line_type,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          sort_order: index + 1
        }));
        
        const { data: insertedItems, error } = await supabase
          .from('uv_sales_order_lines')
          .insert(lineItemsToInsert)
          .select();
        
        if (error) throw error;
        
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
            {tabs.map(tab => (
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
                  {/* Form content - disabled when locked */}
                  <fieldset disabled={isLocked} className={`space-y-6 ${isLocked ? 'opacity-60' : ''}`} style={{ border: 'none', padding: 0, margin: 0 }}>
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
                      <button
                        onClick={addLineItem}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100 rounded-lg transition-all shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Line
                      </button>
                    </div>
                    <div className="p-4">
                      {lineItems.length === 0 ? (
                        <div className="text-center py-8 text-white/40">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm mb-3">No line items yet</p>
                          <button
                            onClick={addLineItem}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100 rounded-lg transition-all shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Add First Line Item
                          </button>
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
                                item.line_type === 'part_exchange' 
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
                                item.line_type === 'part_exchange' ? 'text-red-400' : 'text-white'
                              }`}>
                                {item.line_type === 'part_exchange' && item.line_total !== 0 ? '-' : ''}
                                {formatCurrency(Math.abs(item.line_total))}
                              </div>
                              <div className="col-span-1 flex justify-end">
                                <button
                                  onClick={() => removeLineItem(item.id)}
                                  className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          {/* Totals */}
                          <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-white/60">Subtotal</span>
                              <span className="text-white font-medium">AED {formatCurrency(subtotal)}</span>
                            </div>
                            {partExchangeValue > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-red-400">Part Exchange Deduction</span>
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
                    <textarea
                      className={`${inputClass} min-h-[80px] resize-none`}
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Any additional notes..."
                    />
                  </Section>
                  </fieldset>
                </div>
              )}

              {activeTab === 'invoices' && (
                <div className="space-y-4">
                  {/* Header with Convert button */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Invoices</h3>
                    {existingSalesOrder && !isLocked && (
                      <button
                        onClick={handleConvertToInvoice}
                        disabled={convertingToInvoice || lineItems.length === 0}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                        const isPaid = invoice.status === 'paid';
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

                                {/* Reverse Action - Separate section */}
                                {!isReversed && invoice.signing_status !== 'completed' && (
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
                            {/* Add Payment Button */}
                            {!showAddPaymentForm && (
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
                                      {payment.pdf_url ? (
                                        <a
                                          href={payment.pdf_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2 py-1 text-[10px] font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                                        >
                                          View Receipt
                                        </a>
                                      ) : (
                                        <button
                                          onClick={() => handleGenerateReceipt(payment.id)}
                                          disabled={generatingReceiptId === payment.id}
                                          className="px-2 py-1 text-[10px] font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                                        >
                                          {generatingReceiptId === payment.id ? 'Generating...' : 'Generate Receipt'}
                                        </button>
                                      )}
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-white">+{formatCurrency(payment.amount)}</p>
                                        {isUnallocated && <p className="text-[10px] text-amber-400">{formatCurrency(payment.unallocated_amount || 0)} unallocated</p>}
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
                                  {/* Allocate */}
                                  {isUnallocated && invoices.some(inv => inv.status !== 'reversed' && inv.balance_due > 0) && (
                                    <div className="mt-2 pt-2 border-t border-white/5">
                                      {allocatingPayment === payment.id ? (
                                        <div className="space-y-2">
                                          {invoices.filter(inv => inv.status !== 'reversed' && inv.balance_due > 0).map(inv => {
                                            const maxAmount = Math.min(payment.unallocated_amount || 0, inv.balance_due);
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
                            {/* Add Credit Note Button */}
                            {!showCreditNoteForm && (
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
                                    {cn.pdf_url ? (
                                      <a
                                        href={cn.pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 text-[10px] font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                                      >
                                        View
                                      </a>
                                    ) : (
                                      <button
                                        onClick={() => handleGenerateCreditNote(cn.id)}
                                        disabled={generatingCreditNoteId === cn.id}
                                        className="px-2 py-1 text-[10px] font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                                      >
                                        {generatingCreditNoteId === cn.id ? 'Generating...' : 'Generate Credit Note'}
                                      </button>
                                    )}
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
                            {/* Add Refund Button */}
                            {!showRefundForm && (
                              <button
                                onClick={() => setShowRefundForm(true)}
                                disabled={!invoices.some(i => i.status !== 'reversed' && i.paid_amount > 0)}
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
                                  <Field label="Invoice">
                                    <select value={newRefund.invoiceId} onChange={(e) => setNewRefund(prev => ({ ...prev, invoiceId: e.target.value }))} className={selectClass}>
                                      <option value="">Select</option>
                                      {invoices.filter(inv => inv.status !== 'reversed' && inv.paid_amount > 0).map(inv => <option key={inv.id} value={inv.id}>{inv.invoice_number}</option>)}
                                    </select>
                                  </Field>
                                  <Field label="Amount">
                                    <input type="number" value={newRefund.amount || ''} onChange={(e) => setNewRefund(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} className={inputClass} placeholder="0.00" />
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
                                  <button onClick={handleAddRefund} disabled={savingAdjustment || !newRefund.invoiceId} className="px-3 py-1.5 text-xs font-medium text-black bg-white rounded-lg disabled:opacity-50">
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
                                    {refund.pdf_url ? (
                                      <a
                                        href={refund.pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 text-[10px] font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                                      >
                                        View
                                      </a>
                                    ) : (
                                      <button
                                        onClick={() => handleGenerateRefund(refund.id)}
                                        disabled={generatingRefundId === refund.id}
                                        className="px-2 py-1 text-[10px] font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                                      >
                                        {generatingRefundId === refund.id ? 'Generating...' : 'Generate Refund'}
                                      </button>
                                    )}
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
              
              {/* Create/Update/Regenerate Sales Order - Show when not locked */}
              {activeTab === 'sales_order' && !isLocked && (
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

