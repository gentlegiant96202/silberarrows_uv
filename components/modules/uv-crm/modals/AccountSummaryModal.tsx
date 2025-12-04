'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';
import { useUserRole } from '@/lib/useUserRole';
import { 
  X, FileText, CreditCard, Receipt, ClipboardList, List,
  Plus, Trash2, Download, Eye, Check, DollarSign, Car, User,
  Phone, Mail, Calendar, Banknote, Shield, Sparkles, ScrollText,
  Building2, Upload, CheckCircle2, Clock, AlertCircle, ChevronRight
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================
interface Lead {
  id: string;
  full_name: string;
  country_code?: string;
  phone_number: string;
  model_of_interest: string;
  inventory_car_id?: string;
}

interface InventoryCar {
  id: string;
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

interface FormData {
  salesExecutive: string;
  date: string;
  customerName: string;
  contactNo: string;
  emailAddress: string;
  customerIdType: 'EID' | 'Passport';
  customerIdNumber: string;
  makeModel: string;
  modelYear: number;
  chassisNo: string;
  exteriorColour: string;
  interiorColour: string;
  mileage: number;
  manufacturerWarranty: boolean;
  manufacturerWarrantyExpiryDate: string;
  manufacturerWarrantyExpiryMileage: number;
  dealerServicePackage: boolean;
  dealerServicePackageExpiryDate: string;
  dealerServicePackageExpiryMileage: number;
  hasPartExchange: boolean;
  partExchangeMakeModel: string;
  partExchangeModelYear: string;
  partExchangeChassisNo: string;
  partExchangeExteriorColour: string;
  partExchangeEngineNo: string;
  partExchangeMileage: string;
  partExchangeValue: number;
  extendedWarranty: boolean;
  extendedWarrantyPrice: number;
  ceramicTreatment: boolean;
  ceramicTreatmentPrice: number;
  serviceCare: boolean;
  serviceCarePrice: number;
  windowTints: boolean;
  windowTintsPrice: number;
  rtaFees: number;
  vehicleSalePrice: number;
  addOnsTotal: number;
  invoiceTotal: number;
  deposit: number;
  amountDue: number;
  additionalNotes: string;
}

interface Charge {
  id: string;
  reservation_id: string;
  charge_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  vat_applicable: boolean;
  vat_rate: number;
  vat_amount: number;
  display_order: number;
}

interface Payment {
  id: string;
  lead_id: string;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  amount: number;
  allocated_amount: number;
  unallocated_amount: number;
  status: string;
  bank_name: string | null;
  cheque_number: string | null;
  cheque_date: string | null;
  part_exchange_vehicle: string | null;
  part_exchange_chassis: string | null;
  receipt_number: string | null;
  notes: string | null;
}

interface AccountSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  mode: 'reservation' | 'invoice';
  lead: Lead;
}

type TabType = 'form' | 'charges' | 'payments' | 'soa' | 'finance' | 'documents';

type SaleType = 'cash' | 'finance';
type FinanceStatus = 'pending_docs' | 'docs_ready' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'funds_received';

interface Bank {
  id: string;
  name: string;
  is_active: boolean;
}

interface FinanceDocument {
  type: string;
  url: string;
  uploaded_at: string;
  uploaded_by?: string;
}

const FINANCE_DOCUMENT_TYPES = [
  { key: 'emirates_id_front', label: 'Emirates ID (Front)', required: true, multiple: false },
  { key: 'emirates_id_back', label: 'Emirates ID (Back)', required: true, multiple: false },
  { key: 'passport', label: 'Passport', required: true, multiple: false },
  { key: 'visa_page', label: 'Visa Page', required: true, multiple: false },
  { key: 'salary_certificate', label: 'Salary Certificate', required: true, multiple: false },
  { key: 'bank_statement', label: '6-Month Bank Statements', required: true, multiple: true, maxCount: 6 },
  { key: 'trade_license', label: 'Trade License (Self-employed)', required: false, multiple: false },
  { key: 'other', label: 'Other Documents', required: false, multiple: true },
];

const FINANCE_STATUS_CONFIG: Record<FinanceStatus, { label: string; color: string; icon: any }> = {
  pending_docs: { label: 'Documents Required', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Clock },
  docs_ready: { label: 'Documents Ready', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: CheckCircle2 },
  submitted: { label: 'Submitted to Bank', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', icon: Building2 },
  under_review: { label: 'Bank Reviewing', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', icon: Clock },
  approved: { label: 'Approved', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: AlertCircle },
  funds_received: { label: 'Funds Received', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
};

const CHARGE_TYPES = [
  { value: 'vehicle_sale', label: 'Vehicle Sale' },
  { value: 'extended_warranty', label: 'Extended Warranty' },
  { value: 'ceramic_treatment', label: 'Ceramic' },
  { value: 'service_care_standard', label: 'ServiceCare - Standard' },
  { value: 'service_care_premium', label: 'ServiceCare - Premium' },
  { value: 'window_tints', label: 'Tints' },
  { value: 'rta_fees', label: 'RTA Fees' },
  { value: 'other_addon', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard },
  { value: 'cheque', label: 'Cheque', icon: FileText },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'part_exchange', label: 'Part Exchange', icon: Car },
  { value: 'finance', label: 'Finance', icon: DollarSign },
  { value: 'refund', label: '↩ Refund', icon: DollarSign },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AccountSummaryModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  lead
}: AccountSummaryModalProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const [activeTab, setActiveTab] = useState<TabType>('form');

  const getUserDisplayName = () => {
    if (!user) return '';
    if (user.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user.email) {
      const emailPrefix = user.email.split('@')[0];
      return emailPrefix.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'User';
  };

  const [formData, setFormData] = useState<FormData>({
    salesExecutive: getUserDisplayName(),
    date: new Date().toISOString().split('T')[0],
    customerName: lead.full_name,
    contactNo: `${lead.country_code || '+971'} ${lead.phone_number}`,
    emailAddress: '',
    customerIdType: 'EID',
    customerIdNumber: '',
    makeModel: lead.model_of_interest,
    modelYear: 0,
    chassisNo: '',
    exteriorColour: '',
    interiorColour: '',
    mileage: 0,
    manufacturerWarranty: false,
    manufacturerWarrantyExpiryDate: '',
    manufacturerWarrantyExpiryMileage: 0,
    dealerServicePackage: false,
    dealerServicePackageExpiryDate: '',
    dealerServicePackageExpiryMileage: 0,
    hasPartExchange: false,
    partExchangeMakeModel: '',
    partExchangeModelYear: '',
    partExchangeChassisNo: '',
    partExchangeExteriorColour: '',
    partExchangeEngineNo: '',
    partExchangeMileage: '',
    partExchangeValue: 0,
    extendedWarranty: false,
    extendedWarrantyPrice: 0,
    ceramicTreatment: false,
    ceramicTreatmentPrice: 0,
    serviceCare: false,
    serviceCarePrice: 0,
    windowTints: false,
    windowTintsPrice: 0,
    rtaFees: 0,
    vehicleSalePrice: 0,
    addOnsTotal: 0,
    invoiceTotal: 0,
    deposit: 0,
    amountDue: 0,
    additionalNotes: '',
  });

  const [inventoryCar, setInventoryCar] = useState<InventoryCar | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [dealNumber, setDealNumber] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [documentNumber, setDocumentNumber] = useState<string | null>(null);
  const [reservationNumber, setReservationNumber] = useState<string | null>(null);
  const [customerNumber, setCustomerNumber] = useState<string | null>(null);
  const [documentStatus, setDocumentStatus] = useState<string>('pending');
  const [invoiceStatus, setInvoiceStatus] = useState<string>('pending');
  const [currentDocumentType, setCurrentDocumentType] = useState<string>('reservation');
  
  // Bank Finance state
  const [saleType, setSaleType] = useState<SaleType>('cash');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [customBankName, setCustomBankName] = useState<string>('');
  const [downpaymentPercent, setDownpaymentPercent] = useState<number>(20);
  const [financeVehiclePrice, setFinanceVehiclePrice] = useState<number>(0);
  const [financeDownpayment, setFinanceDownpayment] = useState<number>(0);
  const [financeTerm, setFinanceTerm] = useState<number>(36);
  const [financeStatus, setFinanceStatus] = useState<FinanceStatus>('pending_docs');
  const [financeBankReference, setFinanceBankReference] = useState<string>('');
  const [financeDocuments, setFinanceDocuments] = useState<FinanceDocument[]>([]);
  const [financeNotes, setFinanceNotes] = useState<string>('');
  const [financeStatusHistory, setFinanceStatusHistory] = useState<Array<{ status: string; timestamp: string; }>>([]);
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [bankSearchTerm, setBankSearchTerm] = useState('');
  
  // Document URLs - store both separately
  const [reservationPdfUrl, setReservationPdfUrl] = useState<string | null>(null);
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  
  // DocuSign state
  const [docusignEnvelopeId, setDocusignEnvelopeId] = useState<string | null>(null);
  const [signingStatus, setSigningStatus] = useState<string>('pending');
  const [sendingForSigning, setSendingForSigning] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [companyEmail, setCompanyEmail] = useState('');

  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentAllocations, setPaymentAllocations] = useState<Map<string, { reservation_id: string; allocated_amount: number; document_number: string | null }[]>>(new Map());
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAllocatePayment, setShowAllocatePayment] = useState(false);
  const [selectedPaymentForAllocation, setSelectedPaymentForAllocation] = useState<Payment | null>(null);
  const [allocationAmount, setAllocationAmount] = useState<number>(0);
  const [allocatingPayment, setAllocatingPayment] = useState(false);
  const [newCharge, setNewCharge] = useState({ charge_type: 'vehicle_sale', description: '', unit_price: 0, vat_applicable: false });
  const [newPayment, setNewPayment] = useState({ payment_method: 'cash', amount: 0, reference_number: '', notes: '', bank_name: '', cheque_number: '', cheque_date: '', part_exchange_vehicle: '', part_exchange_chassis: '' });
  const [generatingSOA, setGeneratingSOA] = useState(false);
  
  // Track if we have unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // All charges and payments now come from DB (no more pending arrays)
  const allCharges = charges;
  const allPayments = payments;

  const chargesTotals = {
    subtotal: allCharges.reduce((sum, c) => sum + (c.total_amount || c.unit_price || 0), 0),
    vat: allCharges.reduce((sum, c) => sum + (c.vat_amount || 0), 0),
    get grandTotal() { return this.subtotal + this.vat; },
    // Separate payments received from refunds given
    paymentsReceived: payments
      .filter(p => p.amount > 0 && p.payment_method !== 'refund')
      .reduce((sum, p) => sum + (p.amount || 0), 0),
    refundsGiven: payments
      .filter(p => p.amount < 0 || p.payment_method === 'refund')
      .reduce((sum, p) => sum + Math.abs(p.amount || 0), 0),
    // Net paid = payments received minus refunds given
    get totalPaid() { return this.paymentsReceived - this.refundsGiven; },
    // Balance = what's owed minus what we actually received (net of refunds)
    get balanceDue() { return this.grandTotal - this.totalPaid; }
  };

  // Finance calculations - using manual inputs
  const financeCalculations = {
    vehiclePrice: financeVehiclePrice || formData.vehicleSalePrice,
    downpaymentAmount: financeDownpayment,
    get financeAmount() { return this.vehiclePrice - this.downpaymentAmount; },
    get customerOwes() { return saleType === 'finance' ? this.downpaymentAmount : chargesTotals.grandTotal; },
    get customerPaid() { return chargesTotals.totalPaid; },
    get customerBalance() { return this.customerOwes - this.customerPaid; }
  };

  // ============================================================
  // CREATE RESERVATION (when modal opens and none exists)
  // ============================================================
  const createReservation = useCallback(async (carData?: InventoryCar) => {
    if (creatingDraft) return null;
    setCreatingDraft(true);
    
    try {
      // Double-check no reservation exists (race condition protection)
      const { data: existingRes } = await supabase
        .from('vehicle_reservations')
        .select('id, document_number, customer_number, document_status, document_type')
        .eq('lead_id', lead.id)
        .maybeSingle();
      
      if (existingRes) {
        // Reservation already exists, use it instead of creating new
        setReservationId(existingRes.id);
        setDocumentNumber(existingRes.document_number);
        setCustomerNumber(existingRes.customer_number);
        setDocumentStatus(existingRes.document_status || 'pending');
        setCurrentDocumentType(existingRes.document_type || mode);
        setIsEditing(true);
        return existingRes;
      }

      const reservationData = {
        lead_id: lead.id,
        document_type: mode,
        document_status: 'pending',
        sales_executive: formData.salesExecutive || 'TBD',
        document_date: formData.date,
        customer_name: formData.customerName || lead.full_name || 'TBD',
        contact_no: formData.contactNo || '',
        email_address: formData.emailAddress || '',
        customer_id_type: formData.customerIdType || 'EID',
        customer_id_number: formData.customerIdNumber || '',
        vehicle_make_model: carData?.vehicle_model || formData.makeModel || lead.model_of_interest || 'TBD',
        model_year: carData?.model_year || formData.modelYear || 0,
        chassis_no: carData?.chassis_number || formData.chassisNo || '',
        vehicle_exterior_colour: carData?.colour || formData.exteriorColour || '',
        vehicle_interior_colour: carData?.interior_colour || formData.interiorColour || '',
        vehicle_mileage: carData?.current_mileage_km || formData.mileage || 0,
        vehicle_sale_price: carData?.advertised_price_aed || formData.vehicleSalePrice || 0,
        invoice_total: carData?.advertised_price_aed || formData.vehicleSalePrice || 0,
        amount_due: carData?.advertised_price_aed || formData.vehicleSalePrice || 0,
        created_by: user?.id || null,
      };

      const { data: newReservation, error } = await supabase
        .from('vehicle_reservations')
        .insert([reservationData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating reservation:', error.message, error.details, error.hint);
        throw error;
      }

      setReservationId(newReservation.id);
      setDealNumber(newReservation.deal_number);
      setDocumentNumber(newReservation.document_number);
      setCustomerNumber(newReservation.customer_number);
      setDocumentStatus('pending');
      setCurrentDocumentType(mode);
      setIsEditing(true);

      // CREATE INVOICE for this deal
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          deal_id: newReservation.id,
          invoice_date: formData.date,
          status: 'pending',
          subtotal: 0,
          total_amount: 0,
          paid_amount: 0,
          created_by: user?.id
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError.message);
      } else if (newInvoice) {
        setInvoiceId(newInvoice.id);
        setInvoiceNumber(newInvoice.invoice_number);
        setInvoiceStatus(newInvoice.status);
      }

      // Auto-add Vehicle Sale as first charge if car has a price
      if (carData?.advertised_price_aed && carData.advertised_price_aed > 0 && newInvoice) {
        const { error: chargeError } = await supabase.from('uv_charges').insert({
          reservation_id: newReservation.id,
          invoice_id: newInvoice.id,
          charge_type: 'vehicle_sale',
          description: `Vehicle Sale - ${carData.vehicle_model || 'Vehicle'}`,
          quantity: 1,
          unit_price: carData.advertised_price_aed,
          vat_applicable: false,
          display_order: 0,
          created_by: user?.id
        });
        if (chargeError) {
          console.error('Error adding vehicle sale charge:', chargeError.message);
        }
      }

      return newReservation;
    } catch (error: any) {
      console.error('Error creating reservation:', error?.message || error);
      return null;
    } finally {
      setCreatingDraft(false);
    }
  }, [lead.id, lead.model_of_interest, mode, formData.salesExecutive, formData.date, formData.customerName, formData.contactNo, formData.makeModel, user?.id, creatingDraft]);

  // ============================================================
  // DATA LOADING
  // ============================================================
  const loadData = useCallback(async (showLoader = true) => {
    if (!lead.id) return;
    if (showLoader) setLoading(true);

    try {
      // Check if reservation exists first
      let resData: any = null;
      const { data: existingRes } = await supabase.from('vehicle_reservations').select('*').eq('lead_id', lead.id).maybeSingle();
      resData = existingRes;
      
      // Load car data first (we need it for draft creation)
      let carData: InventoryCar | null = null;
      if (lead.inventory_car_id) {
        const { data: carResult } = await supabase.from('cars').select('*').eq('id', lead.inventory_car_id).single();
        if (carResult) {
          carData = carResult;
          setInventoryCar(carResult);
          setFormData(prev => ({
            ...prev,
            makeModel: carResult.vehicle_model || '',
            modelYear: carResult.model_year || 0,
            chassisNo: carResult.chassis_number || '',
            exteriorColour: carResult.colour || '',
            interiorColour: carResult.interior_colour || '',
            mileage: carResult.current_mileage_km || 0,
            vehicleSalePrice: carResult.advertised_price_aed || 0,
          }));
        }
      }

      // CREATE RESERVATION if none exists
      if (!resData) {
        const newRes = await createReservation(carData || undefined);
        if (newRes) {
          resData = newRes;
          // Reload charges after draft creation
          const { data: chargesData } = await supabase.from('uv_charges').select('*').eq('reservation_id', newRes.id).order('display_order');
          setCharges(chargesData || []);
        }
      }

      if (resData) {
        setIsEditing(true);
        setReservationId(resData.id);
        setCustomerNumber(resData.customer_number);
        setDocumentStatus(resData.document_status || 'pending');
        setCurrentDocumentType(resData.document_type || 'reservation');
        // Set document numbers - RES number is either current (if reservation) or original (if invoice)
        setDocumentNumber(resData.document_number);
        setReservationNumber(
          resData.document_type === 'reservation' 
            ? resData.document_number 
            : resData.original_reservation_number || null
        );
        // Document URLs are now loaded from invoices table below

        setFormData(prev => ({
          ...prev,
          salesExecutive: resData.sales_executive || prev.salesExecutive,
          date: resData.document_date || prev.date,
          customerName: resData.customer_name || prev.customerName,
          contactNo: resData.contact_no || prev.contactNo,
          emailAddress: resData.email_address || '',
          customerIdType: resData.customer_id_type || 'EID',
          customerIdNumber: resData.customer_id_number || '',
          makeModel: resData.vehicle_make_model || prev.makeModel,
          modelYear: resData.model_year || prev.modelYear,
          chassisNo: resData.chassis_no || prev.chassisNo,
          exteriorColour: resData.vehicle_exterior_colour || resData.vehicle_colour || prev.exteriorColour,
          interiorColour: resData.vehicle_interior_colour || prev.interiorColour,
          mileage: resData.vehicle_mileage || prev.mileage,
          manufacturerWarranty: resData.manufacturer_warranty || false,
          manufacturerWarrantyExpiryDate: resData.manufacturer_warranty_expiry_date || '',
          manufacturerWarrantyExpiryMileage: resData.manufacturer_warranty_expiry_mileage || 0,
          dealerServicePackage: resData.dealer_service_package || false,
          dealerServicePackageExpiryDate: resData.dealer_service_package_expiry_date || '',
          dealerServicePackageExpiryMileage: resData.dealer_service_package_expiry_mileage || 0,
          hasPartExchange: resData.has_part_exchange || false,
          partExchangeMakeModel: resData.part_exchange_make_model || '',
          partExchangeModelYear: resData.part_exchange_model_year || '',
          partExchangeChassisNo: resData.part_exchange_chassis_no || '',
          partExchangeExteriorColour: resData.part_exchange_exterior_colour || '',
          partExchangeEngineNo: resData.part_exchange_engine_no || '',
          partExchangeMileage: resData.part_exchange_mileage || '',
          partExchangeValue: resData.part_exchange_value || 0,
          extendedWarranty: resData.extended_warranty || false,
          extendedWarrantyPrice: resData.extended_warranty_price || 0,
          ceramicTreatment: resData.ceramic_treatment || false,
          ceramicTreatmentPrice: resData.ceramic_treatment_price || 0,
          serviceCare: resData.service_care || false,
          serviceCarePrice: resData.service_care_price || 0,
          windowTints: resData.window_tints || false,
          windowTintsPrice: resData.window_tints_price || 0,
          rtaFees: resData.rta_fees || 0,
          vehicleSalePrice: resData.vehicle_sale_price || prev.vehicleSalePrice,
          addOnsTotal: resData.add_ons_total || 0,
          invoiceTotal: resData.invoice_total || 0,
          deposit: resData.deposit || 0,
          amountDue: resData.amount_due || 0,
          additionalNotes: resData.additional_notes || '',
        }));

        const { data: chargesData } = await supabase.from('uv_charges').select('*').eq('reservation_id', resData.id).order('display_order');
        setCharges(chargesData || []);
        
        // Load invoice data for this deal
        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('*')
          .eq('deal_id', resData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (invoiceData) {
          setInvoiceId(invoiceData.id);
          setInvoiceNumber(invoiceData.invoice_number);
          setInvoiceStatus(invoiceData.status);
          // Load PDF URLs from invoice
          setReservationPdfUrl(invoiceData.reservation_pdf_url || null);
          setInvoicePdfUrl(invoiceData.invoice_pdf_url || null);
          setSignedPdfUrl(invoiceData.reservation_signed_pdf_url || invoiceData.invoice_signed_pdf_url || null);
          setDocusignEnvelopeId(invoiceData.reservation_docusign_envelope_id || invoiceData.invoice_docusign_envelope_id || null);
          setSigningStatus(invoiceData.reservation_signing_status || invoiceData.invoice_signing_status || 'pending');
        } else {
          // No invoice exists yet for this deal - create one
          const { data: newInvoice } = await supabase
            .from('invoices')
            .insert({
              deal_id: resData.id,
              invoice_date: resData.document_date || new Date().toISOString().split('T')[0],
              status: 'pending',
              subtotal: 0,
              total_amount: 0,
              paid_amount: 0,
              created_by: user?.id
            })
            .select()
            .single();
          
          if (newInvoice) {
            setInvoiceId(newInvoice.id);
            setInvoiceNumber(newInvoice.invoice_number);
            setInvoiceStatus(newInvoice.status);
          }
        }
        
        // Set deal number
        setDealNumber(resData.deal_number || resData.document_number);
        
        // Load finance data - only populate if sale_type is 'finance'
        const isFinanceSale = resData.sale_type === 'finance';
        setSaleType(resData.sale_type || 'cash');
        setSelectedBankId(isFinanceSale ? (resData.finance_bank_id || null) : null);
        setCustomBankName(isFinanceSale ? (resData.finance_bank_name || '') : '');
        setDownpaymentPercent(isFinanceSale ? (resData.downpayment_percent || 20) : 20);
        setFinanceVehiclePrice(isFinanceSale ? (resData.finance_vehicle_price || 0) : 0);
        setFinanceDownpayment(isFinanceSale ? (resData.downpayment_amount || 0) : 0);
        setFinanceTerm(isFinanceSale ? (resData.finance_term || 36) : 36);
        setFinanceStatus(isFinanceSale ? (resData.finance_status || 'pending_docs') : 'pending_docs');
        setFinanceBankReference(isFinanceSale ? (resData.finance_bank_reference || '') : '');
        setFinanceDocuments(isFinanceSale ? (resData.finance_documents || []) : []);
        setFinanceNotes(isFinanceSale ? (resData.finance_notes || '') : '');
        setFinanceStatusHistory(isFinanceSale ? (resData.finance_status_history || []) : []);
      }

      const { data: paymentsData } = await supabase.from('uv_payments').select('*').eq('lead_id', lead.id).order('payment_date', { ascending: false }).order('created_at', { ascending: false });
      setPayments(paymentsData || []);
      
      // Fetch payment allocations
      if (paymentsData && paymentsData.length > 0) {
        const paymentIds = paymentsData.map(p => p.id);
        const { data: allocationsData } = await supabase
          .from('uv_payment_allocations')
          .select('payment_id, reservation_id, allocated_amount')
          .in('payment_id', paymentIds);
        
        if (allocationsData && allocationsData.length > 0) {
          // Get document numbers for reservations
          const resIds = [...new Set(allocationsData.map(a => a.reservation_id))];
          const { data: resDocs } = await supabase
            .from('vehicle_reservations')
            .select('id, document_number')
            .in('id', resIds);
          
          const docMap = new Map<string, string | null>();
          resDocs?.forEach(r => docMap.set(r.id, r.document_number));
          
          const allocMap = new Map<string, { reservation_id: string; allocated_amount: number; document_number: string | null }[]>();
          allocationsData.forEach(a => {
            const existing = allocMap.get(a.payment_id) || [];
            existing.push({
              reservation_id: a.reservation_id,
              allocated_amount: a.allocated_amount,
              document_number: docMap.get(a.reservation_id) || null
            });
            allocMap.set(a.payment_id, existing);
          });
          setPaymentAllocations(allocMap);
        } else {
          setPaymentAllocations(new Map());
        }
      }
      
      // Load banks for dropdown
      const { data: banksData } = await supabase.from('banks').select('*').eq('is_active', true).order('name');
      setBanks(banksData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [lead.id, lead.inventory_car_id, mode]);

  useEffect(() => {
    if (isOpen) {
      // Reset finance state when modal opens
      setSaleType('cash');
      setSelectedBankId(null);
      setCustomBankName('');
      setDownpaymentPercent(20);
      setFinanceVehiclePrice(0);
      setFinanceDownpayment(0);
      setFinanceTerm(36);
      setFinanceStatus('pending_docs');
      setFinanceBankReference('');
      setFinanceDocuments([]);
      setFinanceNotes('');
      setFinanceStatusHistory([]);
      loadData();
      setActiveTab('form');
    }
  }, [isOpen, loadData]);

  // Reset to form tab if sale type is cash but active tab is finance
  useEffect(() => {
    if (saleType === 'cash' && activeTab === 'finance') {
      setActiveTab('form');
    }
  }, [saleType, activeTab]);

  useEffect(() => {
    const addOnsTotal =
      (formData.extendedWarranty ? formData.extendedWarrantyPrice : 0) +
      (formData.ceramicTreatment ? formData.ceramicTreatmentPrice : 0) +
      (formData.serviceCare ? formData.serviceCarePrice : 0) +
      (formData.windowTints ? formData.windowTintsPrice : 0);
    const invoiceTotal = formData.vehicleSalePrice + formData.rtaFees + addOnsTotal;
    // Amount due is calculated from payments tracked in Payments tab
    const totalPaid = chargesTotals.totalPaid || 0;
    const partExchangeCredit = formData.hasPartExchange ? formData.partExchangeValue : 0;
    const amountDue = invoiceTotal - totalPaid - partExchangeCredit;
    setFormData(prev => ({ ...prev, addOnsTotal, invoiceTotal, amountDue }));
  }, [formData.extendedWarrantyPrice, formData.ceramicTreatmentPrice, formData.serviceCarePrice, formData.windowTintsPrice, formData.vehicleSalePrice, formData.rtaFees, formData.partExchangeValue, formData.extendedWarranty, formData.ceramicTreatment, formData.serviceCare, formData.windowTints, formData.hasPartExchange, chargesTotals.totalPaid]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Save finance data to DB (for existing reservations)
  const saveFinanceData = useCallback(async (updates: Record<string, any>) => {
    if (!reservationId) return; // Only save if reservation exists
    
    try {
      const { error } = await supabase
        .from('vehicle_reservations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', reservationId);
      
      if (error) {
        console.error('Failed to save finance data:', error);
      }
    } catch (err) {
      console.error('Error saving finance data:', err);
    }
  }, [reservationId]);

  // Handle sale type toggle
  const handleSaleTypeChange = (newSaleType: SaleType) => {
    setSaleType(newSaleType);
    
    // Don't auto-initialize - let user enter values manually
    
    // Auto-save for existing reservations
    if (reservationId) {
      const financeData = newSaleType === 'finance' 
        ? {
            sale_type: newSaleType,
            finance_vehicle_price: financeVehiclePrice || formData.vehicleSalePrice,
            downpayment_percent: downpaymentPercent,
            downpayment_amount: financeDownpayment || Math.round((financeVehiclePrice || formData.vehicleSalePrice) * (downpaymentPercent / 100)),
            finance_amount: (financeVehiclePrice || formData.vehicleSalePrice) - (financeDownpayment || Math.round((financeVehiclePrice || formData.vehicleSalePrice) * (downpaymentPercent / 100))),
            finance_status: financeStatus,
          }
        : {
            sale_type: newSaleType,
            finance_bank_id: null,
            finance_bank_name: null,
            finance_vehicle_price: null,
            downpayment_percent: null,
            downpayment_amount: null,
            finance_amount: null,
            finance_status: null,
            finance_bank_reference: null,
            finance_documents: [],
            finance_notes: null,
          };
      saveFinanceData(financeData);
    }
  };

  // Handle finance field changes (auto-save for existing reservations)
  const handleFinanceFieldChange = useCallback((field: string, value: any) => {
    // Update local state
    switch (field) {
      case 'selectedBankId':
        setSelectedBankId(value);
        if (reservationId) saveFinanceData({ finance_bank_id: value, finance_bank_name: null });
        break;
      case 'customBankName':
        setCustomBankName(value);
        if (reservationId) saveFinanceData({ finance_bank_name: value, finance_bank_id: null });
        break;
      case 'downpaymentPercent':
        setDownpaymentPercent(value);
        // Also update the downpayment amount based on new percentage
        const newDpAmount = Math.round(financeVehiclePrice * (value / 100));
        setFinanceDownpayment(newDpAmount);
        if (reservationId) saveFinanceData({ downpayment_percent: value, downpayment_amount: newDpAmount, finance_amount: financeVehiclePrice - newDpAmount });
        break;
      case 'financeVehiclePrice':
        setFinanceVehiclePrice(value);
        // Recalculate downpayment based on percentage
        const recalcDp = Math.round(value * (downpaymentPercent / 100));
        setFinanceDownpayment(recalcDp);
        if (reservationId) saveFinanceData({ finance_vehicle_price: value, downpayment_amount: recalcDp, finance_amount: value - recalcDp });
        break;
      case 'financeDownpayment':
        setFinanceDownpayment(value);
        // Update percentage based on manual downpayment entry
        if (financeVehiclePrice > 0) {
          const newPercent = Math.round((value / financeVehiclePrice) * 100);
          setDownpaymentPercent(Math.min(100, Math.max(0, newPercent)));
        }
        if (reservationId) saveFinanceData({ downpayment_amount: value, finance_amount: financeVehiclePrice - value });
        break;
      case 'financeTerm':
        setFinanceTerm(value);
        if (reservationId) saveFinanceData({ finance_term: value });
        break;
      case 'financeStatus':
        setFinanceStatus(value);
        // Record status change with timestamp
        const newHistory = [...financeStatusHistory, { status: value, timestamp: new Date().toISOString() }];
        setFinanceStatusHistory(newHistory);
        if (reservationId) saveFinanceData({ finance_status: value, finance_status_history: newHistory });
        break;
      case 'financeBankReference':
        setFinanceBankReference(value);
        if (reservationId) saveFinanceData({ finance_bank_reference: value });
        break;
      case 'financeNotes':
        setFinanceNotes(value);
        if (reservationId) saveFinanceData({ finance_notes: value });
        break;
      case 'financeDocuments':
        setFinanceDocuments(value);
        if (reservationId) saveFinanceData({ finance_documents: value });
        break;
    }
  }, [reservationId, saveFinanceData, chargesTotals.grandTotal, financeStatusHistory, financeVehiclePrice, downpaymentPercent]);

  // Handle payment allocation
  const handleAllocatePayment = async () => {
    if (!selectedPaymentForAllocation || !reservationId || !invoiceId || allocationAmount <= 0) return;
    
    setAllocatingPayment(true);
    try {
      // Check if allocation already exists
      const { data: existing } = await supabase
        .from('uv_payment_allocations')
        .select('id, allocated_amount')
        .eq('payment_id', selectedPaymentForAllocation.id)
        .eq('invoice_id', invoiceId)
        .maybeSingle();
      
      if (existing) {
        // Update existing allocation
        const { error } = await supabase
          .from('uv_payment_allocations')
          .update({ allocated_amount: existing.allocated_amount + allocationAmount })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Create new allocation with invoice_id
        const { error } = await supabase
          .from('uv_payment_allocations')
          .insert({
            payment_id: selectedPaymentForAllocation.id,
            reservation_id: reservationId,
            invoice_id: invoiceId,
            allocated_amount: allocationAmount
          });
        
        if (error) throw error;
      }
      
      // Refresh data
      await loadData();
      setShowAllocatePayment(false);
      setSelectedPaymentForAllocation(null);
    } catch (err) {
      console.error('Error allocating payment:', err);
      alert('Failed to allocate payment');
    } finally {
      setAllocatingPayment(false);
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    // Customer fields
    if (!formData.customerName?.trim()) errors.push('Customer Name is required');
    if (!formData.contactNo?.trim()) errors.push('Phone Number is required');
    if (!formData.emailAddress?.trim()) errors.push('Email Address is required');
    if (!formData.customerIdNumber?.trim()) errors.push('ID Number is required');
    
    // Vehicle fields
    if (!formData.makeModel?.trim()) errors.push('Vehicle Make & Model is required');
    if (!formData.modelYear || formData.modelYear <= 0) errors.push('Vehicle Year is required');
    if (!formData.chassisNo?.trim()) errors.push('Chassis Number is required');
    
    // Charges
    if (allCharges.length === 0) errors.push('At least one charge is required');
    
    // Payment required for reservation
    if (mode === 'reservation' && allPayments.length === 0) {
      errors.push('At least one payment (deposit) is required for reservation');
    }
    
    // Invoice can be generated even with outstanding balance
    // (Removed restriction that required full payment)
    
    return errors;
  };

  // Build reservation data object (reusable for save and generate)
  const buildReservationData = () => ({
    lead_id: lead.id,
    document_type: mode,
    sales_executive: formData.salesExecutive,
    document_date: formData.date,
    customer_name: formData.customerName,
    contact_no: formData.contactNo,
    email_address: formData.emailAddress,
    customer_id_type: formData.customerIdType,
    customer_id_number: formData.customerIdNumber,
    vehicle_make_model: formData.makeModel,
    model_year: formData.modelYear,
    chassis_no: formData.chassisNo,
    vehicle_exterior_colour: formData.exteriorColour,
    vehicle_interior_colour: formData.interiorColour,
    vehicle_mileage: formData.mileage,
    manufacturer_warranty: formData.manufacturerWarranty,
    manufacturer_warranty_expiry_date: formData.manufacturerWarrantyExpiryDate || null,
    manufacturer_warranty_expiry_mileage: formData.manufacturerWarrantyExpiryMileage || null,
    dealer_service_package: formData.dealerServicePackage,
    dealer_service_package_expiry_date: formData.dealerServicePackageExpiryDate || null,
    dealer_service_package_expiry_mileage: formData.dealerServicePackageExpiryMileage || null,
    has_part_exchange: formData.hasPartExchange,
    part_exchange_make_model: formData.hasPartExchange ? formData.partExchangeMakeModel : null,
    part_exchange_model_year: formData.hasPartExchange ? formData.partExchangeModelYear : null,
    part_exchange_chassis_no: formData.hasPartExchange ? formData.partExchangeChassisNo : null,
    part_exchange_exterior_colour: formData.hasPartExchange ? formData.partExchangeExteriorColour : null,
    part_exchange_engine_no: formData.hasPartExchange ? formData.partExchangeEngineNo : null,
    part_exchange_mileage: formData.hasPartExchange ? formData.partExchangeMileage : null,
    part_exchange_value: formData.hasPartExchange ? formData.partExchangeValue : 0,
    extended_warranty: formData.extendedWarranty,
    extended_warranty_price: formData.extendedWarranty ? formData.extendedWarrantyPrice : 0,
    ceramic_treatment: formData.ceramicTreatment,
    ceramic_treatment_price: formData.ceramicTreatment ? formData.ceramicTreatmentPrice : 0,
    service_care: formData.serviceCare,
    service_care_price: formData.serviceCare ? formData.serviceCarePrice : 0,
    window_tints: formData.windowTints,
    window_tints_price: formData.windowTints ? formData.windowTintsPrice : 0,
    rta_fees: formData.rtaFees,
    vehicle_sale_price: formData.vehicleSalePrice,
    add_ons_total: formData.addOnsTotal,
    invoice_total: formData.invoiceTotal,
    deposit: formData.deposit,
    amount_due: formData.amountDue,
    additional_notes: formData.additionalNotes,
    // Bank Finance fields
    sale_type: saleType,
    finance_bank_id: saleType === 'finance' ? selectedBankId : null,
    finance_bank_name: saleType === 'finance' && !selectedBankId ? customBankName : null,
    finance_vehicle_price: saleType === 'finance' ? financeVehiclePrice : null,
    downpayment_percent: saleType === 'finance' ? downpaymentPercent : null,
    downpayment_amount: saleType === 'finance' ? financeDownpayment : null,
    finance_amount: saleType === 'finance' ? financeCalculations.financeAmount : null,
    finance_term: saleType === 'finance' ? financeTerm : null,
    finance_status: saleType === 'finance' ? financeStatus : null,
    finance_bank_reference: saleType === 'finance' ? financeBankReference : null,
    finance_documents: saleType === 'finance' ? financeDocuments : [],
    finance_notes: saleType === 'finance' ? financeNotes : null,
    finance_status_history: saleType === 'finance' ? financeStatusHistory : [],
  });

  // SAVE - Saves form data and closes modal
  const handleSave = async () => {
    if (!reservationId) return;
    
    setSaving(true);
    try {
      const reservationData = buildReservationData();
      const { error } = await supabase
        .from('vehicle_reservations')
        .update({ ...reservationData, updated_at: new Date().toISOString() })
        .eq('id', reservationId);
      
      if (error) throw error;
      
      setHasUnsavedChanges(false);
      if (onSubmit) onSubmit();
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // GENERATE - Validates, saves form data, and generates PDF
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reservationId) {
      alert('Please wait for the account to be created.');
      return;
    }
    
    // Validate before generating
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setActiveTab('form'); // Switch to details tab to show what's missing
      return;
    }
    setValidationErrors([]);
    
    setSaving(true);

    try {
      // Save form data first
      const reservationData = buildReservationData();
      const { data: savedReservation, error } = await supabase
        .from('vehicle_reservations')
        .update({ ...reservationData, updated_at: new Date().toISOString() })
        .eq('id', reservationId)
        .select()
        .single();
      
      if (error) throw error;

      // Build add-ons from charges
      const getChargePrice = (type: string) => {
        const charge = charges.find((c: any) => c.charge_type === type);
        return charge ? (charge.total_amount || charge.unit_price || 0) : 0;
      };
      const hasCharge = (type: string) => charges.some((c: any) => c.charge_type === type);

      // Enhance formData with payment totals and charges from UV accounting system
      const enhancedFormData = {
        ...formData,
        totalCharges: chargesTotals.grandTotal,
        totalPaid: chargesTotals.totalPaid,
        balanceDue: chargesTotals.balanceDue,
        // Override legacy fields with actual values from charges
        invoiceTotal: chargesTotals.grandTotal || formData.invoiceTotal,
        deposit: chargesTotals.totalPaid,
        amountDue: chargesTotals.balanceDue,
        // Override add-on fields from actual charges
        vehicleSalePrice: getChargePrice('vehicle_sale') || formData.vehicleSalePrice,
        extendedWarranty: hasCharge('extended_warranty') || formData.extendedWarranty,
        extendedWarrantyPrice: getChargePrice('extended_warranty') || formData.extendedWarrantyPrice,
        ceramicTreatment: hasCharge('ceramic_treatment') || formData.ceramicTreatment,
        ceramicTreatmentPrice: getChargePrice('ceramic_treatment') || formData.ceramicTreatmentPrice,
        serviceCare: hasCharge('service_care') || formData.serviceCare,
        serviceCarePrice: getChargePrice('service_care') || formData.serviceCarePrice,
        windowTints: hasCharge('window_tints') || formData.windowTints,
        windowTintsPrice: getChargePrice('window_tints') || formData.windowTintsPrice,
        rtaFees: getChargePrice('rta_fees') || formData.rtaFees,
        // Calculate add-ons total from charges
        addOnsTotal: getChargePrice('extended_warranty') + getChargePrice('ceramic_treatment') + 
                     getChargePrice('service_care') + getChargePrice('window_tints') + getChargePrice('rta_fees'),
        // Discount (negative value)
        hasDiscount: hasCharge('discount'),
        discountAmount: Math.abs(getChargePrice('discount')),
        // Other add-ons
        hasOtherAddon: hasCharge('other_addon'),
        otherAddonPrice: getChargePrice('other_addon'),
        otherAddonDescription: charges.find((c: any) => c.charge_type === 'other_addon')?.description || 'Other'
      };

      const response = await fetch('/api/generate-vehicle-document', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, formData: enhancedFormData, leadId: lead.id, reservationId: savedReservation.id })
      });

      if (!response.ok) throw new Error('Failed to generate document');

      const result = await response.json();
      if (result.pdfUrl) {
        // Update vehicle_reservations with basic status
        await supabase.from('vehicle_reservations').update({ 
          document_status: 'completed',
          updated_at: new Date().toISOString()
        }).eq('id', savedReservation.id);
        
        // Save PDF URL to invoices table based on document type
        if (invoiceId) {
          if (mode === 'reservation') {
            await supabase.from('invoices').update({
              reservation_pdf_url: result.pdfUrl,
              updated_at: new Date().toISOString()
            }).eq('id', invoiceId);
            setReservationPdfUrl(result.pdfUrl);
          } else {
            await supabase.from('invoices').update({
              invoice_pdf_url: result.pdfUrl,
              updated_at: new Date().toISOString()
            }).eq('id', invoiceId);
            setInvoicePdfUrl(result.pdfUrl);
          }
        }
        
        if (result.documentNumber) setDocumentNumber(result.documentNumber);
        if (result.invoiceNumber) setInvoiceNumber(result.invoiceNumber);
        if (savedReservation.document_number) setDocumentNumber(savedReservation.document_number);
        if (savedReservation.deal_number) setDealNumber(savedReservation.deal_number);
      }

      // Reload data from DB to update charges/payments state after saving (silent refresh, no loader)
      await loadData(false);

      if (onSubmit) onSubmit();
    } catch (error) {
      console.error('Error:', error);
      alert('Error generating document. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Get current document URL based on mode
  const currentPdfUrl = mode === 'reservation' ? reservationPdfUrl : invoicePdfUrl;
  const hasCurrentPdf = !!currentPdfUrl;

  const handleSendForSigning = () => {
    if (!currentPdfUrl) { alert('Generate document first'); return; }
    if (!formData.emailAddress) { alert('Add customer email first'); return; }
    setShowEmailModal(true);
  };

  const handleConfirmSendForSigning = async () => {
    if (!companyEmail) return;
    setSendingForSigning(true);
    setShowEmailModal(false);
    try {
      const response = await fetch('/api/docusign/send-for-signing-vehicle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id, documentType: mode, customerEmail: formData.emailAddress,
          customerName: formData.customerName, companySignerEmail: companyEmail,
          documentTitle: mode === 'reservation' ? 'Vehicle Reservation Form' : 'Vehicle Invoice',
          pdfUrl: currentPdfUrl, formData
        })
      });
      if (!response.ok) throw new Error('Failed to send');
      const result = await response.json();
      setDocusignEnvelopeId(result.envelopeId);
      setSigningStatus('sent');
      
      // Save signing status to invoices table
      if (invoiceId) {
        if (mode === 'reservation') {
          await supabase.from('invoices').update({
            reservation_docusign_envelope_id: result.envelopeId,
            reservation_signing_status: 'sent',
            updated_at: new Date().toISOString()
          }).eq('id', invoiceId);
        } else {
          await supabase.from('invoices').update({
            invoice_docusign_envelope_id: result.envelopeId,
            invoice_signing_status: 'sent',
            updated_at: new Date().toISOString()
          }).eq('id', invoiceId);
        }
      }
    } catch (error) {
      alert('Failed to send for signing');
    } finally {
      setSendingForSigning(false);
    }
  };

  const handleAddCharge = async () => {
    if (!newCharge.unit_price || !reservationId || !invoiceId) return;
    
    // Discounts are stored as negative values so they subtract from total
    const isDiscount = newCharge.charge_type === 'discount';
    const finalPrice = isDiscount ? -Math.abs(newCharge.unit_price) : Math.abs(newCharge.unit_price);
    const description = newCharge.description || CHARGE_TYPES.find(c => c.value === newCharge.charge_type)?.label || '';

    // Always save directly to DB - include invoice_id
    setSaving(true);
    try {
      await supabase.from('uv_charges').insert({
        reservation_id: reservationId,
        invoice_id: invoiceId,
        charge_type: newCharge.charge_type,
        description: description,
        quantity: 1,
        unit_price: finalPrice,
        vat_applicable: newCharge.vat_applicable,
        display_order: charges.length,
        created_by: user?.id
      });
      await loadData(false);
    } catch (error) {
      console.error('Failed to add charge:', error);
      alert('Failed to add charge');
    } finally {
      setSaving(false);
    }
    
    setShowAddCharge(false);
    setNewCharge({ charge_type: 'vehicle_sale', description: '', unit_price: 0, vat_applicable: false });
  };

  const handleDeleteCharge = async (id: string) => {
    if (!confirm('Delete this charge?')) return;
    
    // Always delete from DB
    setSaving(true);
    try {
      await supabase.from('uv_charges').delete().eq('id', id);
      await loadData(false);
    } catch (error) {
      console.error('Failed to delete charge:', error);
      alert('Failed to delete charge');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount || !reservationId) return;
    
    // Refunds are stored as negative amounts
    const isRefund = newPayment.payment_method === 'refund';
    
    // VALIDATION: Prevent refunding more than what was paid
    if (isRefund) {
      const maxRefundable = chargesTotals.paymentsReceived - chargesTotals.refundsGiven;
      if (Math.abs(newPayment.amount) > maxRefundable) {
        alert(`Cannot refund more than what was paid.\n\nMaximum refundable: AED ${maxRefundable.toLocaleString()}`);
        return;
      }
    }
    
    const finalAmount = isRefund ? -Math.abs(newPayment.amount) : Math.abs(newPayment.amount);

    // Always save directly to DB
    setSaving(true);
    try {
      const { data: dbPayment, error: insertError } = await supabase.from('uv_payments').insert({
        lead_id: lead.id,
        payment_method: newPayment.payment_method,
        amount: finalAmount,
        reference_number: newPayment.reference_number || null,
        notes: newPayment.notes || null,
        bank_name: newPayment.bank_name || null,
        cheque_number: newPayment.cheque_number || null,
        cheque_date: newPayment.cheque_date || null,
        part_exchange_vehicle: newPayment.part_exchange_vehicle || null,
        part_exchange_chassis: newPayment.part_exchange_chassis || null,
        created_by: user?.id
      }).select().single();

      if (insertError) {
        console.error('Payment insert error:', insertError);
        alert('Failed to save payment: ' + insertError.message);
        setSaving(false);
        return;
      }

      // Generate receipt PDF
      if (dbPayment) {
        try {
          const updatedTotalPaid = chargesTotals.totalPaid + finalAmount;
          const updatedBalanceDue = (chargesTotals.grandTotal || formData.invoiceTotal) - updatedTotalPaid;
          
          await fetch('/api/generate-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId: dbPayment.id,
              customerName: formData.customerName,
              customerPhone: formData.contactNo,
              customerEmail: formData.emailAddress,
              vehicleInfo: `${formData.modelYear} ${formData.makeModel}`,
              chassisNo: formData.chassisNo,
              reservationNumber: documentNumber,
              notes: newPayment.notes,
              totalCharges: chargesTotals.grandTotal || formData.invoiceTotal,
              totalPaid: updatedTotalPaid,
              balanceDue: updatedBalanceDue
            })
          });
        } catch (receiptError) {
          console.error('Failed to generate receipt:', receiptError);
        }
      }

      await loadData(false);
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert('Failed to record payment');
    } finally {
      setSaving(false);
    }
    
    setShowAddPayment(false);
    setNewPayment({ payment_method: 'cash', amount: 0, reference_number: '', notes: '', bank_name: '', cheque_number: '', cheque_date: '', part_exchange_vehicle: '', part_exchange_chassis: '' });
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0 }).format(n);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleGenerateSOA = async () => {
    setGeneratingSOA(true);
    try {
      const response = await fetch('/api/generate-soa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          reservationId,
          customerName: formData.customerName,
          customerNumber,
          customerPhone: formData.contactNo,
          customerEmail: formData.emailAddress,
          customerIdType: formData.customerIdType,
          customerIdNumber: formData.customerIdNumber,
          vehicleInfo: `${formData.makeModel} ${formData.modelYear > 0 ? formData.modelYear : ''}`.trim(),
          chassisNo: formData.chassisNo,
          documentNumber,
          documentDate: formData.date,
          documentStatus,
          charges: allCharges,
          payments: allPayments
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate SOA');
      }

      const result = await response.json();
      if (result.pdfUrl) {
        window.open(result.pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('SOA generation error:', error);
      alert('Failed to generate Statement of Account. Please try again.');
    } finally {
      setGeneratingSOA(false);
    }
  };

  const handleReverseInvoice = async () => {
    if (!reservationId) return;
    if (!confirm('Are you sure you want to reverse this invoice? This will mark it as REVERSED and cannot be undone.')) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vehicle_reservations')
        .update({ 
          document_status: 'reversed',
          updated_at: new Date().toISOString()
        })
        .eq('id', reservationId);
      
      if (error) throw error;
      
      setDocumentStatus('reversed');
      alert('Invoice has been reversed successfully.');
      await loadData(false);
    } catch (error) {
      console.error('Reverse invoice error:', error);
      alert('Failed to reverse invoice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Only show as "PAID" if there are actual charges recorded AND balance is zero or credit
  const isPaid = chargesTotals.grandTotal > 0 && chargesTotals.balanceDue <= 0;

  // ============================================================
  // RENDER
  // ============================================================
  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      {/* Override browser autofill styles */}
      <style>{`
        .account-modal input,
        .account-modal select,
        .account-modal textarea {
          background-color: #1a1a1a !important;
        }
        .account-modal input:-webkit-autofill,
        .account-modal input:-webkit-autofill:hover,
        .account-modal input:-webkit-autofill:focus,
        .account-modal input:-webkit-autofill:active,
        .account-modal select:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #1a1a1a inset !important;
          -webkit-text-fill-color: white !important;
          caret-color: white !important;
          background-color: #1a1a1a !important;
        }
      `}</style>
      <div className="account-modal bg-[#0d0d0d] rounded-xl w-full max-w-6xl h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-[#333]">
        
        {/* ============ FULL SCREEN LOADER ============ */}
        {loading && (
          <>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#333] border-t-[#888] rounded-full animate-spin mb-4" />
              <p className="text-[#666] text-sm">Loading...</p>
            </div>
            <div className="px-6 py-4 border-t border-[#333] flex items-center justify-end shrink-0 bg-[#111]">
              <button onClick={onClose} className="px-4 py-2 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md transition-colors">Close</button>
            </div>
          </>
        )}

        {/* ============ HEADER ============ */}
        {!loading && (
        <div className="shrink-0 bg-gradient-to-b from-[#1a1a1a] to-[#111] border-b border-[#333]">
          {/* Top bar with customer info and close */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#888] to-[#444] flex items-center justify-center text-white font-semibold text-sm">
                {(formData.customerName || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-white">
                    {formData.customerName || 'Customer'}
                  </h2>
                  {customerNumber && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-[#444] to-[#333] text-[#ccc] text-[11px] font-mono rounded border border-[#555]">
                      {customerNumber}
                    </span>
                  )}
                  {dealNumber && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 text-[11px] font-mono rounded border border-blue-500/30">
                      {dealNumber}
                    </span>
                  )}
                  {invoiceNumber && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 text-[11px] font-mono rounded border border-emerald-500/30">
                      {invoiceNumber}
                    </span>
                  )}
                  {isPaid && documentStatus !== 'reversed' && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[11px] font-medium rounded flex items-center gap-1">
                      <Check className="w-3 h-3" /> Paid
                    </span>
                  )}
                  {documentStatus === 'reversed' && (
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[11px] font-medium rounded flex items-center gap-1">
                      <X className="w-3 h-3" /> Reversed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[13px] text-[#888]">
                  <span>{formData.contactNo}</span>
                  {formData.emailAddress && (
                    <>
                      <span className="text-[#444]">•</span>
                      <span>{formData.emailAddress}</span>
                    </>
                  )}
                  <span className="text-[#444]">•</span>
                  <span>{formData.makeModel} {formData.modelYear > 0 && formData.modelYear}</span>
                </div>
              </div>
            </div>
            
            {/* Stats & Close */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-5 text-right">
                <div>
                  <p className="text-[11px] text-[#666] uppercase tracking-wide">Total</p>
                  <p className="text-sm font-semibold text-white">AED {formatCurrency(chargesTotals.grandTotal || formData.invoiceTotal)}</p>
                </div>
                <div className="w-px h-8 bg-[#333]" />
                <div>
                  <p className="text-[11px] text-[#666] uppercase tracking-wide">Paid</p>
                  <p className="text-sm font-semibold text-emerald-400">AED {formatCurrency(chargesTotals.totalPaid)}</p>
                </div>
                <div className="w-px h-8 bg-[#333]" />
                <div>
                  <p className="text-[11px] text-[#666] uppercase tracking-wide">{chargesTotals.balanceDue < 0 ? 'Credit' : 'Balance'}</p>
                  <p className={`text-sm font-semibold ${chargesTotals.balanceDue <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    AED {formatCurrency(Math.abs(chargesTotals.balanceDue))}{chargesTotals.balanceDue < 0 ? ' CR' : ''}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[#333] rounded-lg transition-colors">
                <X className="w-5 h-5 text-[#666] hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex w-full">
            {[
              { key: 'form', label: 'Details', icon: ClipboardList },
              { key: 'charges', label: 'Charges', icon: List, count: allCharges.length },
              { key: 'payments', label: 'Payments', icon: CreditCard, count: allPayments.length },
              { key: 'soa', label: 'Statement', icon: ScrollText },
              ...(saleType === 'finance' && reservationId ? [{ key: 'finance', label: 'Bank Finance', icon: Building2 }] : []),
              { key: 'documents', label: 'Documents', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex-1 relative flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab.key 
                    ? 'text-white bg-gradient-to-t from-[#222] to-transparent border-[#888]' 
                    : 'text-[#666] hover:text-[#999] hover:bg-[#0d0d0d] border-transparent'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    activeTab === tab.key ? 'bg-[#444] text-white' : 'bg-[#333] text-[#888]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* ============ VALIDATION ERRORS ============ */}
        {!loading && validationErrors.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <X className="w-3 h-3 text-red-400" />
              </div>
              <div>
                <p className="text-red-400 font-medium text-sm mb-2">Please fix the following errors:</p>
                <ul className="text-red-400/80 text-sm space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
              <button onClick={() => setValidationErrors([])} className="ml-auto text-red-400/50 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============ CONTENT ============ */}
        {!loading && (
        <div className="flex-1 overflow-y-auto p-6 relative min-h-0 bg-[#0a0a0a]">
            <>
              {/* FORM TAB */}
              {activeTab === 'form' && (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Customer Information */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <div className="px-3 py-2 border-b border-[#333] bg-[#111]">
                      <h3 className="text-[12px] font-medium text-[#999] flex items-center gap-2">
                        <User className="w-3.5 h-3.5" /> Customer Information
                      </h3>
                    </div>
                    <div className="p-3">
                      <div className="flex gap-3">
                        <div className="w-[180px] shrink-0">
                          <label className="block text-[11px] text-[#666] mb-1">Full Name</label>
                          <input type="text" value={formData.customerName} onChange={(e) => handleInputChange('customerName', e.target.value)} placeholder="Customer Name" className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm shadow-inner placeholder-[#555] focus:outline-none focus:border-[#666]" required />
                        </div>
                        <div className="w-[130px] shrink-0">
                          <label className="block text-[11px] text-[#666] mb-1">Phone</label>
                          <input type="tel" value={formData.contactNo} onChange={(e) => handleInputChange('contactNo', e.target.value)} placeholder="+971 XX XXX" className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm shadow-inner placeholder-[#555] focus:outline-none focus:border-[#666]" required />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-[11px] text-[#666] mb-1">Email</label>
                          <input type="email" value={formData.emailAddress} onChange={(e) => handleInputChange('emailAddress', e.target.value)} placeholder="email@example.com" className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm shadow-inner placeholder-[#555] focus:outline-none focus:border-[#666]" required />
                        </div>
                        <div className="w-[80px] shrink-0">
                          <label className="block text-[11px] text-[#666] mb-1">ID Type</label>
                          <select value={formData.customerIdType} onChange={(e) => handleInputChange('customerIdType', e.target.value)} className="w-full px-2 h-[34px] bg-[#1a1a1a] border border-[#444] rounded text-white text-sm shadow-inner focus:outline-none focus:border-[#666]">
                            <option value="EID" className="bg-[#0d0d0d]">EID</option>
                            <option value="Passport" className="bg-[#0d0d0d]">Passport</option>
                          </select>
                        </div>
                        <div className="w-[200px] shrink-0">
                          <label className="block text-[11px] text-[#666] mb-1">ID Number</label>
                          <input type="text" value={formData.customerIdNumber} onChange={(e) => handleInputChange('customerIdNumber', e.target.value)} placeholder="784-XXXX-XXXXXXX-X" className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm shadow-inner placeholder-[#555] focus:outline-none focus:border-[#666]" required />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sale Type Toggle */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#888] font-medium">Sale Type</span>
                      <div className="flex items-center bg-[#111] rounded-lg p-1 border border-[#333]">
                        <button
                          type="button"
                          onClick={() => handleSaleTypeChange('cash')}
                          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                            saleType === 'cash'
                              ? 'bg-[#333] text-white'
                              : 'text-[#666] hover:text-[#999]'
                          }`}
                        >
                          Cash Sale
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaleTypeChange('finance')}
                          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                            saleType === 'finance'
                              ? 'bg-[#333] text-white'
                              : 'text-[#666] hover:text-[#999]'
                          }`}
                        >
                          Bank Finance
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <div className="px-3 py-2 border-b border-[#333] bg-[#111]">
                      <h3 className="text-[12px] font-medium text-[#999] flex items-center gap-2">
                        <Car className="w-3.5 h-3.5" /> Vehicle Information
                      </h3>
                    </div>
                    <div className="p-3">
                      <div className="grid grid-cols-4 gap-3">
                        <div><label className="block text-[11px] text-[#666] mb-1">Year</label><input type="number" value={formData.modelYear} readOnly className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm shadow-inner cursor-not-allowed" /></div>
                        <div><label className="block text-[11px] text-[#666] mb-1">Make & Model</label><input type="text" value={formData.makeModel} readOnly className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm shadow-inner cursor-not-allowed" /></div>
                        <div><label className="block text-[11px] text-[#666] mb-1">Mileage</label><input type="number" value={formData.mileage} readOnly className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm shadow-inner cursor-not-allowed" /></div>
                        <div><label className="block text-[11px] text-[#666] mb-1">Chassis Number</label><input type="text" value={formData.chassisNo} readOnly className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm shadow-inner font-mono cursor-not-allowed" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div><label className="block text-[11px] text-[#666] mb-1">Exterior Colour</label><input type="text" value={formData.exteriorColour} readOnly className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm shadow-inner cursor-not-allowed" /></div>
                        <div><label className="block text-[11px] text-[#666] mb-1">Interior Colour</label><input type="text" value={formData.interiorColour} readOnly className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm shadow-inner cursor-not-allowed" /></div>
                      </div>
                    </div>
                  </div>

                  {/* Coverage & Warranty */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Manufacturer Warranty */}
                    <div className={`bg-[#0a0a0a] rounded-lg border overflow-hidden ${formData.manufacturerWarranty ? 'border-[#555]' : 'border-[#333]'}`}>
                      <div className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <p className="text-[12px] font-medium text-white">Manufacturer Warranty</p>
                          <p className="text-[10px] text-[#666]">Factory coverage</p>
                        </div>
                        <button type="button" onClick={() => handleInputChange('manufacturerWarranty', !formData.manufacturerWarranty)} className={`relative w-9 h-5 rounded-full transition-colors ${formData.manufacturerWarranty ? 'bg-gradient-to-r from-[#666] to-[#888]' : 'bg-[#333]'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${formData.manufacturerWarranty ? 'left-[18px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                      {formData.manufacturerWarranty && (
                        <div className="px-3 pb-2 grid grid-cols-2 gap-2 border-t border-[#333] pt-2">
                          <div><label className="block text-[10px] text-[#666] mb-1">Expiry</label><input type="date" value={formData.manufacturerWarrantyExpiryDate} onChange={(e) => handleInputChange('manufacturerWarrantyExpiryDate', e.target.value)} className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-[#444] rounded text-white text-xs shadow-inner" /></div>
                          <div><label className="block text-[10px] text-[#666] mb-1">Mileage</label><input type="number" value={formData.manufacturerWarrantyExpiryMileage} onChange={(e) => handleInputChange('manufacturerWarrantyExpiryMileage', parseInt(e.target.value) || 0)} placeholder="km" className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-[#444] rounded text-white text-xs shadow-inner placeholder-[#555]" /></div>
                        </div>
                      )}
                    </div>

                    {/* Dealer Service Package */}
                    <div className={`bg-[#0a0a0a] rounded-lg border overflow-hidden ${formData.dealerServicePackage ? 'border-[#555]' : 'border-[#333]'}`}>
                      <div className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <p className="text-[12px] font-medium text-white">Dealer Service Package</p>
                          <p className="text-[10px] text-[#666]">Prepaid service</p>
                        </div>
                        <button type="button" onClick={() => handleInputChange('dealerServicePackage', !formData.dealerServicePackage)} className={`relative w-9 h-5 rounded-full transition-colors ${formData.dealerServicePackage ? 'bg-gradient-to-r from-[#666] to-[#888]' : 'bg-[#333]'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${formData.dealerServicePackage ? 'left-[18px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                      {formData.dealerServicePackage && (
                        <div className="px-3 pb-2 grid grid-cols-2 gap-2 border-t border-[#333] pt-2">
                          <div><label className="block text-[10px] text-[#666] mb-1">Expiry</label><input type="date" value={formData.dealerServicePackageExpiryDate} onChange={(e) => handleInputChange('dealerServicePackageExpiryDate', e.target.value)} className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-[#444] rounded text-white text-xs shadow-inner" /></div>
                          <div><label className="block text-[10px] text-[#666] mb-1">Mileage</label><input type="number" value={formData.dealerServicePackageExpiryMileage} onChange={(e) => handleInputChange('dealerServicePackageExpiryMileage', parseInt(e.target.value) || 0)} placeholder="km" className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-[#444] rounded text-white text-xs shadow-inner placeholder-[#555]" /></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <div className="px-3 py-2 border-b border-[#333] bg-[#111]">
                      <h3 className="text-[12px] font-medium text-[#999]">Additional Notes</h3>
                    </div>
                    <div className="p-3">
                      <textarea value={formData.additionalNotes} onChange={(e) => handleInputChange('additionalNotes', e.target.value)} rows={2} className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm shadow-inner resize-none placeholder-[#555] focus:outline-none focus:border-[#666]" placeholder="Any notes for this transaction..." />
                    </div>
                  </div>
                </form>
              )}

              {/* CHARGES TAB */}
              {activeTab === 'charges' && (
                <div className="space-y-5">
                  <>
                      {/* Quick Add Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {CHARGE_TYPES.map((type) => {
                          const getDefaultPrice = () => {
                            if (type.value === 'vehicle_sale') return inventoryCar?.advertised_price_aed || formData.vehicleSalePrice || 0;
                            if (type.value === 'rta_fees') return 2800;
                            return 0;
                          };
                          const getDescription = () => {
                            if (type.value === 'vehicle_sale') return `Vehicle Sale - ${formData.makeModel || 'Vehicle'}`;
                            if (type.value === 'rta_fees') return 'RTA Registration & Transfer Fees';
                            return type.label;
                          };
                          return (
                            <button 
                              key={type.value} 
                              onClick={() => { 
                                setNewCharge({ 
                                  charge_type: type.value, 
                                  description: getDescription(), 
                                  unit_price: getDefaultPrice(), 
                                  vat_applicable: false 
                                }); 
                                setShowAddCharge(true); 
                              }} 
                              className="px-4 py-2 rounded-full text-[13px] font-medium transition-all bg-[#222] text-[#aaa] border border-[#333] hover:bg-[#333] hover:text-white"
                            >
                              {type.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Add Form */}
                      {showAddCharge && (
                        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#333]">
                          <h4 className="text-sm font-medium text-white mb-4">Add Charge</h4>
                          <div className="grid grid-cols-4 gap-4 items-end">
                            <div><label className="block text-[12px] text-[#666] mb-2">Type</label><select value={newCharge.charge_type} onChange={(e) => setNewCharge(prev => ({ ...prev, charge_type: e.target.value, description: CHARGE_TYPES.find(c => c.value === e.target.value)?.label || '' }))} className="w-full px-3 h-[42px] bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner">{CHARGE_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-[#0d0d0d]">{t.label}</option>)}</select></div>
                            <div><label className="block text-[12px] text-[#666] mb-2">Description</label><input type="text" value={newCharge.description} onChange={(e) => setNewCharge(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                            <div><label className="block text-[12px] text-[#666] mb-2">Amount (AED)</label><input type="number" value={newCharge.unit_price} onChange={(e) => setNewCharge(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                            <div className="flex gap-2">
                              <button onClick={handleAddCharge} disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#555] to-[#666] text-white text-sm font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors">{saving ? '...' : 'Add'}</button>
                              <button onClick={() => setShowAddCharge(false)} className="px-4 py-2.5 bg-[#333] text-white text-sm rounded-md hover:bg-[#444]">Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Charges Table */}
                      <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                        <table className="w-full">
                          <thead><tr className="border-b border-[#333] bg-[#111]"><th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Description</th><th className="px-4 py-3 text-right text-[11px] font-medium text-[#666] uppercase tracking-wider">Amount</th><th className="px-4 py-3 w-12"></th></tr></thead>
                          <tbody className="divide-y divide-[#333]">
                            {allCharges.length === 0 ? <tr><td colSpan={3} className="px-4 py-12 text-center text-[#555]">No charges added yet. Click a button above to add.</td></tr> : allCharges.map((c) => (
                              <tr key={c.id} className="hover:bg-[#0d0d0d] transition-colors">
                                <td className="px-4 py-3 text-white text-sm">{c.description}</td>
                                <td className={`px-4 py-3 text-right font-medium text-sm ${c.unit_price < 0 ? 'text-emerald-400' : 'text-white'}`}>{c.unit_price < 0 ? '-' : ''}AED {formatCurrency(Math.abs(c.total_amount || c.unit_price))}</td>
                                <td className="px-4 py-3"><button onClick={() => handleDeleteCharge(c.id)} className="p-1.5 hover:bg-red-500/20 rounded text-[#555] hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                          {allCharges.length > 0 && (
                            <tfoot><tr className="bg-[#0d0d0d] border-t border-[#333]"><td className="px-4 py-3 text-sm font-semibold text-white">Grand Total</td><td className="px-4 py-3 text-right text-base font-bold text-white">AED {formatCurrency(chargesTotals.grandTotal)}</td><td></td></tr></tfoot>
                          )}
                        </table>
                      </div>
                    </>
                </div>
              )}

              {/* PAYMENTS TAB */}
              {activeTab === 'payments' && (
                <div className="space-y-5">
                  {/* Balance Header */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-[#0f0f0f] rounded-lg border border-[#333]">
                    <div><p className="text-[11px] text-[#666] uppercase tracking-wide">Invoice Total</p><p className="text-xl font-bold text-white mt-1">AED {formatCurrency(chargesTotals.grandTotal || formData.invoiceTotal)}</p></div>
                    <div>
                      <p className="text-[11px] text-[#666] uppercase tracking-wide">{chargesTotals.refundsGiven > 0 ? 'Net Paid' : 'Total Paid'}</p>
                      <p className={`text-xl font-bold mt-1 ${chargesTotals.totalPaid >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        AED {formatCurrency(chargesTotals.totalPaid)}
                      </p>
                      {chargesTotals.refundsGiven > 0 && (
                        <p className="text-[10px] text-[#555] mt-0.5">
                          Received: {formatCurrency(chargesTotals.paymentsReceived)} | Refunded: {formatCurrency(chargesTotals.refundsGiven)}
                        </p>
                      )}
                    </div>
                    <div className="text-right"><p className="text-[11px] text-[#666] uppercase tracking-wide">{chargesTotals.balanceDue < 0 ? 'Credit Balance' : 'Balance Due'}</p><p className={`text-xl font-bold mt-1 ${chargesTotals.balanceDue <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>AED {formatCurrency(Math.abs(chargesTotals.balanceDue))}{chargesTotals.balanceDue < 0 ? ' CR' : ''}</p></div>
                  </div>

                  {/* Add Payment Button - always show (even for overpayments/credits) */}
                  {!showAddPayment && (
                    <button onClick={() => { setNewPayment(prev => ({ ...prev, amount: Math.max(0, chargesTotals.balanceDue) || Math.max(0, formData.amountDue) })); setShowAddPayment(true); }} className="w-full py-3 border border-dashed border-[#333] hover:border-[#555] rounded-lg text-[#666] hover:text-white transition-all flex items-center justify-center gap-2 group">
                      <Plus className="w-4 h-4" /> Record New Payment
                    </button>
                  )}

                  {/* Add Payment Form */}
                  {showAddPayment && (
                    <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#333]">
                      <h4 className="text-sm font-medium text-white mb-4">Record Payment</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-[12px] text-[#666] mb-2">Method</label><select value={newPayment.payment_method} onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value }))} className="w-full px-3 h-[42px] bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner">{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value} className="bg-[#0d0d0d]">{m.label}</option>)}</select></div>
                        <div><label className="block text-[12px] text-[#666] mb-2">Amount (AED)</label><input type="number" value={newPayment.amount} onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                        <div><label className="block text-[12px] text-[#666] mb-2">Reference</label><input type="text" value={newPayment.reference_number} onChange={(e) => setNewPayment(prev => ({ ...prev, reference_number: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" placeholder="Ref #" /></div>
                      </div>
                      {newPayment.payment_method === 'cheque' && (
                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#333]">
                          <div><label className="block text-[12px] text-[#666] mb-2">Bank</label><input type="text" value={newPayment.bank_name} onChange={(e) => setNewPayment(prev => ({ ...prev, bank_name: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                          <div><label className="block text-[12px] text-[#666] mb-2">Cheque #</label><input type="text" value={newPayment.cheque_number} onChange={(e) => setNewPayment(prev => ({ ...prev, cheque_number: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                          <div><label className="block text-[12px] text-[#666] mb-2">Date</label><input type="date" value={newPayment.cheque_date} onChange={(e) => setNewPayment(prev => ({ ...prev, cheque_date: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                        </div>
                      )}
                      {newPayment.payment_method === 'part_exchange' && (
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#333]">
                          <div><label className="block text-[12px] text-[#666] mb-2">Vehicle</label><input type="text" value={newPayment.part_exchange_vehicle} onChange={(e) => setNewPayment(prev => ({ ...prev, part_exchange_vehicle: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" placeholder="Make/Model/Year" /></div>
                          <div><label className="block text-[12px] text-[#666] mb-2">Chassis</label><input type="text" value={newPayment.part_exchange_chassis} onChange={(e) => setNewPayment(prev => ({ ...prev, part_exchange_chassis: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm shadow-inner" /></div>
                        </div>
                      )}
                      <div className="flex gap-3 mt-4">
                        <button type="button" onClick={handleAddPayment} disabled={saving || !newPayment.amount} className="px-4 py-2.5 bg-gradient-to-r from-[#555] to-[#666] text-white text-sm font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors disabled:opacity-50 flex items-center gap-2">
                          {saving ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Generating Receipt...
                            </>
                          ) : 'Save Payment'}
                        </button>
                        <button onClick={() => setShowAddPayment(false)} className="px-4 py-2.5 bg-[#333] text-white text-sm rounded-md hover:bg-[#444]">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Payments Table */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-[#333] bg-[#111]"><th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Date</th><th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Receipt</th><th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Method</th><th className="px-4 py-3 text-right text-[11px] font-medium text-[#666] uppercase tracking-wider">Amount</th><th className="px-4 py-3 text-center text-[11px] font-medium text-[#666] uppercase tracking-wider">Allocation</th><th className="px-4 py-3 text-center text-[11px] font-medium text-[#666] uppercase tracking-wider">Actions</th></tr></thead>
                      <tbody className="divide-y divide-[#333]">
                        {allPayments.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-[#555]">No payments recorded</td></tr> : allPayments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-[#0d0d0d] transition-colors">
                            <td className="px-4 py-3 text-[#999] text-sm">{formatDate(p.payment_date)}</td>
                            <td className="px-4 py-3 text-[#888] font-mono text-xs">{p.receipt_number || '-'}</td>
                            <td className="px-4 py-3 text-white text-sm capitalize">{p.payment_method === 'refund' ? '↩ Refund' : p.payment_method.replace('_', ' ')}</td>
                            <td className={`px-4 py-3 text-right font-semibold text-sm ${p.amount < 0 || p.payment_method === 'refund' ? 'text-red-400' : 'text-emerald-400'}`}>{p.amount < 0 ? '-' : ''}AED {formatCurrency(Math.abs(p.amount))}</td>
                            <td className="px-4 py-3 text-center">
                              {(() => {
                                const allocs = paymentAllocations.get(p.id) || [];
                                const totalAllocated = allocs.reduce((sum, a) => sum + a.allocated_amount, 0);
                                const isFullyAllocated = totalAllocated >= p.amount;
                                const isThisReservation = allocs.some(a => a.reservation_id === reservationId);
                                
                                if (p.amount < 0 || p.payment_method === 'refund') {
                                  return <span className="text-[#555] text-xs">-</span>;
                                }
                                
                                if (allocs.length === 0) {
                                  return (
                                    <button
                                      onClick={() => {
                                        setSelectedPaymentForAllocation(p);
                                        setAllocationAmount(p.amount);
                                        setShowAllocatePayment(true);
                                      }}
                                      className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-medium hover:bg-amber-500/30 transition-colors"
                                    >
                                      Not Allocated
                                    </button>
                                  );
                                }
                                
                                return (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                      isFullyAllocated 
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    }`}>
                                      {isFullyAllocated ? 'Allocated' : 'Partial'}
                                    </span>
                                    {isThisReservation && (
                                      <span className="text-[9px] text-emerald-400">✓ This invoice</span>
                                    )}
                                    {!isFullyAllocated && (
                                      <button
                                        onClick={() => {
                                          setSelectedPaymentForAllocation(p);
                                          setAllocationAmount(p.amount - totalAllocated);
                                          setShowAllocatePayment(true);
                                        }}
                                        className="text-[9px] text-brand hover:underline"
                                      >
                                        + Allocate more
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {p.receipt_url ? (
                                  <button onClick={() => window.open(p.receipt_url, '_blank')} className="p-1.5 bg-[#333] hover:bg-[#444] rounded text-white transition-colors" title="Download Receipt">
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                ) : p.id?.startsWith('pending-') ? (
                                  <span className="text-[#555] text-xs">-</span>
                                ) : (
                                  <button 
                                    onClick={async () => {
                                      try {
                                        const res = await fetch('/api/generate-receipt', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            paymentId: p.id,
                                            customerName: formData.customerName,
                                            customerPhone: formData.contactNo,
                                            customerEmail: formData.emailAddress,
                                            vehicleInfo: `${formData.modelYear} ${formData.makeModel}`,
                                            chassisNo: formData.chassisNo,
                                            reservationNumber: documentNumber,
                                            totalCharges: chargesTotals.grandTotal || formData.invoiceTotal,
                                            totalPaid: chargesTotals.totalPaid,
                                            balanceDue: chargesTotals.balanceDue
                                          })
                                        });
                                        if (res.ok) {
                                          const data = await res.json();
                                          if (data.receiptUrl) window.open(data.receiptUrl, '_blank');
                                          await loadData();
                                        }
                                      } catch (e) { console.error(e); }
                                    }} 
                                    className="p-1.5 bg-[#444] hover:bg-[#555] rounded text-[#888] hover:text-white transition-colors" 
                                    title="Generate Receipt"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SOA TAB - Statement of Account */}
              {activeTab === 'soa' && (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-4">
                      <p className="text-[11px] text-[#666] uppercase tracking-wide mb-1">Total Charges</p>
                      <p className="text-xl font-semibold text-white">AED {formatCurrency(chargesTotals.grandTotal)}</p>
                    </div>
                    <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-4">
                      <p className="text-[11px] text-[#666] uppercase tracking-wide mb-1">Total Payments</p>
                      <p className="text-xl font-semibold text-emerald-400">AED {formatCurrency(chargesTotals.totalPaid)}</p>
                    </div>
                    <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-4">
                      <p className="text-[11px] text-[#666] uppercase tracking-wide mb-1">Balance Due</p>
                      <p className={`text-xl font-semibold ${chargesTotals.balanceDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        AED {formatCurrency(chargesTotals.balanceDue)}
                      </p>
                    </div>
                    <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-4">
                      <p className="text-[11px] text-[#666] uppercase tracking-wide mb-1">Status</p>
                      <p className={`text-xl font-semibold ${documentStatus === 'reversed' ? 'text-red-400' : chargesTotals.grandTotal > 0 && chargesTotals.balanceDue <= 0 ? 'text-emerald-400' : chargesTotals.totalPaid > 0 ? 'text-amber-400' : chargesTotals.grandTotal > 0 ? 'text-red-400' : 'text-[#666]'}`}>
                        {documentStatus === 'reversed' ? 'REVERSED' : chargesTotals.grandTotal === 0 ? 'NO CHARGES' : chargesTotals.balanceDue <= 0 ? 'PAID' : chargesTotals.totalPaid > 0 ? 'PARTIAL' : 'UNPAID'}
                      </p>
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#333] bg-[#111] flex items-center justify-between">
                      <h3 className="text-[13px] font-medium text-[#999] flex items-center gap-2">
                        <ScrollText className="w-4 h-4" /> Transaction History
                      </h3>
                      <button
                        onClick={handleGenerateSOA}
                        disabled={generatingSOA || allCharges.length === 0}
                        className="px-3 py-1.5 bg-gradient-to-r from-[#555] to-[#666] text-white text-xs font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {generatingSOA ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3" />
                            Download Statement
                          </>
                        )}
                      </button>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#333] bg-[#0d0d0d]">
                          <th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Reference</th>
                          <th className="px-4 py-3 text-right text-[11px] font-medium text-[#666] uppercase tracking-wider">Charges</th>
                          <th className="px-4 py-3 text-right text-[11px] font-medium text-[#666] uppercase tracking-wider">Payments</th>
                          <th className="px-4 py-3 text-right text-[11px] font-medium text-[#666] uppercase tracking-wider">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#333]">
                        {(() => {
                          // Combine charges and payments into a single chronological list
                          const transactions: Array<{
                            date: string;
                            type: 'charge' | 'payment';
                            description: string;
                            reference: string;
                            amount: number;
                            createdAt: string;
                          }> = [];

                          // Add charges
                          allCharges.forEach((charge: any) => {
                            transactions.push({
                              date: charge.created_at || formData.date || new Date().toISOString(),
                              createdAt: charge.created_at || formData.date || new Date().toISOString(),
                              type: 'charge',
                              description: charge.description || charge.charge_type?.replace('_', ' '),
                              reference: documentNumber || '-',
                              amount: charge.unit_price * (charge.quantity || 1)
                            });
                          });

                          // Add payments
                          allPayments.forEach((payment: any) => {
                            const isRefund = payment.payment_method === 'refund' || payment.amount < 0;
                            transactions.push({
                              date: payment.payment_date || payment.created_at,
                              createdAt: payment.created_at || payment.payment_date || new Date().toISOString(),
                              type: 'payment',
                              description: isRefund ? `Refund - ${payment.payment_method === 'refund' ? 'Refund' : payment.payment_method?.replace('_', ' ')}` : `Payment - ${payment.payment_method?.replace('_', ' ')}`,
                              reference: payment.reference_number || payment.receipt_number || '-',
                              amount: payment.amount
                            });
                          });

                          // Sort by created_at timestamp (true chronological order)
                          transactions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                          // Calculate running balance
                          let runningBalance = 0;
                          const rows = transactions.map((txn, idx) => {
                            if (txn.type === 'charge') {
                              runningBalance += txn.amount;
                            } else {
                              runningBalance -= txn.amount;
                            }
                            return { ...txn, balance: runningBalance, idx };
                          });

                          if (rows.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-[#555]">
                                  No transactions recorded
                                </td>
                              </tr>
                            );
                          }

                          return rows.map((txn) => (
                            <tr key={`${txn.type}-${txn.idx}`} className="hover:bg-[#0d0d0d] transition-colors">
                              <td className="px-4 py-3 text-[#999] text-sm">{formatDate(txn.date)}</td>
                              <td className="px-4 py-3 text-white text-sm">{txn.description}</td>
                              <td className="px-4 py-3 text-[#666] font-mono text-sm">{txn.reference}</td>
                              <td className="px-4 py-3 text-right text-sm">
                                {txn.type === 'charge' ? (
                                  <span className={txn.amount < 0 ? 'text-emerald-400' : 'text-white'}>
                                    {txn.amount < 0 ? '-' : ''}AED {formatCurrency(Math.abs(txn.amount))}
                                  </span>
                                ) : (
                                  <span className="text-[#555]">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                {txn.type === 'payment' ? (
                                  <span className={txn.amount < 0 ? 'text-red-400' : 'text-emerald-400'}>{txn.amount < 0 ? '-' : ''}AED {formatCurrency(Math.abs(txn.amount))}</span>
                                ) : (
                                  <span className="text-[#555]">-</span>
                                )}
                              </td>
                              <td className={`px-4 py-3 text-right font-semibold text-sm ${txn.balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                AED {formatCurrency(Math.abs(txn.balance))}
                                {txn.balance < 0 && ' CR'}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                      {/* Footer totals */}
                      <tfoot className="border-t-2 border-[#444]">
                        <tr className="bg-[#111]">
                          <td colSpan={3} className="px-4 py-3 text-right text-[12px] font-medium text-[#888] uppercase">Totals</td>
                          <td className="px-4 py-3 text-right font-semibold text-white">AED {formatCurrency(chargesTotals.grandTotal)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-400">AED {formatCurrency(chargesTotals.totalPaid)}</td>
                          <td className={`px-4 py-3 text-right font-bold ${chargesTotals.balanceDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            AED {formatCurrency(Math.abs(chargesTotals.balanceDue))}
                            {chargesTotals.balanceDue < 0 && ' CR'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Customer & Document Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-4">
                      <h4 className="text-[12px] text-[#666] uppercase tracking-wide mb-3">Customer Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#666]">Name</span>
                          <span className="text-white">{formData.customerName || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666]">Customer ID</span>
                          <span className="text-white font-mono">{customerNumber || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666]">Deal #</span>
                          <span className="text-blue-400 font-mono">{dealNumber || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666]">Invoice #</span>
                          <span className="text-emerald-400 font-mono">{invoiceNumber || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666]">Phone</span>
                          <span className="text-white">{formData.contactNo || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666]">Email</span>
                          <span className="text-white">{formData.emailAddress || '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-4">
                      <h4 className="text-[12px] text-[#666] uppercase tracking-wide mb-3">Document Reference</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#666]">Vehicle</span>
                          <span className="text-white">{formData.makeModel} {formData.modelYear > 0 && formData.modelYear}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666]">Chassis</span>
                          <span className="text-white font-mono">{formData.chassisNo || '-'}</span>
                        </div>
                        {documentNumber && (
                          <div className="flex justify-between">
                            <span className="text-[#666]">{documentNumber.startsWith('RES') ? 'Reservation' : 'Invoice'} #</span>
                            <span className="text-white font-mono">{documentNumber}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-[#666]">Date</span>
                          <span className="text-white">{formatDate(formData.date)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BANK FINANCE TAB */}
              {activeTab === 'finance' && saleType === 'finance' && reservationId && (
                <div className="space-y-4">
                  {/* Finance Summary Card */}
                  <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] rounded-xl border border-[#333] p-5">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">Bank Finance Application</h3>
                        <p className="text-[#555] text-sm">Track the progress of the finance application</p>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-[#222] border border-[#444] text-sm font-medium text-[#999] flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          financeStatus === 'approved' || financeStatus === 'funds_received' ? 'bg-white' :
                          financeStatus === 'rejected' ? 'bg-[#666]' : 'bg-[#888] animate-pulse'
                        }`} />
                        {FINANCE_STATUS_CONFIG[financeStatus].label}
                      </div>
                    </div>
                    
                    {/* Finance Breakdown */}
                    <div className="grid grid-cols-4 gap-3 mb-5">
                      <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#222]">
                        <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Total Amount</p>
                        <div className="flex items-center gap-1">
                          <span className="text-[#666] text-sm">AED</span>
                          <input
                            type="number"
                            value={financeVehiclePrice > 0 ? financeVehiclePrice : ''}
                            onChange={(e) => handleFinanceFieldChange('financeVehiclePrice', parseInt(e.target.value) || 0)}
                            placeholder="Enter amount"
                            className="w-full bg-transparent text-xl font-bold text-white focus:outline-none placeholder:text-[#444] placeholder:font-normal placeholder:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                      <div className={`bg-[#0a0a0a] rounded-lg p-4 border ${financeDownpayment > 0 ? 'border-[#444] ring-1 ring-[#555]' : 'border-[#222]'}`}>
                        <p className="text-[10px] text-[#888] uppercase tracking-wider mb-2">↓ Collect from Customer</p>
                        <div className="flex items-center gap-1">
                          <span className="text-[#666] text-sm">AED</span>
                          <input
                            type="number"
                            value={financeDownpayment > 0 ? financeDownpayment : ''}
                            onChange={(e) => handleFinanceFieldChange('financeDownpayment', parseInt(e.target.value) || 0)}
                            placeholder="Enter amount"
                            className="w-full bg-transparent text-xl font-bold text-white focus:outline-none placeholder:text-[#444] placeholder:font-normal placeholder:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <p className="text-[10px] text-[#555] mt-1">{financeVehiclePrice > 0 ? `${downpaymentPercent}% Downpayment` : ''}</p>
                      </div>
                      <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#222]">
                        <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Bank Finance Amount</p>
                        <p className="text-xl font-bold text-[#888]">AED {formatCurrency(financeCalculations.financeAmount)}</p>
                      </div>
                      <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#222]">
                        <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Customer Paid</p>
                        <p className="text-xl font-bold text-white">AED {formatCurrency(financeCalculations.customerPaid)}</p>
                        {financeCalculations.customerBalance > 0 ? (
                          <p className="text-[10px] text-[#666] mt-1">Remaining: AED {formatCurrency(financeCalculations.customerBalance)}</p>
                        ) : (
                          <p className="text-[10px] text-[#888] mt-1">✓ Downpayment complete</p>
                        )}
                      </div>
                    </div>

                    {/* Downpayment % & Term Adjustment */}
                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#333]">
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-[#666] whitespace-nowrap">Downpayment</label>
                        <input 
                          type="range" 
                          min="0" 
                          max="50" 
                          value={downpaymentPercent}
                          onChange={(e) => handleFinanceFieldChange('downpaymentPercent', parseInt(e.target.value))}
                          className="flex-1 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                        />
                        <span className="text-white font-semibold w-14 text-center bg-[#222] px-2 py-1 rounded">{downpaymentPercent}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-[#666] whitespace-nowrap">Term</label>
                        <input 
                          type="range" 
                          min="12" 
                          max="60" 
                          step="12"
                          value={financeTerm}
                          onChange={(e) => handleFinanceFieldChange('financeTerm', parseInt(e.target.value))}
                          className="flex-1 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                        />
                        <span className="text-white font-semibold w-20 text-center bg-[#222] px-2 py-1 rounded">{financeTerm} mo</span>
                      </div>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#333] bg-gradient-to-r from-[#111] to-[#0d0d0d]">
                      <h3 className="text-[12px] font-medium text-[#888] flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" /> Bank Details
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <label className="block text-[11px] text-[#555] mb-1.5">Finance Bank</label>
                          <div 
                            className="w-full px-3 py-2.5 bg-[#111] border border-[#333] rounded-lg text-white text-sm cursor-pointer flex items-center justify-between hover:border-[#444] transition-colors"
                            onClick={() => setShowBankDropdown(!showBankDropdown)}
                          >
                            <span className={selectedBankId || customBankName ? 'text-white' : 'text-[#555]'}>
                              {selectedBankId 
                                ? banks.find(b => b.id === selectedBankId)?.name 
                                : customBankName || 'Select or type bank name...'}
                            </span>
                            <ChevronRight className={`w-4 h-4 text-[#555] transition-transform ${showBankDropdown ? 'rotate-90' : ''}`} />
                          </div>
                          {showBankDropdown && (
                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#111] border border-[#333] rounded-lg shadow-2xl max-h-60 overflow-auto">
                              <input 
                                type="text"
                                placeholder="Search or add bank..."
                                value={bankSearchTerm}
                                onChange={(e) => setBankSearchTerm(e.target.value)}
                                className="w-full px-3 py-2.5 bg-[#0a0a0a] border-b border-[#333] text-white text-sm focus:outline-none"
                                onClick={(e) => e.stopPropagation()}
                              />
                              {banks
                                .filter(b => b.name.toLowerCase().includes(bankSearchTerm.toLowerCase()))
                                .map(bank => (
                                  <div 
                                    key={bank.id}
                                    className={`px-3 py-2.5 hover:bg-[#1a1a1a] cursor-pointer text-sm transition-colors ${selectedBankId === bank.id ? 'bg-[#222] text-white' : 'text-[#999]'}`}
                                    onClick={() => {
                                      handleFinanceFieldChange('selectedBankId', bank.id);
                                      setShowBankDropdown(false);
                                      setBankSearchTerm('');
                                    }}
                                  >
                                    {bank.name}
                                  </div>
                                ))}
                              {bankSearchTerm && !banks.some(b => b.name.toLowerCase() === bankSearchTerm.toLowerCase()) && (
                                <div 
                                  className="px-3 py-2.5 hover:bg-[#1a1a1a] cursor-pointer text-sm text-white border-t border-[#333]"
                                  onClick={() => {
                                    handleFinanceFieldChange('customBankName', bankSearchTerm);
                                    setShowBankDropdown(false);
                                    setBankSearchTerm('');
                                  }}
                                >
                                  + Add "{bankSearchTerm}"
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#555] mb-1.5">Bank Reference Number</label>
                          <input 
                            type="text"
                            value={financeBankReference}
                            onChange={(e) => handleFinanceFieldChange('financeBankReference', e.target.value)}
                            placeholder="Bank's reference #"
                            className="w-full px-3 py-2.5 bg-[#111] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-[#444] transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#555] mb-1.5">Notes</label>
                        <textarea
                          value={financeNotes}
                          onChange={(e) => handleFinanceFieldChange('financeNotes', e.target.value)}
                          rows={2}
                          placeholder="Any notes about this finance application..."
                          className="w-full px-3 py-2.5 bg-[#111] border border-[#333] rounded-lg text-white text-sm resize-none focus:outline-none focus:border-[#444] transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Checklist */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#333] bg-gradient-to-r from-[#111] to-[#0d0d0d] flex items-center justify-between">
                      <h3 className="text-[12px] font-medium text-[#888] flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Customer Documents
                      </h3>
                      <span className="text-[11px] text-[#555]">
                        {financeDocuments.length} uploaded
                      </span>
                    </div>
                    <div className="divide-y divide-[#222]">
                      {FINANCE_DOCUMENT_TYPES.map((docType) => {
                        const uploadedDocs = financeDocuments.filter(d => d.type === docType.key);
                        const hasUploads = uploadedDocs.length > 0;
                        const isMultiple = docType.multiple;
                        const maxCount = (docType as any).maxCount || 99;
                        const canAddMore = isMultiple && uploadedDocs.length < maxCount;
                        
                        return (
                          <div key={docType.key} className="px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                                  hasUploads ? 'bg-[#1a1a1a] border-[#444]' : 'bg-[#111] border-[#333]'
                                }`}>
                                  {hasUploads ? (
                                    isMultiple ? (
                                      <span className="text-xs font-medium text-white">{uploadedDocs.length}</span>
                                    ) : (
                                      <Check className="w-4 h-4 text-white" />
                                    )
                                  ) : (
                                    <Upload className="w-4 h-4 text-[#555]" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm text-white">{docType.label}</p>
                                  <p className="text-[10px] text-[#555]">
                                    {docType.required ? 'Required' : 'Optional'}
                                    {isMultiple && docType.key === 'bank_statement' && ` • ${uploadedDocs.length}/6 months`}
                                    {isMultiple && docType.key === 'other' && uploadedDocs.length > 0 && ` • ${uploadedDocs.length} files`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Single document: show View/Replace if uploaded, Upload if not */}
                                {!isMultiple && hasUploads && (
                                  <>
                                    <a 
                                      href={uploadedDocs[0].url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg text-xs text-white transition-colors"
                                    >
                                      View
                                    </a>
                                    <label className="px-3 py-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg text-xs text-[#888] cursor-pointer transition-colors">
                                      Replace
                                      <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*,.pdf"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          setUploadingDocument(docType.key);
                                          try {
                                            const fileName = `finance-docs/${reservationId}/${docType.key}-${Date.now()}.${file.name.split('.').pop()}`;
                                            const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
                                            if (uploadError) throw uploadError;
                                            const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
                                            const newDocs = financeDocuments.map(d => d.type === docType.key ? { ...d, url: publicUrl, uploaded_at: new Date().toISOString() } : d);
                                            handleFinanceFieldChange('financeDocuments', newDocs);
                                          } catch (err) {
                                            console.error('Upload error:', err);
                                            alert('Failed to upload document');
                                          }
                                          setUploadingDocument(null);
                                        }}
                                      />
                                    </label>
                                  </>
                                )}
                                {/* Single or multiple: Upload button */}
                                {(!hasUploads || canAddMore) && (
                                  <label className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors flex items-center gap-1.5 border ${
                                    uploadingDocument === docType.key 
                                      ? 'bg-[#333] border-[#444] text-white' 
                                      : 'bg-[#222] border-[#333] text-[#888] hover:bg-[#333] hover:text-white'
                                  }`}>
                                    {uploadingDocument === docType.key ? (
                                      <>Uploading...</>
                                    ) : (
                                      <><Upload className="w-3 h-3" /> {hasUploads && isMultiple ? 'Add More' : 'Upload'}</>
                                    )}
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*,.pdf"
                                      multiple={isMultiple}
                                      disabled={uploadingDocument === docType.key}
                                      onChange={async (e) => {
                                        const files = e.target.files;
                                        if (!files || files.length === 0 || !reservationId) return;
                                        setUploadingDocument(docType.key);
                                        try {
                                          const newDocsToAdd: FinanceDocument[] = [];
                                          for (let i = 0; i < files.length; i++) {
                                            const file = files[i];
                                            const fileName = `finance-docs/${reservationId}/${docType.key}-${Date.now()}-${i}.${file.name.split('.').pop()}`;
                                            const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
                                            if (uploadError) throw uploadError;
                                            const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
                                            newDocsToAdd.push({ type: docType.key, url: publicUrl, uploaded_at: new Date().toISOString() });
                                          }
                                          const newDocs = [...financeDocuments, ...newDocsToAdd];
                                          handleFinanceFieldChange('financeDocuments', newDocs);
                                        } catch (err) {
                                          console.error('Upload error:', err);
                                          alert('Failed to upload document');
                                        }
                                        setUploadingDocument(null);
                                      }}
                                    />
                                  </label>
                                )}
                                {!docType.required && !hasUploads && (
                                  <button className="px-3 py-1.5 bg-[#111] hover:bg-[#222] border border-[#333] rounded-lg text-xs text-[#555] transition-colors">
                                    N/A
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Show list of uploaded files for multiple document types */}
                            {isMultiple && uploadedDocs.length > 0 && (
                              <div className="mt-3 pl-12 space-y-2">
                                {uploadedDocs.map((doc, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-[#111] rounded-lg px-3 py-2 border border-[#222]">
                                    <span className="text-xs text-[#888]">
                                      {docType.key === 'bank_statement' ? `Month ${idx + 1}` : `File ${idx + 1}`}
                                      <span className="text-[#555] ml-2">• {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <a 
                                        href={doc.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-[#888] hover:text-white transition-colors"
                                      >
                                        View
                                      </a>
                                      <button 
                                        onClick={() => {
                                          const newDocs = financeDocuments.filter((d, i) => !(d.type === docType.key && financeDocuments.filter(fd => fd.type === docType.key).indexOf(d) === idx));
                                          // Simpler approach: filter by URL since each is unique
                                          const filteredDocs = financeDocuments.filter(d => d.url !== doc.url);
                                          handleFinanceFieldChange('financeDocuments', filteredDocs);
                                        }}
                                        className="text-xs text-[#555] hover:text-white transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Application Progress */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#333] bg-gradient-to-r from-[#111] to-[#0d0d0d]">
                      <h3 className="text-[12px] font-medium text-[#888]">Application Progress</h3>
                    </div>
                    <div className="p-5">
                      {/* Days Counter */}
                      {(() => {
                        const docsReadyEntry = financeStatusHistory.find(h => h.status === 'docs_ready');
                        const approvedEntry = financeStatusHistory.find(h => h.status === 'approved');
                        if (docsReadyEntry) {
                          const startDate = new Date(docsReadyEntry.timestamp);
                          const endDate = approvedEntry ? new Date(approvedEntry.timestamp) : new Date();
                          const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <div className="flex items-center justify-center gap-3 mb-5 py-3 px-4 bg-[#0a0a0a] rounded-lg border border-[#222]">
                              <Clock className="w-4 h-4 text-[#666]" />
                              <span className="text-sm text-[#888]">
                                {approvedEntry ? (
                                  <>Approved in <span className="text-white font-semibold">{daysDiff} day{daysDiff !== 1 ? 's' : ''}</span></>
                                ) : (
                                  <>Processing: <span className="text-white font-semibold">{daysDiff} day{daysDiff !== 1 ? 's' : ''}</span> since docs ready</>
                                )}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Progress Steps */}
                      <div className="flex items-center justify-between mb-6">
                        {(['pending_docs', 'docs_ready', 'submitted', 'under_review', 'approved'] as FinanceStatus[]).map((status, index, arr) => {
                          const isActive = status === financeStatus;
                          const isPast = arr.indexOf(financeStatus) > index || financeStatus === 'funds_received';
                          const config = FINANCE_STATUS_CONFIG[status];
                          const Icon = config.icon;
                          const statusEntry = financeStatusHistory.find(h => h.status === status);
                          const statusDate = statusEntry ? new Date(statusEntry.timestamp) : null;
                          return (
                            <React.Fragment key={status}>
                              <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                  isActive ? 'border-white bg-[#333]' :
                                  isPast ? 'border-[#666] bg-[#333]' : 'border-[#333] bg-[#111]'
                                }`}>
                                  {isPast ? (
                                    <Check className="w-5 h-5 text-white" />
                                  ) : (
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#444]'}`} />
                                  )}
                                </div>
                                <span className={`text-[10px] mt-2 text-center max-w-[70px] ${
                                  isActive ? 'text-white font-medium' : isPast ? 'text-[#888]' : 'text-[#444]'
                                }`}>
                                  {config.label}
                                </span>
                                {statusDate && (isPast || isActive) && (
                                  <div className="flex flex-col items-center mt-0.5">
                                    <span className="text-[9px] text-[#666]">
                                      {statusDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                    <span className="text-[8px] text-[#444]">
                                      {statusDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {index < arr.length - 1 && (
                                <div className={`flex-1 h-px mx-2 ${isPast ? 'bg-[#555]' : 'bg-[#333]'}`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* Status Update Buttons */}
                      <div className="flex items-center justify-center gap-3 pt-5 border-t border-[#333]">
                        {financeStatus === 'pending_docs' && (
                          <button 
                            onClick={() => handleFinanceFieldChange('financeStatus', 'docs_ready')}
                            className="px-5 py-2.5 bg-[#222] border border-[#444] rounded-lg text-white text-sm font-medium hover:bg-[#333] transition-colors"
                          >
                            Mark Documents Ready
                          </button>
                        )}
                        {financeStatus === 'docs_ready' && (
                          <button 
                            onClick={() => handleFinanceFieldChange('financeStatus', 'submitted')}
                            className="px-5 py-2.5 bg-[#222] border border-[#444] rounded-lg text-white text-sm font-medium hover:bg-[#333] transition-colors"
                          >
                            Mark as Submitted to Bank
                          </button>
                        )}
                        {financeStatus === 'submitted' && (
                          <button 
                            onClick={() => handleFinanceFieldChange('financeStatus', 'under_review')}
                            className="px-5 py-2.5 bg-[#222] border border-[#444] rounded-lg text-white text-sm font-medium hover:bg-[#333] transition-colors"
                          >
                            Bank is Reviewing
                          </button>
                        )}
                        {(financeStatus === 'submitted' || financeStatus === 'under_review') && (
                          <>
                            <button 
                              onClick={() => handleFinanceFieldChange('financeStatus', 'approved')}
                              className="px-5 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#eee] transition-colors"
                            >
                              ✓ Approved
                            </button>
                            <button 
                              onClick={() => handleFinanceFieldChange('financeStatus', 'rejected')}
                              className="px-5 py-2.5 bg-[#222] border border-[#444] rounded-lg text-[#888] text-sm font-medium hover:bg-[#333] hover:text-white transition-colors"
                            >
                              ✗ Rejected
                            </button>
                          </>
                        )}
                        {financeStatus === 'approved' && (
                          <button 
                            onClick={() => handleFinanceFieldChange('financeStatus', 'funds_received')}
                            className="px-5 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#eee] transition-colors"
                          >
                            Funds Received
                          </button>
                        )}
                        {financeStatus === 'rejected' && (
                          <button 
                            onClick={() => handleFinanceFieldChange('financeStatus', 'pending_docs')}
                            className="px-5 py-2.5 bg-[#222] border border-[#444] rounded-lg text-white text-sm font-medium hover:bg-[#333] transition-colors"
                          >
                            ↩ Restart Application
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DOCUMENTS TAB */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {/* RESERVATION DOCUMENT - Always show in reservation mode, view-only in invoice mode */}
                  <div className={`rounded-lg border overflow-hidden ${reservationPdfUrl ? 'bg-[#0f0f0f] border-[#333]' : 'bg-[#0d0d0d] border-[#222]'}`}>
                    <div className="px-4 py-3 border-b border-[#333] bg-[#111] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${reservationPdfUrl ? 'bg-[#444]' : 'bg-[#333]'}`}>
                          <FileText className={`w-4 h-4 ${reservationPdfUrl ? 'text-[#ccc]' : 'text-[#666]'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-white">Reservation Form</h3>
                            {reservationNumber && (
                              <span className="px-1.5 py-0.5 bg-[#444] text-[#ccc] text-[10px] font-mono rounded">
                                {reservationNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#666] mt-0.5">
                            {reservationPdfUrl 
                              ? (signingStatus === 'completed' ? 'Signed' : 'Ready') 
                              : 'Not generated'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {mode === 'reservation' && (
                          <button 
                            onClick={handleSubmit} 
                            disabled={saving} 
                            className="px-3 py-1.5 bg-gradient-to-r from-[#555] to-[#666] text-white text-sm font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            {reservationPdfUrl ? 'Regenerate' : 'Generate'}
                          </button>
                        )}
                        {reservationPdfUrl && (
                          <>
                            <button onClick={() => window.open(signedPdfUrl || reservationPdfUrl, '_blank')} className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md flex items-center gap-2 transition-colors">
                              <Eye className="w-4 h-4" /> View
                            </button>
                            <button onClick={() => window.open(signedPdfUrl || reservationPdfUrl, '_blank')} className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md flex items-center gap-2 transition-colors">
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Send for Signing - Reservation */}
                    {mode === 'reservation' && reservationPdfUrl && signingStatus !== 'completed' && (
                      <div className="px-4 py-4 border-t border-[#333] bg-gradient-to-r from-[#1a1a1a] to-[#111]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#555] to-[#333] flex items-center justify-center">
                              <Mail className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">Send for DocuSign</p>
                              <p className="text-[12px] text-[#888]">
                                {formData.emailAddress ? `Will be sent to ${formData.emailAddress}` : 'Add customer email in Details tab first'}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={handleSendForSigning} 
                            disabled={sendingForSigning || !formData.emailAddress} 
                            className="px-4 py-2 bg-gradient-to-r from-[#555] to-[#666] hover:from-[#666] hover:to-[#777] text-white text-sm font-medium rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {sendingForSigning ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <FileText className="w-4 h-4" />
                                Send for Signing
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Signed Badge */}
                    {signingStatus === 'completed' && signedPdfUrl && (
                      <div className="px-4 py-3 border-t border-[#333] flex items-center justify-between bg-emerald-500/5">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Check className="w-4 h-4" />
                          <span className="text-[12px] font-medium">Document Signed via DocuSign</span>
                        </div>
                        <button onClick={() => window.open(signedPdfUrl, '_blank')} className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[12px] rounded-md transition-colors flex items-center gap-1.5">
                          <Download className="w-3.5 h-3.5" /> Download Signed
                        </button>
                      </div>
                    )}
                  </div>

                  {/* INVOICE DOCUMENT - Only show in invoice mode */}
                  {mode === 'invoice' && (
                    <div className={`rounded-lg border overflow-hidden ${documentStatus === 'reversed' ? 'bg-[#0f0f0f] border-red-500/30' : invoicePdfUrl ? 'bg-[#0f0f0f] border-[#333]' : 'bg-[#0d0d0d] border-[#222]'}`}>
                      <div className="px-4 py-3 border-b border-[#333] bg-[#111] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-md flex items-center justify-center ${documentStatus === 'reversed' ? 'bg-red-500/10' : invoicePdfUrl ? 'bg-emerald-500/10' : 'bg-[#333]'}`}>
                            <Receipt className={`w-4 h-4 ${documentStatus === 'reversed' ? 'text-red-400' : invoicePdfUrl ? 'text-emerald-400' : 'text-[#666]'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-white">Invoice</h3>
                              {invoiceNumber && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded">
                                  {invoiceNumber}
                                </span>
                              )}
                            </div>
                            <p className={`text-[12px] mt-0.5 ${documentStatus === 'reversed' ? 'text-red-400' : chargesTotals.balanceDue > 0 ? 'text-amber-400' : 'text-[#666]'}`}>
                              {documentStatus === 'reversed' 
                                ? 'REVERSED' 
                                : chargesTotals.balanceDue > 0 
                                  ? `Outstanding: AED ${formatCurrency(chargesTotals.balanceDue)}` 
                                  : invoicePdfUrl ? 'Ready' : 'Not generated'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {documentStatus !== 'reversed' && (
                          <button 
                            onClick={handleSubmit} 
                            disabled={saving} 
                            className="px-3 py-1.5 bg-gradient-to-r from-[#555] to-[#666] text-white text-sm font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors disabled:opacity-50 flex items-center gap-2"
                            title=""
                          >
                            {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            {invoicePdfUrl ? 'Regenerate' : 'Generate'}
                          </button>
                          )}
                          {invoicePdfUrl && (
                            <>
                              <button onClick={() => window.open(invoicePdfUrl, '_blank')} className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md flex items-center gap-2 transition-colors">
                                <Eye className="w-4 h-4" /> View
                              </button>
                              <button onClick={() => window.open(invoicePdfUrl, '_blank')} className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md flex items-center gap-2 transition-colors">
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Send for Signing - Invoice */}
                      {invoicePdfUrl && formData.emailAddress && documentStatus !== 'reversed' && (
                        <div className="px-4 py-3 border-t border-[#333] flex items-center justify-between bg-[#0d0d0d]">
                          <p className="text-[12px] text-[#888]">Send to {formData.emailAddress} for signing</p>
                          <button 
                            onClick={handleSendForSigning} 
                            disabled={sendingForSigning} 
                            className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md transition-colors disabled:opacity-50"
                          >
                            {sendingForSigning ? 'Sending...' : 'Send for Signing'}
                          </button>
                        </div>
                      )}
                      {/* Reversed Status Badge */}
                      {documentStatus === 'reversed' && (
                        <div className="px-4 py-3 border-t border-[#333] bg-red-500/10">
                          <div className="flex items-center gap-2 text-red-400">
                            <X className="w-4 h-4" />
                            <span className="text-[12px] font-medium">This invoice has been REVERSED</span>
                          </div>
                        </div>
                      )}
                      {/* Reverse Invoice Button - Only for completed invoices */}
                      {invoicePdfUrl && documentStatus !== 'reversed' && isAdmin && (
                        <div className="px-4 py-3 border-t border-[#333] flex items-center justify-between bg-[#0d0d0d]">
                          <p className="text-[12px] text-[#666]">Cancel this sale and mark as reversed</p>
                          <button 
                            onClick={handleReverseInvoice} 
                            disabled={saving} 
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-md transition-colors disabled:opacity-50"
                          >
                            {saving ? 'Reversing...' : 'Reverse Invoice'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
        </div>
        )}

        {/* ============ FOOTER ============ */}
        {!loading && (
        <div className="px-6 py-4 border-t border-[#333] flex items-center justify-between shrink-0 bg-[#111]">
          <p className="text-[13px] text-[#666]">{formData.salesExecutive} • {formatDate(formData.date)}</p>
          <button 
            onClick={handleSave}
            disabled={saving || !reservationId}
            className="px-4 py-2 bg-gradient-to-r from-[#555] to-[#666] hover:from-[#666] hover:to-[#777] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>
        )}
      </div>

      {/* Payment Allocation Modal */}
      {showAllocatePayment && selectedPaymentForAllocation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#0d0d0d] rounded-xl w-full max-w-md shadow-2xl border border-[#333]">
            <div className="px-5 py-4 border-b border-[#333]">
              <h3 className="text-base font-semibold text-white">Allocate Payment</h3>
              <p className="text-[13px] text-[#666] mt-1">Link this payment to the current reservation</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Payment Info */}
              <div className="bg-[#111] rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">Receipt #</span>
                  <span className="text-white font-mono">{selectedPaymentForAllocation.receipt_number || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">Payment Amount</span>
                  <span className="text-emerald-400 font-semibold">AED {formatCurrency(selectedPaymentForAllocation.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">Already Allocated</span>
                  <span className="text-white">{(() => {
                    const allocs = paymentAllocations.get(selectedPaymentForAllocation.id) || [];
                    return `AED ${formatCurrency(allocs.reduce((s, a) => s + a.allocated_amount, 0))}`;
                  })()}</span>
                </div>
              </div>
              
              {/* Allocation Target */}
              <div className="bg-[#111] rounded-lg p-4">
                <p className="text-[11px] text-[#666] uppercase tracking-wide mb-2">Allocating to:</p>
                <p className="text-white font-medium">{documentNumber || 'This Reservation'}</p>
                <p className="text-[#666] text-sm">{formData.makeModel}</p>
              </div>
              
              {/* Amount Input */}
              <div>
                <label className="block text-[12px] text-[#666] mb-2">Amount to Allocate</label>
                <div className="flex items-center gap-2">
                  <span className="text-[#666]">AED</span>
                  <input
                    type="number"
                    value={allocationAmount}
                    onChange={(e) => {
                      const allocs = paymentAllocations.get(selectedPaymentForAllocation.id) || [];
                      const maxAmount = selectedPaymentForAllocation.amount - allocs.reduce((s, a) => s + a.allocated_amount, 0);
                      setAllocationAmount(Math.min(maxAmount, Math.max(0, Number(e.target.value))));
                    }}
                    className="flex-1 px-3 py-2.5 bg-[#111] border border-[#333] rounded-md text-white focus:outline-none focus:border-[#666]"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-[#333] flex gap-3 justify-end">
              <button 
                onClick={() => {
                  setShowAllocatePayment(false);
                  setSelectedPaymentForAllocation(null);
                }} 
                className="px-4 py-2 bg-[#333] text-white rounded-md hover:bg-[#444] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAllocatePayment}
                disabled={allocationAmount <= 0 || allocatingPayment || !reservationId}
                className="px-4 py-2 bg-gradient-to-r from-[#555] to-[#666] text-white font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors disabled:opacity-50"
              >
                {allocatingPayment ? 'Allocating...' : 'Allocate Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#0d0d0d] rounded-xl w-full max-w-md shadow-2xl border border-[#333]">
            <div className="px-5 py-4 border-b border-[#333]">
              <h3 className="text-base font-semibold text-white">Company Signer</h3>
              <p className="text-[13px] text-[#666] mt-1">Enter the email of who should sign first from SilberArrows</p>
            </div>
            <div className="p-5">
              <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="email@silberarrows.ae" className="w-full px-3 py-2.5 bg-[#111] border border-[#333] rounded-md text-white placeholder-[#555] focus:outline-none focus:border-[#666] transition-colors" autoFocus />
            </div>
            <div className="px-5 py-4 border-t border-[#333] flex gap-3 justify-end">
              <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 bg-[#333] text-white rounded-md hover:bg-[#444] transition-colors">Cancel</button>
              <button onClick={handleConfirmSendForSigning} disabled={!companyEmail} className="px-4 py-2 bg-gradient-to-r from-[#555] to-[#666] text-white font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors disabled:opacity-50">Send for Signing</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
}

