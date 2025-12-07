"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';
import { X, FileText, Receipt, CreditCard, ClipboardList, ChevronDown, ChevronUp, Save, Loader2, Plus, Trash2 } from 'lucide-react';

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
  { key: 'invoices', label: 'Invoices', icon: <Receipt className="w-4 h-4" /> },
  { key: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
  { key: 'soa', label: 'SOA', icon: <ClipboardList className="w-4 h-4" /> },
];

// ===== STYLING =====
const inputClass = `
  w-full px-3 py-2 text-sm font-medium text-white
  bg-black/40 border border-white/10 rounded-lg
  hover:bg-black/50 hover:border-white/20
  focus:bg-black/60 focus:border-white/30 focus:ring-1 focus:ring-white/20
  focus:outline-none transition-all duration-150
  placeholder-white/40
  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
`.replace(/\s+/g, ' ').trim();

const selectClass = `
  w-full px-3 py-2 text-sm font-medium text-white
  bg-black/40 border border-white/10 rounded-lg
  hover:bg-black/50 hover:border-white/20
  focus:bg-black/60 focus:border-white/30 focus:ring-1 focus:ring-white/20
  focus:outline-none transition-all duration-150
  appearance-none cursor-pointer
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
  const [newCreditNote, setNewCreditNote] = useState({ amount: 0, reason: '' });
  const [newRefund, setNewRefund] = useState({ amount: 0, reason: '', method: 'bank_transfer', reference: '', invoiceId: '' });
  
  // SOA state
  const [soaData, setSoaData] = useState<any[]>([]);
  const [soaBalance, setSoaBalance] = useState<any>(null);
  const [loadingSoa, setLoadingSoa] = useState(false);
  
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

  // Load existing sales order if any
  useEffect(() => {
    if (isOpen && lead.id) {
      loadExistingSalesOrder();
    }
  }, [isOpen, lead.id]);

  // Load payments for this customer
  useEffect(() => {
    if (isOpen && lead.id) {
      loadPayments();
    }
  }, [isOpen, lead.id]);

  // Load adjustments for this customer
  useEffect(() => {
    if (isOpen && lead.id) {
      loadAdjustments();
    }
  }, [isOpen, lead.id]);

  // Load SOA when tab is selected
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
      // First, save any pending changes to the sales order
      await handleSave();
      
      // Call the database function to convert SO to Invoice
      const { data, error } = await supabase
        .rpc('convert_so_to_invoice', {
          p_sales_order_id: existingSalesOrder.id,
          p_created_by: user?.id
        });
      
      if (error) throw error;
      
      // Reload invoices
      await loadInvoices(existingSalesOrder.id);
      
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
      }
      
      // Reload payments (allocations may have been deleted)
      await loadPayments();
      
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
        setPayments(paymentsData.map(p => ({
          ...p,
          amount: parseFloat(p.total_amount) || 0,
          allocated_amount: parseFloat(p.allocated_amount) || 0,
          unallocated_amount: parseFloat(p.unallocated_amount) || 0,
        })));
      }
      
      // Load allocations for invoices in this SO
      if (existingSalesOrder) {
        const { data: allocData, error: allocError } = await supabase
          .from('uv_payment_allocations')
          .select(`
            *,
            uv_payments!inner(payment_number),
            uv_invoices!inner(invoice_number, sales_order_id)
          `)
          .eq('uv_invoices.sales_order_id', existingSalesOrder.id);
        
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
      
      // Reload payments
      await loadPayments();
      
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
      
      // Reload data
      await loadPayments();
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
      
      // Reload data
      await loadPayments();
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

  // Load SOA data
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
      
      // Get balance summary
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
      
      // Reload data
      await loadAdjustments();
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
      
      // Reload data
      await loadAdjustments();
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

  const handleSave = async () => {
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

      if (existingSalesOrder) {
        // Update existing Sales Order
        const { data, error } = await supabase
          .from('uv_sales_orders')
          .update(salesOrderData)
          .eq('id', existingSalesOrder.id)
          .select()
          .single();
        
        if (error) throw error;
        setExistingSalesOrder(data);
        salesOrderId = data.id;
        onSalesOrderUpdated?.(data);
      } else {
        // Create new Sales Order
        const { data, error } = await supabase
          .from('uv_sales_orders')
          .insert(salesOrderData)
          .select()
          .single();
        
        if (error) throw error;
        setExistingSalesOrder(data);
        salesOrderId = data.id;
        setCreatingNewSO(false);
        // Add to the list of all SOs
        setAllSalesOrders(prev => [data, ...prev]);
        onSalesOrderCreated?.(data);
      }

      // Save line items
      await saveLineItems(salesOrderId);
      
    } catch (error: any) {
      console.error('Error saving sales order:', error);
      if (error.message?.includes('does not exist')) {
        alert('Database table not found. Please run the SQL migration first.');
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

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-5xl h-[85vh] bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
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
            
            {/* Right: Invoice Status Strip + Close Button */}
            <div className="flex items-start gap-4">
              {/* Quick Status Strip - Show from initial status or loaded invoices */}
              {(() => {
                // Use loaded invoice data if available, otherwise use initial status from hook
                const hasInvoiceData = invoices.length > 0;
                const hasInitialStatus = initialAccountingStatus?.invoiceNumber;
                
                if (!hasInvoiceData && !hasInitialStatus) return null;
                
                const activeInvoice = invoices.find(inv => inv.status !== 'reversed') || invoices[0];
                const totalInvoiced = hasInvoiceData 
                  ? invoices.filter(i => i.status !== 'reversed').reduce((sum, i) => sum + i.total_amount, 0)
                  : (initialAccountingStatus?.totalAmount || 0);
                const totalPaid = hasInvoiceData 
                  ? invoices.filter(i => i.status !== 'reversed').reduce((sum, i) => sum + (i.paid_amount || 0), 0)
                  : (initialAccountingStatus?.paidAmount || 0);
                const totalBalance = hasInvoiceData 
                  ? invoices.filter(i => i.status !== 'reversed').reduce((sum, i) => sum + (i.balance_due || 0), 0)
                  : (initialAccountingStatus?.balanceDue || 0);
                const invoiceNumber = activeInvoice?.invoice_number || initialAccountingStatus?.invoiceNumber || '-';
                
                return (
                  <div className="flex items-center gap-4 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-center px-2">
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">Invoice</p>
                      <p className="text-xs font-semibold text-white">{invoiceNumber}</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center px-2">
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">Amount</p>
                      <p className="text-xs font-semibold text-white">{totalInvoiced.toLocaleString()}</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center px-2">
                      <p className="text-[9px] text-green-400/70 uppercase tracking-wider">Paid</p>
                      <p className="text-xs font-semibold text-green-400">{totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center px-2">
                      <p className="text-[9px] text-orange-400/70 uppercase tracking-wider">Balance</p>
                      <p className={`text-xs font-semibold ${totalBalance > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                        {totalBalance > 0 ? totalBalance.toLocaleString() : 'Paid ✓'}
                      </p>
                    </div>
                  </div>
                );
              })()}
              
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all
                  ${activeTab === tab.key 
                    ? 'bg-white/10 text-white border-b-2 border-white/50' 
                    : 'text-white/50 hover:text-white/70 hover:bg-white/5'}
                `}
              >
                {tab.icon}
                {tab.label}
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
                  {/* Locked Indicator */}
                  {isLocked && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                      <span className="text-xs font-medium text-yellow-400">Locked — Invoice exists</span>
                    </div>
                  )}

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
                        className="w-4 h-4 rounded border-white/20 bg-black/40 text-blue-500 focus:ring-blue-500/30"
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
                        className="w-4 h-4 rounded border-white/20 bg-black/40 text-blue-500 focus:ring-blue-500/30"
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
                        className="w-4 h-4 rounded border-white/20 bg-black/40 text-blue-500 focus:ring-blue-500/30"
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
                      <div className="flex bg-black/40 rounded-lg p-1 gap-1">
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
                            <Receipt className="w-4 h-4" />
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
                        <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm mb-3">No invoices yet</p>
                        <p className="text-xs">Click "Convert to Invoice" to create one</p>
                      </div>
                    </div>
                  )}

                  {/* Invoice List */}
                  {!loadingInvoices && invoices.length > 0 && (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div 
                          key={invoice.id} 
                          className={`bg-white/5 border rounded-xl p-4 ${
                            invoice.status === 'reversed' 
                              ? 'border-red-500/30 opacity-60' 
                              : invoice.status === 'paid'
                              ? 'border-green-500/30'
                              : 'border-white/10'
                          }`}
                        >
                          {/* Invoice Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Receipt className="w-5 h-5 text-white/60" />
                              <div>
                                <p className="text-sm font-bold text-white">{invoice.invoice_number}</p>
                                <p className="text-xs text-white/50">
                                  {new Date(invoice.invoice_date).toLocaleDateString('en-GB', { 
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                invoice.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                invoice.status === 'partial' ? 'bg-blue-500/20 text-blue-400' :
                                invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                              </span>
                            </div>
                          </div>

                          {/* Invoice Amounts */}
                          <div className="py-3 border-t border-b border-white/10 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-white/50">Invoice Total</span>
                              <span className="font-medium text-white">AED {formatCurrency(invoice.total_amount)}</span>
                            </div>
                            {(invoice.credit_note_total || 0) > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-purple-400">Credit Notes</span>
                                <span className="font-medium text-purple-400">-AED {formatCurrency(invoice.credit_note_total || 0)}</span>
                              </div>
                            )}
                            {(invoice.credit_note_total || 0) > 0 && (
                              <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                                <span className="text-white/50">Net Amount</span>
                                <span className="font-medium text-white">AED {formatCurrency(invoice.total_amount - (invoice.credit_note_total || 0))}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-green-400">Paid</span>
                              <span className="font-medium text-green-400">AED {formatCurrency(invoice.paid_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                              <span className="text-white/70 font-medium">Balance Due</span>
                              <span className={`font-bold ${invoice.balance_due > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                AED {formatCurrency(invoice.balance_due)}
                              </span>
                            </div>
                          </div>

                          {/* Reversal Info */}
                          {invoice.status === 'reversed' && invoice.reversal_reason && (
                            <div className="mt-3 p-2 bg-red-500/10 rounded-lg">
                              <p className="text-xs text-red-400">
                                <strong>Reversed:</strong> {invoice.reversal_reason}
                              </p>
                            </div>
                          )}

                          {/* Credit Notes for this invoice */}
                          {adjustments.filter(a => a.adjustment_type === 'credit_note' && a.invoice_id === invoice.id).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                              <p className="text-xs text-white/50 uppercase tracking-wide">Credit Notes:</p>
                              {adjustments
                                .filter(a => a.adjustment_type === 'credit_note' && a.invoice_id === invoice.id)
                                .map(cn => (
                                  <div key={cn.id} className="flex items-center justify-between bg-purple-500/10 p-2 rounded-lg">
                                    <div>
                                      <span className="text-xs font-medium text-purple-400">{cn.adjustment_number}</span>
                                      <span className="text-xs text-white/50 ml-2">{cn.reason}</span>
                                    </div>
                                    <span className="text-xs font-medium text-purple-400">-AED {formatCurrency(cn.amount)}</span>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Add Credit Note Form */}
                          {showCreditNoteForm === invoice.id && (
                            <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                              <p className="text-xs text-white/50 uppercase tracking-wide">New Credit Note</p>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="number"
                                  placeholder="Amount"
                                  value={newCreditNote.amount || ''}
                                  onChange={(e) => setNewCreditNote(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                  className={`${inputClass} text-sm`}
                                />
                                <input
                                  type="text"
                                  placeholder="Reason"
                                  value={newCreditNote.reason}
                                  onChange={(e) => setNewCreditNote(prev => ({ ...prev, reason: e.target.value }))}
                                  className={`${inputClass} text-sm`}
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setShowCreditNoteForm(null)}
                                  className="px-3 py-1.5 text-xs text-white/50 hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleAddCreditNote(invoice.id)}
                                  disabled={savingAdjustment}
                                  className="px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {savingAdjustment ? 'Saving...' : 'Add Credit Note'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-white/10">
                            {invoice.status !== 'reversed' && invoice.balance_due > 0 && !showCreditNoteForm && (
                              <button
                                onClick={() => setShowCreditNoteForm(invoice.id)}
                                className="px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors"
                              >
                                + Credit Note
                              </button>
                            )}
                            {invoice.pdf_url && (
                              <a
                                href={invoice.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 text-xs font-medium text-white/70 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                              >
                                View PDF
                              </a>
                            )}
                            {invoice.status !== 'reversed' && invoice.status !== 'paid' && (
                              <button
                                onClick={() => handleReverseInvoice(invoice)}
                                className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                              >
                                Reverse
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Invoice Reversal Confirmation Form */}
                  {reversingInvoice && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-semibold text-white">Reverse Invoice</h3>
                        <p className="text-sm text-white/60">
                          You are about to reverse invoice <span className="text-white font-medium">{reversingInvoice.invoice_number}</span>. 
                          This action cannot be undone.
                        </p>
                        <Field label="Reason for Reversal *">
                          <input
                            type="text"
                            value={reversalReason}
                            onChange={(e) => setReversalReason(e.target.value)}
                            placeholder="Enter the reason for reversing this invoice..."
                            className="w-full px-3 py-2 text-sm font-medium text-white bg-black/40 border border-white/10 rounded-lg focus:border-white/30 focus:ring-1 focus:ring-white/20"
                          />
                        </Field>
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={() => {
                              setReversingInvoice(null);
                              setReversalReason('');
                            }}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white/70 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={confirmReverseInvoice}
                            disabled={!reversalReason.trim()}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Confirm Reversal
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="space-y-4">
                  {/* Header with Add Payment button */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Customer Payments</h3>
                    <button
                      onClick={() => setShowAddPaymentForm(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100 rounded-lg transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Payment
                    </button>
                  </div>

                  {/* Add Payment Form */}
                  {showAddPaymentForm && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                      <h4 className="text-sm font-semibold text-white">New Payment</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Amount (AED)">
                          <input
                            type="number"
                            className={inputClass}
                            value={newPayment.amount || ''}
                            onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            step="0.01"
                          />
                        </Field>
                        <Field label="Payment Method">
                          <select
                            className={selectClass}
                            value={newPayment.payment_method}
                            onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value as Payment['payment_method'] }))}
                          >
                            {paymentMethods.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Payment Date">
                          <input
                            type="date"
                            className={inputClass}
                            value={newPayment.payment_date}
                            onChange={(e) => setNewPayment(prev => ({ ...prev, payment_date: e.target.value }))}
                          />
                        </Field>
                        <Field label="Reference">
                          <input
                            type="text"
                            className={inputClass}
                            value={newPayment.reference}
                            onChange={(e) => setNewPayment(prev => ({ ...prev, reference: e.target.value }))}
                            placeholder="Cheque #, Transfer Ref..."
                          />
                        </Field>
                        {(newPayment.payment_method === 'cheque' || newPayment.payment_method === 'bank_transfer') && (
                          <Field label="Bank Name">
                            <input
                              type="text"
                              className={inputClass}
                              value={newPayment.bank_name}
                              onChange={(e) => setNewPayment(prev => ({ ...prev, bank_name: e.target.value }))}
                              placeholder="Bank name"
                            />
                          </Field>
                        )}
                        <Field label="Notes" className="col-span-2">
                          <input
                            type="text"
                            className={inputClass}
                            value={newPayment.notes}
                            onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Optional notes..."
                          />
                        </Field>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setShowAddPaymentForm(false)}
                          className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddPayment}
                          disabled={savingPayment || newPayment.amount <= 0}
                          className="px-4 py-2 text-sm font-medium text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {savingPayment ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Payment'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Loading */}
                  {loadingPayments && (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                    </div>
                  )}

                  {/* No payments */}
                  {!loadingPayments && payments.length === 0 && !showAddPaymentForm && (
                    <div className="flex items-center justify-center h-48 text-white/40 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-center">
                        <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm mb-3">No payments recorded</p>
                        <button
                          onClick={() => setShowAddPaymentForm(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100 rounded-lg transition-all shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add First Payment
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payments List */}
                  {!loadingPayments && payments.length > 0 && (
                    <div className="space-y-3">
                      {payments.map((payment) => {
                        const isUnallocated = (payment.unallocated_amount || 0) > 0;
                        const paymentAllocations = allocations.filter(a => a.payment_id === payment.id);
                        
                        return (
                          <div 
                            key={payment.id} 
                            className={`bg-white/5 border rounded-xl p-4 ${
                              isUnallocated ? 'border-yellow-500/30' : 'border-white/10'
                            }`}
                          >
                            {/* Payment Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <CreditCard className="w-5 h-5 text-white/60" />
                                <div>
                                  <p className="text-sm font-bold text-white">{payment.payment_number}</p>
                                  <p className="text-xs text-white/50">
                                    {new Date(payment.payment_date).toLocaleDateString('en-GB', { 
                                      day: '2-digit', 
                                      month: 'short', 
                                      year: 'numeric' 
                                    })} • {paymentMethods.find(m => m.value === payment.payment_method)?.label}
                                    {payment.reference && ` • ${payment.reference}`}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-green-400">AED {formatCurrency(payment.amount)}</p>
                                {isUnallocated && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400">
                                    {formatCurrency(payment.unallocated_amount || 0)} unallocated
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Allocations */}
                            {paymentAllocations.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                                <p className="text-xs text-white/50 uppercase tracking-wide">Allocated to:</p>
                                {paymentAllocations.map(alloc => (
                                  <div key={alloc.id} className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                                    <span className="text-sm text-white/80">{alloc.invoice_number}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-white">AED {formatCurrency(alloc.amount)}</span>
                                      <button
                                        onClick={() => handleUnallocate(alloc.id)}
                                        className="text-red-400 hover:text-red-300 text-xs"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Allocate Button */}
                            {isUnallocated && invoices.some(inv => inv.status !== 'reversed' && inv.balance_due > 0) && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                {allocatingPayment === payment.id ? (
                                  <div className="space-y-3">
                                    <p className="text-xs text-white/50 uppercase tracking-wide">Allocate to invoice:</p>
                                    {invoices
                                      .filter(inv => inv.status !== 'reversed' && inv.balance_due > 0)
                                      .map(inv => {
                                        const maxAmount = Math.min(payment.unallocated_amount || 0, inv.balance_due);
                                        const isSelected = allocationInvoiceId === inv.id;
                                        
                                        return (
                                          <div key={inv.id} className={`p-3 rounded-lg transition-colors ${isSelected ? 'bg-green-500/20 border border-green-500/30' : 'bg-black/20'}`}>
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <span className="text-sm text-white/80">{inv.invoice_number}</span>
                                                <span className="text-xs text-white/50 ml-2">Balance: AED {formatCurrency(inv.balance_due)}</span>
                                              </div>
                                              {!isSelected && (
                                                <button
                                                  onClick={() => {
                                                    setAllocationInvoiceId(inv.id);
                                                    setAllocationAmount(maxAmount);
                                                  }}
                                                  className="px-3 py-1 text-xs font-medium text-green-400 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                                                >
                                                  Select
                                                </button>
                                              )}
                                            </div>
                                            {isSelected && (
                                              <div className="mt-3 flex items-center gap-2">
                                                <input
                                                  type="number"
                                                  value={allocationAmount || ''}
                                                  onChange={(e) => setAllocationAmount(Math.min(parseFloat(e.target.value) || 0, maxAmount))}
                                                  className={`${inputClass} w-32 text-sm`}
                                                  placeholder="Amount"
                                                  max={maxAmount}
                                                />
                                                <span className="text-xs text-white/50">Max: {formatCurrency(maxAmount)}</span>
                                                <button
                                                  onClick={() => {
                                                    if (allocationAmount > 0) {
                                                      handleAllocatePayment(payment.id, inv.id, allocationAmount);
                                                      setAllocationInvoiceId(null);
                                                      setAllocationAmount(0);
                                                    }
                                                  }}
                                                  disabled={allocationAmount <= 0}
                                                  className="px-3 py-1.5 text-xs font-medium text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 rounded-lg disabled:opacity-50"
                                                >
                                                  Allocate
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setAllocationInvoiceId(null);
                                                    setAllocationAmount(0);
                                                  }}
                                                  className="text-xs text-white/50 hover:text-white"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    <button
                                      onClick={() => {
                                        setAllocatingPayment(null);
                                        setAllocationInvoiceId(null);
                                        setAllocationAmount(0);
                                      }}
                                      className="text-xs text-white/50 hover:text-white"
                                    >
                                      Close
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setAllocatingPayment(payment.id)}
                                    className="w-full px-3 py-2 text-sm font-medium text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-lg transition-colors"
                                  >
                                    Allocate to Invoice
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary */}
                  {!loadingPayments && payments.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-white/50 uppercase tracking-wide">Total Received</p>
                          <p className="text-lg font-bold text-green-400">
                            AED {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50 uppercase tracking-wide">Allocated</p>
                          <p className="text-lg font-bold text-white">
                            AED {formatCurrency(payments.reduce((sum, p) => sum + (p.allocated_amount || 0), 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50 uppercase tracking-wide">Unallocated</p>
                          <p className={`text-lg font-bold ${payments.some(p => (p.unallocated_amount || 0) > 0) ? 'text-yellow-400' : 'text-white/50'}`}>
                            AED {formatCurrency(payments.reduce((sum, p) => sum + (p.unallocated_amount || 0), 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Refunds Section */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Refunds</h3>
                      <button
                        onClick={() => setShowRefundForm(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Issue Refund
                      </button>
                    </div>

                    {/* Add Refund Form */}
                    {showRefundForm && (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 space-y-3">
                        <p className="text-xs text-white/50 uppercase tracking-wide">New Refund</p>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Against Invoice" className="col-span-2">
                            <select
                              value={newRefund.invoiceId}
                              onChange={(e) => setNewRefund(prev => ({ ...prev, invoiceId: e.target.value }))}
                              className={selectClass}
                            >
                              <option value="">Select Invoice</option>
                              {invoices
                                .filter(inv => inv.status !== 'reversed' && inv.paid_amount > 0)
                                .map(inv => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.invoice_number} - Paid: AED {formatCurrency(inv.paid_amount)}
                                  </option>
                                ))}
                            </select>
                          </Field>
                          <Field label="Amount (AED)">
                            <input
                              type="number"
                              value={newRefund.amount || ''}
                              onChange={(e) => setNewRefund(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                              className={inputClass}
                              placeholder="0.00"
                            />
                          </Field>
                          <Field label="Method">
                            <select
                              value={newRefund.method}
                              onChange={(e) => setNewRefund(prev => ({ ...prev, method: e.target.value }))}
                              className={selectClass}
                            >
                              <option value="cash">Cash</option>
                              <option value="bank_transfer">Bank Transfer</option>
                              <option value="cheque">Cheque</option>
                            </select>
                          </Field>
                          <Field label="Reference" className="col-span-1">
                            <input
                              type="text"
                              value={newRefund.reference}
                              onChange={(e) => setNewRefund(prev => ({ ...prev, reference: e.target.value }))}
                              className={inputClass}
                              placeholder="Optional"
                            />
                          </Field>
                          <Field label="Reason" className="col-span-1">
                            <input
                              type="text"
                              value={newRefund.reason}
                              onChange={(e) => setNewRefund(prev => ({ ...prev, reason: e.target.value }))}
                              className={inputClass}
                              placeholder="Reason for refund"
                            />
                          </Field>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            onClick={() => setShowRefundForm(false)}
                            className="px-3 py-1.5 text-xs text-white/50 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddRefund}
                            disabled={savingAdjustment || !newRefund.invoiceId}
                            className="px-4 py-2 text-sm font-medium text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100 rounded-lg transition-all shadow-sm disabled:opacity-50"
                          >
                            {savingAdjustment ? 'Saving...' : 'Issue Refund'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Refunds List */}
                    {adjustments.filter(a => a.adjustment_type === 'refund').length === 0 && !showRefundForm && (
                      <div className="text-center py-4 text-white/40">
                        <p className="text-sm">No refunds issued</p>
                      </div>
                    )}

                    {adjustments.filter(a => a.adjustment_type === 'refund').length > 0 && (
                      <div className="space-y-2">
                        {adjustments
                          .filter(a => a.adjustment_type === 'refund')
                          .map(refund => (
                            <div key={refund.id} className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-orange-400">{refund.adjustment_number}</p>
                                <p className="text-xs text-white/50">
                                  {refund.reason} • {refund.refund_method}
                                  {refund.refund_reference && ` • ${refund.refund_reference}`}
                                </p>
                              </div>
                              <p className="text-sm font-bold text-orange-400">-AED {formatCurrency(refund.amount)}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
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
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <div className="text-xs text-white/40">
            {existingSalesOrder && (
              <span>Created: {new Date(existingSalesOrder.created_at).toLocaleDateString()}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            
            {/* Show Convert to Invoice button only on Sales Order tab when SO exists, not locked, and no active invoice */}
            {activeTab === 'sales_order' && existingSalesOrder && lineItems.length > 0 && !isLocked && (
              <button
                onClick={handleConvertToInvoice}
                disabled={convertingToInvoice}
                className="px-4 py-2 text-sm font-medium text-green-500 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {convertingToInvoice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Invoice...
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4" />
                    Convert to Invoice →
                  </>
                )}
              </button>
            )}
            
            {!isLocked && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-black bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100 rounded-lg transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {existingSalesOrder ? 'Update' : 'Create'} Sales Order
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

