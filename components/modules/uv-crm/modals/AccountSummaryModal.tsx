'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';
import { useUserRole } from '@/lib/useUserRole';
import { 
  X, FileText, CreditCard, Receipt, ClipboardList,
  Plus, Trash2, Download, Eye, Check, DollarSign, Car, User,
  Phone, Mail, Calendar, Banknote, Shield, Sparkles, ScrollText
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================
interface Lead {
  id: string;
  full_name: string;
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

type TabType = 'form' | 'charges' | 'payments' | 'soa' | 'documents';

const CHARGE_TYPES = [
  { value: 'vehicle_sale', label: 'Vehicle Sale' },
  { value: 'extended_warranty', label: 'Warranty' },
  { value: 'ceramic_treatment', label: 'Ceramic' },
  { value: 'service_care', label: 'Service' },
  { value: 'window_tints', label: 'Tints' },
  { value: 'rta_fees', label: 'RTA Fees' },
  { value: 'other_addon', label: 'Other' },
  { value: 'discount', label: 'Discount' },
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
    contactNo: lead.phone_number,
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
  const [documentNumber, setDocumentNumber] = useState<string | null>(null);
  const [reservationNumber, setReservationNumber] = useState<string | null>(null);
  const [customerNumber, setCustomerNumber] = useState<string | null>(null);
  
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
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newCharge, setNewCharge] = useState({ charge_type: 'vehicle_sale', description: '', unit_price: 0, vat_applicable: false });
  const [newPayment, setNewPayment] = useState({ payment_method: 'cash', amount: 0, reference_number: '', notes: '', bank_name: '', cheque_number: '', cheque_date: '', part_exchange_vehicle: '', part_exchange_chassis: '' });
  const [generatingSOA, setGeneratingSOA] = useState(false);

  // PENDING DATA - stored in memory until "Generate" is clicked
  const [pendingCharges, setPendingCharges] = useState<Array<{ id: string; charge_type: string; description: string; unit_price: number; total_amount: number; vat_applicable: boolean; vat_amount: number }>>([]);
  const [pendingPayments, setPendingPayments] = useState<Array<{ id: string; payment_method: string; amount: number; reference_number: string; notes: string; bank_name?: string; cheque_number?: string; cheque_date?: string; part_exchange_vehicle?: string; part_exchange_chassis?: string }>>([]);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Combine DB charges with pending charges for display
  const allCharges = reservationId ? charges : pendingCharges;
  const allPayments = reservationId ? payments : pendingPayments;

  const chargesTotals = {
    subtotal: allCharges.reduce((sum, c) => sum + (c.total_amount || c.unit_price || 0), 0),
    vat: allCharges.reduce((sum, c) => sum + (c.vat_amount || 0), 0),
    get grandTotal() { return this.subtotal + this.vat; },
    // Use actual payment amounts (not allocations) to correctly show overpayments/credits
    totalPaid: reservationId 
      ? payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      : pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    get balanceDue() { return this.grandTotal - this.totalPaid; }
  };

  // ============================================================
  // DATA LOADING
  // ============================================================
  const loadData = useCallback(async (showLoader = true) => {
    if (!lead.id) return;
    if (showLoader) setLoading(true);

    try {
      // Check if reservation exists first
      const { data: resData } = await supabase.from('vehicle_reservations').select('*').eq('lead_id', lead.id).maybeSingle();
      
      if (lead.inventory_car_id) {
        const { data: carData } = await supabase.from('cars').select('*').eq('id', lead.inventory_car_id).single();
        if (carData) {
          setInventoryCar(carData);
          setFormData(prev => ({
            ...prev,
            makeModel: carData.vehicle_model || '',
            modelYear: carData.model_year || 0,
            chassisNo: carData.chassis_number || '',
            exteriorColour: carData.colour || '',
            interiorColour: carData.interior_colour || '',
            mileage: carData.current_mileage_km || 0,
            vehicleSalePrice: carData.advertised_price_aed || 0,
          }));
          
          // Auto-add Vehicle Sale as first charge if no existing reservation
          if (!resData && carData.advertised_price_aed > 0) {
            setPendingCharges([{
              id: `pending-vehicle-sale`,
              charge_type: 'vehicle_sale',
              description: `Vehicle Sale - ${carData.vehicle_model || 'Vehicle'}`,
              unit_price: carData.advertised_price_aed,
              total_amount: carData.advertised_price_aed,
              vat_applicable: false,
              vat_amount: 0
            }]);
          }
        }
      }

      if (resData) {
        setIsEditing(true);
        setReservationId(resData.id);
        setCustomerNumber(resData.customer_number);
        // Set document numbers - RES number is either current (if reservation) or original (if invoice)
        setDocumentNumber(resData.document_number);
        setReservationNumber(
          resData.document_type === 'reservation' 
            ? resData.document_number 
            : resData.original_reservation_number || null
        );
        // Load both document URLs
        setReservationPdfUrl(resData.reservation_pdf_url || null);
        setInvoicePdfUrl(resData.invoice_pdf_url || null);
        setSignedPdfUrl(resData.signed_pdf_url || null);
        setDocusignEnvelopeId(resData.docusign_envelope_id);
        setSigningStatus(resData.signing_status || 'pending');

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
      }

      const { data: paymentsData } = await supabase.from('uv_payments').select('*').eq('lead_id', lead.id).order('payment_date', { ascending: false }).order('created_at', { ascending: false });
      setPayments(paymentsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [lead.id, lead.inventory_car_id, mode]);

  useEffect(() => {
    if (isOpen) {
      // Reset pending state when modal opens
      setPendingCharges([]);
      setPendingPayments([]);
      loadData();
      setActiveTab('form');
    }
  }, [isOpen, loadData]);

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
    
    // Invoice requires full payment - balance must be zero or credit
    if (mode === 'invoice' && chargesTotals.balanceDue > 0) {
      errors.push(`Outstanding balance of AED ${formatCurrency(chargesTotals.balanceDue)} must be cleared before generating invoice`);
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      const reservationData = {
        lead_id: lead.id, document_type: mode, document_status: 'pending',
        sales_executive: formData.salesExecutive, document_date: formData.date,
        customer_name: formData.customerName, contact_no: formData.contactNo,
        email_address: formData.emailAddress, customer_id_type: formData.customerIdType,
        customer_id_number: formData.customerIdNumber, vehicle_make_model: formData.makeModel,
        model_year: formData.modelYear, chassis_no: formData.chassisNo,
        vehicle_exterior_colour: formData.exteriorColour, vehicle_interior_colour: formData.interiorColour,
        vehicle_mileage: formData.mileage, manufacturer_warranty: formData.manufacturerWarranty,
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
        rta_fees: formData.rtaFees, vehicle_sale_price: formData.vehicleSalePrice,
        add_ons_total: formData.addOnsTotal, invoice_total: formData.invoiceTotal,
        deposit: formData.deposit, amount_due: formData.amountDue,
        additional_notes: formData.additionalNotes, created_by: user?.id || null
      };

      let savedReservation;
      if (reservationId) {
        const { data, error } = await supabase.from('vehicle_reservations').update({ ...reservationData, updated_at: new Date().toISOString() }).eq('id', reservationId).select().single();
        if (error) throw error;
        savedReservation = data;
      } else {
        const { data, error } = await supabase.from('vehicle_reservations').insert([reservationData]).select().single();
        if (error) throw error;
        savedReservation = data;
        setReservationId(data.id);

        // Save pending charges to DB now that we have a reservation_id
        if (pendingCharges.length > 0) {
          const chargesForDB = pendingCharges.map((c, index) => ({
            reservation_id: data.id,
            charge_type: c.charge_type,
            description: c.description,
            quantity: 1,
            unit_price: c.unit_price,
            vat_applicable: c.vat_applicable,
            display_order: index,
            created_by: user?.id
          }));
          const { error: chargesError } = await supabase.from('uv_charges').insert(chargesForDB);
          if (chargesError) {
            console.error('Failed to save charges:', chargesError);
            throw new Error('Failed to save charges');
          }
        }

        // Save pending payments to DB
        if (pendingPayments.length > 0) {
          for (const payment of pendingPayments) {
            const { error: paymentError } = await supabase.from('uv_payments').insert({
              lead_id: lead.id,
              payment_method: payment.payment_method,
              amount: payment.amount,
              reference_number: payment.reference_number || null,
              notes: payment.notes || null,
              bank_name: payment.bank_name || null,
              cheque_number: payment.cheque_number || null,
              cheque_date: payment.cheque_date || null,
              part_exchange_vehicle: payment.part_exchange_vehicle || null,
              part_exchange_chassis: payment.part_exchange_chassis || null,
              created_by: user?.id
            });
            if (paymentError) {
              console.error('Failed to save payment:', paymentError);
              throw new Error('Failed to save payment');
            }
          }
        }
        
        // Clear pending state - loadData will refresh from DB
        setPendingCharges([]);
        setPendingPayments([]);
      }

      const response = await fetch('/api/generate-vehicle-document', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, formData, leadId: lead.id, reservationId: savedReservation.id })
      });

      if (!response.ok) throw new Error('Failed to generate document');

      const result = await response.json();
      if (result.pdfUrl) {
        await supabase.from('vehicle_reservations').update({ pdf_url: result.pdfUrl, document_status: 'completed' }).eq('id', savedReservation.id);
        if (mode === 'reservation') {
          setReservationPdfUrl(result.pdfUrl);
        } else {
          setInvoicePdfUrl(result.pdfUrl);
        }
        if (result.documentNumber) setDocumentNumber(result.documentNumber);
        if (savedReservation.document_number) setDocumentNumber(savedReservation.document_number);
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
    } catch (error) {
      alert('Failed to send for signing');
    } finally {
      setSendingForSigning(false);
    }
  };

  const handleAddCharge = async () => {
    if (!newCharge.unit_price) return;
    
    const chargeData = {
      id: `pending-${Date.now()}`,
      charge_type: newCharge.charge_type,
      description: newCharge.description || CHARGE_TYPES.find(c => c.value === newCharge.charge_type)?.label || '',
      unit_price: newCharge.unit_price,
      total_amount: newCharge.unit_price, // For now, same as unit_price (qty=1)
      vat_applicable: newCharge.vat_applicable,
      vat_amount: 0
    };

    if (reservationId) {
      // Save to DB if reservation exists
      setSaving(true);
      try {
        await supabase.from('uv_charges').insert({
          reservation_id: reservationId, charge_type: chargeData.charge_type,
          description: chargeData.description,
          quantity: 1, unit_price: chargeData.unit_price, vat_applicable: chargeData.vat_applicable,
          display_order: charges.length, created_by: user?.id
        });
        await loadData();
      } catch (error) { alert('Failed to add charge'); } finally { setSaving(false); }
    } else {
      // Store locally until Generate is clicked
      setPendingCharges(prev => [...prev, chargeData]);
    }
    
    setShowAddCharge(false);
    setNewCharge({ charge_type: 'vehicle_sale', description: '', unit_price: 0, vat_applicable: false });
  };

  const handleDeleteCharge = async (id: string) => {
    if (!confirm('Delete this charge?')) return;
    
    if (id.startsWith('pending-')) {
      // Remove from pending (local) state
      setPendingCharges(prev => prev.filter(c => c.id !== id));
    } else {
      // Remove from DB
      await supabase.from('uv_charges').delete().eq('id', id);
      await loadData();
    }
  };

  const handleAddPayment = async () => {
    console.log('handleAddPayment called', { amount: newPayment.amount, method: newPayment.payment_method, reservationId });
    if (!newPayment.amount) {
      console.log('No amount, returning');
      return;
    }
    
    // Refunds are stored as negative amounts
    const isRefund = newPayment.payment_method === 'refund';
    const finalAmount = isRefund ? -Math.abs(newPayment.amount) : Math.abs(newPayment.amount);
    
    const paymentData = {
      id: `pending-${Date.now()}`,
      payment_method: newPayment.payment_method,
      amount: finalAmount,
      reference_number: newPayment.reference_number || '',
      notes: newPayment.notes || '',
      bank_name: newPayment.bank_name || '',
      cheque_number: newPayment.cheque_number || '',
      cheque_date: newPayment.cheque_date || '',
      part_exchange_vehicle: newPayment.part_exchange_vehicle || '',
      part_exchange_chassis: newPayment.part_exchange_chassis || '',
      payment_date: new Date().toISOString(),
      status: 'pending'
    };

    if (reservationId) {
      // Save to DB if reservation exists
      setSaving(true);
      try {
        const { data: dbPayment, error: insertError } = await supabase.from('uv_payments').insert({
          lead_id: lead.id, payment_method: newPayment.payment_method, amount: finalAmount,
          reference_number: newPayment.reference_number || null, notes: newPayment.notes || null,
          bank_name: newPayment.bank_name || null, cheque_number: newPayment.cheque_number || null,
          cheque_date: newPayment.cheque_date || null, part_exchange_vehicle: newPayment.part_exchange_vehicle || null,
          part_exchange_chassis: newPayment.part_exchange_chassis || null, created_by: user?.id
        }).select().single();

        if (insertError) {
          console.error('Payment insert error:', insertError);
          alert('Failed to save payment: ' + insertError.message);
          setSaving(false);
          return;
        }

        // Payment is already linked to lead via lead_id - no separate allocation needed

        // Generate receipt PDF
        if (dbPayment) {
          try {
            // Calculate updated totals after this payment (can be negative if overpaid or refund)
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

        await loadData();
      } catch (error) { alert('Failed to record payment'); } finally { setSaving(false); }
    } else {
      // Store locally until Generate is clicked (newest first)
      setPendingPayments(prev => [paymentData, ...prev]);
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
                  {isPaid && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[11px] font-medium rounded flex items-center gap-1">
                      <Check className="w-3 h-3" /> Paid
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
          <div className="grid grid-cols-5">
            {[
              { key: 'form', label: 'Details', icon: ClipboardList },
              { key: 'charges', label: 'Charges', icon: Receipt, count: allCharges.length },
              { key: 'payments', label: 'Payments', icon: CreditCard, count: allPayments.length },
              { key: 'soa', label: 'Statement', icon: ScrollText },
              { key: 'documents', label: 'Documents', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`relative flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all border-b-2 ${
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
                  {/* Info banner when building quote */}
                  {!reservationId && pendingCharges.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-400 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Building quote - charges will be saved when you Generate the document
                    </div>
                  )}
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
                              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                                type.value === 'discount' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20' 
                                  : 'bg-[#222] text-[#aaa] border border-[#333] hover:bg-[#333] hover:text-white'
                              }`}
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
                    <div><p className="text-[11px] text-[#666] uppercase tracking-wide">Total Paid</p><p className="text-xl font-bold text-emerald-400 mt-1">AED {formatCurrency(chargesTotals.totalPaid)}</p></div>
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

                  {/* Info banner when building quote */}
                  {!reservationId && pendingPayments.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-400 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Payments will be saved when you Generate the document
                    </div>
                  )}

                  {/* Payments Table */}
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-[#333] bg-[#111]"><th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Date</th><th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Receipt</th><th className="px-4 py-3 text-left text-[11px] font-medium text-[#666] uppercase tracking-wider">Method</th><th className="px-4 py-3 text-right text-[11px] font-medium text-[#666] uppercase tracking-wider">Amount</th><th className="px-4 py-3 text-center text-[11px] font-medium text-[#666] uppercase tracking-wider">Status</th><th className="px-4 py-3 text-center text-[11px] font-medium text-[#666] uppercase tracking-wider">PDF</th></tr></thead>
                      <tbody className="divide-y divide-[#333]">
                        {allPayments.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-[#555]">No payments recorded</td></tr> : allPayments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-[#0d0d0d] transition-colors">
                            <td className="px-4 py-3 text-[#999] text-sm">{formatDate(p.payment_date)}</td>
                            <td className="px-4 py-3 text-[#888] font-mono text-xs">{p.receipt_number || '-'}</td>
                            <td className="px-4 py-3 text-white text-sm capitalize">{p.payment_method === 'refund' ? '↩ Refund' : p.payment_method.replace('_', ' ')}</td>
                            <td className={`px-4 py-3 text-right font-semibold text-sm ${p.amount < 0 || p.payment_method === 'refund' ? 'text-red-400' : 'text-emerald-400'}`}>{p.amount < 0 ? '-' : ''}AED {formatCurrency(Math.abs(p.amount))}</td>
                            <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-[11px] font-medium ${p.amount < 0 || p.payment_method === 'refund' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{p.amount < 0 || p.payment_method === 'refund' ? 'refund' : 'received'}</span></td>
                            <td className="px-4 py-3 text-center">
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
                      <p className={`text-xl font-semibold ${chargesTotals.grandTotal > 0 && chargesTotals.balanceDue <= 0 ? 'text-emerald-400' : chargesTotals.totalPaid > 0 ? 'text-amber-400' : chargesTotals.grandTotal > 0 ? 'text-red-400' : 'text-[#666]'}`}>
                        {chargesTotals.grandTotal === 0 ? 'NO CHARGES' : chargesTotals.balanceDue <= 0 ? 'PAID' : chargesTotals.totalPaid > 0 ? 'PARTIAL' : 'UNPAID'}
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
                                  <span className="text-white">AED {formatCurrency(txn.amount)}</span>
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
                    <div className={`rounded-lg border overflow-hidden ${invoicePdfUrl ? 'bg-[#0f0f0f] border-[#333]' : 'bg-[#0d0d0d] border-[#222]'}`}>
                      <div className="px-4 py-3 border-b border-[#333] bg-[#111] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-md flex items-center justify-center ${invoicePdfUrl ? 'bg-emerald-500/10' : 'bg-[#333]'}`}>
                            <Receipt className={`w-4 h-4 ${invoicePdfUrl ? 'text-emerald-400' : 'text-[#666]'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-white">Invoice</h3>
                              {documentNumber && documentNumber.startsWith('INV') && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded">
                                  {documentNumber}
                                </span>
                              )}
                            </div>
                            <p className={`text-[12px] mt-0.5 ${chargesTotals.balanceDue > 0 ? 'text-amber-400' : 'text-[#666]'}`}>
                              {chargesTotals.balanceDue > 0 
                                ? `Clear balance (AED ${formatCurrency(chargesTotals.balanceDue)}) to generate` 
                                : invoicePdfUrl ? 'Ready' : 'Not generated'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSubmit} 
                            disabled={saving || chargesTotals.balanceDue > 0} 
                            className="px-3 py-1.5 bg-gradient-to-r from-[#555] to-[#666] text-white text-sm font-medium rounded-md hover:from-[#666] hover:to-[#777] transition-colors disabled:opacity-50 flex items-center gap-2"
                            title={chargesTotals.balanceDue > 0 ? `Clear balance of AED ${formatCurrency(chargesTotals.balanceDue)} first` : ''}
                          >
                            {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            {invoicePdfUrl ? 'Regenerate' : 'Generate'}
                          </button>
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
                      {invoicePdfUrl && formData.emailAddress && (
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
          <button onClick={onClose} className="px-4 py-2 bg-[#333] hover:bg-[#444] text-white text-sm rounded-md transition-colors">Close</button>
        </div>
        )}
      </div>

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

